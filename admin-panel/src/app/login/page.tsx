'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data.data;

      if (user.role !== 'Admin' && user.role !== 'Moderator') {
        throw new Error('Unauthorized role level.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-12 h-12 rounded-xl bg-[#00ff00] flex items-center justify-center mb-6">
            <ShieldCheck className="text-black w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">OPERATIONS</h1>
          <p className="text-white/30 mt-2 text-[10px] font-bold uppercase tracking-[0.2em]">Authorized Access Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 border border-red-500/20 bg-red-500/5 text-red-500 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Terminal ID</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-xl focus:border-[#00ff00]/30 outline-none text-white transition-all placeholder:text-white/10 font-medium text-sm"
                  placeholder="name@leazo.in"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Key-Code</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-xl focus:border-[#00ff00]/30 outline-none text-white transition-all placeholder:text-white/10 font-medium text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-white/20 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff00] hover:bg-[#00dd00] disabled:opacity-50 text-black font-bold py-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                AUTHENTICATE
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-white/10 text-[9px] font-bold uppercase tracking-[0.3em] mt-16">
          System Control Panel v2.0
        </p>
      </motion.div>
    </div>
  );
}
