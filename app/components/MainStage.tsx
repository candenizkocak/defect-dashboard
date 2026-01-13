// app/components/MainStage.tsx
import React, { useImperativeHandle, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, useControls, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw, Layers } from 'lucide-react';
import { BatchItem } from '../types';
import { DEFECT_COLORS } from '../constants';
import { ImageToolbar, ImageFilters } from './ImageToolbar';

// --- Internal Zoom Controls ---
const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button 
        onClick={() => zoomIn()} 
        className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button 
        onClick={() => zoomOut()} 
        className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button 
        onClick={() => resetTransform()} 
        className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"
        title="Reset View"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Types ---
interface MainStageProps {
  item: BatchItem | null;
  highlightedIndex: number | null;
  onDefectContextMenu: (e: React.MouseEvent, index: number) => void; // <--- NEW PROP
}

export interface MainStageRef {
  zoomToBox: (box: [number, number, number, number]) => void;
}

// --- Component ---
export const MainStage = React.forwardRef<MainStageRef, MainStageProps>(({ item, highlightedIndex, onDefectContextMenu }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // --- Filter State ---
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    invert: false,
    grayscale: false
  });

  // --- Expose Zoom Method to Parent ---
  useImperativeHandle(ref, () => ({
    zoomToBox: (box: [number, number, number, number]) => {
      if (!transformRef.current) return;
      
      const [x1, y1, x2, y2] = box;
      
      // Zoom logic: Scale 2.5x and center on the specific HTML element ID
      transformRef.current.zoomToElement(
        `defect-box-${x1}-${y1}`, 
        2.5, 
        500, 
        "easeOutQuad"
      );
    }
  }));

  // Helper to generate CSS string for filters
  const getFilterStyle = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) invert(${filters.invert ? 1 : 0}) grayscale(${filters.grayscale ? 1 : 0})`;
  };

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
      
      {/* --- Image Enhancement Toolbar --- */}
      <ImageToolbar filters={filters} setFilters={setFilters} />

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
            
            {/* --- The Image (With CSS Filters Applied) --- */}
            <img 
                src={item.src} 
                alt="Inspection Target" 
                className="w-full h-auto object-contain max-h-[700px] transition-all duration-200 ease-linear"
                style={{ filter: getFilterStyle() }} 
            />
            
            {/* --- SVG Overlay (Filters NOT Applied here, so text stays readable) --- */}
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
                   
                   // Dynamic styling based on zoom/selection
                   const strokeW = isHighlighted ? 8 : 4;
                   const fontSize = 24;
                   const labelHeight = 40;
                   const labelPadding = 4;
                   
                   return (
                     <g 
                        key={i} 
                        id={`defect-box-${x1}-${y1}`} 
                        className="transition-all duration-300 cursor-context-menu pointer-events-auto"
                        onContextMenu={(e) => onDefectContextMenu(e, i)} // <--- ATTACHED HANDLER
                     >
                       
                       {/* Bounding Box */}
                       <rect 
                         x={x1} y={y1} width={w} height={h} 
                         fill={isHighlighted ? color : "transparent"} // Transparent catch-all for clicks
                         fillOpacity={isHighlighted ? 0.15 : 0}
                         stroke={color} 
                         strokeWidth={strokeW} 
                         className={isHighlighted ? "animate-pulse" : ""}
                       />

                       {/* Label Background */}
                       <rect 
                         x={x1} y={y1 - labelHeight} 
                         width={Math.max(w, 160)} 
                         height={labelHeight} 
                         fill={color} 
                         opacity={isHighlighted ? 1 : 0.85} 
                       />
                       
                       {/* Label Text */}
                       <text 
                         x={x1 + labelPadding} 
                         y={y1 - (labelHeight / 2) + (fontSize / 3)} 
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