"use client"

import { useState } from "react"

interface TabsContainerProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

export function TabsContainer({ defaultValue, children, className = "" }: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div className={`flex space-x-2 ${className}`}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function TabsTrigger({ value, children, className = "", onClick }: TabsTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className = "" }: TabsContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
} 