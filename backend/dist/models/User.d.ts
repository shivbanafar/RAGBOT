import mongoose from 'mongoose';
export interface IUser extends mongoose.Document {
    email: string;
    name: string;
    password: string;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const User: mongoose.Model<any, {}, {}, {}, any, any>;
