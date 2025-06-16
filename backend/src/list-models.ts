import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function listModels() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
    const data = await response.json();
    console.log('Available models:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels(); 