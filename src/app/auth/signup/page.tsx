'use client'

import React, { useState, Suspense } from 'react'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const prefilledEmail = searchParams.get('email');
  
  const [formData, setFormData] = useState({
    name: '',
    email: prefilledEmail || '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPaidUser = !!sessionId;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // Update Firebase profile with name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // Note: User sync is now handled automatically by AuthProvider

      // If this is a post-purchase signup, link the subscription
      if (sessionId) {
        console.log('Linking subscription for session:', sessionId);
        
        const linkResponse = await fetch('/api/stripe/link-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userEmail: formData.email,
            firebaseUid: userCredential.user.uid,
          }),
        });

        const linkData = await linkResponse.json();

        if (!linkResponse.ok) {
          console.error('Failed to link subscription:', linkData.error);
          // Don't fail the signup if subscription linking fails
        }
      }

      setSuccess(true);
      
      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = isPaidUser ? '/dashboard?welcome=true&plan=pro' : '/dashboard?welcome=true';
      }, 2000);

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Note: User sync is now handled automatically by AuthProvider

      // Handle subscription linking if needed
      if (sessionId) {
        const linkResponse = await fetch('/api/stripe/link-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userEmail: userCredential.user.email,
            firebaseUid: userCredential.user.uid,
          }),
        });
      }

      window.location.href = isPaidUser ? '/dashboard?welcome=true&plan=pro' : '/dashboard?welcome=true';
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Account Created! 🎉</h1>
            <p className="text-gray-400 mb-4">
              {isPaidUser 
                ? 'Your Pro subscription has been activated!'
                : 'Welcome to Brainer!'
              }
            </p>
            <div className="animate-pulse text-indigo-400">
              Redirecting to dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
      <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl mr-2">🧠</span>
            <span className="text-xl font-bold text-white">Brainer</span>
          </div>
          
          {isPaidUser ? (
            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg mb-6">
              <h1 className="text-xl font-bold text-white mb-2">Complete Your Pro Account</h1>
              <p className="text-green-400 text-sm">
                ✅ Payment successful! Create your account to activate Pro features.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
              <p className="text-gray-400">Start building your second brain today</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 pr-10"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900/50 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignUp}
            className="mt-4 w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
