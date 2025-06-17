"use client"

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Upload, File, X, Send } from "lucide-react"
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
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  // Load documents on component mount
  useEffect(() => {
    if (session) {
      loadDocuments()
    }
  }, [session])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      // Update to handle the new response format
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name)

    try {
      console.log('Sending upload request to /api/documents/upload');
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || "Failed to upload document")
      }

      const data = await response.json()
      console.log('Upload successful:', data);
      
      toast({
        title: "Success",
        description: `Document "${data.document.title}" uploaded successfully!`,
      })

      // Reload documents list
      console.log('Reloading documents list');
      await loadDocuments()
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session) return;

    try {
      setIsLoading(true);
      console.log('Submitting message:', input);
      console.log('Current chat ID:', currentChatId);

      let chatId = currentChatId;
      
      // If no current chat, create a new one
      if (!chatId) {
        console.log('Creating new chat');
        const createChatResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
          }),
        });

        if (!createChatResponse.ok) {
          const errorData = await createChatResponse.json();
          console.error('Failed to create chat:', errorData);
          toast({
            title: "Error",
            description: "Failed to create chat",
            variant: "destructive"
          });
          return;
        }

        const newChat = await createChatResponse.json();
        console.log('Created new chat:', newChat);
        chatId = newChat._id;
        setCurrentChatId(chatId);
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        content: input,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send the message
      console.log('Sending message to chat:', chatId);
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
      });

      console.log('Message response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return;
      }

      const data = await response.json();
      console.log('Message response data:', data);

      // Update messages with the full chat history
      if (data.messages) {
        setMessages(data.messages.map((msg: any) => ({
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp || Date.now()),
          sources: msg.sources
        })));
      } else if (data.response) {
        // If we only got a response (old format), add it to existing messages
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
        };
        setMessages(prev => [...prev, aiMessage]);
      }

      setInput('');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to use the chat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Documents Sidebar */}
      <div className="w-80 border-r bg-muted/30 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Documents</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
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
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {doc.type}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet. Upload a document to get started!
            </p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(!messages || messages.length === 0) && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Start a conversation by typing a message below.
                </p>
              </div>
            )}
            {messages?.map((message, index) => {
              // Convert timestamp to Date if it's a string
              const timestamp = typeof message.timestamp === 'string' 
                ? new Date(message.timestamp) 
                : message.timestamp;
              
              const messageKey = `message-${index}-${timestamp.getTime()}`;
              
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
              );
            })}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
} 