// app/components/Sidebar.tsx
import React from 'react';
import { useDropzone } from 'react-dropzone';
// Add Play, Square imports
import { Upload, Loader2, ZoomIn, Layers, Trash2, CheckCircle, BarChart3, Image as ImageIcon, Play, Square } from 'lucide-react';
import { BatchItem } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DEFECT_COLORS } from '../constants';

interface SidebarProps {
  batch: BatchItem[];
  selectedIndex: number;
  isProcessing: boolean;
  globalStats: { data: any[], total: number };
  onUpload: (files: File[]) => void;
  onAnalyze: () => void;
  onSelect: (index: number) => void;
  onRemove: (index: number, e: React.MouseEvent) => void;
  onOpenChart: () => void;
  
  // --- NEW PROPS ---
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  batch, selectedIndex, isProcessing, globalStats,
  onUpload, onAnalyze, onSelect, onRemove, onOpenChart,
  isSimulating, onToggleSimulation
}) => {
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (acceptedFiles) => onUpload(acceptedFiles),
    disabled: isProcessing || isSimulating // Disable drop during sim
  });

  return (
    <aside className="col-span-12 lg:col-span-3 space-y-6 flex flex-col h-[calc(100vh-8rem)] sticky top-24">
      
      {/* 1. Actions Area */}
      <div className="bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm space-y-3 flex-shrink-0 backdrop-blur-sm">
         
         <div 
            {...getRootProps()} 
            className={`
              w-full py-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}
              ${(isProcessing || isSimulating) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
         >
            <input {...getInputProps()} />
            <div className={`p-2 rounded-full ${isDragActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                <Upload className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                {isDragActive ? "Drop tiles here..." : "Upload Tiles"}
              </p>
              <p className="text-[10px] text-slate-400">Support JPG, PNG</p>
            </div>
         </div>

         {/* Standard Analyze Button */}
         <button
            onClick={onAnalyze}
            disabled={batch.length === 0 || isProcessing || isSimulating}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg 
                ${batch.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 
                isProcessing ? 'bg-blue-600/90 text-white cursor-wait' : 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-900/20'}`}
         >
            {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
                <><ZoomIn className="w-4 h-4" /> Analyze Batch ({batch.filter(i => i.status === 'idle').length})</>
            )}
         </button>

         {/* --- NEW SIMULATION BUTTON --- */}
         {batch.length > 0 && (
             <button
                onClick={onToggleSimulation}
                disabled={isProcessing}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border
                    ${isSimulating 
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}
                `}
             >
                {isSimulating ? (
                    <><Square className="w-3.5 h-3.5 fill-current" /> Stop Slideshow</>
                ) : (
                    <><Play className="w-3.5 h-3.5 fill-current" /> Start Slideshow</>
                )}
             </button>
         )}
      </div>

      {/* 2. Mini Chart */}
      {globalStats.total > 0 && (
         <div 
            onClick={onOpenChart}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all group flex-shrink-0"
         >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" /> Batch Stats
                </h3>
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

      {/* 3. Queue List */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-0 shadow-sm flex-grow flex flex-col overflow-hidden min-h-[300px]">
         <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Layers className="w-4 h-4 text-slate-400" />
                <h3>Queue</h3>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {batch.length}
            </span>
         </div>

         <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {batch.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
                <ImageIcon className="w-8 h-8" />
                <p className="text-xs">No images queued</p>
              </div>
            )}
            {batch.map((item, idx) => (
                <div 
                    key={item.id}
                    onClick={() => onSelect(idx)}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                        ${selectedIndex === idx ? 'bg-blue-50/80 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}
                    `}
                >
                    <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                        <img src={item.src} className="w-full h-full object-cover" alt="thumbnail" />
                        {item.status === 'done' && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white drop-shadow-md" /></div>}
                        {item.status === 'processing' && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                        {/* Indicate active item during simulation */}
                        {isSimulating && selectedIndex === idx && <div className="absolute inset-0 ring-2 ring-red-500 ring-inset" />}
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedIndex === idx ? 'text-blue-700' : 'text-slate-700'}`}>
                            {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                            {item.status === 'done' ? `${item.results?.defects.length} defects` : item.status}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => onRemove(idx, e)}
                        disabled={isSimulating} // Disable remove during sim
                        className="p-1.5 hover:bg-red-50 rounded-md text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
         </div>
      </div>
    </aside>
  );
};