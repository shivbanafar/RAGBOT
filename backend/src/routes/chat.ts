import express from 'express';
import type { Request, Response } from 'express';
import { Chat } from '../models/Chat';
import { protect } from '../middleware/auth';

const router = express.Router();

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

export default router; 