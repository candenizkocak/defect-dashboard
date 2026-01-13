// app/components/Sidebar.tsx
import React from 'react';
import { Upload, Loader2, ZoomIn, Layers, Trash2, CheckCircle, BarChart3 } from 'lucide-react';
import { BatchItem } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DEFECT_COLORS } from '../constants';

interface SidebarProps {
  batch: BatchItem[];
  selectedIndex: number;
  isProcessing: boolean;
  globalStats: { data: any[], total: number };
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  onSelect: (index: number) => void;
  onRemove: (index: number, e: React.MouseEvent) => void;
  onOpenChart: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  batch, selectedIndex, isProcessing, globalStats,
  onUpload, onAnalyze, onSelect, onRemove, onOpenChart
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <aside className="col-span-12 lg:col-span-3 space-y-6 flex flex-col h-[calc(100vh-8rem)] sticky top-24">
      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3 flex-shrink-0">
         <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 hover:text-blue-700 group"
         >
            <div className="p-1.5 bg-gray-100 rounded-md group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600">
                <Upload className="w-4 h-4" />
            </div>
            Upload Tiles
         </button>
         <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />

         <button
            onClick={onAnalyze}
            disabled={batch.length === 0 || isProcessing}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/10
                ${batch.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                isProcessing ? 'bg-blue-600/90 text-white cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
         >
            {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
                <><ZoomIn className="w-4 h-4" /> Analyze Batch ({batch.filter(i => i.status === 'idle').length})</>
            )}
         </button>
      </div>

      {/* Mini Chart */}
      {globalStats.total > 0 && (
         <div 
            onClick={onOpenChart}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-300 transition-all group flex-shrink-0"
         >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" /> Batch Distribution
                </h3>
                <ZoomIn className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
            </div>
            <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalStats.data}>
                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {globalStats.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || DEFECT_COLORS['Unknown']} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
      )}

      {/* Queue */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex-grow flex flex-col overflow-hidden min-h-[300px]">
         <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Layers className="w-4 h-4 text-slate-400" />
                <h3>Batch Queue</h3>
            </div>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-slate-500">
                {batch.length}
            </span>
         </div>
         <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {batch.map((item, idx) => (
                <div 
                    key={item.id}
                    onClick={() => onSelect(idx)}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                        ${selectedIndex === idx ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-transparent'}
                    `}
                >
                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                        <img src={item.src} className="w-full h-full object-cover" alt="thumbnail" />
                        {item.status === 'done' && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-white drop-shadow-md" /></div>}
                        {item.status === 'processing' && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>}
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedIndex === idx ? 'text-blue-700' : 'text-slate-700'}`}>
                            {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                            {item.status}
                            {item.results && <span className="text-slate-300">• {item.results.defects.length} defects</span>}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => onRemove(idx, e)}
                        className="p-1.5 hover:bg-red-50 rounded-md text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
         </div>
      </div>
    </aside>
  );
};