// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, RefreshCw } from 'lucide-react'; // Added RefreshCw
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Login Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

      // --- NEW: CHECK FOR FORCED PASSWORD CHANGE ---
      if (data.requireChange) {
          setTempUserId(data.userId);
          setIsChangingPassword(true);
          toast.message("Safety Check", { description: "You must set a new password to proceed." });
          setLoading(false);
          return;
      }

      // Normal Login Success
      finalizeLogin(data);

    } catch (err: any) {
      toast.error(err.message);
      setPassword(""); 
    } finally {
      if(!isChangingPassword) setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: tempUserId, 
                oldPassword: password, // Send the temp password to verify
                newPassword: newPassword 
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        toast.success("Password updated successfully");
        finalizeLogin(data);

      } catch (err: any) {
          toast.error(err.message);
          setLoading(false);
      }
  };

  const finalizeLogin = (data: any) => {
      localStorage.setItem('cerasight_token', data.token);
      localStorage.setItem('cerasight_user', data.operator);
      localStorage.setItem('cerasight_role', data.role);
      
      toast.success(`Welcome back, ${data.operator}`);
      
      if (data.role === 'ADMIN') window.location.href = '/admin';
      else window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      
      {/* LEFT SIDE: Full Height Image */}
      <div className="hidden md:block md:w-1/2 lg:w-[55%] relative bg-slate-100">
        <img src="/color_2.0_shelfs.png" alt="Studio Setting" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-black/5"></div> 
      </div>

      {/* RIGHT SIDE: Form Container */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-white">
        
        <div className="w-full max-w-[400px] space-y-10">
          
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Cera<span className="text-blue-700">Sight</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {isChangingPassword ? "Update your credentials." : "Enter your secure credentials to proceed."}
            </p>
          </div>

          {!isChangingPassword ? (
             /* --- NORMAL LOGIN FORM --- */
             <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Operator ID</label>
                    <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors"><User className="w-5 h-5" /></div>
                        <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-all font-medium" placeholder="e.g. Operator-1" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Password</label>
                    <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors"><Lock className="w-5 h-5" /></div>
                        <input type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-all font-medium" placeholder="••••••••" />
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait mt-2">
                    {loading ? 'Authenticating...' : 'Sign In'} {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
             </form>
          ) : (
             /* --- CHANGE PASSWORD FORM --- */
             <form onSubmit={handleChangePassword} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm border border-blue-100 flex gap-2">
                    <RefreshCw className="w-5 h-5 flex-shrink-0" />
                    <p>This is a temporary password. Please set a new permanent password to continue.</p>
                </div>
                
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">New Password</label>
                    <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors"><Lock className="w-5 h-5" /></div>
                        <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-all font-medium" placeholder="New secure password" />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait mt-2">
                    {loading ? 'Updating...' : 'Set Password & Login'} {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
             </form>
          )}

          <div className="text-center">
             <p className="text-xs text-slate-400 leading-relaxed">Authorized Personnel Only. <br/>Contact System Administrator for access.</p>
          </div>

        </div>
      </div>
    </div>
  );
}