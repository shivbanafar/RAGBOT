"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const chunkSchema = new mongoose_1.default.Schema({
    text: {
        type: String,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
        index: true,
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
const documentSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
documentSchema.index({ userId: 1, createdAt: -1 });
exports.Document = mongoose_1.default.models.Document || mongoose_1.default.model('Document', documentSchema);
//# sourceMappingURL=Document.js.map