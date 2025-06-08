'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

interface PaymentSession {
  id: string;
  customer_email: string;
  payment_status: string;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/session/${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch session');
        }

        setSession(data);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch payment information');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleCreateAccount = () => {
    if (session?.customer_email) {
      window.location.href = `/auth/signup?session_id=${sessionId}&email=${encodeURIComponent(session.customer_email)}`;
    } else {
      window.location.href = `/auth/signup?session_id=${sessionId}`;
    }
  };

  const handleSignIn = () => {
    window.location.href = `/auth/signin?session_id=${sessionId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Verifying your payment...</h2>
          <p className="text-gray-400">Please wait while we process your subscription.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="bg-gray-900/50 p-8 rounded-lg border border-red-500/50 max-w-md">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">⚠️</span>
            </div>
            <h2 className="text-xl text-white mb-2">Payment Verification Failed</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/pricing">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200">
                Back to Pricing
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 max-w-md w-full">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful! 🎉</h1>
          <p className="text-gray-400 mb-6">
            Thank you for subscribing to Brainer Pro! Your subscription is ready to activate.
          </p>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 mb-6">
            <p className="text-sm text-gray-400 mb-2">Payment Email:</p>
            <p className="text-white font-medium">
              {session?.customer_email}
            </p>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            To complete your subscription setup, please create an account or sign in:
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCreateAccount}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Create New Account
            </button>
            
            <button
              onClick={handleSignIn}
              className="w-full border border-gray-600 hover:border-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Sign In to Existing Account
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Your subscription will be automatically linked to your account.
          </p>
        </div>
      </div>
    </div>
  );
} 