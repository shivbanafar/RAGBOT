import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsContainer } from "@/components/tabs-container"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            AI-Powered Document Chat
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Upload your documents and chat with them using our advanced RAG-powered AI assistant. 
            Get instant answers and insights from your documents with natural language.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
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
        </div>
      </div>

      {/* Features Section with Tabs */}
      <div id="features" className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <TabsContainer defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Chat Overview</CardTitle>
                <CardDescription>
                  A powerful AI assistant that understands your documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our RAG-powered chatbot allows you to have natural conversations with your documents. 
                  Simply upload your files, and start asking questions in plain English. The AI will 
                  understand the context and provide accurate answers based on your document content.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Smart Document Processing</CardTitle>
                  <CardDescription>
                    Upload and process any document format with our advanced AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Our system automatically processes and indexes your documents, making them searchable and chat-ready.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Natural Language Chat</CardTitle>
                  <CardDescription>
                    Chat with your documents using natural language
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ask questions in plain English and get accurate answers based on your document content.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Secure & Private</CardTitle>
                  <CardDescription>
                    Your data is always secure and private
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Built with security in mind. Your documents and conversations are encrypted and protected.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simple, Transparent Pricing</CardTitle>
                <CardDescription>
                  Choose the plan that works for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Free</CardTitle>
                      <CardDescription>Perfect for trying out</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">$0</p>
                      <p className="text-sm text-muted-foreground">Up to 5 documents</p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline">Get Started</Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Pro</CardTitle>
                      <CardDescription>For power users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">$10</p>
                      <p className="text-sm text-muted-foreground">Unlimited documents</p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Upgrade to Pro</Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </TabsContainer>
      </div>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} RAG Chat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
