#!/usr/bin/env python3
"""
RAG Chatbot using Ollama
Based on: https://huggingface.co/blog/ngxson/make-your-own-rag
"""

import ollama
import json
import os
from typing import List, Tuple
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

# Configuration
EMBEDDING_MODEL = 'hf.co/CompendiumLabs/bge-base-en-v1.5-gguf'
LANGUAGE_MODEL = 'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF'

# In-memory vector database
VECTOR_DB = []  # List of tuples: (chunk, embedding, metadata)

app = Flask(__name__)
CORS(app)

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return dot_product / (norm_a * norm_b)

def add_chunk_to_database(chunk: str, metadata: dict = None):
    """Add a chunk to the vector database."""
    try:
        embedding = ollama.embeddings(model=EMBEDDING_MODEL, prompt=chunk)
        VECTOR_DB.append((chunk, embedding, metadata or {}))
        print(f"Added chunk to database: {chunk[:50]}...")
    except Exception as e:
        print(f"Error adding chunk to database: {e}")

def retrieve(query: str, top_n: int = 3) -> List[Tuple[str, float, dict]]:
    """Retrieve top N most relevant chunks for a query."""
    try:
        query_embedding = ollama.embeddings(model=EMBEDDING_MODEL, prompt=query)
        similarities = []
        
        for chunk, embedding, metadata in VECTOR_DB:
            similarity = cosine_similarity(query_embedding, embedding)
            similarities.append((chunk, similarity, metadata))
        
        # Sort by similarity in descending order
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_n]
    except Exception as e:
        print(f"Error in retrieval: {e}")
        return []

def generate_response(query: str, retrieved_chunks: List[Tuple[str, float, dict]]) -> str:
    """Generate response using the language model."""
    try:
        if not retrieved_chunks:
            return "I don't have enough information to answer that question."
        
        # Build context from retrieved chunks
        context = "\n".join([f"- {chunk}" for chunk, similarity, metadata in retrieved_chunks])
        
        instruction_prompt = f"""You are a helpful chatbot. Use only the following pieces of context to answer the question. Don't make up any new information:

{context}

Question: {query}

Answer:"""
        
        response = ollama.chat(
            model=LANGUAGE_MODEL,
            messages=[
                {'role': 'system', 'content': instruction_prompt},
                {'role': 'user', 'content': query},
            ],
            stream=False
        )
        
        return response['message']['content']
    except Exception as e:
        print(f"Error generating response: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

# Flask API endpoints
@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint."""
    try:
        data = request.json
        query = data.get('message', '')
        
        if not query:
            return jsonify({'error': 'Message is required'}), 400
        
        # Retrieve relevant chunks
        retrieved_chunks = retrieve(query, top_n=3)
        
        # Generate response
        response = generate_response(query, retrieved_chunks)
        
        # Format sources
        sources = []
        for chunk, similarity, metadata in retrieved_chunks:
            sources.append({
                'text': chunk[:200] + '...' if len(chunk) > 200 else chunk,
                'similarity': round(similarity, 3),
                'source': metadata.get('source', 'Unknown'),
                'startIndex': metadata.get('startIndex', 0),
                'endIndex': metadata.get('endIndex', 0)
            })
        
        return jsonify({
            'response': response,
            'sources': sources,
            'chunks_retrieved': len(retrieved_chunks)
        })
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/upload', methods=['POST'])
def upload_document():
    """Upload and process a document."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        title = request.form.get('title', file.filename)
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        
        # Split into chunks (simple approach)
        chunks = split_text_into_chunks(content)
        
        # Add chunks to database
        for i, chunk in enumerate(chunks):
            metadata = {
                'source': title,
                'chunk_index': i,
                'startIndex': i * 2000,  # Approximate
                'endIndex': (i + 1) * 2000
            }
            add_chunk_to_database(chunk, metadata)
        
        return jsonify({
            'message': 'Document uploaded and processed successfully',
            'chunks_added': len(chunks),
            'title': title
        })
        
    except Exception as e:
        print(f"Error in upload endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get list of documents."""
    try:
        # Get unique sources from vector database
        sources = set()
        for chunk, embedding, metadata in VECTOR_DB:
            if 'source' in metadata:
                sources.add(metadata['source'])
        
        documents = [{'title': source, 'chunks_count': sum(1 for c, e, m in VECTOR_DB if m.get('source') == source)} 
                    for source in sources]
        
        return jsonify(documents)
        
    except Exception as e:
        print(f"Error getting documents: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/clear', methods=['DELETE'])
def clear_documents():
    """Clear all documents."""
    try:
        global VECTOR_DB
        count = len(VECTOR_DB)
        VECTOR_DB.clear()
        return jsonify({
            'message': f'Cleared {count} chunks',
            'cleared_count': count
        })
        
    except Exception as e:
        print(f"Error clearing documents: {e}")
        return jsonify({'error': str(e)}), 500

def split_text_into_chunks(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        
        # Try to break at sentence boundaries
        if end < len(text):
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            
            if break_point > start + chunk_size * 0.7:
                chunk = chunk[:break_point + 1]
                end = start + break_point + 1
        
        chunks.append(chunk.strip())
        start = end - overlap
        
        if start >= len(text):
            break
    
    return chunks

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'chunks_in_db': len(VECTOR_DB),
        'embedding_model': EMBEDDING_MODEL,
        'language_model': LANGUAGE_MODEL
    })

if __name__ == '__main__':
    print("Starting RAG Chatbot with Ollama...")
    print(f"Embedding model: {EMBEDDING_MODEL}")
    print(f"Language model: {LANGUAGE_MODEL}")
    print("Make sure you have the models downloaded with:")
    print(f"ollama pull {EMBEDDING_MODEL}")
    print(f"ollama pull {LANGUAGE_MODEL}")
    
    app.run(host='0.0.0.0', port=3001, debug=True) 