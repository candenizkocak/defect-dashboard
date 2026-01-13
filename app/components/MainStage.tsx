// app/components/MainStage.tsx
import React, { useImperativeHandle, useRef } from 'react';
import { TransformWrapper, TransformComponent, useControls, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw, Layers } from 'lucide-react';
import { BatchItem } from '../types';
import { DEFECT_COLORS } from '../constants';

// --- Internal Zoom Controls ---
const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button onClick={() => zoomIn()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <Plus className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <Minus className="w-4 h-4" />
      </button>
      <button onClick={() => resetTransform()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Props & Ref Interface ---
interface MainStageProps {
  item: BatchItem | null;
  highlightedIndex: number | null; // <--- New prop to know which one is active
}

export interface MainStageRef {
  zoomToBox: (box: [number, number, number, number]) => void;
}

// --- Component ---
export const MainStage = React.forwardRef<MainStageRef, MainStageProps>(({ item, highlightedIndex }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Expose the zoom function to the parent
  useImperativeHandle(ref, () => ({
    zoomToBox: (box: [number, number, number, number]) => {
      if (!transformRef.current) return;
      
      const [x1, y1, x2, y2] = box;
      
      // Calculate center of defect
      const cx = x1 + (x2 - x1) / 2;
      const cy = y1 + (y2 - y1) / 2;
      
      // Zoom logic
      // We zoom in (scale 2.5 is usually good for inspection) and center on the point
      // The library handles the math of converting image coordinates to viewport coordinates
      transformRef.current.zoomToElement(
        `defect-box-${x1}-${y1}`, // We will add this ID to the SVG rects
        2.5, // Scale factor
        500, // Animation duration (ms)
        "easeOutQuad"
      );
    }
  }));

  if (!item) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl min-h-[500px] flex items-center justify-center bg-grid-slate-50">
        <div className="text-center space-y-4 opacity-50">
          <Layers className="w-12 h-12 mx-auto text-gray-300" />
          <p className="text-slate-500 font-medium">Select an image to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative min-h-[500px] flex items-center justify-center bg-slate-50">
      <TransformWrapper 
        ref={transformRef}
        initialScale={1} 
        minScale={0.5} 
        maxScale={8}
        wheel={{ step: 0.1 }}
      >
        <ZoomControls />
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <div className="relative w-full h-full">
            <img src={item.src} alt="Inspection Target" className="w-full h-auto object-contain max-h-[700px]" />
            
            {/* SVG Overlay */}
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
                   const isHighlighted = i === highlightedIndex;
                   
                   // --- NEW THINNER STYLES ---
                   const strokeW = isHighlighted ? 4 : 2;   // Was 40 / 20
                   const fontSize = 40;                     // Was 45
                   const labelHeight = 80;                  // Was 80
                   const labelPadding = 5;
                   
                   return (
                     <g key={i} id={`defect-box-${x1}-${y1}`} className="transition-all duration-300">
                       
                       {/* The Bounding Box */}
                       <rect 
                         x={x1} y={y1} width={w} height={h} 
                         fill={isHighlighted ? color : "none"} 
                         fillOpacity={isHighlighted ? 0.15 : 0} // Slightly more transparent fill
                         stroke={color} 
                         strokeWidth={strokeW} 
                         className={isHighlighted ? "animate-pulse" : ""}
                       />

                       {/* The Label Tag (Background) */}
                       <rect 
                         x={x1} y={y1 - labelHeight} 
                         width={Math.max(w, 350)} // Ensure label isn't too squished
                         height={labelHeight} 
                         fill={color} 
                         opacity={isHighlighted ? 0.5 : 0.25} 
                       />
                       
                       {/* The Label Text */}
                       <text 
                         x={x1 + labelPadding} 
                         y={y1 - (labelHeight / 2) + (fontSize / 3)} // Vertically centered
                         fill="white" 
                         fontSize={fontSize} 
                         fontWeight="600" 
                         fontFamily="ui-sans-serif, system-ui, sans-serif"
                         style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                       >
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
});

MainStage.displayName = "MainStage";