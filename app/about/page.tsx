import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"

export default function About() {
  return (
    <div className="w-full bg-black text-white min-h-screen">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl font-bold mb-8 text-red-400">About Me</h1>

        <div className="space-y-12">
          {/* Personal Info */}
          <section>
            <h2 className="text-3xl font-bold mb-4">Krystel Lingat</h2>
            <p className="text-lg text-gray-300 leading-relaxed mb-4">
              BS Information Technology Major in AI | Database Certified
            </p>
            <p className="text-lg text-gray-300 leading-relaxed">Saint Paul University Philippines</p>
          </section>

          {/* Biography */}
          <section className="border-t border-red-900/30 pt-8">
            <h2 className="text-3xl font-bold mb-4 text-red-400">My Journey</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                I'm a passionate AI and database specialist with a deep love for building intelligent systems. My
                journey in tech began with a curiosity about how machines learn and think, which led me to pursue a
                degree in Information Technology with a major in AI.
              </p>
              <p>
                Throughout my academic and professional career, I've focused on creating practical AI solutions,
                particularly in the area of Retrieval Augmented Generation (RAG) systems, chatbots, and intelligent
                information retrieval. I believe in the power of technology to solve real-world problems.
              </p>
              <p>
                Beyond coding, I'm known for being friendly, humorous, and approachable—though I tend to get a bit shy
                when talking about certain topics. What really gets me excited is diving deep into complex technical
                challenges and emerging with elegant solutions.
              </p>
            </div>
          </section>

          {/* Personality & Values */}
          <section className="border-t border-red-900/30 pt-8">
            <h2 className="text-3xl font-bold mb-4 text-red-400">Personality & Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border border-red-900/30 bg-red-900/5">
                <h3 className="font-bold text-red-400 mb-2">Traits</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Curious and detail-oriented</li>
                  <li>• Friendly and approachable</li>
                  <li>• Tech-passionate problem solver</li>
                  <li>• Humorous and somewhat shy</li>
                  <li>• Continuous learner</li>
                </ul>
              </div>
              <div className="p-6 rounded-lg border border-red-900/30 bg-red-900/5">
                <h3 className="font-bold text-red-400 mb-2">Core Values</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Innovation through integrity</li>
                  <li>• Practical technology solutions</li>
                  <li>• Continuous improvement</li>
                  <li>• Collaborative development</li>
                  <li>• Impact-driven work</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Goals & Passions */}
          <section className="border-t border-red-900/30 pt-8">
            <h2 className="text-3xl font-bold mb-4 text-red-400">Goals & Passions</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                My primary goal is to advance the field of AI, particularly in making RAG systems and intelligent
                chatbots more accessible and powerful. I want to build systems that can understand context, learn from
                interactions, and provide genuinely helpful responses.
              </p>
              <p>
                I'm passionate about open-source contributions, mentoring junior developers, and exploring the
                intersection of databases and AI. I believe that the future belongs to those who can seamlessly
                integrate machine learning into practical applications.
              </p>
            </div>
          </section>

          {/* Resume */}
          <section className="border-t border-red-900/30 pt-8">
            <a href="#" className="inline-block">
              <Button className="bg-red-600 hover:bg-red-700">Download Resume</Button>
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
