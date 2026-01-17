// app/utils/processing.ts
import { Crop } from "../types";

export const generateCrops = (imgSrc: string, defects: any[]): Promise<Crop[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // --- THE FIX ---
    // This tells the browser to request CORS headers. 
    // Without this, the canvas gets "tainted" when drawing remote images.
    img.crossOrigin = "Anonymous"; 
    
    img.src = imgSrc;

    img.onload = () => {
      const newCrops: Crop[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve([]);
        return;
      }

      defects.forEach((d: any) => {
        const padding = 60; 
        const [x1, y1, x2, y2] = d.box;
        const w = x2 - x1;
        const h = y2 - y1;
        
        // Ensure boundaries
        const cx = Math.max(0, x1 - padding);
        const cy = Math.max(0, y1 - padding);
        const cw = w + (padding * 2);
        const ch = h + (padding * 2);
        
        canvas.width = cw;
        canvas.height = ch;
        
        try {
            ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
            newCrops.push({ src: canvas.toDataURL(), label: d.class, score: d.score });
        } catch (e) {
            console.error("Canvas Taint Error:", e);
            // If it still fails, push a placeholder or skip
        }
      });
      resolve(newCrops);
    };

    img.onerror = (err) => {
        console.error("Failed to load image for cropping", err);
        resolve([]);
    };
  });
};

// ... (downloadBatchCSV remains the same) ...
import { BatchItem } from "../types";

export const downloadBatchCSV = (batch: BatchItem[]) => {
  const processedItems = batch.filter(item => item.status === 'done' && item.results?.defects);
  if (processedItems.length === 0) return;

  const headers = ["Filename", "Defect Type", "Confidence", "x_min", "y_min", "x_max", "y_max"];
  let csvRows: string[] = [];
  
  processedItems.forEach(item => {
      const rows = item.results!.defects.map((d: any) => [
          item.file.name,
          d.class,
          (d.score * 100).toFixed(2) + "%",
          d.box[0], d.box[1], d.box[2], d.box[3]
      ]);
      csvRows = [...csvRows, ...rows.map((r) => r.join(","))];
  });

  const csvContent = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `CeraSight_Batch_Report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};