import React, { useState } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LoginFormProps {
  onLogin: (userId: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  error: string;
}

export function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(loginUserId, loginPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-forest/20 flex items-center justify-center p-4" style={{
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)'
    }}>
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-stone-forest/20 rounded-2xl flex items-center justify-center mb-4 border border-stone-forest/30">
              <span className="text-2xl">🇨🇭</span>
            </div>
            <h1 className="text-2xl font-display font-semibold text-stone-900 mb-2">Swiss Adventure Album</h1>
            <p className="text-stone-600 font-medium">Sign in to view our amazing trip memories</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-3 font-display">User ID</label>
            <input
              type="text"
              value={loginUserId}
              onChange={(e) => setLoginUserId(e.target.value)}
              className="w-full px-4 py-4 bg-white/60 backdrop-blur-sm border border-stone-300/40 rounded-2xl focus:ring-2 focus:ring-stone-forest/30 focus:border-stone-forest/50 transition-all placeholder-stone-400 font-medium shadow-sm hover:bg-white/70"
              placeholder="Enter your user ID"
              required
              suppressHydrationWarning
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-3 font-display">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-4 bg-white/60 backdrop-blur-sm border border-stone-300/40 rounded-2xl focus:ring-2 focus:ring-stone-forest/30 focus:border-stone-forest/50 transition-all placeholder-stone-400 font-medium shadow-sm hover:bg-white/70"
              placeholder="Enter your password"
              required
              suppressHydrationWarning
            />
          </div>
          
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-4 text-red-700 text-sm font-medium shadow-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-forest hover:bg-stone-forest/90 disabled:bg-stone-300 text-white font-medium py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-display tracking-wide disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <div className="bg-stone-forest/10 backdrop-blur-sm rounded-2xl p-4 border border-stone-forest/20">
            <p className="text-xs text-stone-600 font-medium mb-1">Try these credentials:</p>
            <p className="text-sm text-stone-800 font-mono bg-white/40 rounded-lg px-3 py-2 border border-stone-200/50">
              <strong>anni</strong> / ilovelaswiss
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}