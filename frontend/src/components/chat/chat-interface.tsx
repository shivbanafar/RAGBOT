"use client"

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string | Date
  sources?: Array<{
    text: string
    metadata: {
      source: string
      page?: number
      chunkId?: string
    }
  }>
}

interface Document {
  id: string
  title: string
  type: string
  createdAt: string
}

export default function ChatInterface() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      loadDocuments()
    }
  }, [session])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error loading documents:', error)
      setError('Failed to load documents')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name)

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload document")
      }

      const data = await response.json()
      await loadDocuments()
    } catch (error) {
      console.error('Error in handleFileUpload:', error)
      setError('Failed to upload document')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !session) return

    try {
      setIsLoading(true)
      let chatId = currentChatId

      if (!chatId) {
        const createChatResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
          }),
        })

        if (!createChatResponse.ok) {
          throw new Error('Failed to create chat')
        }

        const newChat = await createChatResponse.json()
        chatId = newChat._id
        setCurrentChatId(chatId)
      }

      const userMessage: Message = {
        content: input,
        role: 'user',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: input,
          role: 'user',
          chatId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      if (data.messages) {
        setMessages(data.messages.map((msg: any) => ({
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp || Date.now()),
          sources: msg.sources
        })))
      } else if (data.response) {
        const aiMessage: Message = {
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
          sources: data.relevantDocs?.map((doc: any) => ({
            text: doc.content,
            metadata: {
              source: doc.title,
              page: doc.page,
              chunkId: doc.chunkId
            }
          }))
        }
        setMessages(prev => [...prev, aiMessage])
      }

      setInput('')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setError('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to use the chat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Documents Sidebar */}
      <div className="w-80 border-r bg-gray-50 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Documents</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex-1 overflow-y-auto space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border"
            >
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 text-gray-500">📄</div>
                <div>
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {doc.type}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No documents uploaded yet. Upload a document to get started!
            </p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col bg-white border rounded-lg">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(!messages || messages.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Start a conversation by typing a message below.
                </p>
              </div>
            )}
            {messages?.map((message, index) => {
              const timestamp = typeof message.timestamp === 'string' 
                ? new Date(message.timestamp) 
                : message.timestamp
              
              const messageKey = `message-${index}-${timestamp.getTime()}`
              
              return (
                <div
                  key={messageKey}
                  className={`flex flex-col space-y-2 ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">Sources:</p>
                        <ul className="list-disc pl-4">
                          {message.sources.map((source, idx) => (
                            <li key={`${messageKey}-source-${idx}`}>
                              {source.metadata.source}
                              {source.metadata.page && ` (Page ${source.metadata.page})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 