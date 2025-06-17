"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
dotenv_1.default.config();
async function listModels() {
    try {
        const response = await (0, node_fetch_1.default)('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
        const data = await response.json();
        console.log('Available models:');
        console.log(JSON.stringify(data, null, 2));
    }
    catch (error) {
        console.error('Error listing models:', error);
    }
}
listModels();
//# sourceMappingURL=list-models.js.map