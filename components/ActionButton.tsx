/**
 * ActionButton Component
 * 
 * FIX: Marked as "use client" because it uses onClick event handler.
 * This prevents the error: "Event handlers cannot be passed to Client Component props"
 * 
 * Safe pattern: Client Component receiving onClick from parent is allowed
 * in Next.js 16 App Router.
 */
"use client"

import React from "react"

interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function ActionButton({
  variant = "primary",
  children,
  onClick,
  className = "",
  ...props
}: ActionButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-colors duration-200"

  const variantStyles = {
    primary:
      "bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600",
    secondary:
      "bg-black dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700",
    outline:
      "border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
