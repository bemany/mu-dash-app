import React, { useState } from 'react';
import { Upload, CheckCircle2, CloudUpload, Car, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processPaymentCSV } from '@/lib/data-processor';
import { UberTrip, UberTransaction } from '@/lib/types';

interface FileResult {
  filename: string;
  type: 'trips' | 'payments' | 'unknown';
  rowCount: number;
}

interface UnifiedUploadProps {
  onDataLoaded: (trips: UberTrip[], payments: UberTransaction[]) => void;
  testId?: string;
}

function detectFileType(filename: string): 'trips' | 'payments' | 'unknown' {
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('trip')) {
    return 'trips';
  }
  if (lowerName.includes('payment')) {
    return 'payments';
  }
  return 'unknown';
}

export function UnifiedUpload({ 
  onDataLoaded,
  testId = "unified-upload"
}: UnifiedUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);

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
      processFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    const Papa = await import('papaparse');
    
    const allTrips: UberTrip[] = [];
    const allPayments: UberTransaction[] = [];
    const results: FileResult[] = [];

    for (const file of files) {
      const fileType = detectFileType(file.name);
      
      await new Promise<void>((resolve) => {
        Papa.default.parse(file, {
          header: true,
          complete: (parseResults) => {
            const validData = parseResults.data.filter((row: any) => 
              Object.values(row).some(v => v !== '' && v !== null && v !== undefined)
            );
            
            if (fileType === 'trips') {
              allTrips.push(...(validData as UberTrip[]));
              results.push({ filename: file.name, type: 'trips', rowCount: validData.length });
            } else if (fileType === 'payments') {
              const processed = processPaymentCSV(validData);
              allPayments.push(...processed);
              results.push({ filename: file.name, type: 'payments', rowCount: processed.length });
            } else {
              // Try to auto-detect based on columns
              const firstRow = validData[0] as any;
              if (firstRow) {
                if (firstRow["Kennzeichen"] && firstRow["Zeitpunkt der Fahrtbestellung"]) {
                  allTrips.push(...(validData as UberTrip[]));
                  results.push({ filename: file.name, type: 'trips', rowCount: validData.length });
                } else if (firstRow["Beschreibung"] || firstRow["An dein Unternehmen gezahlt"]) {
                  const processed = processPaymentCSV(validData);
                  allPayments.push(...processed);
                  results.push({ filename: file.name, type: 'payments', rowCount: processed.length });
                } else {
                  results.push({ filename: file.name, type: 'unknown', rowCount: validData.length });
                }
              }
            }
            resolve();
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            resolve();
          }
        });
      });
    }

    setFileResults(results);
    setIsProcessing(false);
    onDataLoaded(allTrips, allPayments);
  };

  const inputId = `file-upload-${testId}`;
  const tripFiles = fileResults.filter(f => f.type === 'trips');
  const paymentFiles = fileResults.filter(f => f.type === 'payments');
  const unknownFiles = fileResults.filter(f => f.type === 'unknown');
  const totalTrips = tripFiles.reduce((acc, f) => acc + f.rowCount, 0);
  const totalPayments = paymentFiles.reduce((acc, f) => acc + f.rowCount, 0);
  const hasFiles = fileResults.length > 0;

  return (
    <div className="space-y-4">
      <div 
        data-testid={testId}
        className={cn(
          "group relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-out text-center cursor-pointer overflow-hidden bg-white",
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
          accept=".csv"
          multiple={true}
          className="hidden" 
          onChange={handleFileChange}
        />
        
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative flex flex-col items-center gap-4 z-10">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-100",
            isDragging ? "bg-emerald-100 text-emerald-600 scale-110" : 
            hasFiles ? "bg-emerald-100 text-emerald-600" :
            "bg-white text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:border-emerald-100"
          )}>
            {isProcessing ? (
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : hasFiles ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : isDragging ? (
              <CloudUpload className="w-7 h-7" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          
          <div className="space-y-2 max-w-lg">
            <h3 data-testid={`${testId}-title`} className={cn(
              "text-xl font-bold transition-colors duration-300",
              isDragging ? "text-emerald-700" : 
              hasFiles ? "text-emerald-700" :
              "text-slate-700 group-hover:text-emerald-700"
            )}>
              {hasFiles ? `${fileResults.length} Datei${fileResults.length > 1 ? 'en' : ''} geladen` : 'Alle CSV-Dateien hier ablegen'}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {hasFiles 
                ? 'Klicken Sie erneut, um weitere Dateien hinzuzufügen' 
                : 'Fahrten und Zahlungen werden automatisch anhand des Dateinamens erkannt'}
            </p>
          </div>
          
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700">
              <Car className="w-3.5 h-3.5" />
              <span>*trip*.csv → Fahrten</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-700">
              <CreditCard className="w-3.5 h-3.5" />
              <span>*payment*.csv → Zahlungen</span>
            </div>
          </div>
        </div>
      </div>

      {hasFiles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="upload-summary">
          {tripFiles.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4" data-testid="trips-summary">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Fahrten</span>
                <span className="ml-auto text-sm text-emerald-600">{totalTrips.toLocaleString('de-DE')} Einträge</span>
              </div>
              <div className="space-y-1">
                {tripFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-emerald-700">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto text-emerald-500">{f.rowCount.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paymentFiles.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4" data-testid="payments-summary">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-800">Zahlungen</span>
                <span className="ml-auto text-sm text-purple-600">{totalPayments.toLocaleString('de-DE')} Einträge</span>
              </div>
              <div className="space-y-1">
                {paymentFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-purple-700">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto text-purple-500">{f.rowCount.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unknownFiles.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 col-span-full" data-testid="unknown-summary">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Nicht erkannt</span>
              </div>
              <p className="text-xs text-amber-700">
                Diese Dateien konnten nicht zugeordnet werden. Stellen Sie sicher, dass "trip" oder "payment" im Dateinamen enthalten ist.
              </p>
              <div className="space-y-1 mt-2">
                {unknownFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate">{f.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
