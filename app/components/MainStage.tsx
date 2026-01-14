// app/components/MainStage.tsx
import React, { useImperativeHandle, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, useControls, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw, Layers } from 'lucide-react';
import { BatchItem } from '../types';
import { DEFECT_COLORS } from '../constants';
import { ImageToolbar, ImageFilters } from './ImageToolbar';

// ... (ZoomControls component remains the same) ...
const ZoomControls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
        <button onClick={() => zoomIn()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"><Plus className="w-4 h-4" /></button>
        <button onClick={() => zoomOut()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"><Minus className="w-4 h-4" /></button>
        <button onClick={() => resetTransform()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95"><RefreshCw className="w-4 h-4" /></button>
        </div>
    );
};


interface MainStageProps {
  item: BatchItem | null;
  highlightedIndex: number | null;
  onDefectContextMenu: (e: React.MouseEvent, index: number) => void;
  // --- NEW PROP: Callback when drawing finishes ---
  onDrawComplete: (box: [number, number, number, number], clientX: number, clientY: number) => void;
}

export interface MainStageRef {
  zoomToBox: (box: [number, number, number, number]) => void;
}

export const MainStage = React.forwardRef<MainStageRef, MainStageProps>(({ 
    item, highlightedIndex, onDefectContextMenu, onDrawComplete 
}, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // --- States ---
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100, contrast: 100, invert: false, grayscale: false
  });
  
  const [isDrawMode, setDrawMode] = useState(false); // Drawing Mode Toggle
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentBox, setCurrentBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  useImperativeHandle(ref, () => ({
    zoomToBox: (box) => {
      if (!transformRef.current) return;
      const [x1, y1] = box;
      transformRef.current.zoomToElement(`defect-box-${x1}-${y1}`, 2.5, 500, "easeOutQuad");
    }
  }));

  const getFilterStyle = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) invert(${filters.invert ? 1 : 0}) grayscale(${filters.grayscale ? 1 : 0})`;
  };

  // --- MOUSE HANDLERS FOR DRAWING ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (!isDrawMode || !imgRef.current) return;
      e.preventDefault();

      // Get relative coordinates on the image
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate scale factor (natural vs displayed)
      const scaleX = imgRef.current.naturalWidth / rect.width;
      const scaleY = imgRef.current.naturalHeight / rect.height;

      setStartPoint({ x: x * scaleX, y: y * scaleY });
      setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawMode || !isDragging || !startPoint || !imgRef.current) return;
      
      const rect = imgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (imgRef.current.naturalWidth / rect.width);
      const y = (e.clientY - rect.top) * (imgRef.current.naturalHeight / rect.height);

      // Determine Box
      const x1 = Math.min(startPoint.x, x);
      const y1 = Math.min(startPoint.y, y);
      const w = Math.abs(x - startPoint.x);
      const h = Math.abs(y - startPoint.y);

      setCurrentBox({ x: x1, y: y1, w, h });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (!isDrawMode || !isDragging || !currentBox) {
          setIsDragging(false);
          setStartPoint(null);
          setCurrentBox(null);
          return;
      }
      
      // Stop Drawing
      setIsDragging(false);
      setStartPoint(null);
      
      // Pass the final box to parent
      // Note: We pass [x1, y1, x2, y2]
      onDrawComplete(
        [currentBox.x, currentBox.y, currentBox.x + currentBox.w, currentBox.y + currentBox.h],
        e.clientX, e.clientY
      );
      
      setCurrentBox(null);
      setDrawMode(false); // Auto-exit draw mode
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
      
      <ImageToolbar 
        filters={filters} setFilters={setFilters} 
        isDrawMode={isDrawMode} setDrawMode={setDrawMode} 
      />

      <TransformWrapper 
        ref={transformRef}
        initialScale={1} minScale={0.5} maxScale={8}
        disabled={isDrawMode} // <--- DISABLE PANNING WHEN DRAWING
      >
        <ZoomControls />
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            // Attach handlers to container
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: isDrawMode ? 'crosshair' : 'grab' }}
          >
            <div className="relative">
                <img 
                    ref={imgRef}
                    src={item.src} 
                    alt="Inspection Target" 
                    className="w-auto h-auto max-h-[700px] max-w-full select-none"
                    style={{ filter: getFilterStyle() }} 
                    draggable={false}
                />
                
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
                        const strokeW = isHighlighted ? 8 : 4;
                    
                        return (
                            <g key={i} id={`defect-box-${x1}-${y1}`} className="transition-all duration-300 cursor-context-menu pointer-events-auto" onContextMenu={(e) => onDefectContextMenu(e, i)}>
                                <rect x={x1} y={y1} width={w} height={h} fill={isHighlighted ? color : "transparent"} fillOpacity={isHighlighted ? 0.15 : 0} stroke={color} strokeWidth={strokeW} className={isHighlighted ? "animate-pulse" : ""} />
                                <rect x={x1} y={y1 - 40} width={Math.max(w, 160)} height={40} fill={color} opacity={isHighlighted ? 1 : 0.85} />
                                <text x={x1 + 4} y={y1 - 12} fill="white" fontSize="24" fontWeight="600" fontFamily="sans-serif">{d.class} {(d.score * 100).toFixed(0)}%</text>
                            </g>
                        );
                    })}

                    {/* Temporary Draw Box */}
                    {currentBox && (
                        <rect 
                            x={currentBox.x} y={currentBox.y} width={currentBox.w} height={currentBox.h}
                            fill="rgba(37, 99, 235, 0.2)"
                            stroke="#2563eb" strokeWidth="4" strokeDasharray="10 5"
                        />
                    )}
                </svg>
                )}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
});

MainStage.displayName = "MainStage";