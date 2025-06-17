"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export function SessionButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <button
        disabled
        className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
      >
        Loading...
      </button>
    )
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn()}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Sign In
    </button>
  )
} 