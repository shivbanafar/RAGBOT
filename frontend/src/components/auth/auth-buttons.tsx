"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function AuthButtons() {
  const { user, logout, loading } = useAuth()

  if (loading) {
    return <Button variant="ghost" disabled>Loading...</Button>
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user.email}
        </span>
        <Button
          variant="ghost"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="ghost">
          Login
        </Button>
      </Link>
      <Link href="/register">
        <Button variant="outline">
          Register
        </Button>
      </Link>
    </div>
  )
} 