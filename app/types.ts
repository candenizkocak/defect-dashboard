// app/types.ts
export type Defect = {
  class: string;
  score: number;
  box: [number, number, number, number]; // x1, y1, x2, y2
};

export type AnalysisResult = {
  width: number;
  height: number;
  defects: Defect[];
};

export type Crop = {
  src: string;
  label: string;
  score: number;
};

export type BatchItem = {
  id: string;
  file: File;
  src: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  results: AnalysisResult | null;
  crops: Crop[];
};