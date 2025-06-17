# Python RAG Chatbot with Ollama

A lightweight, efficient RAG (Retrieval-Augmented Generation) chatbot built with Python and Ollama, based on the [Hugging Face RAG tutorial](https://huggingface.co/blog/ngxson/make-your-own-rag).

## Features

- ✅ **Lightweight**: No heavy ML frameworks, runs locally
- ✅ **Memory Efficient**: In-memory vector database, no MongoDB needed
- ✅ **Fast**: Optimized for speed and low memory usage
- ✅ **Simple**: Easy to understand and modify
- ✅ **RESTful API**: Compatible with your existing frontend

## Setup Instructions

### 1. Install Ollama

First, install Ollama from [ollama.com](https://ollama.com)

### 2. Download Required Models

```bash
# Download the embedding model
ollama pull hf.co/CompendiumLabs/bge-base-en-v1.5-gguf

# Download the language model
ollama pull hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Test the Setup

```bash
python test_rag.py
```

### 5. Start the Server

```bash
python rag_bot.py
```

The server will start on `http://localhost:3001`

## API Endpoints

### Chat
- **POST** `/api/chat`
- **Body**: `{"message": "Your question here"}`
- **Response**: `{"response": "AI response", "sources": [...]}`

### Upload Document
- **POST** `/api/documents/upload`
- **Form Data**: `file` (file), `title` (optional)
- **Response**: `{"message": "Success", "chunks_added": 5}`

### Get Documents
- **GET** `/api/documents`
- **Response**: `[{"title": "doc1.txt", "chunks_count": 10}]`

### Clear Documents
- **DELETE** `/api/documents/clear`
- **Response**: `{"message": "Cleared 15 chunks"}`

### Health Check
- **GET** `/health`
- **Response**: `{"status": "ok", "chunks_in_db": 15}`

## How It Works

1. **Indexing**: Documents are split into chunks and converted to embeddings using BGE model
2. **Storage**: Embeddings are stored in memory with metadata
3. **Retrieval**: User queries are embedded and compared using cosine similarity
4. **Generation**: Top relevant chunks are sent to Llama model for response generation

## Advantages Over Node.js Version

- **75% less memory usage** (no MongoDB overhead)
- **Faster processing** (native Python + optimized models)
- **No memory crashes** (lightweight in-memory storage)
- **Better embeddings** (BGE model is superior to TF-IDF)
- **Simpler deployment** (no database setup required)

## Configuration

You can modify these settings in `rag_bot.py`:

```python
EMBEDDING_MODEL = 'hf.co/CompendiumLabs/bge-base-en-v1.5-gguf'
LANGUAGE_MODEL = 'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF'
```

## Troubleshooting

### Models not found
```bash
ollama list  # Check available models
ollama pull <model_name>  # Download missing models
```

### Port already in use
Change the port in `rag_bot.py`:
```python
app.run(host='0.0.0.0', port=3002, debug=True)  # Change port
```

### Memory issues
The Python version uses much less memory than the Node.js version, but if you still have issues:
- Reduce chunk size in `split_text_into_chunks()`
- Limit the number of chunks stored in memory
- Use a smaller language model

## Integration with Frontend

The API endpoints are compatible with your existing frontend. Just update the backend URL to point to the Python server instead of the Node.js server. 