"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    sources: [{
            text: String,
            metadata: {
                source: String,
                page: Number,
                chunkId: String,
            },
        }],
    timestamp: {
        type: Date,
        default: Date.now,
    },
});
const chatSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    messages: [messageSchema],
}, {
    timestamps: true,
});
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ 'messages.timestamp': 1 });
exports.Chat = mongoose_1.default.models.Chat || mongoose_1.default.model('Chat', chatSchema);
//# sourceMappingURL=Chat.js.map