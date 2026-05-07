/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create or update profile (use upsert to handle race condition with useAuth auto-creation)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: data.user.id,
              name: name,
              email: email,
              password: password,
              role: 'MODERATOR',
              can_add: true,
              can_edit: false,
              can_delete: false,
              joining_date: new Date().toISOString().split('T')[0]
            }
          ], { onConflict: 'id' });

        if (profileError) {
          console.error('Error syncing profile:', profileError);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm relative z-10 transition-all duration-300">
        <div>
          <div className="flex justify-center">
            <div className="bg-slate-900 dark:bg-indigo-600 p-4 rounded-xl">
              <Lock className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="mt-8 text-center text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Ashiq's Creation
          </h2>
          <p className="mt-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {mode === 'signin' ? 'Ecosystem Access Protocol' : 'Professional Onboarding'}
          </p>
        </div>

        <form className="mt-10 space-y-5" onSubmit={handleAuth}>
          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  id="full-name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-12 py-4 border border-slate-200 dark:border-slate-800 placeholder-slate-400 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/50"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-slate-200 dark:border-slate-800 placeholder-slate-400 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/50"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-slate-200 dark:border-slate-800 placeholder-slate-400 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/50 pr-12"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 italic"
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
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30"
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
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-[11px] font-black rounded-xl text-white bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading 
                ? (mode === 'signin' ? 'Authenticating...' : 'Processing...') 
                : (mode === 'signin' ? 'Initiate Access' : 'Create Account')}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors uppercase tracking-widest text-[10px]"
            >
              {mode === 'signin' 
                ? "Don't have an account? Join us" 
                : "Already a member? Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
