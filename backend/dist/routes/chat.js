"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Chat_1 = require("../models/Chat");
const Document_1 = require("../models/Document");
const auth_1 = require("../middleware/auth");
const embedding_1 = require("../services/embedding");
const generative_ai_1 = require("@google/generative-ai");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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
        console.log('Fetching all chats for user:', req.user?._id);
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            res.status(500).json({ error: 'Database connection not ready' });
            return;
        }
        const chats = await Chat_1.Chat.find({ userId: req.user?._id })
            .sort({ updatedAt: -1 })
            .select('-messages');
        console.log(`Found ${chats.length} chats`);
        res.json(chats);
    }
    catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', auth_1.protect, async (req, res) => {
    try {
        console.log('Fetching chat:', req.params.id);
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            res.status(500).json({ error: 'Database connection not ready' });
            return;
        }
        const chat = await Chat_1.Chat.findOne({
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
    }
    catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/', auth_1.protect, async (req, res) => {
    try {
        console.log('Creating new chat for user:', req.user?._id);
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            res.status(500).json({ error: 'Database connection not ready' });
            return;
        }
        const chat = new Chat_1.Chat({
            userId: req.user?._id,
            title: req.body.title || 'New Chat',
            messages: [],
        });
        await chat.save();
        console.log('Successfully created new chat:', chat._id);
        res.status(201).json(chat);
    }
    catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/message', auth_1.protect, async (req, res) => {
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
        const chat = await Chat_1.Chat.findOne({
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
        console.log('📤 Sending response:', {
            messageCount: chat.messages.length,
            lastMessage: chat.messages[chat.messages.length - 1],
            timestamp: new Date().toISOString()
        });
        res.json(chat);
    }
    catch (error) {
        console.error('❌ Error adding message:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/:id/process', auth_1.protect, async (req, res) => {
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
        const chat = await Chat_1.Chat.findOne({
            _id: req.params.id,
            userId: req.user?._id,
        });
        if (!chat) {
            console.error('❌ Chat not found:', req.params.id);
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        chat.messages.push({ content: message, role: 'user' });
        await chat.save();
        console.log('✅ Added user message to chat');
        console.log('🔄 Generating embedding for message');
        let messageEmbedding = [];
        try {
            messageEmbedding = await (0, embedding_1.generateEmbedding)(message);
        }
        catch (error) {
            console.error('❌ Error generating embedding:', error);
        }
        console.log('🔍 Retrieving relevant documents');
        let relevantDocs = [];
        try {
            relevantDocs = await retrieveRelevantDocuments(messageEmbedding, req.user?._id);
            console.log(`✅ Found ${relevantDocs.length} relevant documents`);
        }
        catch (error) {
            console.error('❌ Error retrieving documents:', error);
        }
        const context = relevantDocs
            .map(doc => doc.chunks.map((chunk) => chunk.text).join('\n'))
            .join('\n\n');
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
            chat.messages.push({ content: response, role: 'assistant' });
            await chat.save();
            console.log('✅ Added AI response to chat');
            const updatedChat = await Chat_1.Chat.findById(chat._id);
            res.json({
                response,
                relevantDocs,
                messages: updatedChat?.messages || []
            });
        }
        catch (error) {
            console.error('❌ Error generating AI response:', error);
            const fallbackResponse = "I apologize, but I'm having trouble generating a response at the moment. However, I found some relevant information in your documents that might help answer your question.";
            chat.messages.push({ content: fallbackResponse, role: 'assistant' });
            await chat.save();
            console.log('⚠️ Using fallback response');
            const updatedChat = await Chat_1.Chat.findById(chat._id);
            res.json({
                response: fallbackResponse,
                relevantDocs,
                messages: updatedChat?.messages || [],
                error: 'AI response generation failed, but relevant documents were found'
            });
        }
    }
    catch (error) {
        console.error('❌ Error processing message:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        console.log('Deleting chat:', req.params.id);
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            res.status(500).json({ error: 'Database connection not ready' });
            return;
        }
        const chat = await Chat_1.Chat.findOneAndDelete({
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
    }
    catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: error.message });
    }
});
async function retrieveRelevantDocuments(queryEmbedding, userId, limit = 5) {
    try {
        console.log('Retrieving relevant documents for user:', userId);
        if (!userId) {
            console.error('No user ID provided');
            return [];
        }
        const documents = await Document_1.Document.find({ userId }).lean();
        console.log(`Found ${documents.length} total documents`);
        const scoredDocs = documents.map(doc => {
            const maxSimilarity = Math.max(...doc.chunks.map(chunk => {
                const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                return similarity;
            }));
            return { document: doc, similarity: maxSimilarity };
        });
        const relevantDocs = scoredDocs
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(item => item.document);
        console.log(`Retrieved ${relevantDocs.length} relevant documents`);
        return relevantDocs;
    }
    catch (error) {
        console.error('Error retrieving relevant documents:', error);
        return [];
    }
}
function cosineSimilarity(vecA, vecB) {
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
    }
    catch (error) {
        console.error('Error calculating cosine similarity:', error);
        return 0;
    }
}
exports.default = router;
//# sourceMappingURL=chat.js.map