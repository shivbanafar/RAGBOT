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
  folder: string;
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
    index: true, // Enable vector search
    validate: {
      validator: function(v: number[]) {
        console.log(`Validating embedding dimensions: ${v.length}`);
        return v.length === 128;
      },
      message: 'Embedding must be 128-dimensional'
    }
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
    index: true, // Add index for faster queries
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
  folder: {
    type: String,
    default: 'root',
  },
  chunks: {
    type: [chunkSchema],
    default: [], // Make chunks optional with empty array as default
  },
}, {
  timestamps: true,
});

// Create compound index for better query performance
documentSchema.index({ userId: 1, createdAt: -1 });

// Add pre-save middleware for validation
documentSchema.pre('save', function(next) {
  console.log(`Saving document: ${this.title} with ${this.chunks.length} chunks`);
  // Only validate chunks for new documents or when chunks are being modified
  if (this.isNew || this.isModified('chunks')) {
    if (this.chunks.length === 0) {
      console.error('Document has no chunks');
      next(new Error('Document must have at least one chunk'));
      return;
    }
  }
  next();
});

// Add error handling for save operations
documentSchema.post('save', function(error: any, doc: any, next: any) {
  if (error) {
    console.error('Error saving document:', error);
    next(error);
  } else {
    console.log(`Successfully saved document: ${doc.title}`);
    next();
  }
});

// Add index for faster folder queries
documentSchema.index({ userId: 1, folder: 1 });

export const Document = mongoose.model<IDocument>('Document', documentSchema); 