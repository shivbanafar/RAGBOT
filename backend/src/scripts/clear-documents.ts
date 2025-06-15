import mongoose from 'mongoose';
import { Document } from '../models/Document';
import dotenv from 'dotenv';

dotenv.config();

async function clearOldDocuments() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    console.log('Connected to MongoDB');

    // Find documents with chunks that have wrong embedding dimensions
    const documents = await Document.find({});
    let clearedCount = 0;

    for (const doc of documents) {
      let hasWrongEmbeddings = false;
      
      for (const chunk of doc.chunks) {
        if (chunk.embedding && chunk.embedding.length !== 128) {
          hasWrongEmbeddings = true;
          break;
        }
      }
      
      if (hasWrongEmbeddings) {
        console.log(`Clearing document: ${doc.title} (has ${chunk.embedding?.length || 0}-dimensional embeddings)`);
        await Document.findByIdAndDelete(doc._id);
        clearedCount++;
      }
    }

    console.log(`Cleared ${clearedCount} documents with incompatible embeddings`);
    
    // Also clear all documents if there are any issues
    if (clearedCount === 0) {
      console.log('No incompatible documents found. Clearing all documents for fresh start...');
      const result = await Document.deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error clearing documents:', error);
    process.exit(1);
  }
}

clearOldDocuments(); 