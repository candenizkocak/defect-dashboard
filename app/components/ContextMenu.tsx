// app/components/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import { Trash2, XCircle, AlertOctagon } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onDelete }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Close on scroll to prevent floating menu in wrong place
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Adjust position if close to edge of screen (basic collision detection)
  const style = {
    top: y,
    left: x,
  };

  return (
    <div 
      ref={menuRef}
      style={style}
      className="fixed z-[100] bg-white border border-slate-200 rounded-lg shadow-2xl py-1 w-56 animate-in fade-in zoom-in duration-100 origin-top-left"
    >
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50 rounded-t-lg">
        <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Defect Action</span>
      </div>
      
      <div className="p-1">
        <button 
            onClick={() => { onDelete(); }}
            className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md flex items-center gap-2 transition-colors"
        >
            <Trash2 className="w-4 h-4" />
            Mark as False Positive
        </button>
        <button 
            onClick={onClose}
            className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md flex items-center gap-2 transition-colors"
        >
            <XCircle className="w-4 h-4" />
            Cancel
        </button>
      </div>
    </div>
  );
};