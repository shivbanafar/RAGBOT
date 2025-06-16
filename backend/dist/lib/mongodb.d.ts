import mongoose from 'mongoose';
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}
declare global {
    var mongoose: MongooseCache | undefined;
}
declare function connectDB(): Promise<typeof mongoose>;
export default connectDB;
