"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.generateEmbeddings = generateEmbeddings;
const axios_1 = __importDefault(require("axios"));
const OLLAMA_API = 'http://localhost:11434/api';
const EMBEDDING_MODEL = 'hf.co/CompendiumLabs/bge-base-en-v1.5-gguf';
function preprocessText(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function generateWordVector(text) {
    const words = preprocessText(text).split(' ');
    const wordFreq = new Map();
    for (const word of words) {
        if (word.length > 2) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
    }
    return wordFreq;
}
function wordVectorToEmbedding(wordVector) {
    const embedding = new Array(128).fill(0);
    const words = Array.from(wordVector.keys());
    for (let i = 0; i < 128; i++) {
        if (i < words.length) {
            const word = words[i];
            const freq = wordVector.get(word) || 0;
            const hash = word.split('').reduce((acc, char) => {
                return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
            }, 0);
            const pos = hash % 128;
            embedding[pos] = freq * 0.1;
        }
    }
    return embedding;
}
async function generateEmbedding(text) {
    try {
        const response = await axios_1.default.post(`${OLLAMA_API}/embeddings`, {
            model: EMBEDDING_MODEL,
            prompt: text
        });
        if (!response.data || !response.data.embedding) {
            throw new Error('Invalid response from Ollama');
        }
        return response.data.embedding;
    }
    catch (error) {
        console.log('Ollama not available, using fallback embedding method');
        const wordVector = generateWordVector(text);
        return wordVectorToEmbedding(wordVector);
    }
}
async function generateEmbeddings(texts) {
    try {
        const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
        return embeddings;
    }
    catch (error) {
        console.error('Batch embedding generation error:', error);
        throw error;
    }
}
//# sourceMappingURL=embedding.js.map