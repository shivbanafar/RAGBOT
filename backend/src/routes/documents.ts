import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { Document } from '../models/Document';
import { protect } from '../middleware/auth';
import { generateEmbedding, generateEmbeddings } from '../services/embedding';
import mongoose from 'mongoose';
import pdfParse from 'pdf-parse';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Increased to 100MB
  },
  fileFilter: (req, file, cb) => {
    console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}`);
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error(`Invalid file type: ${file.mimetype}`);
      cb(new Error('Invalid file type. Only PDF, TXT, MD, and JSON files are allowed.'));
    }
  },
});

// Check MongoDB connection
const checkMongoConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
      throw new Error('Database connection not ready');
    }
    console.log('MongoDB connection is ready');
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return false;
  }
};

// Get all documents for a user
router.get('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching documents for user:', req.user?._id);
    
    // Check MongoDB connection
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('MongoDB connection not ready');
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    if (!req.user?._id) {
      console.error('No user ID found in request');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get folder from query parameter, default to 'root'
    const folder = req.query.folder as string || 'root';
    console.log('Fetching documents from folder:', folder);

    // Log the query parameters
    const query = { 
      userId: req.user._id,
      folder: folder,
      title: { $ne: '.folder' }
    };
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    // First, let's check if there are any documents at all for this user
    const totalDocs = await Document.countDocuments({ userId: req.user._id });
    console.log(`Total documents for user: ${totalDocs}`);

    // Get documents in the specified folder
    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .select('_id title type createdAt folder')
      .lean();
    
    // Get all unique folders for this user
    const folders = await Document.distinct('folder', { 
      userId: req.user._id,
      title: { $ne: '.folder' }
    });
    
    console.log(`Found ${documents.length} documents in folder ${folder}:`, documents.map(d => ({
      id: d._id,
      title: d.title,
      type: d.type,
      folder: d.folder
    })));
    console.log('Available folders:', folders);
    
    // Let's also check one document to see its structure
    if (documents.length > 0) {
      const sampleDoc = await Document.findOne({ userId: req.user._id }).lean();
      console.log('Sample document structure:', JSON.stringify(sampleDoc, null, 2));
    }
    
    res.json({
      documents,
      folders,
      currentFolder: folder
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Upload and process a document
router.post('/upload', protect, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Starting document upload process');
    
    // Check MongoDB connection
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('MongoDB connection not ready');
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    if (!req.file) {
      console.error('No file uploaded');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title, folder = 'root' } = req.body;
    const file = req.file;
    console.log(`Processing file: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}, folder: ${folder}`);
    
    // Check file size
    if (file.size > 100 * 1024 * 1024) {
      console.error(`File too large: ${file.size} bytes`);
      res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
      return;
    }
    
    // Determine file type
    let fileType: 'pdf' | 'txt' | 'md' | 'json';
    switch (file.mimetype) {
      case 'application/pdf':
        fileType = 'pdf';
        break;
      case 'text/plain':
        fileType = 'txt';
        break;
      case 'text/markdown':
        fileType = 'md';
        break;
      case 'application/json':
        fileType = 'json';
        break;
      default:
        console.error(`Unsupported file type: ${file.mimetype}`);
        res.status(400).json({ error: 'Unsupported file type' });
        return;
    }

    console.log(`Extracting text from ${fileType} file`);
    // Extract text from file
    let text: string;
    try {
      text = await extractTextFromFile(file.buffer, fileType);
      console.log(`Successfully extracted ${text.length} characters of text`);
    } catch (error) {
      console.error('Error extracting text:', error);
      res.status(500).json({ error: 'Failed to extract text from file' });
      return;
    }
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    console.log(`Split text into ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      console.error('No content could be extracted from the file');
      res.status(400).json({ error: 'No content could be extracted from the file.' });
      return;
    }
    
    console.log('Generating embeddings for chunks');
    // Process chunks with selective embedding
    const chunksWithEmbeddings: Array<{
      text: string;
      embedding: number[];
      metadata: {
        source: string;
        startIndex: number;
        endIndex: number;
      };
    }> = [];
    
    for (const chunk of chunks) {
      try {
        console.log(`Processing chunk of length ${chunk.text.length}`);
        // Only generate embeddings for chunks longer than 500 characters
        let embedding: number[];
        if (chunk.text.length > 500) {
          console.log('Generating embedding for long chunk');
          embedding = await generateEmbedding(chunk.text);
          // Ensure embedding is 128-dimensional
          if (embedding.length !== 128) {
            console.log(`Fixing embedding dimension from ${embedding.length} to 128`);
            if (embedding.length > 128) {
              embedding = embedding.slice(0, 128);
            } else {
              const padding = new Array(128 - embedding.length).fill(0);
              embedding = [...embedding, ...padding];
            }
          }
        } else {
          console.log('Using hash-based embedding for short chunk');
          // For short chunks, use a simple hash-based embedding
          const hash = chunk.text.split('').reduce((acc, char) => {
            return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
          }, 0);
          // Create a 128-dimensional vector
          embedding = new Array(128).fill(0);
          for (let i = 0; i < 128; i++) {
            embedding[i] = Math.sin(hash + i) * 0.01;
          }
        }
        
        chunksWithEmbeddings.push({
          text: chunk.text,
          embedding,
          metadata: {
            source: title || file.originalname,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
          },
        });
        console.log('Successfully processed chunk with embedding dimension:', embedding.length);
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Continue with next chunk
      }
    }

    if (chunksWithEmbeddings.length === 0) {
      console.error('Failed to process any chunks');
      res.status(500).json({ error: 'Failed to process document chunks.' });
      return;
    }

    console.log('Creating document in database');
    // Create document
    const document = new Document({
      userId: req.user?._id,
      title: title || file.originalname,
      type: fileType,
      folder: folder,
      chunks: chunksWithEmbeddings,
    });

    await document.save();
    console.log(`Successfully saved document with ${chunksWithEmbeddings.length} chunks in folder ${folder}`);

    res.status(201).json({
      message: 'Document uploaded and processed successfully',
      document: {
        id: document._id,
        title: document.title,
        type: document.type,
        folder: document.folder,
        chunksCount: document.chunks.length,
      },
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete a document
router.delete('/:id', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Deleting document:', req.params.id);
    
    // Check MongoDB connection
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('MongoDB connection not ready');
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    if (!req.user?._id) {
      console.error('No user ID found in request');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      console.error('Document not found:', req.params.id);
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    console.log('Successfully deleted document:', req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Clear all documents (for migration purposes)
router.delete('/clear', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Document.deleteMany({ userId: req.user?._id });
    res.json({ 
      message: `Cleared ${result.deletedCount} documents`,
      deletedCount: result.deletedCount 
    });
  } catch (error: any) {
    console.error('Clear documents error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Create a new folder
router.post('/folders', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folderName } = req.body;
    
    if (!folderName) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    // Check if folder already exists for this user
    const existingFolder = await Document.findOne({
      userId: req.user?._id,
      folder: folderName
    });

    if (existingFolder) {
      res.status(400).json({ error: 'Folder already exists' });
      return;
    }

    // Create a placeholder document to establish the folder
    const document = new Document({
      userId: req.user?._id,
      title: '.folder',
      type: 'txt',
      folder: folderName,
      chunks: [{
        text: 'This is a folder placeholder document.',
        embedding: new Array(128).fill(0),
        metadata: {
          source: '.folder',
          startIndex: 0,
          endIndex: 0
        }
      }]
    });

    await document.save();
    
    res.status(201).json({
      message: 'Folder created successfully',
      folder: folderName
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Move document to a different folder
router.patch('/:id/move', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { folder } = req.body;

    if (!folder) {
      res.status(400).json({ error: 'Target folder is required' });
      return;
    }

    const document = await Document.findOneAndUpdate(
      { _id: id, userId: req.user?._id },
      { folder },
      { new: true }
    );

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({
      message: 'Document moved successfully',
      document: {
        id: document._id,
        title: document.title,
        folder: document.folder
      }
    });
  } catch (error: any) {
    console.error('Move document error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Helper function to extract text from file
async function extractTextFromFile(buffer: Buffer, fileType: string): Promise<string> {
  console.log(`Extracting text from ${fileType} file`);
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty file buffer provided');
    }

    switch (fileType) {
      case 'txt':
      case 'md':
      case 'json':
        const text = buffer.toString('utf-8');
        if (!text || text.trim().length === 0) {
          throw new Error('File appears to be empty or contains no readable text');
        }
        console.log(`Extracted ${text.length} characters from text file`);
        return text;

      case 'pdf':
        try {
          console.log('Starting PDF extraction...');
          const pdfData = await pdfParse(buffer, {
            max: 0, // No page limit
            version: 'v2.0.550'
          });
          
          if (!pdfData || !pdfData.text) {
            throw new Error('PDF parsing failed to extract any text');
          }

          const extractedText = pdfData.text.trim();
          if (extractedText.length === 0) {
            throw new Error('No text content could be extracted from the PDF. The file might be scanned or image-based.');
          }

          console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
          console.log(`PDF has ${pdfData.numpages} pages`);
          return extractedText;
        } catch (pdfError) {
          console.error('Error extracting text from PDF:', pdfError);
          if (pdfError instanceof Error) {
            throw new Error(`PDF extraction failed: ${pdfError.message}`);
          }
          throw new Error('Failed to extract text from PDF file. Please ensure it is a valid PDF with extractable text.');
        }

      default:
        console.error(`Unsupported file type: ${fileType}`);
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('Error in extractTextFromFile:', error);
    if (error instanceof Error) {
      throw new Error(`Text extraction failed: ${error.message}`);
    }
    throw new Error('Failed to extract text from file');
  }
}

// Helper function to split text into chunks
function splitTextIntoChunks(text: string, targetChunks: number = 10, overlap: number = 400): Array<{text: string, startIndex: number, endIndex: number}> {
  console.log(`Splitting text into approximately ${targetChunks} chunks`);
  
  // Validate input parameters
  if (targetChunks <= 0) {
    console.error('Invalid target chunks:', targetChunks);
    throw new Error('Target chunks must be greater than 0');
  }
  
  const textLength = text.length;
  console.log(`Total text length: ${textLength} characters`);
  
  // For very small texts, return as a single chunk
  if (textLength < 1000) {
    console.log('Text is small, returning as single chunk');
    return [{
      text: text.trim(),
      startIndex: 0,
      endIndex: textLength
    }];
  }
  
  // Calculate dynamic chunk size based on total length and target chunks
  const baseChunkSize = Math.ceil(textLength / targetChunks);
  console.log(`Base chunk size: ${baseChunkSize} characters`);
  
  // Set minimum chunk size to prevent too many small chunks
  const minChunkSize = 500;
  const effectiveChunkSize = Math.max(baseChunkSize, minChunkSize);
  console.log(`Effective chunk size: ${effectiveChunkSize} characters`);
  
  // Ensure overlap is not too large
  const safeOverlap = Math.min(overlap, Math.floor(effectiveChunkSize * 0.2)); // Max 20% overlap
  console.log(`Using overlap of ${safeOverlap} characters`);
  
  const chunks = [];
  let start = 0;
  let iterationCount = 0;
  const maxIterations = targetChunks * 2; // Safety limit
  
  while (start < textLength && iterationCount < maxIterations) {
    iterationCount++;
    let end = Math.min(start + effectiveChunkSize, textLength);
    
    // If we're not at the end, try to find a good breaking point
    if (end < textLength) {
      // Look for the last period or newline within the last 200 characters
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + effectiveChunkSize * 0.7) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push({
        text: chunk,
        startIndex: start,
        endIndex: end
      });
      console.log(`Created chunk ${chunks.length} of length ${chunk.length}`);
    }
    
    // Ensure we make progress
    const newStart = end - safeOverlap;
    if (newStart <= start) {
      console.error('No progress in chunking, breaking loop');
      break;
    }
    start = newStart;
  }
  
  if (iterationCount >= maxIterations) {
    console.warn('Reached maximum iterations in chunking');
  }
  
  console.log(`Split text into ${chunks.length} chunks`);
  return chunks;
}

const testDocument = {
  title: 'Test Document',
  type: 'txt',
  chunks: [
    {
      text: 'This is a test document for machine learning types and applications.',
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      metadata: { source: 'Test Document', startIndex: 0, endIndex: 60 }
    }
  ]
};

export default router; 