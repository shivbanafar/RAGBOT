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
export declare const Chat: mongoose.Model<any, {}, {}, {}, any, any>;
