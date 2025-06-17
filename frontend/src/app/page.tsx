"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"

export default function HomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Welcome to RAG Chat</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Chat with your documents using Retrieval-Augmented Generation (RAG) technology.
            Upload your documents and start asking questions!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Upload Documents</h2>
            <p className="text-gray-600 mb-6">
              Upload your documents in various formats (PDF, TXT, MD, JSON) and let our AI
              process them for you.
            </p>
            <Link
              href="/documents"
              className="inline-block px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Documents
            </Link>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Start Chatting</h2>
            <p className="text-gray-600 mb-6">
              Ask questions about your documents and get instant, accurate answers powered
              by our advanced RAG system.
            </p>
            <Link
              href="/chat"
              className="inline-block px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Chat
            </Link>
          </div>
        </div>

        {!session && (
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-4">
              Sign in to start using RAG Chat
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
