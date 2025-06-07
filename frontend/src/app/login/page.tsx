import { Metadata } from "next"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Login | RAG Chatbot",
  description: "Login to access the RAG chatbot",
}

export default function LoginPage() {
  return <LoginForm />
} 