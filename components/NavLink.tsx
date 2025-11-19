/**
 * NavLink Component
 * 
 * FIX: Marked as "use client" because it uses onClick event handler.
 * This prevents the error: "Event handlers cannot be passed to Client Component props"
 * 
 * The parent Server Component passes the onClick handler to this Client Component,
 * which is safe and follows Next.js 16 App Router best practices.
 */
"use client"

import Link from "next/link"

interface NavLinkProps {
  href: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  children: React.ReactNode
  className?: string
  external?: boolean
}

export default function NavLink({
  href,
  onClick,
  children,
  className = "",
  external = false,
}: NavLinkProps) {
  if (external) {
    return (
      <a
        href={href}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition ${className}`}
      >
        {children}
      </a>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition ${className}`}
    >
      {children}
    </Link>
  )
}
