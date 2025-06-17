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
export declare const Document: mongoose.Model<IDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDocument, {}> & IDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
