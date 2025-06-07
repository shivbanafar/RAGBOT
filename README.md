# RAG Chatbot

A modern RAG-based chatbot application built with Next.js, MongoDB, and Google OAuth authentication.

## Features

- 🤖 RAG-based chatbot for intelligent responses
- 🔐 Google OAuth authentication
- 💾 MongoDB integration for user data and chat history
- 🎨 Modern UI with Tailwind CSS and shadcn/ui
- 📱 Responsive design
- 🔒 Protected routes and secure authentication

## Tech Stack

- **Frontend:**
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - shadcn/ui
  - NextAuth.js

- **Backend:**
  - Node.js
  - Express
  - MongoDB
  - Google OAuth

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Google Cloud Platform account
- Git

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

3. **Environment Setup**

   Create `.env.local` in the frontend directory:
   ```env
   # NextAuth.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # MongoDB
   MONGODB_URI=your-mongodb-connection-string
   ```

   Create `.env` in the backend directory:
   ```env
   PORT=3001
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   ```

4. **Google OAuth Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000/login`

5. **MongoDB Setup**
   - Create a MongoDB Atlas account
   - Create a new cluster
   - Get your connection string
   - Create a database user
   - Add your IP to the whitelist

6. **Run the development servers**

   In the frontend directory:
   ```bash
   npm run dev
   ```

   In the backend directory:
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Project Structure

```
RAGBOT/
├── frontend/                # Next.js frontend application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   ├── lib/           # Utility functions
│   │   └── types/         # TypeScript types
│   └── public/            # Static files
│
└── backend/               # Express backend application
    ├── src/
    │   ├── controllers/  # Route controllers
    │   ├── models/       # MongoDB models
    │   ├── routes/       # API routes
    │   └── utils/        # Utility functions
    └── tests/            # Test files
```

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
- [MongoDB](https://www.mongodb.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [NextAuth.js](https://next-auth.js.org/) 