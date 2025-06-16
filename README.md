# RAGBOT - AI-Powered Document Chatbot

RAGBOT is a powerful document-based chatbot that uses Retrieval-Augmented Generation (RAG) to provide accurate and context-aware responses based on your documents. Built with Next.js, Express, and Google's Gemini AI, it offers a modern, user-friendly interface for document management and AI-powered conversations.

## Features

- 📄 **Document Management**
  - Upload and manage PDF, TXT, MD, and JSON files
  - Automatic text extraction and chunking
  - Vector embeddings for semantic search

- 💬 **AI-Powered Chat**
  - Context-aware responses using RAG
  - Real-time message processing
  - Conversation history management
  - Source attribution for responses

- 🔐 **Authentication**
  - Secure user authentication
  - JWT-based session management
  - Protected routes and API endpoints

- 🎨 **Modern UI**
  - Clean and intuitive interface
  - Real-time updates
  - Responsive design
  - Dark mode support

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- React Query

### Backend
- Express.js
- TypeScript
- MongoDB
- Google Gemini AI
- JWT Authentication

## Prerequisites

- Node.js 18+ and npm
- MongoDB instance
- Google Cloud account with Gemini API access

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
GEMINI_API_KEY=your_gemini_api_key
```

### Backend (.env)
```env
PORT=3001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivbanafar/RAGBOT.git
   cd RAGBOT
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables with your configuration

4. **Start the development servers**
   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend server (in a new terminal)
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Project Structure

```
RAGBOT/
├── frontend/                # Next.js frontend application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── lib/           # Utility functions
│   └── public/            # Static assets
│
├── backend/                # Express.js backend application
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── models/        # MongoDB models
│   │   ├── middleware/    # Express middleware
│   │   └── services/      # Business logic
│   └── uploads/           # Document uploads
│
└── README.md              # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List user's documents
- `POST /api/documents/upload` - Upload new document
- `DELETE /api/documents/:id` - Delete document

### Chat
- `GET /api/chat` - List user's chats
- `POST /api/chat` - Create new chat
- `POST /api/chat/message` - Send message
- `POST /api/chat/:id/process` - Process chat message

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Express.js](https://expressjs.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/) 