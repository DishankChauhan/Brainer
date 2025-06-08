export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            About Brainer
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We're building the future of personal knowledge management, making it effortless to capture, organize, and discover your thoughts.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              At Brainer, we believe that every thought, idea, and insight has value. Our mission is to create 
              the most intuitive and powerful platform for capturing and organizing your mental assets, making 
              them easily searchable and actionable.
            </p>
            <p className="text-gray-400 leading-relaxed">
              We're democratizing access to advanced AI-powered note-taking and knowledge management tools, 
              enabling individuals and teams to unlock their full creative and intellectual potential.
            </p>
          </div>
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Smart by Design</h3>
              <p className="text-gray-400">
                Every feature we build is designed to enhance your thinking process, not complicate it.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Speed</h3>
              <p className="text-gray-400">
                Ideas move at the speed of thought. Our tools should too.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Privacy</h3>
              <p className="text-gray-400">
                Your thoughts are yours. We protect them with enterprise-grade security.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Innovation</h3>
              <p className="text-gray-400">
                We push the boundaries of what's possible with AI and machine learning.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center bg-gray-900/30 p-12 rounded-lg border border-gray-700/50">
          <h2 className="text-3xl font-bold text-white mb-6">Join Our Journey</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            We're just getting started. Join thousands of users who are already transforming 
            how they capture and organize their thoughts with Brainer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200">
              Start Free Today
            </button>
            <button className="border border-gray-600 hover:border-gray-500 text-white font-semibold py-3 px-8 rounded-lg transition duration-200">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 