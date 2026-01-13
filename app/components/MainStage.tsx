// app/components/MainStage.tsx
import React from 'react';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw, Layers } from 'lucide-react';
import { BatchItem } from '../types';
import { DEFECT_COLORS } from '../constants';

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button onClick={() => zoomIn()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700">
        <Plus className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700">
        <Minus className="w-4 h-4" />
      </button>
      <button onClick={() => resetTransform()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

interface MainStageProps {
  item: BatchItem | null;
}

export const MainStage: React.FC<MainStageProps> = ({ item }) => {
  if (!item) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl min-h-[500px] flex items-center justify-center bg-grid-slate-50">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">No Image Selected</h3>
            <p className="text-slate-500 text-sm mt-1">Upload images to the queue to begin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative min-h-[500px] flex items-center justify-center bg-grid-slate-50">
      <TransformWrapper initialScale={1} minScale={0.5} maxScale={8}>
        <ZoomControls />
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <div className="relative w-full h-full">
            <img src={item.src} alt="Inspection Target" className="w-full h-auto object-contain max-h-[700px]" />
            {item.results && (
              <svg 
                viewBox={`0 0 ${item.results.width} ${item.results.height}`} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              >
                {item.results.defects.map((d, i) => {
                   const [x1, y1, x2, y2] = d.box;
                   const color = DEFECT_COLORS[d.class] || DEFECT_COLORS['Unknown'];
                   const w = x2 - x1;
                   const h = y2 - y1;
                   
                   return (
                     <g key={i}>
                       <rect x={x1} y={y1} width={w} height={h} fill="none" stroke={color} strokeWidth="20" opacity="0.9"/>
                       <rect x={x1} y={y1 - 60} width={w < 200 ? 200 : w} height="60" fill={color} opacity="1" />
                       <text x={x1 + 10} y={y1 - 15} fill="white" fontSize="35" fontWeight="bold" fontFamily="sans-serif">
                         {d.class} {(d.score * 100).toFixed(0)}%
                       </text>
                     </g>
                   );
                })}
              </svg>
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};