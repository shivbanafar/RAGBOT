"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/chat"
  const error = searchParams.get("error")

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Sign in to access the RAG chatbot
          </CardDescription>
          {error && (
            <p className="text-sm text-destructive">
              {error === "AccessDenied" 
                ? "You must be signed in to access this page"
                : "An error occurred during sign in"}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            onClick={() => signIn("google", { callbackUrl })}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 