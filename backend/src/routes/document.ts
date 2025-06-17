import express from 'express';
import type { Request, Response } from 'express';
import { Document } from '../models/Document';
import { protect } from '../middleware/auth';

const router = express.Router();

// Get all documents for a user
router.get('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const documents = await Document.find({ userId: req.user?._id })
      .sort({ updatedAt: -1 })
      .select('-chunks');
    res.json(documents);
  } catch (error: any) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get a specific document
router.get('/:documentId', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user?._id,
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (error: any) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Create a new document with chunks
router.post('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, chunks } = req.body;

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      res.status(400).json({ error: 'Document must have at least one chunk' });
      return;
    }

    const document = new Document({
      userId: req.user?._id,
      title,
      type,
      chunks: chunks.map((chunk: any) => ({
        text: chunk.text,
        embedding: chunk.embedding,
        metadata: chunk.metadata || {},
      })),
    });

    await document.save();
    res.status(201).json(document);
  } catch (error: any) {
    console.error('Create document error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Search documents using vector similarity
router.post('/search', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query || !query.embedding) {
      res.status(400).json({ error: 'Query must include an embedding' });
      return;
    }

    // Perform vector search using MongoDB Atlas
    const results = await Document.aggregate([
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
              body: function(chunkEmbedding: number[], queryEmbedding: number[]) {
                // Cosine similarity calculation
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
  } catch (error: any) {
    console.error('Search documents error:', error);
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

export default router; 