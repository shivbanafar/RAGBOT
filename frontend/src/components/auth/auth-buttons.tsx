"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function AuthButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button variant="ghost" disabled>Loading...</Button>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {session.user?.email}
        </span>
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Logout
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={() => signIn("google", { callbackUrl: "/chat" })}
    >
      Login with Google
    </Button>
  )
} 