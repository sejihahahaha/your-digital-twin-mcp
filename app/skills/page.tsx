import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'

export default function Skills() {
  const skills = [
    { name: 'Python', level: 90 },
    { name: 'AI/RAG Systems', level: 85 },
    { name: 'SQL/MySQL', level: 88 },
    { name: 'Laravel', level: 75 },
    { name: 'JavaScript', level: 80 },
    { name: 'Next.js', level: 82 },
    { name: 'OpenCV', level: 70 },
    { name: 'PHP', level: 72 },
    { name: 'System Design', level: 80 },
    { name: 'Git/GitHub', level: 85 },
    { name: 'Cloud Tools', level: 75 },
    { name: 'HTML/CSS', level: 88 },
  ]

  return (
    <div className="w-full bg-black text-white min-h-screen">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl font-bold mb-4 text-red-400">Skills & Expertise</h1>
        <p className="text-gray-400 mb-12">My professional toolkit and areas of expertise</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="p-6 rounded-lg border border-red-900/30 bg-red-900/5 hover:border-red-600/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">{skill.name}</h3>
                <span className="text-sm text-red-400 font-semibold">{skill.level}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${skill.level}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Skills Categories */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-lg border border-red-900/30 bg-red-900/10">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Backend & AI</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Python (Advanced)</li>
              <li>• AI/RAG Systems</li>
              <li>• Chatbot Development</li>
              <li>• SQL/MySQL (Advanced)</li>
              <li>• Laravel</li>
              <li>• System Design</li>
            </ul>
          </div>
          <div className="p-8 rounded-lg border border-red-900/30 bg-red-900/10">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Frontend & Tools</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• JavaScript & TypeScript</li>
              <li>• Next.js & React</li>
              <li>• HTML/CSS</li>
              <li>• OpenCV</li>
              <li>• Git/GitHub</li>
              <li>• Cloud Tools</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
