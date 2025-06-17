"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Document_1 = require("../models/Document");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const documents = await Document_1.Document.find({ userId: req.user?._id })
            .sort({ updatedAt: -1 })
            .select('-chunks');
        res.json(documents);
    }
    catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.get('/:documentId', auth_1.protect, async (req, res) => {
    try {
        const document = await Document_1.Document.findOne({
            _id: req.params.documentId,
            userId: req.user?._id,
        });
        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.json(document);
    }
    catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { title, type, chunks } = req.body;
        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
            res.status(400).json({ error: 'Document must have at least one chunk' });
            return;
        }
        const document = new Document_1.Document({
            userId: req.user?._id,
            title,
            type,
            chunks: chunks.map((chunk) => ({
                text: chunk.text,
                embedding: chunk.embedding,
                metadata: chunk.metadata || {},
            })),
        });
        await document.save();
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Create document error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/search', auth_1.protect, async (req, res) => {
    try {
        const { query, limit = 5 } = req.body;
        if (!query || !query.embedding) {
            res.status(400).json({ error: 'Query must include an embedding' });
            return;
        }
        const results = await Document_1.Document.aggregate([
            {
                $match: {
                    userId: req.user?._id,
                },
            },
            {
                $unwind: '$chunks',
            },
            {
                $project: {
                    documentId: '$_id',
                    title: 1,
                    type: 1,
                    chunk: '$chunks',
                    score: {
                        $function: {
                            body: function (chunkEmbedding, queryEmbedding) {
                                let dotProduct = 0;
                                let normA = 0;
                                let normB = 0;
                                for (let i = 0; i < chunkEmbedding.length; i++) {
                                    dotProduct += chunkEmbedding[i] * queryEmbedding[i];
                                    normA += chunkEmbedding[i] * chunkEmbedding[i];
                                    normB += queryEmbedding[i] * queryEmbedding[i];
                                }
                                return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                            },
                            args: ['$chunks.embedding', query.embedding],
                            lang: 'js',
                        },
                    },
                },
            },
            {
                $sort: { score: -1 },
            },
            {
                $limit: limit,
            },
        ]);
        res.json(results);
    }
    catch (error) {
        console.error('Search documents error:', error);
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
exports.default = router;
//# sourceMappingURL=document.js.map