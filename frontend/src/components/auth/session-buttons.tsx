"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SessionButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button size="lg" disabled>Loading...</Button>
  }

  return (
    <div className="flex items-center gap-x-6">
      {session ? (
        <Link href="/chat">
          <Button size="lg">
            Go to Chat
          </Button>
        </Link>
      ) : (
        <Link href="/auth/login">
          <Button size="lg">
            Get Started
          </Button>
        </Link>
      )}
      <Link href="#features">
        <Button variant="outline" size="lg">
          Learn More
        </Button>
      </Link>
    </div>
  )
} 