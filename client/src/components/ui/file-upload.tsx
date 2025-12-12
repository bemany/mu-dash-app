import React, { useCallback } from 'react';
import { Upload, FileText, CheckCircle2, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
  title?: string;
  description?: string;
  accept?: string;
}

export function FileUpload({ 
  onDataLoaded, 
  title = "CSV Datei hier ablegen", 
  description = "Drag & Drop oder klicken zum Hochladen",
  accept = ".csv"
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    import('papaparse').then((Papa) => {
      Papa.default.parse(file, {
        header: true,
        complete: (results) => {
          onDataLoaded(results.data);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        }
      });
    });
  };

  return (
    <div 
      className={cn(
        "group relative border-2 border-dashed rounded-xl p-16 transition-all duration-300 ease-out text-center cursor-pointer overflow-hidden bg-white",
        isDragging 
          ? "border-emerald-500 bg-emerald-50/50 scale-[1.01] shadow-xl" 
          : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50 hover:shadow-md"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept={accept}
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative flex flex-col items-center gap-6 z-10">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-100",
          isDragging ? "bg-emerald-100 text-emerald-600 scale-110" : "bg-white text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:border-emerald-100"
        )}>
          {isDragging ? <CloudUpload className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
        </div>
        
        <div className="space-y-2 max-w-sm">
          <h3 className={cn(
            "text-xl font-bold transition-colors duration-300",
            isDragging ? "text-emerald-700" : "text-slate-700 group-hover:text-emerald-700"
          )}>
            {title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-500 shadow-sm group-hover:border-emerald-200 group-hover:text-emerald-600 transition-colors">
          Unterstützt: {accept}
        </div>
      </div>
    </div>
  );
}
