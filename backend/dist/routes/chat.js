"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Chat_1 = require("../models/Chat");
const Document_1 = require("../models/Document");
const auth_1 = require("../middleware/auth");
const generative_ai_1 = require("@google/generative-ai");
const router = express_1.default.Router();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const chats = await Chat_1.Chat.find({ userId: req.user?._id })
            .sort({ updatedAt: -1 })
            .select('-messages');
        res.json(chats);
    }
    catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.get('/:chatId', auth_1.protect, async (req, res) => {
    try {
        const chat = await Chat_1.Chat.findOne({
            _id: req.params.chatId,
            userId: req.user?._id,
        });
        if (!chat) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        res.json(chat);
    }
    catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { title } = req.body;
        const chat = new Chat_1.Chat({
            userId: req.user?._id,
            title: title || 'New Chat',
            messages: [],
        });
        await chat.save();
        res.status(201).json(chat);
    }
    catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/:chatId/messages', auth_1.protect, async (req, res) => {
    try {
        const { role, content } = req.body;
        const chat = await Chat_1.Chat.findOne({
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
    }
    catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.delete('/:chatId', auth_1.protect, async (req, res) => {
    try {
        const chat = await Chat_1.Chat.findOneAndDelete({
            _id: req.params.chatId,
            userId: req.user?._id,
        });
        if (!chat) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        res.json({ message: 'Chat deleted successfully' });
    }
    catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
router.post('/message', auth_1.protect, async (req, res) => {
    try {
        const { message, chatId } = req.body;
        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }
        let chat;
        if (chatId) {
            chat = await Chat_1.Chat.findOne({
                _id: chatId,
                userId: req.user?._id,
            });
        }
        if (!chat) {
            chat = new Chat_1.Chat({
                userId: req.user?._id,
                title: message.substring(0, 50) + '...',
                messages: [],
            });
        }
        chat.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
        });
        const relevantDocs = await retrieveRelevantDocuments(message, req.user?._id);
        const aiResponse = await generateAIResponse(message, relevantDocs);
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
    }
    catch (error) {
        console.error('Chat message error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
async function retrieveRelevantDocuments(query, userId) {
    try {
        const documents = await Document_1.Document.find({ userId })
            .limit(5)
            .select('chunks title');
        return documents;
    }
    catch (error) {
        console.error('Document retrieval error:', error);
        return [];
    }
}
async function generateAIResponse(userMessage, relevantDocs) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        let context = '';
        const sources = [];
        if (relevantDocs.length > 0) {
            context = 'Based on the following relevant information:\n\n';
            relevantDocs.forEach((doc, index) => {
                const docText = doc.chunks.map((chunk) => chunk.text).join('\n');
                context += `Document ${index + 1} (${doc.title}):\n${docText}\n\n`;
                sources.push({
                    text: docText.substring(0, 200) + '...',
                    metadata: {
                        source: doc.title,
                    },
                });
            });
        }
        const prompt = `${context}Please answer the following question based on the provided information. If the information doesn't contain the answer, say so clearly: ${userMessage}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return {
            content: text,
            sources: sources,
        };
    }
    catch (error) {
        console.error('AI response generation error:', error);
        return {
            content: "I'm sorry, I encountered an error while processing your request. Please try again.",
            sources: [],
        };
    }
}
exports.default = router;
//# sourceMappingURL=chat.js.map