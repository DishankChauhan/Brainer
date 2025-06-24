'use client'
import React, { useState, Suspense, useRef, useEffect } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Chrome, Twitter, Gamepad2, CheckCircle } from 'lucide-react';

interface FormInputProps {
    icon: React.ReactNode;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

interface SocialButtonProps {
    icon: React.ReactNode;
    name: string;
    onClick?: () => void;
}

interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
    id: string;
}

// FormInput Component
const FormInput: React.FC<FormInputProps> = ({ icon, type, placeholder, value, onChange, required }) => {
    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {icon}
            </div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
        </div>
    );
};

// SocialButton Component
const SocialButton: React.FC<SocialButtonProps> = ({ icon, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="flex items-center justify-center p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
            {icon}
        </button>
    );
};

// ToggleSwitch Component
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
    return (
        <div className="relative inline-block w-10 h-5 cursor-pointer">
            <input
                type="checkbox"
                id={id}
                className="sr-only"
                checked={checked}
                onChange={onChange}
            />
            <div className={`absolute inset-0 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-white' : 'bg-white/20'}`}>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-black transition-transform duration-200 ease-in-out ${checked ? 'transform translate-x-5' : ''}`} />
            </div>
        </div>
    );
};

function SignInPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPaidUser = !!sessionId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSubmitting(true);
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // If this is a post-purchase signin, link the subscription
      if (sessionId) {
        console.log('Linking subscription for session:', sessionId);
        
        const linkResponse = await fetch('/api/stripe/link-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userEmail: email,
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
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
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
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] animate-pulse"></div>
        </div>
        <div className="relative z-20 p-8 rounded-2xl backdrop-blur-sm bg-black/50 border border-white/10 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back! 🎉</h1>
            <p className="text-white/80 mb-4">
              {isPaidUser 
                ? 'Your Pro subscription has been activated!'
                : 'Successfully signed in to your account.'
              }
            </p>
            <div className="animate-pulse text-purple-400">
              Redirecting to dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] animate-pulse"></div>
      </div>
      
      <div className="relative z-20 p-8 rounded-2xl backdrop-blur-sm bg-black/50 border border-white/10 max-w-md w-full">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2 relative group">
            <span className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-blue-500/30 blur-xl opacity-75 group-hover:opacity-100 transition-all duration-500 animate-pulse"></span>
            <span className="relative inline-block text-3xl font-bold mb-2 text-white">
              🧠 Brainer
            </span>
            <span className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
          </h2>
          <div className="text-white/80 flex flex-col items-center space-y-1">
            <span className="relative group cursor-default">
              <span className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
              <span className="relative inline-block animate-pulse">
                {isPaidUser ? 'Link Your Pro Subscription' : 'Your digital brain awaits'}
              </span>
            </span>
            <span className="text-xs text-white/50 animate-pulse">
              [Press Enter to access your memories]
            </span>
            <div className="flex space-x-2 text-xs text-white/40">
              <span className="animate-pulse">🧠</span>
              <span className="animate-bounce">💡</span>
              <span className="animate-pulse">🎯</span>
            </div>
          </div>
          {isPaidUser && (
            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg mt-4">
              <p className="text-green-400 text-sm">
                ✅ Payment successful! Sign in to activate Pro features.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            icon={<Mail className="text-white/60" size={18} />}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <FormInput
              icon={<Lock className="text-white/60" size={18} />}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div onClick={() => setRemember(!remember)} className="cursor-pointer">
                <ToggleSwitch
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  id="remember-me"
                />
              </div>
              <label
                htmlFor="remember-me"
                className="text-sm text-white/80 cursor-pointer hover:text-white transition-colors"
                onClick={() => setRemember(!remember)}
              >
                Remember me
              </label>
            </div>
            <Link href="#" className="text-sm text-white/80 hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg ${success
                ? 'animate-success'
                : 'bg-white hover:bg-gray-200'
              } text-black font-medium transition-all duration-200 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-gray-500/20 hover:shadow-gray-500/40`}
          >
            {isSubmitting ? 'Accessing Brain...' : 'Enter Brainer'}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 absolute w-full"></div>
            <div className="bg-transparent px-4 relative text-white/60 text-sm">
              quick access via
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <SocialButton icon={<Chrome size={18} />} name="Chrome" onClick={handleGoogleSignIn} />
            <SocialButton icon={<Twitter size={18} />} name="X" />
            <SocialButton icon={<Gamepad2 size={18} />} name="Steam" />
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-white/60">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-white hover:text-purple-300 transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
} 