// app/utils/exportDataset.ts
import JSZip from 'jszip';
import { BatchItem } from '../types';

// Map class names to IDs (based on your model)
const CLASS_MAP: Record<string, number> = {
  'Halo': 0,
  'Edge defect': 1,
  'Corner defect': 2,
  'White spot': 3,
  'Light patch': 4,
  'Dark spot': 5,
  'Unknown': 6
};

export const exportYOLODataset = async (batch: BatchItem[]) => {
  const zip = new JSZip();
  const validItems = batch.filter(i => i.status === 'done' && i.results);
  
  if (validItems.length === 0) return;

  const imagesFolder = zip.folder("images");
  const labelsFolder = zip.folder("labels");

  // Process items sequentially
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    if (!item.results) continue;

    const filename = item.file.name.split('.')[0];
    const safeName = filename.replace(/[^a-z0-9]/gi, '_');

    // 1. Add Image to Zip
    // We need to convert Base64 back to binary
    const base64Data = item.src.split(',')[1];
    if (imagesFolder) {
        imagesFolder.file(`${safeName}.jpg`, base64Data, { base64: true });
    }

    // 2. Generate YOLO Annotation TXT
    // Format: class_id x_center y_center width height (normalized)
    const imgW = item.results.width;
    const imgH = item.results.height;
    
    const lines = item.results.defects.map(d => {
      const classId = CLASS_MAP[d.class] ?? 6; // Default to 6 if unknown
      
      const [x1, y1, x2, y2] = d.box;
      
      // Calculate Normalized Center and Size
      const w = x2 - x1;
      const h = y2 - y1;
      const cx = x1 + (w / 2);
      const cy = y1 + (h / 2);

      const normCx = (cx / imgW).toFixed(6);
      const normCy = (cy / imgH).toFixed(6);
      const normW = (w / imgW).toFixed(6);
      const normH = (h / imgH).toFixed(6);

      return `${classId} ${normCx} ${normCy} ${normW} ${normH}`;
    });

    if (labelsFolder) {
        labelsFolder.file(`${safeName}.txt`, lines.join('\n'));
    }
  }

  // 3. Add classes.txt metafile
  zip.file("classes.txt", Object.keys(CLASS_MAP).join('\n'));
  
  // 4. Generate and Download
  const content = await zip.generateAsync({ type: "blob" });
  
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CeraSight_Training_Data_${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};