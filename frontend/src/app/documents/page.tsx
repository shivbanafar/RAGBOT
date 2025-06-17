"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/providers/auth-provider"
import { Upload, File, Trash2, FolderPlus, Folder, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Document {
  _id: string
  title: string
  type: string
  createdAt: string
  folder: string
  size: number
}

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState('root')
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/documents')
        if (!response.ok) {
          throw new Error('Failed to fetch documents')
        }
        const data = await response.json()
        setDocuments(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDocuments()
    }
  }, [status])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const newDoc = await response.json()
      setDocuments(prev => [...prev, newDoc])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    setIsDeleting(documentId)
    try {
      console.log('Deleting document:', documentId)
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('Delete response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete failed:', errorData)
        throw new Error(errorData.error || 'Failed to delete document')
      }

      toast({
        title: "Success",
        description: "Document deleted successfully!",
      })

      // Reload documents list
      await fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive"
      })
      return
    }

    setIsCreatingFolder(true)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderName: newFolderName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create folder')
      }

      toast({
        title: "Success",
        description: "Folder created successfully!",
      })

      setNewFolderName('')
      await fetchDocuments()
    } catch (error) {
      console.error('Error creating folder:', error)
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleMoveDocument = async (documentId: string, targetFolder: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/move`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder: targetFolder }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to move document')
      }

      toast({
        title: "Success",
        description: "Document moved successfully!",
      })

      await fetchDocuments()
    } catch (error) {
      console.error('Error moving document:', error)
      toast({
        title: "Error",
        description: "Failed to move document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFolderClick = (folder: string) => {
    console.log('Changing to folder:', folder)
    setCurrentFolder(folder)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to manage documents.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Documents</h1>
        <div className="flex items-center space-x-4">
          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Upload Document
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No documents found. Upload a document to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold">{doc.title}</h3>
              <p className="text-sm text-gray-500">
                Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                Size: {(doc.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 