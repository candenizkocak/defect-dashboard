// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('cerasight_token');
    const role = localStorage.getItem('cerasight_role');
    
    if (token && role) {
      if (role === 'ADMIN') router.push('/admin');
      else router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Authentication failed");

      // 1. SAVE SESSION
      localStorage.setItem('cerasight_token', data.token);
      localStorage.setItem('cerasight_user', data.operator);
      localStorage.setItem('cerasight_role', data.role);
      
      toast.success(`Welcome back, ${data.operator}`);
      
      // 2. ROLE BASED REDIRECT
      if (data.role === 'ADMIN') {
          window.location.href = '/admin';
      } else {
          window.location.href = '/dashboard';
      }

    } catch (err: any) {
      toast.error(err.message);
      setPassword(""); // Clear password on fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      
      {/* LEFT SIDE: Full Height Image */}
      {/* Hidden on mobile, takes up 55% of width on large screens */}
      <div className="hidden md:block md:w-1/2 lg:w-[55%] relative bg-slate-100">
        <img 
          src="/color_2.0_shelfs.png" 
          alt="Studio Setting" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Optional: subtle overlay if image is too bright, currently transparent */}
        <div className="absolute inset-0 bg-black/5"></div> 
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-white">
        
        <div className="w-full max-w-[400px] space-y-10">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Cera<span className="text-blue-700">Sight</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Enter your secure credentials to proceed.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Operator ID
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="e.g. sysadmin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center">
             <p className="text-xs text-slate-400 leading-relaxed">
               Authorized Personnel Only. <br/>
               Contact System Administrator for access.
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}