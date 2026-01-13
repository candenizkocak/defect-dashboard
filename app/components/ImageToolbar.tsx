// app/components/ImageToolbar.tsx
import React from 'react';
import { Sun, Contrast, RotateCcw, EyeOff, Sparkles } from 'lucide-react';

export interface ImageFilters {
  brightness: number;
  contrast: number;
  invert: boolean;
  grayscale: boolean;
}

interface ImageToolbarProps {
  filters: ImageFilters;
  setFilters: React.Dispatch<React.SetStateAction<ImageFilters>>;
}

export const ImageToolbar: React.FC<ImageToolbarProps> = ({ filters, setFilters }) => {
  
  const updateFilter = (key: keyof ImageFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ brightness: 100, contrast: 100, invert: false, grayscale: false });
  };

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-sm border border-gray-200/50 w-48 transition-opacity duration-200 hover:opacity-100 opacity-80">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-500" /> Filters
        </span>
        <button 
            onClick={resetFilters}
            className="p-1 hover:bg-gray-100 rounded text-slate-400 hover:text-slate-600"
            title="Reset Filters"
        >
            <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Brightness */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brightness</span>
            <span>{filters.brightness}%</span>
        </div>
        <input 
            type="range" min="50" max="150" step="5"
            value={filters.brightness}
            onChange={(e) => updateFilter('brightness', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-1 mt-1">
        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Contrast className="w-3 h-3" /> Contrast</span>
            <span>{filters.contrast}%</span>
        </div>
        <input 
            type="range" min="50" max="150" step="5"
            value={filters.contrast}
            onChange={(e) => updateFilter('contrast', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Toggles */}
      <div className="flex gap-2 mt-2">
        <button
            onClick={() => updateFilter('invert', !filters.invert)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-colors flex items-center justify-center gap-1
                ${filters.invert ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
            `}
        >
            <EyeOff className="w-3 h-3" /> Invert
        </button>
        <button
            onClick={() => updateFilter('grayscale', !filters.grayscale)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-colors flex items-center justify-center gap-1
                ${filters.grayscale ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
            `}
        >
            B&W
        </button>
      </div>
    </div>
  );
};