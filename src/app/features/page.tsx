import { Features } from '@/components/blocks/features-10';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Powerful Features for Your Voice Notes
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Discover how Brainer transforms your voice recordings into organized, searchable knowledge with AI-powered transcription and smart insights.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a5 5 0 1110 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Voice to Text</h3>
            <p className="text-gray-400">
              Advanced AI-powered transcription that accurately converts your voice notes to searchable text with high accuracy.
            </p>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Smart Search</h3>
            <p className="text-gray-400">
              Find any note instantly with AI-powered semantic search that understands context and meaning, not just keywords.
            </p>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">AI Insights</h3>
            <p className="text-gray-400">
              Get intelligent insights and connections between your notes, helping you discover patterns in your thoughts.
            </p>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Screenshot OCR</h3>
            <p className="text-gray-400">
              Extract text from images and screenshots automatically, making all your visual content searchable.
            </p>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Smart Tags</h3>
            <p className="text-gray-400">
              Automatically tag and categorize your notes with AI-powered organization for better knowledge management.
            </p>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">Real-time Sync</h3>
            <p className="text-gray-400">
              Access your notes instantly across all devices with real-time synchronization and cloud backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 