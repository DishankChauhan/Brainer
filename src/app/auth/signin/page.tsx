'use client'
import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
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
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // If this is a post-purchase signin, link the subscription
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
          // Don't fail the signin if subscription linking fails
        }
      }

      setSuccess(true);
      
      // Redirect to dashboard after success
      setTimeout(() => {
        router.push(isPaidUser ? '/dashboard?welcome=true&plan=pro' : '/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error('Signin error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Sync with database
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        })
      });

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

      router.push(isPaidUser ? '/dashboard?welcome=true&plan=pro' : '/dashboard');
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
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back! 🎉</h1>
            <p className="text-gray-400 mb-4">
              {isPaidUser 
                ? 'Your Pro subscription has been activated!'
                : 'Successfully signed in to your account.'
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
              <h1 className="text-xl font-bold text-white mb-2">Link Your Pro Subscription</h1>
              <p className="text-green-400 text-sm">
                ✅ Payment successful! Sign in to activate Pro features.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-400">Sign in to your account</p>
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
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {loading ? 'Signing In...' : (isPaidUser ? 'Sign In & Activate Pro' : 'Sign In')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-lg transition duration-200 hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <span>🔥</span>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link 
              href={sessionId ? `/auth/signup?session_id=${sessionId}` : '/auth/signup'} 
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-400">
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
} 