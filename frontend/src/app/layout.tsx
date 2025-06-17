import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/providers/session-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RAG Chat",
  description: "Chat with your documents using RAG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthSessionProvider>
          <AuthProvider>
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
