"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function AuthButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button variant="ghost" disabled>Loading...</Button>
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm">{session.user?.name || session.user?.email}</span>
        <Button variant="outline" onClick={() => signOut()}>Logout</Button>
      </div>
    )
  }

  return (
    <Button variant="outline" onClick={() => signIn()}>Login</Button>
  )
} 