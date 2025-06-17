"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/providers/auth-provider"
import { Upload, File, Trash2 } from "lucide-react"

interface Document {
  _id: string
  title: string
  type: string
  createdAt: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { token, user } = useAuth()

  // Load documents on component mount
  useEffect(() => {
    if (token) {
      loadDocuments()
    }
  }, [token])

  const loadDocuments = async () => {
    try {
      console.log('Fetching documents list');
      const response = await fetch("/api/documents", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      console.log('Documents response status:', response.status);
      
      if (response.ok) {
        const data = await response.json()
        console.log('Documents loaded:', data);
        setDocuments(data)
      } else {
        const errorData = await response.json();
        console.error('Failed to load documents:', errorData);
        toast({
          title: "Error",
          description: "Failed to load documents",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name)

    try {
      console.log('Sending upload request to /api/documents/upload');
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || "Failed to upload document")
      }

      const data = await response.json()
      console.log('Upload successful:', data);
      
      toast({
        title: "Success",
        description: `Document "${data.document.title}" uploaded successfully!`,
      })

      // Reload documents list
      console.log('Reloading documents list');
      await loadDocuments()
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setIsDeleting(documentId);
    try {
      console.log('Deleting document:', documentId);
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Delete response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        throw new Error(errorData.error || 'Failed to delete document');
      }

      toast({
        title: "Success",
        description: "Document deleted successfully!",
      });

      // Reload documents list
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

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
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload Document"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <File className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc._id)}
                disabled={isDeleting === doc._id}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
        {documents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No documents uploaded yet. Upload a document to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 