import { Request, Response, NextFunction } from 'express';
declare global {
    var inMemoryUsers: Map<string, any>;
}
export declare const protect: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const restrictTo: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
