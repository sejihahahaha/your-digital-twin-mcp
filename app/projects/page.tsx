import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'

export default function Projects() {
  const projects = [
    {
      name: 'Digital Twin Chatbot',
      description: 'AI-powered chatbot with semantic search and conversation memory',
      tech: ['Python', 'Groq', 'Upstash Vector', 'Next.js'],
    },
    {
      name: 'NavBot AI',
      description: 'Navigation and assistance chatbot for intelligent routing',
      tech: ['Python', 'AI', 'RAG'],
    },
    {
      name: 'Clinic Management System',
      description: 'Full-stack healthcare management platform',
      tech: ['Laravel', 'MySQL', 'PHP', 'Bootstrap'],
    },
    {
      name: 'Sci-Linx',
      description: 'a mobile robot designed to safely deliver laboratory tools and materials, improving efficiency and reducing manual workload in lab environments.',
      tech: ['Next.js', 'Python', 'Database', 'AI'],
    },
    {
      name: 'RAG Applications',
      description: 'Collection of Retrieval Augmented Generation projects',
      tech: ['Python', 'OpenAI', 'Vector DB', 'LLMs'],
    },
    {
      name: 'Tuguegarao Tourism Website',
      description: 'Interactive tourism and travel guide website for Tuguegarao City',
      tech: ['Next.js', 'React', 'MySQL', 'TypeScript'],
    },
  ]

  return (
    <div className="w-full bg-black text-white min-h-screen">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl font-bold mb-4 text-red-400">My Projects</h1>
        <p className="text-gray-400 mb-12">A showcase of my work across AI, full-stack development, and interactive systems</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.name}
              className="rounded-lg border border-red-900/30 overflow-hidden hover:border-red-600/50 transition-all group"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-red-600/20 text-red-400 text-xs rounded-full border border-red-600/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
