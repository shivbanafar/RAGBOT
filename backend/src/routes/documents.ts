import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { Document } from '../models/Document';
import { protect } from '../middleware/auth';
import { generateEmbedding, generateEmbeddings } from '../services/embedding';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased to 50MB for RAG use case
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, MD, and JSON files are allowed.'));
    }
  },
});

// Get all documents for a user
router.get('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const documents = await Document.find({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .select('title type createdAt');
    res.json(documents);
  } catch (error: any) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Upload and process a document
router.post('/upload', protect, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title } = req.body;
    const file = req.file;
    
    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
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
        res.status(400).json({ error: 'Unsupported file type' });
        return;
    }

    // Extract text from file
    const text = await extractTextFromFile(file.buffer, fileType);
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    
    if (chunks.length === 0) {
      res.status(400).json({ error: 'No content could be extracted from the file.' });
      return;
    }
    
    console.log(`Processing ${chunks.length} chunks...`);
    
    // Process chunks with selective embedding (only for chunks > 500 chars)
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
        // Only generate embeddings for chunks longer than 500 characters
        let embedding: number[];
        if (chunk.text.length > 500) {
          embedding = await generateEmbedding(chunk.text);
        } else {
          // For short chunks, use a simple hash-based embedding
          const hash = chunk.text.split('').reduce((acc, char) => {
            return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
          }, 0);
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
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Continue with next chunk
      }
    }

    if (chunksWithEmbeddings.length === 0) {
      res.status(500).json({ error: 'Failed to process document chunks.' });
      return;
    }

    // Create document
    const document = new Document({
      userId: req.user?._id,
      title: title || file.originalname,
      type: fileType,
      chunks: chunksWithEmbeddings,
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded and processed successfully',
      document: {
        id: document._id,
        title: document.title,
        type: document.type,
        chunksCount: document.chunks.length,
      },
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete a document
router.delete('/:documentId', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.documentId,
      userId: req.user?._id,
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

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

// Helper function to extract text from file
async function extractTextFromFile(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'txt':
    case 'md':
    case 'json':
      return buffer.toString('utf-8');
    case 'pdf':
      // For now, return a placeholder. In production, you'd use a PDF parsing library
      return 'PDF content extraction not implemented yet. Please use text files for now.';
    default:
      throw new Error('Unsupported file type');
  }
}

// Helper function to split text into chunks
function splitTextIntoChunks(text: string, chunkSize: number = 2000, overlap: number = 200): Array<{text: string, startIndex: number, endIndex: number}> {
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunkText = text.slice(startIndex, endIndex);
    
    // Try to break at sentence boundaries
    if (endIndex < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > startIndex + chunkSize * 0.7) {
        chunkText = chunkText.slice(0, breakPoint + 1);
        endIndex = startIndex + breakPoint + 1;
      }
    }
    
    chunks.push({
      text: chunkText.trim(),
      startIndex,
      endIndex,
    });
    
    startIndex = endIndex - overlap;
    if (startIndex >= text.length) break;
  }
  
  return chunks;
}

export default router; 