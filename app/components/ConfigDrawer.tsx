// app/components/ConfigDrawer.tsx
import React from 'react';
import { Settings, X, ShieldCheck, User, Lock } from 'lucide-react';

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  confThreshold: number;
  setConfThreshold: (val: number) => void;
  useRoi: boolean;
  setUseRoi: (val: boolean) => void;
  maxAllowedDefects: number;
  setMaxAllowedDefects: (val: number) => void;
  operatorName: string;
  setOperatorName: (val: string) => void;
  readOnly?: boolean; // <--- NEW PROP
}

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({ 
  isOpen, onClose, 
  confThreshold, setConfThreshold, 
  useRoi, setUseRoi,
  maxAllowedDefects, setMaxAllowedDefects,
  operatorName, setOperatorName,
  readOnly = false // Default to false
}) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
           <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configuration
           </h2>
           <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
           </button>
        </div>

        {/* ADMIN LOCK BANNER */}
        {readOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Read Only</h3>
                    <p className="text-[10px] text-amber-700 leading-snug mt-1">
                        Global inspection rules are managed by the System Administrator.
                    </p>
                </div>
            </div>
        )}
        
        <div className={`space-y-8 flex-grow ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
           
           {/* Operator Info */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" /> Operator Details
              </h3>
              <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Current Operator ID</label>
                  <input 
                    type="text" 
                    value={operatorName}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed"
                  />
              </div>
           </div>

           <hr className="border-gray-100" />
           
           {/* Detection Sensitivity */}
           <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">AI Confidence</span>
                <span className="text-blue-600 font-mono font-bold">{confThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="0.9" step="0.05" 
                value={confThreshold}
                disabled={readOnly}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-slate-400">Lower values find more defects but increase false positives.</p>
           </div>

           {/* QC Standards */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" /> Quality Standards
              </h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                 <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">Tolerance</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${maxAllowedDefects === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {maxAllowedDefects === 0 ? 'Zero Tolerance' : `<= ${maxAllowedDefects} Defects`}
                    </span>
                 </div>
                 
                 <div className="flex items-center gap-3">
                     <button 
                        disabled={readOnly}
                        onClick={() => setMaxAllowedDefects(Math.max(0, maxAllowedDefects - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-slate-600 disabled:opacity-50"
                     >-</button>
                     <div className="flex-grow text-center font-bold text-slate-800">
                        {maxAllowedDefects}
                     </div>
                     <button 
                        disabled={readOnly}
                        onClick={() => setMaxAllowedDefects(maxAllowedDefects + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-slate-600 disabled:opacity-50"
                     >+</button>
                 </div>
              </div>
           </div>

           {/* Advanced Options */}
           <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">ROI Filter</span>
                <button 
                  disabled={readOnly}
                  onClick={() => setUseRoi(!useRoi)}
                  className={`w-11 h-6 flex items-center rounded-full transition-colors ${useRoi ? 'bg-blue-600' : 'bg-gray-300'} ${readOnly ? 'opacity-50' : ''}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${useRoi ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Smart crop to ignore conveyor belts.
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