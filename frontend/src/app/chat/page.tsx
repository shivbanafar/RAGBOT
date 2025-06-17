import { Metadata } from "next"
import ChatInterface from "@/components/chat/chat-interface"

export const metadata: Metadata = {
  title: "Chat | RAG Chatbot",
  description: "Chat with your AI assistant powered by RAG",
}

export default function ChatPage() {
  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
} 