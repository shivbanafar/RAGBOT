"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface TabsContainerProps {
  children: React.ReactNode
  defaultValue?: string
  className?: string
}

export function TabsContainer({ children, defaultValue = "overview", className }: TabsContainerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get("tab") || defaultValue

  useEffect(() => {
    // Update URL when tab changes
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.replaceState({}, "", url.toString())
  }, [tab])

  return (
    <Tabs value={tab} onValueChange={(value) => {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", value)
      router.push(url.toString())
    }} className={className}>
      {children}
    </Tabs>
  )
} 