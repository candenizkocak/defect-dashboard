// app/utils/reportGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BatchItem } from '../types';

export const generatePDFReport = (batch: BatchItem[], heatmapCanvas: HTMLCanvasElement | null) => {
  const doc = new jsPDF();
  const processedItems = batch.filter(i => i.status === 'done' && i.results);
  const totalItems = processedItems.length;
  
  // --- Calculate Stats ---
  let totalDefects = 0;
  const defectCounts: Record<string, number> = {};
  let defectFree = 0;

  processedItems.forEach(item => {
    const defects = item.results?.defects || [];
    if (defects.length === 0) defectFree++;
    totalDefects += defects.length;
    defects.forEach(d => {
      defectCounts[d.class] = (defectCounts[d.class] || 0) + 1;
    });
  });

  const yieldRate = totalItems ? ((defectFree / totalItems) * 100).toFixed(1) : "0";

  // --- 1. HEADER & BRANDING ---
  // Blue Accents
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, 210, 20, 'F'); // Top bar

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("CeraSight Inspection Report", 14, 13);

  // Metadata
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Batch ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 14, 35);

  // --- 2. EXECUTIVE SUMMARY (KPIs) ---
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("Executive Summary", 14, 50);

  // Draw KPI Boxes
  const drawStatBox = (x: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(x, 55, 40, 25, 2, 2, 'FD');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + 4, 62);
    
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 4, 73);
  };

  const yieldColor: [number, number, number] = Number(yieldRate) > 90 ? [22, 163, 74] : [220, 38, 38];
  
  drawStatBox(14, "Yield Rate", `${yieldRate}%`, yieldColor);
  drawStatBox(60, "Total Tiles", `${totalItems}`, [71, 85, 105]);
  drawStatBox(106, "Total Defects", `${totalDefects}`, [234, 179, 8]); // Yellow-600
  drawStatBox(152, "Avg Density", totalItems ? (totalDefects/totalItems).toFixed(2) : "0", [37, 99, 235]);

  // --- 3. HEATMAP SNAPSHOT ---
  if (heatmapCanvas) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Spatial Defect Heatmap", 14, 95);
    
    // Convert canvas to image
    const imgData = heatmapCanvas.toDataURL("image/png");
    // Add image (x, y, w, h)
    doc.addImage(imgData, 'PNG', 14, 100, 90, 90);
    
    // Add explanation text next to heatmap
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(
      "The heatmap on the left aggregates all defect coordinates detected in this batch. Darker red areas indicate frequent defects.", 
      80
    );
    doc.text(splitText, 110, 110);
  }

  // --- 4. DETAILED LOG TABLE ---
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  // Position table below heatmap
  const tableStartY = heatmapCanvas ? 200 : 100;
  doc.text("Defect Log", 14, tableStartY);

  // Flatten defects for the table
  const tableRows: any[] = [];
  processedItems.forEach(item => {
    if (item.results?.defects.length === 0) {
      tableRows.push([item.file.name, "PASSED", "-", "-", "-"]);
    } else {
      item.results?.defects.forEach(d => {
        tableRows.push([
          item.file.name, 
          d.class, 
          `${(d.score * 100).toFixed(0)}%`,
          `[${d.box.map(n => Math.round(n)).join(', ')}]`
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [['Filename', 'Defect / Status', 'Confidence', 'Coordinates (x1,y1,x2,y2)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // --- 5. SAVE ---
  doc.save(`CeraSight_Report_${Date.now()}.pdf`);
};