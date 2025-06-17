"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const Document_1 = require("../models/Document");
const auth_1 = require("../middleware/auth");
const embedding_1 = require("../services/embedding");
const mongoose_1 = __importDefault(require("mongoose"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}`);
        const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            console.error(`Invalid file type: ${file.mimetype}`);
            cb(new Error('Invalid file type. Only PDF, TXT, MD, and JSON files are allowed.'));
        }
    },
});
const checkMongoConnection = async () => {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            console.error('MongoDB not connected. Current state:', mongoose_1.default.connection.readyState);
            throw new Error('Database connection not ready');
        }
        console.log('MongoDB connection is ready');
        return true;
    }
    catch (error) {
        console.error('MongoDB connection check failed:', error);
        return false;
    }
};
router.get('/', auth_1.protect, async (req, res) => {
    try {
        console.log('Fetching documents for user:', req.user?._id);
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
        const folder = req.query.folder || 'root';
        console.log('Fetching documents from folder:', folder);
        const query = {
            userId: req.user._id,
            folder: folder,
            title: { $ne: '.folder' }
        };
        console.log('MongoDB query:', JSON.stringify(query, null, 2));
        const totalDocs = await Document_1.Document.countDocuments({ userId: req.user._id });
        console.log(`Total documents for user: ${totalDocs}`);
        const documents = await Document_1.Document.find(query)
            .sort({ createdAt: -1 })
            .select('_id title type createdAt folder')
            .lean();
        const folders = await Document_1.Document.distinct('folder', {
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
        if (documents.length > 0) {
            const sampleDoc = await Document_1.Document.findOne({ userId: req.user._id }).lean();
            console.log('Sample document structure:', JSON.stringify(sampleDoc, null, 2));
        }
        res.json({
            documents,
            folders,
            currentFolder: folder
        });
    }
    catch (error) {
        console.error('Get documents error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/upload', auth_1.protect, upload.single('file'), async (req, res) => {
    try {
        console.log('Starting document upload process');
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
        if (file.size > 100 * 1024 * 1024) {
            console.error(`File too large: ${file.size} bytes`);
            res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
            return;
        }
        let fileType;
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
        let text;
        try {
            text = await extractTextFromFile(file.buffer, fileType);
            console.log(`Successfully extracted ${text.length} characters of text`);
        }
        catch (error) {
            console.error('Error extracting text:', error);
            res.status(500).json({ error: 'Failed to extract text from file' });
            return;
        }
        const chunks = splitTextIntoChunks(text);
        console.log(`Split text into ${chunks.length} chunks`);
        if (chunks.length === 0) {
            console.error('No content could be extracted from the file');
            res.status(400).json({ error: 'No content could be extracted from the file.' });
            return;
        }
        console.log('Generating embeddings for chunks');
        const chunksWithEmbeddings = [];
        for (const chunk of chunks) {
            try {
                console.log(`Processing chunk of length ${chunk.text.length}`);
                let embedding;
                if (chunk.text.length > 500) {
                    console.log('Generating embedding for long chunk');
                    embedding = await (0, embedding_1.generateEmbedding)(chunk.text);
                    if (embedding.length !== 128) {
                        console.log(`Fixing embedding dimension from ${embedding.length} to 128`);
                        if (embedding.length > 128) {
                            embedding = embedding.slice(0, 128);
                        }
                        else {
                            const padding = new Array(128 - embedding.length).fill(0);
                            embedding = [...embedding, ...padding];
                        }
                    }
                }
                else {
                    console.log('Using hash-based embedding for short chunk');
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
                console.log('Successfully processed chunk with embedding dimension:', embedding.length);
            }
            catch (error) {
                console.error('Error processing chunk:', error);
            }
        }
        if (chunksWithEmbeddings.length === 0) {
            console.error('Failed to process any chunks');
            res.status(500).json({ error: 'Failed to process document chunks.' });
            return;
        }
        console.log('Creating document in database');
        const document = new Document_1.Document({
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
    }
    catch (error) {
        console.error('Document upload error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        console.log('Deleting document:', req.params.id);
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
        const document = await Document_1.Document.findOneAndDelete({
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
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.delete('/clear', auth_1.protect, async (req, res) => {
    try {
        const result = await Document_1.Document.deleteMany({ userId: req.user?._id });
        res.json({
            message: `Cleared ${result.deletedCount} documents`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        console.error('Clear documents error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/folders', auth_1.protect, async (req, res) => {
    try {
        const { folderName } = req.body;
        if (!folderName) {
            res.status(400).json({ error: 'Folder name is required' });
            return;
        }
        const existingFolder = await Document_1.Document.findOne({
            userId: req.user?._id,
            folder: folderName
        });
        if (existingFolder) {
            res.status(400).json({ error: 'Folder already exists' });
            return;
        }
        const document = new Document_1.Document({
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
    }
    catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.patch('/:id/move', auth_1.protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { folder } = req.body;
        if (!folder) {
            res.status(400).json({ error: 'Target folder is required' });
            return;
        }
        const document = await Document_1.Document.findOneAndUpdate({ _id: id, userId: req.user?._id }, { folder }, { new: true });
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
    }
    catch (error) {
        console.error('Move document error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
async function extractTextFromFile(buffer, fileType) {
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
                    const pdfData = await (0, pdf_parse_1.default)(buffer, {
                        max: 0,
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
                }
                catch (pdfError) {
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
    }
    catch (error) {
        console.error('Error in extractTextFromFile:', error);
        if (error instanceof Error) {
            throw new Error(`Text extraction failed: ${error.message}`);
        }
        throw new Error('Failed to extract text from file');
    }
}
function splitTextIntoChunks(text, targetChunks = 10, overlap = 400) {
    console.log(`Splitting text into approximately ${targetChunks} chunks`);
    if (targetChunks <= 0) {
        console.error('Invalid target chunks:', targetChunks);
        throw new Error('Target chunks must be greater than 0');
    }
    const textLength = text.length;
    console.log(`Total text length: ${textLength} characters`);
    if (textLength < 1000) {
        console.log('Text is small, returning as single chunk');
        return [{
                text: text.trim(),
                startIndex: 0,
                endIndex: textLength
            }];
    }
    const baseChunkSize = Math.ceil(textLength / targetChunks);
    console.log(`Base chunk size: ${baseChunkSize} characters`);
    const minChunkSize = 500;
    const effectiveChunkSize = Math.max(baseChunkSize, minChunkSize);
    console.log(`Effective chunk size: ${effectiveChunkSize} characters`);
    const safeOverlap = Math.min(overlap, Math.floor(effectiveChunkSize * 0.2));
    console.log(`Using overlap of ${safeOverlap} characters`);
    const chunks = [];
    let start = 0;
    let iterationCount = 0;
    const maxIterations = targetChunks * 2;
    while (start < textLength && iterationCount < maxIterations) {
        iterationCount++;
        let end = Math.min(start + effectiveChunkSize, textLength);
        if (end < textLength) {
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
exports.default = router;
//# sourceMappingURL=documents.js.map