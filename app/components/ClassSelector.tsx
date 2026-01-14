// app/components/ClassSelector.tsx
import React, { useEffect, useRef } from 'react';
import { DEFECT_COLORS } from '../constants';
import { X } from 'lucide-react';

interface ClassSelectorProps {
  x: number;
  y: number;
  onSelect: (className: string) => void;
  onCancel: () => void;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({ x, y, onSelect, onCancel }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  return (
    <div 
      ref={menuRef}
      style={{ top: y, left: x }}
      className="fixed z-[100] bg-white border border-slate-200 rounded-lg shadow-2xl w-56 animate-in fade-in zoom-in duration-100 flex flex-col overflow-hidden"
    >
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-500 uppercase">Select Defect Type</span>
        <button onClick={onCancel}><X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {Object.keys(DEFECT_COLORS).map((cls) => (
          <button
            key={cls}
            onClick={() => onSelect(cls)}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2 transition-colors"
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEFECT_COLORS[cls] }} />
            {cls}
          </button>
        ))}
      </div>
    </div>
  );
};