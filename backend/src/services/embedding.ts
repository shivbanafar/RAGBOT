// Lightweight embedding service for RAG
// Uses TF-IDF inspired approach for document similarity
// Optimized: 128 dimensions for better performance and memory usage

import axios from 'axios';

const OLLAMA_API = 'http://localhost:11434/api';
const EMBEDDING_MODEL = 'hf.co/CompendiumLabs/bge-base-en-v1.5-gguf';

// Simple text preprocessing
function preprocessText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate word frequency vector
function generateWordVector(text: string): Map<string, number> {
  const words = preprocessText(text).split(' ');
  const wordFreq = new Map<string, number>();
  
  for (const word of words) {
    if (word.length > 2) { // Skip very short words
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  return wordFreq;
}

// Convert word vector to fixed-size embedding (128 dimensions)
function wordVectorToEmbedding(wordVector: Map<string, number>): number[] {
  const embedding = new Array(128).fill(0); // Reduced from 512 to 128
  const words = Array.from(wordVector.keys());
  
  for (let i = 0; i < 128; i++) {
    if (i < words.length) {
      const word = words[i];
      const freq = wordVector.get(word) || 0;
      // Use hash-based positioning for consistency
      const hash = word.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
      }, 0);
      const pos = hash % 128; // Reduced from 512 to 128
      embedding[pos] = freq * 0.1; // Normalize frequency
    }
  }
  
  return embedding;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(`${OLLAMA_API}/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: text
    });

    if (!response.data || !response.data.embedding) {
      throw new Error('Invalid response from Ollama');
    }

    return response.data.embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    console.error('Batch embedding generation error:', error);
    throw error;
  }
} 