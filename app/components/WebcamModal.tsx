// app/components/WebcamModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';

interface WebcamModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
      }
    };

    startCamera();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
          onCapture(file);
        }
      }, 'image/png');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Camera className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">Live Camera Input</h3>
                <p className="text-xs text-slate-500">Align the tile within the frame</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
           {error ? (
             <div className="text-center text-white/80 space-y-3 p-8">
               <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
               <p>{error}</p>
             </div>
           ) : (
             <>
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover"
               />
               {/* Target Overlay (Crosshair) */}
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
                  <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-white"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-white"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white"></div>
                  </div>
               </div>
             </>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white border-t border-gray-100 flex justify-center gap-4">
           {!error && (
             <button 
               onClick={handleCapture}
               className="group relative flex flex-col items-center gap-2"
             >
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 flex items-center justify-center transition-all group-active:scale-95 group-hover:border-blue-200">
                    <div className="w-12 h-12 bg-red-500 rounded-full shadow-lg group-hover:bg-red-600 transition-colors"></div>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Snap Photo</span>
             </button>
           )}
        </div>
      </div>
    </div>
  );
};