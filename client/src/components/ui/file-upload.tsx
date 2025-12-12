import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
  title?: string;
  description?: string;
  accept?: string;
}

export function FileUpload({ 
  onDataLoaded, 
  title = "CSV Datei hier ablegen oder klicken", 
  description = "Laden Sie Ihre Datei hoch (.csv). Wir verarbeiten die Daten lokal in Ihrem Browser.",
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
        "border-2 border-dashed rounded-lg p-12 transition-all duration-200 ease-in-out text-center cursor-pointer",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.01]" 
          : "border-border hover:border-primary/50 hover:bg-slate-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept=".csv" 
        className="hidden" 
        onChange={handleFileChange}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <Upload className="w-8 h-8 text-slate-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            CSV Datei hier ablegen oder klicken
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Laden Sie Ihre Uber-Exportdatei hoch (.csv). Wir verarbeiten die Daten lokal in Ihrem Browser.
          </p>
        </div>
      </div>
    </div>
  );
}
