"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, ShieldCheck, Activity, Layers, LayoutDashboard } from 'lucide-react';
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
      // We use window.location to ensure a hard refresh so state is clean
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        
        {/* LEFT: Branding & Marketing */}
        <div className="bg-slate-900 text-white p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Abstract Background Effects */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Cera<span className="text-blue-500">Sight</span></h1>
            <p className="text-slate-400 text-sm">Enterprise Quality Control Platform</p>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Zero-Trust Access</h3>
                <p className="text-slate-400 text-sm">Secure role-based authentication with audit logging.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Real-time Telemetry</h3>
                <p className="text-slate-400 text-sm">Live defect tracking with precision metrics.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl">
                <Layers className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Data Sovereignty</h3>
                <p className="text-slate-400 text-sm">Full database normalization for compliance and retraining.</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 relative z-10">
            &copy; 2026 CeraSight Systems. Enterprise Edition v2.1.
          </div>
        </div>

        {/* RIGHT: Login Form */}
        <div className="p-12 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <LayoutDashboard className="w-8 h-8 text-slate-700" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Authorized Access
              </h2>
              <p className="text-slate-500 mt-2 text-sm">
                Enter your secure credentials to proceed.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Operator ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="e.g. sysadmin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? 'Verifying Identity...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            
            <div className="text-center pt-4 border-t border-gray-100">
               <p className="text-xs text-slate-400">
                 Authorized Personnel Only. <br/>Contact System Administrator for access.
               </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}