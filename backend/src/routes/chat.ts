import express from 'express';
import type { Request, Response } from 'express';
import { Chat } from '../models/Chat';
import { Document } from '../models/Document';
import { protect } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '../services/embedding';

const router = express.Router();

// Initialize Gemini AI for chat responses
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get all chats for a user
router.get('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const chats = await Chat.find({ userId: req.user?._id })
      .sort({ updatedAt: -1 })
      .select('-messages');
    res.json(chats);
  } catch (error: any) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get a specific chat with messages
router.get('/:chatId', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      userId: req.user?._id,
    });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    res.json(chat);
  } catch (error: any) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Create a new chat
router.post('/', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const chat = new Chat({
      userId: req.user?._id,
      title: title || 'New Chat',
      messages: [],
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error: any) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Add a message to a chat
router.post('/:chatId/messages', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, content } = req.body;
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      userId: req.user?._id,
    });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    chat.messages.push({ role, content });
    await chat.save();

    res.json(chat);
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete a chat
router.delete('/:chatId', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.chatId,
      userId: req.user?._id,
    });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    res.json({ message: 'Chat deleted successfully' });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Process chat message with RAG (authenticated)
router.post('/message', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, chatId } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await Chat.findOne({
        _id: chatId,
        userId: req.user?._id,
      });
    }
    
    if (!chat) {
      chat = new Chat({
        userId: req.user?._id,
        title: message.substring(0, 50) + '...',
        messages: [],
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Retrieve relevant documents using vector search
    const relevantDocs = await retrieveRelevantDocuments(message, req.user?._id);
    
    // Generate AI response
    const aiResponse = await generateAIResponse(message, relevantDocs);
    
    // Add assistant message
    chat.messages.push({
      role: 'assistant',
      content: aiResponse.content,
      sources: aiResponse.sources,
      timestamp: new Date(),
    });

    await chat.save();

    res.json({
      chatId: chat._id,
      message: aiResponse.content,
      sources: aiResponse.sources,
    });
  } catch (error: any) {
    console.error('Chat message error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Helper function to retrieve relevant documents
async function retrieveRelevantDocuments(query: string, userId: string) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get documents with limit to prevent memory issues
    const documents = await Document.find({ userId })
      .select('chunks title')
      .limit(10) // Limit to 10 documents max
      .lean(); // Use lean() for better memory efficiency
    
    if (documents.length === 0) {
      return [];
    }
    
    // Calculate similarity scores for chunks with memory limits
    const allChunks = [];
    let totalChunks = 0;
    const maxChunks = 100; // Limit total chunks to prevent memory issues
    
    for (const doc of documents) {
      if (totalChunks >= maxChunks) break;
      
      for (const chunk of doc.chunks) {
        if (totalChunks >= maxChunks) break;
        
        // Skip chunks with wrong embedding dimensions
        if (chunk.embedding && chunk.embedding.length !== 128) {
          console.warn(`Skipping chunk with ${chunk.embedding.length} dimensions (expected 128)`);
          continue;
        }
        
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        allChunks.push({
          ...chunk,
          documentTitle: doc.title,
          similarity,
        });
        totalChunks++;
      }
    }
    
    // Sort by similarity and take top 3 most relevant chunks
    allChunks.sort((a, b) => b.similarity - a.similarity);
    const topChunks = allChunks.slice(0, 3);
    
    // Group chunks by document
    const relevantDocs = [];
    const docMap = new Map();
    
    for (const chunk of topChunks) {
      if (!docMap.has(chunk.documentTitle)) {
        docMap.set(chunk.documentTitle, {
          title: chunk.documentTitle,
          chunks: [],
        });
      }
      docMap.get(chunk.documentTitle).chunks.push(chunk);
    }
    
    return Array.from(docMap.values());
  } catch (error) {
    console.error('Document retrieval error:', error);
    return [];
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  try {
    // Handle different embedding dimensions
    const minLength = Math.min(vecA.length, vecB.length);
    if (minLength === 0) return 0;
    
    // Use only the minimum length to prevent errors
    const a = vecA.slice(0, minLength);
    const b = vecB.slice(0, minLength);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < minLength; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  } catch (error) {
    console.error('Cosine similarity error:', error);
    return 0; // Return 0 similarity on error
  }
}

// Helper function to generate AI response
async function generateAIResponse(userMessage: string, relevantDocs: any[]) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Build context from relevant documents
    let context = '';
    const sources: any[] = [];
    
    if (relevantDocs.length > 0) {
      context = 'Based on the following relevant information from your documents:\n\n';
      relevantDocs.forEach((doc, index) => {
        const docText = doc.chunks.map((chunk: any) => chunk.text).join('\n');
        context += `Document: ${doc.title}\n${docText}\n\n`;
        sources.push({
          text: docText.substring(0, 200) + '...',
          metadata: {
            source: doc.title,
          },
        });
      });
      
      const prompt = `${context}Please answer the following question based on the provided information. If the information doesn't contain the answer, say so clearly: ${userMessage}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        sources: sources,
      };
    } else {
      // No documents available - provide general AI response
      const prompt = `You are a helpful AI assistant. Please provide a helpful and informative response to: ${userMessage}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        sources: [],
      };
    }
  } catch (error) {
    console.error('AI response generation error:', error);
    return {
      content: "I'm sorry, I encountered an error while processing your request. Please try again.",
      sources: [],
    };
  }
}

export default router; 