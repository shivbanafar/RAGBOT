"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"

interface Document {
  id: string
  title: string
  type: string
  createdAt: string
}

export default function DocumentsPage() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session) {
      fetchDocuments()
    }
  }, [session])

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      setError("Failed to load documents")
    } finally {
      setIsLoading(false)
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

      await fetchDocuments()
    } catch (error) {
      console.error("Error uploading document:", error)
      setError("Failed to upload document")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      await fetchDocuments()
    } catch (error) {
      console.error("Error deleting document:", error)
      setError("Failed to delete document")
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view documents.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <div className="mb-4 p-4 text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-lg shadow-md border"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">{doc.title}</h3>
                  <p className="text-sm text-gray-500 capitalize mb-2">
                    {doc.type}
                  </p>
                  <p className="text-xs text-gray-400">
                    Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-4 p-2 text-red-600 hover:text-red-700 focus:outline-none"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 