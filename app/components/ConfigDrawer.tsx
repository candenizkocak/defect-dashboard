// app/components/ConfigDrawer.tsx
import React from 'react';
import { Settings, X } from 'lucide-react';

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  confThreshold: number;
  setConfThreshold: (val: number) => void;
  useRoi: boolean;
  setUseRoi: (val: boolean) => void;
}

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({ 
  isOpen, onClose, confThreshold, setConfThreshold, useRoi, setUseRoi 
}) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
           <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configuration
           </h2>
           <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
           </button>
        </div>
        
        <div className="space-y-8 flex-grow">
           <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">Sensitivity Threshold</span>
                <span className="text-blue-600 font-mono font-bold">{confThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="0.9" step="0.05" 
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-400">Higher values detect fewer but more certain defects.</p>
           </div>

           <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">ROI Filter</span>
                <button 
                  onClick={() => setUseRoi(!useRoi)}
                  className={`w-11 h-6 flex items-center rounded-full transition-colors ${useRoi ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${useRoi ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Uses edge detection to find the tile and ignore background conveyor belt noise.
              </p>
           </div>
        </div>
        
        <div className="pt-6 border-t border-gray-100">
           <p className="text-xs text-slate-400 text-center">Powered by YOLO11 & Modal</p>
        </div>
      </div>
    </div>
  );
};