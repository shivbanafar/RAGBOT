"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Document_1 = require("../models/Document");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function clearOldDocuments() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) {
            console.error('MONGODB_URI not found in environment variables');
            process.exit(1);
        }
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(MONGODB_URI, {
            maxPoolSize: 5,
            minPoolSize: 1,
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        });
        console.log('Connected to MongoDB');
        const documents = await Document_1.Document.find({});
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
                console.log(`Clearing document: ${doc.title} (has ${doc.chunks[0]?.embedding?.length || 0}-dimensional embeddings)`);
                await Document_1.Document.findByIdAndDelete(doc._id);
                clearedCount++;
            }
        }
        console.log(`Cleared ${clearedCount} documents with incompatible embeddings`);
        if (clearedCount === 0) {
            console.log('No incompatible documents found. Clearing all documents for fresh start...');
            const result = await Document_1.Document.deleteMany({});
            console.log(`Cleared ${result.deletedCount} documents`);
        }
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
    catch (error) {
        console.error('Error clearing documents:', error);
        process.exit(1);
    }
}
clearOldDocuments();
//# sourceMappingURL=clear-documents.js.map