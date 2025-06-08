'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-white font-medium">{question}</span>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function HelpPage() {
  const faqs = [
    {
      question: "How do I upload voice notes?",
      answer: "You can upload voice notes by clicking the 'Upload Voice Note' button on your dashboard. We support various audio formats including MP3, WAV, M4A, and more. Your notes will be automatically transcribed using AI."
    },
    {
      question: "How accurate is the transcription?",
      answer: "Our AI-powered transcription typically achieves 85-95% accuracy depending on audio quality, speaker clarity, and language. The system continuously improves as it processes more audio data."
    },
    {
      question: "Can I search through my transcribed notes?",
      answer: "Yes! We offer powerful semantic search that goes beyond keyword matching. You can search for concepts, ideas, or specific phrases across all your transcribed content."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely. We use enterprise-grade security measures including encryption at rest and in transit. Your data is stored securely and we never share your personal information with third parties."
    },
    {
      question: "What audio formats are supported?",
      answer: "We support most common audio formats including MP3, WAV, M4A, AAC, FLAC, and OGG. If you have a specific format need, please contact our support team."
    },
    {
      question: "How do I organize my notes?",
      answer: "Notes are automatically organized with AI-generated tags and categories. You can also manually add custom tags, create folders, and use our smart filtering system to find exactly what you need."
    },
    {
      question: "Can I share my notes with others?",
      answer: "Yes, you can share individual notes or entire collections with team members or collaborators. You have full control over sharing permissions and can revoke access at any time."
    },
    {
      question: "What's included in the free plan?",
      answer: "The free plan includes 500 voice notes per month, 100 screenshots per month, basic AI search, text extraction (OCR), and web app access. It's perfect for getting started with Brainer."
    }
  ];

  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Help & Support
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Find answers to common questions and get the help you need to make the most of Brainer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 text-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Documentation</h3>
            <p className="text-gray-400 mb-4">
              Comprehensive guides and tutorials to help you get started and master Brainer.
            </p>
            <button className="text-indigo-400 hover:text-indigo-300 font-medium">
              View Docs →
            </button>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 text-center">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Live Chat</h3>
            <p className="text-gray-400 mb-4">
              Get instant help from our support team. Available 24/7 for Pro and Team plan users.
            </p>
            <button className="text-emerald-400 hover:text-emerald-300 font-medium">
              Start Chat →
            </button>
          </div>

          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Email Support</h3>
            <p className="text-gray-400 mb-4">
              Send us an email and we'll get back to you within 24 hours (usually much faster).
            </p>
            <button className="text-purple-400 hover:text-purple-300 font-medium">
              Contact Us →
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>

        <div className="text-center mt-16 bg-gray-900/30 p-12 rounded-lg border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">Still need help?</h2>
          <p className="text-gray-400 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200">
              Contact Support
            </button>
            <button className="border border-gray-600 hover:border-gray-500 text-white font-semibold py-3 px-8 rounded-lg transition duration-200">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 