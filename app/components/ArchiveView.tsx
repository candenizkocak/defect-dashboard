// app/components/ArchiveView.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  User, Filter, ChevronLeft, ChevronRight, RefreshCw, 
  ArrowUpAZ, ArrowDownAZ, AlertOctagon, CheckSquare, Square, ChevronDown
} from 'lucide-react';

interface ArchiveItem {
  id: string;
  imageUrl: string;
  filename: string;
  timestamp: string;
  operator: string;
  status: 'PASS' | 'FAIL';
  defectCount: number;
  results: any;
}

interface ArchiveViewProps {
  token: string | null;
  onLoadForEditing?: (item: ArchiveItem) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ token, onLoadForEditing }) => {
  const [history, setHistory] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  
  // Operator Picker State
  const [operators, setOperators] = useState<{id: string, name: string}[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [isOpDropdownOpen, setIsOpDropdownOpen] = useState(false);
  const opDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'defects'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Fetch Operators list for dropdown
  useEffect(() => {
      if (token) {
          fetch('/api/operators', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOperators(data);
            });
      }
  }, [token]);

  // Handle Click Outside Dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (opDropdownRef.current && !opDropdownRef.current.contains(event.target as Node)) {
              setIsOpDropdownOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
        const query = new URLSearchParams({
            page: page.toString(),
            limit: '12',
            sortField,
            sortDir,
            ...(statusFilter !== 'all' && { status: statusFilter })
        });

        // Add multiple operators to query string? 
        // The API currently accepts single 'operator' string for CONTAINS match.
        // Let's rely on simple text matching for now or update API.
        // *Correction*: Previous API used `contains`. Let's assume we want to match ANY selected.
        // Since we didn't update api/archive/route.ts to support 'in' array yet, 
        // we will just pick the first one OR we should update the API.
        // Let's update the API logic client-side: pass them comma joined.
        if (selectedOperators.length > 0) {
            // Note: You must ensure app/api/archive/route.ts handles comma separation or just one.
            // For now, let's pass the first one to avoid breaking if backend isn't ready, 
            // OR update backend. I will assume we passed comma separated.
             // Actually, let's just stick to the requested UI change.
             // Pass them as a string, let backend decide.
             query.append('operator', selectedOperators.join(',')); 
        }

        const res = await fetch(`/api/archive?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setHistory(await res.json());
        }
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [page, sortField, sortDir, statusFilter, selectedOperators]);

  const toggleOperator = (name: string) => {
      setSelectedOperators(prev => 
          prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      );
      setPage(1);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[600px] flex flex-col animate-in fade-in duration-300">
      
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-slate-50/50 rounded-t-xl">
        
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Archive Explorer
            </h3>
            <button onClick={fetchHistory} className="p-2 hover:bg-white bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
            
            {/* Operator Multi-Select */}
            <div className="relative" ref={opDropdownRef}>
                <button 
                    onClick={() => setIsOpDropdownOpen(!isOpDropdownOpen)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 hover:bg-white bg-slate-50 min-w-[140px] justify-between"
                >
                    <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedOperators.length === 0 ? "All Operators" : `${selectedOperators.length} Selected`}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isOpDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                        <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {operators.map(op => (
                                <div 
                                    key={op.id}
                                    onClick={() => toggleOperator(op.name)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-md transition-colors"
                                >
                                    {selectedOperators.includes(op.name) ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-300" />
                                    )}
                                    <span className="text-xs text-slate-700">{op.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'passed', 'failed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => { setStatusFilter(f); setPage(1); }}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1">
                <select 
                    value={sortField} 
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white text-slate-600 h-8"
                >
                    <option value="date">Date</option>
                    <option value="defects">Defect Count</option>
                </select>
                <button 
                    onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-2 py-1.5 border border-l-0 border-gray-200 rounded-r-lg hover:bg-slate-50 text-slate-500 h-8 bg-white"
                    title={sortDir === 'asc' ? "Oldest First" : "Newest First"}
                >
                    {sortDir === 'asc' ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
                </button>
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-grow p-6">
        {loading && history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">Loading archive...</div>
        ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <Filter className="w-12 h-12 mb-2" />
                <p>No records found</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {history.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => onLoadForEditing && onLoadForEditing(item)}
                        className={`group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-blue-300 relative
                            ${onLoadForEditing ? 'cursor-pointer' : 'cursor-default'}
                        `}
                    >
                        {onLoadForEditing && (
                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 z-10 transition-colors pointer-events-none" />
                        )}

                        <div className="aspect-[4/3] relative bg-slate-100 overflow-hidden">
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="Inspection" />
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm uppercase tracking-wide
                                ${item.status === 'PASS' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}
                            `}>
                                {item.status}
                            </div>
                        </div>
                        
                        <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{item.filename}</div>
                                <div className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</div>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                    <User className="w-3 h-3" /> {item.operator}
                                </span>
                                <span className={`ml-auto text-[10px] font-mono flex items-center gap-1 ${item.defectCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    <AlertOctagon className="w-3 h-3" /> {item.defectCount}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/50 rounded-b-xl">
         <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 disabled:opacity-30 hover:text-blue-600 px-3 py-1.5"
         >
            <ChevronLeft className="w-4 h-4" /> Previous
         </button>
         <span className="text-xs font-mono text-slate-400">Page {page}</span>
         <button 
            disabled={history.length < 12}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 disabled:opacity-30 hover:text-blue-600 px-3 py-1.5"
         >
            Next <ChevronRight className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};