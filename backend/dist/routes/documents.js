"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const Document_1 = require("../models/Document");
const auth_1 = require("../middleware/auth");
const generative_ai_1 = require("@google/generative-ai");
const router = express_1.default.Router();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, TXT, MD, and JSON files are allowed.'));
        }
    },
});
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const documents = await Document_1.Document.find({ userId: req.user?._id })
            .sort({ createdAt: -1 })
            .select('title type createdAt');
        res.json(documents);
    }
    catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/upload', auth_1.protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const { title } = req.body;
        const file = req.file;
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
                res.status(400).json({ error: 'Unsupported file type' });
                return;
        }
        const text = await extractTextFromFile(file.buffer, fileType);
        const chunks = splitTextIntoChunks(text);
        const chunksWithEmbeddings = await Promise.all(chunks.map(async (chunk) => {
            const embedding = await generateEmbedding(chunk.text);
            return {
                text: chunk.text,
                embedding,
                metadata: {
                    source: title || file.originalname,
                    startIndex: chunk.startIndex,
                    endIndex: chunk.endIndex,
                },
            };
        }));
        const document = new Document_1.Document({
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
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.delete('/:documentId', auth_1.protect, async (req, res) => {
    try {
        const document = await Document_1.Document.findOneAndDelete({
            _id: req.params.documentId,
            userId: req.user?._id,
        });
        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
async function extractTextFromFile(buffer, fileType) {
    switch (fileType) {
        case 'txt':
        case 'md':
        case 'json':
            return buffer.toString('utf-8');
        case 'pdf':
            return 'PDF content extraction not implemented yet. Please use text files for now.';
        default:
            throw new Error('Unsupported file type');
    }
}
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let startIndex = 0;
    while (startIndex < text.length) {
        let endIndex = Math.min(startIndex + chunkSize, text.length);
        let chunkText = text.slice(startIndex, endIndex);
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
        if (startIndex >= text.length)
            break;
    }
    return chunks;
}
async function generateEmbedding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
    }
    catch (error) {
        console.error('Embedding generation error:', error);
        return new Array(768).fill(0);
    }
}
exports.default = router;
//# sourceMappingURL=documents.js.map