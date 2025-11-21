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
      name: 'NWeather AI Chatbot',
      description: 'A simple, user-friendly AI chatbot that delivers real-time weather updates using API integration. Designed to give fast and accurate weather information anytime.',
      tech: ['Python', 'AI', 'Basic NLP'],
    },
    {
      name: 'Clinic Management System',
      description: 'A digital system that automates patient records, appointments, and clinic workflows. Built to replace manual processes, reduce errors, and streamline daily clinic operations.',
      tech: ['Laravel', 'MySQL', 'PHP', 'Bootstrap'],
    },
    {
      name: 'Sci-Linx',
      description: 'a mobile robot designed to safely deliver laboratory tools and materials, improving efficiency and reducing manual workload in lab environments.',
      tech: ['Arduino', 'Python', 'SQL', 'AI'],
    },
    {
      name: 'Face Detection Attendance System',
      description: 'A facial recognition-based attendance system that automates logging, tracking, and verifying student or employee attendance, reducing human error and speeding up the process.',
      tech: ['Python', 'OpenCV', 'SQL', 'GUI'],
    },
    {
      name: 'Tuguegarao Tourism Website',
      description: 'A web page created to promote Tuguegarao City’s tourist destinations, festivals, and local events. Provides an accessible platform for visitors to explore attractions and plan trips.',
      tech: ['HTML', 'CSS', 'JavaScript'],
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
                <p className="text-gray-400 text-sm mb-4">An AI-powered assistant modeled after the user, designed to answer questions, store personal data, and provide personalized interactions using RAG and LLM technologies.</p>
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
