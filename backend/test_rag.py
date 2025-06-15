#!/usr/bin/env python3
"""
Test script for RAG chatbot
"""

import ollama
import sys

def test_ollama_models():
    """Test if Ollama models are available."""
    try:
        # Test embedding model
        print("Testing embedding model...")
        embedding = ollama.embeddings(model='hf.co/CompendiumLabs/bge-base-en-v1.5-gguf', prompt='Hello world')
        print(f"✓ Embedding model works! Generated {len(embedding)} dimensions")
        
        # Test language model
        print("Testing language model...")
        response = ollama.chat(
            model='hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF',
            messages=[{'role': 'user', 'content': 'Say hello'}],
            stream=False
        )
        print(f"✓ Language model works! Response: {response['message']['content'][:50]}...")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing models: {e}")
        print("\nMake sure you have downloaded the models:")
        print("ollama pull hf.co/CompendiumLabs/bge-base-en-v1.5-gguf")
        print("ollama pull hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF")
        return False

def test_sample_rag():
    """Test RAG with sample data."""
    try:
        from rag_bot import add_chunk_to_database, retrieve, generate_response
        
        # Sample knowledge base
        sample_chunks = [
            "Cats can run up to 31 mph (49 km/h) over short distances.",
            "The average cat sleeps 12-16 hours per day.",
            "Cats have over 20 muscles that control their ears.",
            "A group of cats is called a clowder.",
            "Cats can jump up to 6 times their body length."
        ]
        
        print("\nAdding sample chunks to database...")
        for chunk in sample_chunks:
            add_chunk_to_database(chunk, {'source': 'cat_facts.txt'})
        
        # Test retrieval
        print("\nTesting retrieval...")
        query = "How fast can cats run?"
        retrieved = retrieve(query, top_n=2)
        
        print(f"Query: {query}")
        for chunk, similarity, metadata in retrieved:
            print(f"- Similarity: {similarity:.3f} | {chunk}")
        
        # Test response generation
        print("\nTesting response generation...")
        response = generate_response(query, retrieved)
        print(f"Response: {response}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing RAG: {e}")
        return False

if __name__ == '__main__':
    print("Testing RAG Chatbot Setup...")
    
    if test_ollama_models():
        if test_sample_rag():
            print("\n✓ All tests passed! RAG system is working correctly.")
            print("\nYou can now run the server with: python rag_bot.py")
        else:
            print("\n✗ RAG test failed.")
            sys.exit(1)
    else:
        print("\n✗ Model test failed.")
        sys.exit(1) 