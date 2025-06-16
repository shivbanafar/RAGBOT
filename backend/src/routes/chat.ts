import express from 'express';
import type { Request, Response } from 'express';
import { Chat } from '../models/Chat';
import { Document } from '../models/Document';
import { protect } from '../middleware/auth';
import { generateEmbedding } from '../services/embedding';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';

const router = express.Router();

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

// Get all chats for a user
router.get('/', protect, async (req: Request, res: Response) => {
  try {
    console.log('Fetching all chats for user:', req.user?._id);
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const chats = await Chat.find({ userId: req.user?._id })
      .sort({ updatedAt: -1 })
      .select('-messages');
    console.log(`Found ${chats.length} chats`);
    res.json(chats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific chat
router.get('/:id', protect, async (req: Request, res: Response) => {
  try {
    console.log('Fetching chat:', req.params.id);
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!chat) {
      console.error('Chat not found:', req.params.id);
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    console.log('Successfully retrieved chat');
    res.json(chat);
  } catch (error: any) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new chat
router.post('/', protect, async (req: Request, res: Response) => {
  try {
    console.log('Creating new chat for user:', req.user?._id);
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const chat = new Chat({
      userId: req.user?._id,
      title: req.body.title || 'New Chat',
      messages: [],
    });

    await chat.save();
    console.log('Successfully created new chat:', chat._id);
    res.status(201).json(chat);
  } catch (error: any) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a message to a chat
router.post('/message', protect, async (req: Request, res: Response) => {
  try {
    console.log('\n=== Backend Chat Route ===');
    console.log('📥 Message received from frontend:', {
      content: req.body.content,
      role: req.body.role,
      chatId: req.body.chatId,
      userId: req.user?._id,
      timestamp: new Date().toISOString()
    });

    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('❌ MongoDB connection not ready');
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const { content, role, chatId } = req.body;
    console.log('🔍 Message details:', { content, role, chatId });

    if (!content || !role || !chatId) {
      console.error('❌ Missing required fields:', { content: !!content, role: !!role, chatId: !!chatId });
      res.status(400).json({ error: 'Content, role, and chatId are required' });
      return;
    }

    const chat = await Chat.findOne({
      _id: chatId,
      userId: req.user?._id,
    });

    if (!chat) {
      console.error('❌ Chat not found:', chatId);
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    console.log('✅ Found chat:', chat._id);
    chat.messages.push({ content, role });
    await chat.save();
    console.log('✅ Successfully added message to chat');
    
    // Log the updated chat state
    console.log('📤 Sending response:', {
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1],
      timestamp: new Date().toISOString()
    });
    
    res.json(chat);
  } catch (error: any) {
    console.error('❌ Error adding message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process a chat message and get AI response
router.post('/:id/process', protect, async (req: Request, res: Response) => {
  try {
    console.log('\n=== Backend AI Processing ===');
    console.log('📥 Processing message for chat:', req.params.id);
    console.log('Message content:', req.body.message);
    
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('❌ MongoDB connection not ready');
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const { message } = req.body;
    if (!message) {
      console.error('❌ No message provided');
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!chat) {
      console.error('❌ Chat not found:', req.params.id);
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    // Add user message to chat
    chat.messages.push({ content: message, role: 'user' });
    await chat.save();
    console.log('✅ Added user message to chat');

    // Generate embedding for the message
    console.log('🔄 Generating embedding for message');
    const messageEmbedding = await generateEmbedding(message);

    // Retrieve relevant documents
    console.log('🔍 Retrieving relevant documents');
    const relevantDocs = await retrieveRelevantDocuments(messageEmbedding, req.user?._id);
    console.log(`✅ Found ${relevantDocs.length} relevant documents`);

    // Prepare context from relevant documents
    const context = relevantDocs
      .map(doc => doc.chunks.map(chunk => chunk.text).join('\n'))
      .join('\n\n');

    // Generate AI response
    console.log('🤖 Generating AI response');
    try {
      const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
      const prompt = `You are a helpful AI assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response based on your knowledge.

Context:
${context}

User: ${message}

Assistant:`;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      console.log('✅ Successfully generated AI response');
      console.log('🤖 AI Response:', response);

      // Add AI response to chat
      chat.messages.push({ content: response, role: 'assistant' });
      await chat.save();
      console.log('✅ Added AI response to chat');

      res.json({ response, relevantDocs });
    } catch (error: any) {
      console.error('❌ Error generating AI response:', error);
      // Add a fallback response
      const fallbackResponse = "I apologize, but I'm having trouble generating a response at the moment. However, I found some relevant information in your documents that might help answer your question.";
      chat.messages.push({ content: fallbackResponse, role: 'assistant' });
      await chat.save();
      console.log('⚠️ Using fallback response');
      res.json({ 
        response: fallbackResponse, 
        relevantDocs,
        error: 'AI response generation failed, but relevant documents were found'
      });
    }
  } catch (error: any) {
    console.error('❌ Error processing message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a chat
router.delete('/:id', protect, async (req: Request, res: Response) => {
  try {
    console.log('Deleting chat:', req.params.id);
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      res.status(500).json({ error: 'Database connection not ready' });
      return;
    }

    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!chat) {
      console.error('Chat not found:', req.params.id);
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    console.log('Successfully deleted chat');
    res.json({ message: 'Chat deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to retrieve relevant documents
async function retrieveRelevantDocuments(queryEmbedding: number[], userId: string | undefined, limit: number = 5) {
  try {
    console.log('Retrieving relevant documents for user:', userId);
    if (!userId) {
      console.error('No user ID provided');
      return [];
    }

    // Get all documents for the user
    const documents = await Document.find({ userId });
    console.log(`Found ${documents.length} total documents`);

    // Calculate similarity scores for each document
    const scoredDocs = documents.map(doc => {
      const maxSimilarity = Math.max(
        ...doc.chunks.map(chunk => {
          const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
          return similarity;
        })
      );
      return { document: doc, similarity: maxSimilarity };
    });

    // Sort by similarity and get top results
    const relevantDocs = scoredDocs
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.document);

    console.log(`Retrieved ${relevantDocs.length} relevant documents`);
    return relevantDocs;
  } catch (error) {
    console.error('Error retrieving relevant documents:', error);
    return [];
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  try {
    if (vecA.length !== vecB.length) {
      console.error('Vector length mismatch:', vecA.length, vecB.length);
      return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      console.error('Zero magnitude vector detected');
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  } catch (error) {
    console.error('Error calculating cosine similarity:', error);
    return 0;
  }
}

export default router; 