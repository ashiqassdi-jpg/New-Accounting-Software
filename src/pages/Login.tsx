/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: name,
              role: 'MODERATOR',
              can_add: true,
              can_edit: false,
              can_delete: false,
              joining_date: new Date().toISOString().split('T')[0]
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Note: The user exists in Auth but profile failed. 
          // In a real app, you might want to handle this retry or cleanup.
        }

        setSuccess('Account created! Please check your email for confirmation.');
        setMode('signin');
        setName('');
        setPassword('');
      }
      setLoading(false);
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-slate-100"
      >
        <div>
          <div className="flex justify-center">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-100">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-sans tracking-tight">
            Ashiq's Creation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            {mode === 'signin' ? 'Sign in to your accounting platform' : 'Create your professional account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    id="full-name"
                    name="name"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-12 py-3.5 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm font-medium bg-slate-50/50"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-12 py-3.5 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm font-medium bg-slate-50/50"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-12 py-3.5 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all sm:text-sm font-medium bg-slate-50/50"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 italic">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold border border-emerald-100">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100"
            >
              {loading 
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') 
                : (mode === 'signin' ? 'Sign in' : 'Create Account')}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-center text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {mode === 'signin' 
                ? "Don't have an account? Create one" 
                : "Already have an account? Sign In"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
