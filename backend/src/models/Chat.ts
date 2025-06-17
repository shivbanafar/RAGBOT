import mongoose from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    text: string;
    metadata: {
      source: string;
      page?: number;
      chunkId?: string;
    };
  }>;
  timestamp: Date;
}

export interface IChat extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sources: [{
    text: String,
    metadata: {
      source: String,
      page: Number,
      chunkId: String,
    },
  }],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
}, {
  timestamps: true,
});

// Create indexes for better query performance
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ 'messages.timestamp': 1 });

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', chatSchema); 