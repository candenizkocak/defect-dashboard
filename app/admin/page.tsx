// app/admin/page.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, UserPlus, LogOut, ShieldAlert, Trash2, Activity, 
    Sliders, Save, Database, PenTool, Archive as ArchiveIcon,
    Filter, CheckSquare, Square, ChevronDown, ArrowUpAZ, ArrowDownAZ 
} from 'lucide-react';
import { toast } from 'sonner';
import { ArchiveView } from '../components/ArchiveView';

interface User { id: string; name: string; role: string; createdAt: string; }

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'audit' | 'history'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any>({ interventions: [], manuals: [], exports: [] });
  
  // Settings State
  const [settings, setSettings] = useState({ confThreshold: 0.35, useRoi: true, maxAllowedDefects: 0 });
  const [saving, setSaving] = useState(false);

  // User Form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Audit Filter & Sort State
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
        // Initial data fetch
        if (activeTab === 'users') fetchUsers(token);
        if (activeTab === 'audit') {
            fetchUsers(token); // Need users list for the filter dropdown
            fetchAuditLogs(token);
        }
        if (activeTab === 'rules') fetchSettings();
    }
  }, [router, activeTab]);

  // Re-fetch audit logs when sort direction changes
  useEffect(() => {
      if (activeTab === 'audit') fetchAuditLogs();
  }, [logSortDir]);

  // Handle click outside dropdown
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
      if (selectedOperators.length > 0) {
          query.append('operators', selectedOperators.join(','));
      }
      query.append('sortDir', logSortDir);
      
      const res = await fetch(`/api/admin/stats?${query}`, { headers: { 'Authorization': `Bearer ${t}` } });
      if (res.ok) setLogs(await res.json());
  };

  // --- Handlers ---

  const toggleOperator = (name: string) => {
      setSelectedOperators(prev => 
          prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      );
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

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const token = localStorage.getItem('cerasight_token');
      await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ username: newUsername, password: newPassword, role: 'OPERATOR' })
      });
      toast.success("Operator Created");
      setNewUsername(""); setNewPassword(""); fetchUsers(token!);
  };

  const handleDeleteUser = async (id: string) => {
      if(!confirm("Are you sure?")) return;
      const token = localStorage.getItem('cerasight_token');
      await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchUsers(token!);
  };

  const handleLogout = () => {
      localStorage.clear();
      router.push('/');
  };

  // Get list of operators for the dropdown
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
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Users</button>
                <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'rules' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>System Rules</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Global Archive</button>
                <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Audit Logs</button>
                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
            </div>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Add Operator
                    </h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <input type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Username" />
                        <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Password" />
                        <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold">Create User</button>
                    </form>
                </div>
                <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Active Users</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="px-4 py-3 font-medium">{u.name}</td>
                                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                                    <td className="px-4 py-3 text-right">{u.role !== 'ADMIN' && <button onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}</td>
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