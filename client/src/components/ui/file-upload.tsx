import React, { useState } from 'react';
import { Upload, CheckCircle2, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
  title?: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  testId?: string;
}

export function FileUpload({ 
  onDataLoaded, 
  title = "CSV Datei hier ablegen", 
  description = "Drag & Drop oder klicken zum Hochladen",
  accept = ".csv",
  multiple = false,
  testId = "file-upload"
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [filesCount, setFilesCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
      if (multiple) {
        processMultipleFiles(files);
      } else {
        processFile(files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (multiple) {
        processMultipleFiles(files);
      } else {
        processFile(files[0]);
      }
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    import('papaparse').then((Papa) => {
      Papa.default.parse(file, {
        header: true,
        complete: (results) => {
          setFilesCount(1);
          setIsProcessing(false);
          onDataLoaded(results.data);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          setIsProcessing(false);
        }
      });
    });
  };

  const processMultipleFiles = async (files: File[]) => {
    setIsProcessing(true);
    const Papa = await import('papaparse');
    const allData: any[] = [];

    for (const file of files) {
      await new Promise<void>((resolve) => {
        Papa.default.parse(file, {
          header: true,
          complete: (results) => {
            allData.push(...results.data);
            resolve();
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            resolve();
          }
        });
      });
    }

    setFilesCount(files.length);
    setIsProcessing(false);
    onDataLoaded(allData);
  };

  const inputId = `file-upload-${testId}`;

  return (
    <div 
      data-testid={testId}
      className={cn(
        "group relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-out text-center cursor-pointer overflow-hidden bg-white",
        isDragging 
          ? "border-emerald-500 bg-emerald-50/50 scale-[1.01] shadow-xl" 
          : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50 hover:shadow-md",
        isProcessing && "opacity-75 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById(inputId)?.click()}
    >
      <input 
        id={inputId}
        data-testid={`${testId}-input`}
        type="file" 
        accept={accept}
        multiple={multiple}
        className="hidden" 
        onChange={handleFileChange}
      />
      
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative flex flex-col items-center gap-4 z-10">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-100",
          isDragging ? "bg-emerald-100 text-emerald-600 scale-110" : 
          filesCount > 0 ? "bg-emerald-100 text-emerald-600" :
          "bg-white text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:border-emerald-100"
        )}>
          {isProcessing ? (
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : filesCount > 0 ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : isDragging ? (
            <CloudUpload className="w-8 h-8" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>
        
        <div className="space-y-1 max-w-sm">
          <h3 data-testid={`${testId}-title`} className={cn(
            "text-lg font-bold transition-colors duration-300",
            isDragging ? "text-emerald-700" : 
            filesCount > 0 ? "text-emerald-700" :
            "text-slate-700 group-hover:text-emerald-700"
          )}>
            {filesCount > 0 ? (
              multiple ? `${filesCount} Datei${filesCount > 1 ? 'en' : ''} geladen` : 'Datei geladen'
            ) : title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            {filesCount > 0 ? 'Klicken Sie erneut, um weitere Dateien hinzuzufügen' : description}
          </p>
        </div>
        
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-500 shadow-sm group-hover:border-emerald-200 group-hover:text-emerald-600 transition-colors">
          {multiple ? 'Mehrere Dateien möglich' : 'Unterstützt:'} {accept}
        </div>
      </div>
    </div>
  );
}
