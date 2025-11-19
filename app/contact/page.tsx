import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'

export default function Contact() {
  return (
    <div className="w-full bg-black text-white min-h-screen">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-2xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl font-bold mb-8 text-red-400">Get In Touch</h1>

        <div className="space-y-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            Interested in collaborating on AI projects, building intelligent systems, or just having a tech conversation? I'd love to hear from you!
          </p>

          <div className="space-y-6">
            <div className="p-6 rounded-lg border border-red-900/30 bg-red-900/5">
              <h3 className="font-bold text-red-400 mb-2">Email</h3>
              <p className="text-gray-300">krystellingat23@gmail.com</p>
            </div>

            <div className="p-6 rounded-lg border border-red-900/30 bg-red-900/5">
              <h3 className="font-bold text-red-400 mb-2">LinkedIn</h3>
              <p className="text-gray-300">https://www.linkedin.com/in/krystel-lingat-1a474b398/</p>
            </div>

            <div className="p-6 rounded-lg border border-red-900/30 bg-red-900/5">
              <h3 className="font-bold text-red-400 mb-2">GitHub</h3>
              <p className="text-gray-300">https://github.com/sejihahahaha</p>
            </div>
          </div>

          <Link href="/chat">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-lg py-6">
              Chat with My Digital Twin Instead
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
