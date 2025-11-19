/**
 * /about/page.tsx
 * 
 * About page for the digital twin portfolio.
 * 
 * FIX PATTERN:
 * - This Server Component does NOT use "use client"
 * - It imports Client Components (NavLink, ActionButton) which handle onClick
 * - This is the correct Next.js 16 App Router pattern:
 *   * Server Component renders the layout and data
 *   * Client Components are imported for interactive elements
 * - The dark-red (#dc2626) + black theme is preserved throughout
 */

import NavLink from "@/components/NavLink"
import CTASection from "@/components/CTASection"

export const metadata = {
  title: "About - Digital Twin",
  description: "Learn about this digital twin portfolio",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <header className="border-b border-red-600 dark:border-red-700">
        <nav className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-red-600 dark:text-red-500">
            DT
          </div>
          <div className="flex gap-6">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <h1 className="text-5xl font-bold mb-4 text-white">
            About This{" "}
            <span className="text-red-600 dark:text-red-500">Digital Twin</span>
          </h1>
          <p className="text-xl text-zinc-300 leading-relaxed max-w-2xl">
            This is an AI-powered digital twin that can answer questions about a
            person's professional background, skills, and experience using
            advanced retrieval-augmented generation (RAG) and the Groq API.
          </p>
        </section>

        {/* Features Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-white">
            Key <span className="text-red-600 dark:text-red-500">Features</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature Card 1 */}
            <div className="border-l-4 border-red-600 dark:border-red-500 pl-6 py-4">
              <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-500">
                Vector Search
              </h3>
              <p className="text-zinc-300">
                Semantic search across professional profile data using Upstash
                Vector database for accurate retrieval.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="border-l-4 border-red-600 dark:border-red-500 pl-6 py-4">
              <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-500">
                AI Responses
              </h3>
              <p className="text-zinc-300">
                Natural language responses powered by Groq's fast AI inference,
                speaking in first person about the profile.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="border-l-4 border-red-600 dark:border-red-500 pl-6 py-4">
              <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-500">
                MCP Integration
              </h3>
              <p className="text-zinc-300">
                Built with the Model Context Protocol for seamless AI tool
                integration and extensibility.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="border-l-4 border-red-600 dark:border-red-500 pl-6 py-4">
              <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-500">
                Real-time Chat
              </h3>
              <p className="text-zinc-300">
                Interactive chat interface for asking questions and getting
                instant answers about the profile.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Stack Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-white">
            Tech <span className="text-red-600 dark:text-red-500">Stack</span>
          </h2>
          <div className="bg-zinc-900 border border-red-600 dark:border-red-500 rounded-lg p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="font-semibold text-red-600 dark:text-red-500 mb-2">
                  Frontend
                </p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Next.js 16</li>
                  <li>• React 19</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-red-600 dark:text-red-500 mb-2">
                  Backend
                </p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Node.js</li>
                  <li>• Groq API</li>
                  <li>• Upstash Vector</li>
                  <li>• MCP Server</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-red-600 dark:text-red-500 mb-2">
                  Deployment
                </p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Vercel</li>
                  <li>• Serverless</li>
                  <li>• Edge Runtime</li>
                  <li>• Turbopack</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <CTASection />

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-8 text-white">
            <span className="text-red-600 dark:text-red-500">Frequently</span>{" "}
            Asked Questions
          </h2>
          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <div className="border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                How does the digital twin work?
              </h3>
              <p className="text-zinc-300">
                The system uses RAG (Retrieval-Augmented Generation) to search a
                personal profile database, then generates natural responses using
                Groq's AI engine. It speaks in first person as if the person is
                answering questions about themselves.
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div className="border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                What data does it have access to?
              </h3>
              <p className="text-zinc-300">
                The digital twin has access to professional profile data
                including experience, projects, skills, and leadership examples.
                This data is loaded into the vector database for semantic search.
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div className="border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Is this production-ready?
              </h3>
              <p className="text-zinc-300">
                Yes! This system is built with production best practices,
                including type-safe TypeScript, proper error handling, Vercel
                deployment compatibility, and comprehensive documentation.
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div className="border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I customize the theme or persona?
              </h3>
              <p className="text-zinc-300">
                Absolutely! The chatbot system includes a Persona class that
                allows customization of name, traits, tone, and speaking
                patterns. The theme can be modified through Tailwind CSS classes.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-red-600 dark:border-red-700 mt-16">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center text-zinc-400">
          <p>
            © 2024 Digital Twin. Built with{" "}
            <span className="text-red-600 dark:text-red-500">Next.js 16</span>,
            Groq, and{" "}
            <a
              href="https://upstash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition"
            >
              Upstash
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
