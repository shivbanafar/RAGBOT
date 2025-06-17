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
        validate: {
            validator: function (v) {
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
const documentSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
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
        default: [],
    },
}, {
    timestamps: true,
});
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.pre('save', function (next) {
    console.log(`Saving document: ${this.title} with ${this.chunks.length} chunks`);
    if (this.isNew || this.isModified('chunks')) {
        if (this.chunks.length === 0) {
            console.error('Document has no chunks');
            next(new Error('Document must have at least one chunk'));
            return;
        }
    }
    next();
});
documentSchema.post('save', function (error, doc, next) {
    if (error) {
        console.error('Error saving document:', error);
        next(error);
    }
    else {
        console.log(`Successfully saved document: ${doc.title}`);
        next();
    }
});
documentSchema.index({ userId: 1, folder: 1 });
exports.Document = mongoose_1.default.model('Document', documentSchema);
//# sourceMappingURL=Document.js.map