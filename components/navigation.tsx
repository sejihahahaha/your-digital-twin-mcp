'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full bg-black/80 backdrop-blur-sm border-b border-red-900/30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-red-600">
          KL
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm hover:text-red-400 transition-colors">Home</Link>
          <Link href="/about" className="text-sm hover:text-red-400 transition-colors">About Me</Link>
          <Link href="/skills" className="text-sm hover:text-red-400 transition-colors">Skills</Link>
          <Link href="/projects" className="text-sm hover:text-red-400 transition-colors">Projects</Link>
          <Link href="/chat" className="text-sm hover:text-red-400 transition-colors">Digital Twin</Link>
          <Link href="/contact" className="text-sm hover:text-red-400 transition-colors">Contact</Link>
        </div>

        {/* Desktop Chat Button */}
        <Link href="/chat" className="hidden md:block">
          <Button size="sm" className="bg-red-600 hover:bg-red-700">Chat</Button>
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/90 border-t border-red-900/30 p-4 space-y-3">
          <Link href="/" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">Home</Link>
          <Link href="/about" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">About Me</Link>
          <Link href="/skills" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">Skills</Link>
          <Link href="/projects" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">Projects</Link>
          <Link href="/chat" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">Digital Twin</Link>
          <Link href="/contact" className="block px-4 py-2 hover:bg-red-900/20 rounded transition-colors">Contact</Link>
          <Link href="/chat" className="block">
            <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">Chat</Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
