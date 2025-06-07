import mongoose from 'mongoose';

export interface IChunk {
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    page?: number;
    startIndex?: number;
    endIndex?: number;
  };
}

export interface IDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  type: 'pdf' | 'txt' | 'md' | 'json';
  chunks: IChunk[];
  createdAt: Date;
  updatedAt: Date;
}

const chunkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
    index: true, // This enables vector search in MongoDB Atlas
  },
  metadata: {
    source: {
      type: String,
      required: true,
    },
    page: Number,
    startIndex: Number,
    endIndex: Number,
  },
});

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['pdf', 'txt', 'md', 'json'],
    required: true,
  },
  chunks: [chunkSchema],
}, {
  timestamps: true,
});

// Create indexes for better query performance
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ 'chunks.embedding': 'vector' }); // This enables vector search in MongoDB Atlas

export const Document = mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema); 