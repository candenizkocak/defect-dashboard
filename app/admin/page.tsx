// app/admin/page.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, UserPlus, LogOut, ShieldAlert, Trash2, Activity, 
    Sliders, Save, Database, PenTool, Archive as ArchiveIcon,
    Filter, CheckSquare, Square, ChevronDown, ArrowUpAZ, ArrowDownAZ,
    TrendingUp, PieChart, RotateCcw, Lock, KeyRound
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip as ReTooltip, ResponsiveContainer, Cell, AreaChart, Area, Line 
} from 'recharts';
import { toast } from 'sonner';
import { ArchiveView } from '../components/ArchiveView';
import { DEFECT_COLORS } from '../constants';

// Updated Interface
interface User { 
    id: string; 
    name: string;      // Username
    firstName?: string;
    lastName?: string;
    role: string; 
    isActive: boolean; 
    createdAt: string; 
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rules' | 'audit' | 'history'>('overview');
  
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any>({ interventions: [], manuals: [], exports: [] });
  const [charts, setCharts] = useState<any>({ trend: [], defects: [], operators: [] });
  
  // Settings State
  const [settings, setSettings] = useState({ confThreshold: 0.35, useRoi: true, maxAllowedDefects: 0 });
  const [saving, setSaving] = useState(false);

  // User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState(""); // New
  const [newLastName, setNewLastName] = useState("");   // New
  const [newPassword, setNewPassword] = useState("");

  // Audit Filter
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [logSortDir, setLogSortDir] = useState<'asc' | 'desc'>('desc');
  const filterRef = useRef<HTMLDivElement>(null);

  // --- Security & Initialization ---
  useEffect(() => {
    const token = localStorage.getItem('cerasight_token');
    const role = localStorage.getItem('cerasight_role');
    if (!token || role !== 'ADMIN') {
        router.push('/');
    } else {
        if (activeTab === 'overview') fetchCharts(token);
        if (activeTab === 'users') fetchUsers(token);
        if (activeTab === 'audit') {
            fetchUsers(token);
            fetchAuditLogs(token);
        }
        if (activeTab === 'rules') fetchSettings();
    }
  }, [router, activeTab]);

  useEffect(() => {
      if (activeTab === 'audit') fetchAuditLogs();
  }, [logSortDir]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
              setIsFilterOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- API Calls ---

  const fetchCharts = async (token: string) => {
      const res = await fetch('/api/admin/charts', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setCharts(await res.json());
  };

  const fetchUsers = async (token: string) => {
      const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
  };

  const fetchSettings = async () => {
      const res = await fetch('/api/admin/settings'); 
      if (res.ok) setSettings(await res.json());
  };

  const fetchAuditLogs = async (token?: string) => {
      const t = token || localStorage.getItem('cerasight_token');
      if (!t) return;
      const query = new URLSearchParams();
      if (selectedOperators.length > 0) query.append('operators', selectedOperators.join(','));
      query.append('sortDir', logSortDir);
      const res = await fetch(`/api/admin/stats?${query}`, { headers: { 'Authorization': `Bearer ${t}` } });
      if (res.ok) setLogs(await res.json());
  };

  // --- Handlers ---
  const toggleOperator = (name: string) => {
      setSelectedOperators(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSaveSettings = async () => {
      setSaving(true);
      const token = localStorage.getItem('cerasight_token');
      try {
          await fetch('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(settings)
          });
          toast.success("Global Rules Updated");
      } catch(e) { toast.error("Update failed"); }
      setSaving(false);
  };

  // 1. CREATE USER (Updated with Names)
  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const token = localStorage.getItem('cerasight_token');
      
      try {
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                username: newUsername, 
                firstName: newFirstName,
                lastName: newLastName,
                password: newPassword, 
                role: 'OPERATOR' 
            })
          });

          if(res.ok) {
              toast.success("Operator Created");
              setNewUsername(""); 
              setNewPassword(""); 
              setNewFirstName(""); 
              setNewLastName("");
              fetchUsers(token!);
          } else {
              const err = await res.json();
              toast.error(err.error || "Creation failed");
          }
      } catch(e) { toast.error("Creation failed"); }
  };

  // 2. SOFT DELETE USER
  const handleDeleteUser = async (id: string) => {
      if(!confirm("Deactivate this operator? They will no longer be able to login.")) return;
      const token = localStorage.getItem('cerasight_token');
      
      const res = await fetch(`/api/admin/users?id=${id}`, { 
          method: 'DELETE', 
          headers: { 'Authorization': `Bearer ${token}` } 
      });
      
      if (res.ok) {
          toast.success("User deactivated");
          fetchUsers(token!);
      } else {
          toast.error("Failed to deactivate");
      }
  };

  // 3. RESTORE USER
  const handleRestoreUser = async (id: string) => {
      if(!confirm("Reactivate this operator?")) return;
      const token = localStorage.getItem('cerasight_token');
      
      const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id })
      });

      if (res.ok) {
          toast.success("User reactivated");
          fetchUsers(token!);
      } else {
          toast.error("Failed to reactivate");
      }
  };

  // 4. RESET PASSWORD (Email)
  const handleResetPassword = async (user: User) => {
      if(!confirm(`Reset password for ${user.firstName || user.name}? They will receive an email.`)) return;
      
      let emailInput = null;
      const token = localStorage.getItem('cerasight_token');
      
      try {
          // Attempt 1: Try without providing email (assumes User already has one in DB)
          const res = await fetch('/api/admin/users/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ userId: user.id })
          });
          
          const data = await res.json();
          
          // If backend says "User has no email", prompt Admin to provide one
          if (!res.ok && data.error && data.error.includes("provide one")) {
              emailInput = prompt(`This user has no email saved.\nPlease enter an email address for ${user.name}:`);
              if (!emailInput) return; // Cancelled
              
              // Attempt 2: Retry with email
              const res2 = await fetch('/api/admin/users/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user.id, email: emailInput })
              });
              
              if(res2.ok) toast.success("Password reset & email sent");
              else toast.error("Failed to reset");

          } else if (res.ok) {
              toast.success("Password reset & email sent");
          } else {
              toast.error(data.error);
          }
      } catch(e) { toast.error("Reset request failed"); }
  };

  const handleLogout = () => {
      localStorage.clear();
      router.push('/');
  };

  const availableOperators = users.filter(u => u.role === 'OPERATOR');

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600 text-white rounded-xl shadow-purple-200">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Command Center</h1>
                    <p className="text-sm text-slate-500">System Administration & Oversight</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Overview</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Users</button>
                <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'rules' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Rules</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Archive</button>
                <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Logs</button>
                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
            </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* 1. Production Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 lg:col-span-2">
                    <h3 className="text-base font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" /> 7-Day Production Volume & Yield Rate
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts.trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" name="Total Tiles" />
                                <Line type="monotone" dataKey="yieldRate" stroke="#16a34a" strokeWidth={2} name="Yield %" dot={{r: 4}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Defect Pareto */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 lg:col-span-2">
                    <h3 className="text-base font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-blue-600" /> Top Defect Types
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.defects} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                <ReTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                    {charts.defects.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || '#94a3b8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Create Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Add Operator
                    </h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500">First Name</label>
                                <input type="text" required value={newFirstName} onChange={e => setNewFirstName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="John" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500">Last Name</label>
                                <input type="text" required value={newLastName} onChange={e => setNewLastName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Doe" />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Username (Login ID)</label>
                            <input type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="jdoe" />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Initial Password</label>
                            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none" placeholder="••••" />
                        </div>

                        <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-md shadow-purple-200 transition-all">Create Operator</button>
                    </form>
                </div>
                
                {/* Users List */}
                <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Team Roster</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Full Name</th>
                                <th className="px-4 py-3 font-semibold">Username</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className={!u.isActive ? "bg-slate-50/50" : "hover:bg-slate-50"}>
                                    <td className={`px-4 py-3 font-bold ${!u.isActive ? "text-slate-400" : "text-slate-800"}`}>
                                        {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : u.name}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                        @{u.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.isActive ? (
                                            <span className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-full w-fit">
                                                <Lock className="w-3 h-3" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {u.role !== 'ADMIN' && (
                                            <div className="flex justify-end gap-2">
                                                 <button 
                                                    onClick={() => handleResetPassword(u)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                                                    title="Reset Password via Email"
                                                >
                                                    <KeyRound className="w-4 h-4"/>
                                                </button>

                                                {u.isActive ? (
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.id)} 
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                        title="Deactivate Account"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleRestoreUser(u.id)} 
                                                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all"
                                                        title="Reactivate Account"
                                                    >
                                                        <RotateCcw className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- RULES TAB --- */}
        {activeTab === 'rules' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-600" /> Global Inspection Policies
                </h2>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">Minimum AI Confidence</label>
                            <span className="text-purple-600 font-bold">{settings.confThreshold}</span>
                        </div>
                        <input type="range" min="0.1" max="0.9" step="0.05" value={settings.confThreshold} onChange={e => setSettings({...settings, confThreshold: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">Max Allowed Defects (Tolerance)</label>
                            <span className="text-purple-600 font-bold">{settings.maxAllowedDefects}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSettings(s => ({...s, maxAllowedDefects: Math.max(0, s.maxAllowedDefects - 1)}))} className="w-10 h-10 bg-slate-100 rounded-lg text-lg font-bold hover:bg-slate-200">-</button>
                            <span className="text-2xl font-bold text-slate-800 w-12 text-center">{settings.maxAllowedDefects}</span>
                            <button onClick={() => setSettings(s => ({...s, maxAllowedDefects: s.maxAllowedDefects + 1}))} className="w-10 h-10 bg-slate-100 rounded-lg text-lg font-bold hover:bg-slate-200">+</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <input type="checkbox" checked={settings.useRoi} onChange={e => setSettings({...settings, useRoi: e.target.checked})} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                        <div>
                            <p className="text-sm font-bold text-slate-700">Enforce ROI Cropping</p>
                            <p className="text-xs text-slate-500">Automatically crop conveyor belts from images before analysis.</p>
                        </div>
                    </div>
                    <button onClick={handleSaveSettings} disabled={saving} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2">
                        {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Deploy Global Rules</>}
                    </button>
                </div>
            </div>
        )}

        {/* --- GLOBAL HISTORY TAB --- */}
        {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ArchiveView token={localStorage.getItem('cerasight_token')} />
            </div>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'audit' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Filter & Sort Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter Logs:
                    </h3>
                    
                    {/* Multi-Select Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 hover:bg-slate-50 bg-white min-w-[200px] justify-between"
                        >
                            <span>
                                {selectedOperators.length === 0 
                                    ? "Select Operators..." 
                                    : `${selectedOperators.length} selected`}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                                <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {availableOperators.length === 0 ? (
                                        <div className="text-xs text-slate-400 p-2 text-center">No active operators found</div>
                                    ) : (
                                        availableOperators.map(op => (
                                            <div 
                                                key={op.id}
                                                onClick={() => toggleOperator(op.name)}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 cursor-pointer rounded-lg transition-colors"
                                            >
                                                {selectedOperators.includes(op.name) ? (
                                                    <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                                                        <CheckSquare className="w-3 h-3 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 border border-slate-300 rounded" />
                                                )}
                                                <span className="text-sm font-medium text-slate-700">{op.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sort Toggle */}
                    <button 
                        onClick={() => setLogSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 ml-auto"
                    >
                        {logSortDir === 'desc' ? "Newest First" : "Oldest First"}
                        {logSortDir === 'desc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
                    </button>

                    <button 
                        onClick={() => fetchAuditLogs()} 
                        className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        Apply Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 1. INTERVENTIONS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-red-500"/> False Positives (Deletions)
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.interventions.length === 0 && <p className="text-xs text-slate-400 italic">No interventions recorded.</p>}
                            {logs.interventions.map((log: any) => (
                                <div key={log.id} className="text-xs p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 flex flex-col gap-1">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        {log.session.operator.name}
                                    </span>
                                    <span>
                                        Rejected a <span className="font-bold underline">{log.detection.class.label}</span>
                                    </span>
                                    <span className="text-[10px] text-red-400">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. MANUAL ADDITIONS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-amber-500"/> Manual Annotations
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.manuals.length === 0 && <p className="text-xs text-slate-400 italic">No annotations recorded.</p>}
                            {logs.manuals.map((log: any) => (
                                <div key={log.id} className="text-xs p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 flex flex-col gap-1">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        {log.image?.batch?.session?.operator?.name || 'Unknown'}
                                    </span>
                                    <span>
                                        Added a <span className="font-bold underline">{log.class.label}</span>
                                    </span>
                                    <span className="text-[10px] text-amber-400">{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. EXPORTS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-500"/> Data Exports
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.exports.length === 0 && <p className="text-xs text-slate-400 italic">No exports recorded.</p>}
                            {logs.exports.map((log: any) => (
                                <div key={log.id} className="text-xs p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex flex-col gap-1">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {log.batch.session.operator.name}
                                    </span>
                                    <span>
                                        Exported <span className="font-bold">{log.imageCount} images</span> (YOLO)
                                    </span>
                                    <span className="text-[10px] text-blue-400">{new Date(log.exportedAt).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        )}

      </div>
    </div>
  );
}