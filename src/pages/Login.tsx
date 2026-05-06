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
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfb] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-50/50 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-white relative z-10"
      >
        <div>
          <div className="flex justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-200"
            >
              <Lock className="h-7 w-7 text-white" />
            </motion.div>
          </div>
          <h2 className="mt-8 text-center text-4xl font-serif font-bold text-slate-900 tracking-tight">
            Ashik's Creation
          </h2>
          <p className="mt-3 text-center text-sm text-slate-500 font-medium tracking-wide">
            {mode === 'signin' ? 'Welcome back to your dashboard' : 'Join our professional accounting network'}
          </p>
        </div>

        <form className="mt-10 space-y-5" onSubmit={handleAuth}>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    id="full-name"
                    name="name"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-12 py-4 border border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all sm:text-sm font-medium bg-slate-50/30"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all sm:text-sm font-medium bg-slate-50/30"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-slate-100 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all sm:text-sm font-medium bg-slate-50/30"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 italic"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold border border-emerald-100"
              >
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4.5 px-4 border border-transparent text-[15px] font-bold rounded-2xl text-white bg-slate-900 hover:bg-black focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
            >
              {loading 
                ? (mode === 'signin' ? 'Securing entrance...' : 'Building profile...') 
                : (mode === 'signin' ? 'Sign in to creation' : 'Create professional account')}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px]"
            >
              {mode === 'signin' 
                ? "Don't have an account? Join us" 
                : "Already a member? Sign In"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
