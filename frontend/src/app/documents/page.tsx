"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import axios from 'axios'

interface Document {
  _id: string
  title: string
  createdAt: string
  size: number
}

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchDocuments()
    }
  }, [status, router])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/documents')
      setDocuments(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      await fetchDocuments()
    } catch (err) {
      setError('Failed to upload document')
      console.error('Error uploading document:', err)
    }
  }

  const handleDelete = async (documentId: string) => {
    try {
      await axios.delete(`/api/documents/${documentId}`)
      await fetchDocuments()
    } catch (err) {
      setError('Failed to delete document')
      console.error('Error deleting document:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Your Documents</h1>
        <div className="flex items-center space-x-4">
          <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
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

      <div className="grid gap-4">
        {documents.map((doc) => (
          <div
            key={doc._id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{doc.title}</h3>
              <p className="text-sm text-gray-500">
                Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                Size: {(doc.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={() => handleDelete(doc._id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
} 