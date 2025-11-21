import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="w-full bg-black text-white overflow-hidden">
      <Navigation />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <h1 className="text-6xl md:text-7xl font-bold text-white">
                Krystel Lingat
              </h1>
              <p className="text-2xl text-red-400">
                AI & Database Specialist
              </p>
            </div>
            <p className="text-lg text-gray-300 leading-relaxed">
              BS Information Technology Major in AI | Database Certified | Building intelligent systems that understand the world
            </p>
            <div className="flex gap-4 pt-4">
              <Link href="/chat">
                <Button className="bg-red-600 hover:bg-red-700 text-white px-8">
                  Chat with My Digital Twin
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10 px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Right - Profile Picture */}
          <div className="flex items-center justify-center">
            <div className="w-80 h-80 rounded-full bg-gradient-to-br from-red-900/30 to-black border border-red-900/50 flex items-center justify-center overflow-hidden hover-glow">
              <img 
                src="/images/design-mode/Gemini_Generated_Image_hg9cl4hg9cl4hg9c(1).png" 
                alt="Krystel Lingat" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-red-900/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Experience AI Excellence</h2>
          <p className="text-gray-400 mb-8">Explore my work, skills, and chat with my intelligent digital twin powered by advanced AI</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-xl border border-red-900/30 hover:border-red-600/50 transition-all hover:bg-red-900/10">
              <h3 className="text-xl font-bold text-red-400 mb-2">AI & ML</h3>
              <p className="text-gray-400">Advanced AI/RAG systems and machine learning expertise</p>
            </div>
            <div className="p-8 rounded-xl border border-red-900/30 hover:border-red-600/50 transition-all hover:bg-red-900/10">
              <h3 className="text-xl font-bold text-red-400 mb-2">Full Stack</h3>
              <p className="text-gray-400">End-to-end development with Python, Laravel, and modern web technologies</p>
            </div>
            <div className="p-8 rounded-xl border border-red-900/30 hover:border-red-600/50 transition-all hover:bg-red-900/10">
              <h3 className="text-xl font-bold text-red-400 mb-2">Database Expert</h3>
              <p className="text-gray-400">SQL, MySQL, and database design certified professional</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
