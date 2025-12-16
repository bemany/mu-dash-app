import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle2, CloudUpload, Car, CreditCard, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processPaymentCSV } from '@/lib/data-processor';
import { UberTrip, UberTransaction } from '@/lib/types';
import { format, parse, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslation } from '@/i18n';

interface FileResult {
  filename: string;
  type: 'trips' | 'payments' | 'unknown';
  rowCount: number;
}

interface DateRange {
  min: Date | null;
  max: Date | null;
  months: Set<string>;
}

interface UnifiedUploadProps {
  onDataLoaded: (trips: UberTrip[], payments: UberTransaction[]) => void;
  testId?: string;
  compact?: boolean;
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

function parseTripDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const isoResult = parseISO(dateStr);
  if (isValid(isoResult)) return isoResult;
  
  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ssXXX",
    'dd.MM.yyyy HH:mm:ss',
    'dd.MM.yyyy HH:mm',
    'yyyy-MM-dd',
    'dd.MM.yyyy',
  ];
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {}
  }
  const fallback = new Date(dateStr);
  return isValid(fallback) ? fallback : null;
}

function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadOriginalFiles(files: File[], fileTypes: Map<string, 'trips' | 'payments'>): Promise<void> {
  const filesToUpload = [];
  for (const file of files) {
    const fileType = fileTypes.get(file.name);
    if (fileType) {
      try {
        const content = await fileToBase64(file);
        filesToUpload.push({
          filename: file.name,
          fileType,
          mimeType: file.type || 'text/csv',
          content,
        });
      } catch (error) {
        console.error('Error converting file to base64:', error);
      }
    }
  }

  if (filesToUpload.length > 0) {
    try {
      await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files: filesToUpload }),
      });
    } catch (error) {
      console.error('Error uploading original files:', error);
    }
  }
}

export function UnifiedUpload({ 
  onDataLoaded,
  testId = "unified-upload",
  compact = false
}: UnifiedUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [tripDateRange, setTripDateRange] = useState<DateRange>({ min: null, max: null, months: new Set() });
  const [paymentDateRange, setPaymentDateRange] = useState<DateRange>({ min: null, max: null, months: new Set() });

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
    const fileTypeMap = new Map<string, 'trips' | 'payments'>();

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
              fileTypeMap.set(file.name, 'trips');
            } else if (fileType === 'payments') {
              const processed = processPaymentCSV(validData);
              allPayments.push(...processed);
              results.push({ filename: file.name, type: 'payments', rowCount: processed.length });
              fileTypeMap.set(file.name, 'payments');
            } else {
              const firstRow = validData[0] as any;
              if (firstRow) {
                if (firstRow["Kennzeichen"] && firstRow["Zeitpunkt der Fahrtbestellung"]) {
                  allTrips.push(...(validData as UberTrip[]));
                  results.push({ filename: file.name, type: 'trips', rowCount: validData.length });
                  fileTypeMap.set(file.name, 'trips');
                } else if (firstRow["Beschreibung"] || firstRow["An dein Unternehmen gezahlt"]) {
                  const processed = processPaymentCSV(validData);
                  allPayments.push(...processed);
                  results.push({ filename: file.name, type: 'payments', rowCount: processed.length });
                  fileTypeMap.set(file.name, 'payments');
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

    const tripMonths = new Set<string>();
    let tripMin: Date | null = null;
    let tripMax: Date | null = null;
    
    for (const trip of allTrips) {
      const dateStr = trip["Zeitpunkt der Fahrtbestellung"];
      if (dateStr) {
        const date = parseTripDate(dateStr);
        if (date) {
          tripMonths.add(getMonthKey(date));
          if (!tripMin || date < tripMin) tripMin = date;
          if (!tripMax || date > tripMax) tripMax = date;
        }
      }
    }

    const paymentMonths = new Set<string>();
    let paymentMin: Date | null = null;
    let paymentMax: Date | null = null;
    
    for (const payment of allPayments) {
      const dateStr = payment.timestamp;
      if (dateStr) {
        const date = parseTripDate(dateStr);
        if (date) {
          paymentMonths.add(getMonthKey(date));
          if (!paymentMin || date < paymentMin) paymentMin = date;
          if (!paymentMax || date > paymentMax) paymentMax = date;
        }
      }
    }

    setTripDateRange({ min: tripMin, max: tripMax, months: tripMonths });
    setPaymentDateRange({ min: paymentMin, max: paymentMax, months: paymentMonths });
    setFileResults(results);
    setIsProcessing(false);
    onDataLoaded(allTrips, allPayments);
    
    // Upload original files in the background
    uploadOriginalFiles(files, fileTypeMap);
  };

  const dateWarning = useMemo(() => {
    if (tripDateRange.months.size === 0 || paymentDateRange.months.size === 0) {
      return null;
    }

    const unmatchedPaymentMonths: string[] = [];
    paymentDateRange.months.forEach(month => {
      if (!tripDateRange.months.has(month)) {
        unmatchedPaymentMonths.push(month);
      }
    });

    if (unmatchedPaymentMonths.length === 0) {
      return null;
    }

    const formattedMonths = unmatchedPaymentMonths.map(m => {
      const [year, month] = m.split('-');
      return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: de });
    });

    return {
      months: formattedMonths
    };
  }, [tripDateRange.months, paymentDateRange.months]);

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
          "group relative border-2 border-dashed rounded-xl transition-all duration-300 ease-out text-center cursor-pointer overflow-hidden bg-white",
          compact ? "p-5" : "p-8",
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

        <div className={cn("relative flex flex-col items-center z-10", compact ? "gap-3" : "gap-4")}>
          <div className={cn(
            "rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-100",
            compact ? "w-10 h-10" : "w-14 h-14",
            isDragging ? "bg-emerald-100 text-emerald-600 scale-110" : 
            hasFiles ? "bg-emerald-100 text-emerald-600" :
            "bg-white text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:border-emerald-100"
          )}>
            {isProcessing ? (
              <div className={cn("border-2 border-emerald-500 border-t-transparent rounded-full animate-spin", compact ? "w-5 h-5" : "w-7 h-7")} />
            ) : hasFiles ? (
              <CheckCircle2 className={compact ? "w-5 h-5" : "w-7 h-7"} />
            ) : isDragging ? (
              <CloudUpload className={compact ? "w-5 h-5" : "w-7 h-7"} />
            ) : (
              <Upload className={compact ? "w-5 h-5" : "w-7 h-7"} />
            )}
          </div>
          
          <div className={cn("max-w-lg", compact ? "space-y-1" : "space-y-2")}>
            <h3 data-testid={`${testId}-title`} className={cn(
              "font-bold transition-colors duration-300",
              compact ? "text-base" : "text-xl",
              isDragging ? "text-emerald-700" : 
              hasFiles ? "text-emerald-700" :
              "text-slate-700 group-hover:text-emerald-700"
            )}>
              {hasFiles ? `${fileResults.length} Datei${fileResults.length > 1 ? 'en' : ''} geladen` : t('upload.dropHere')}
            </h3>
            <p className={cn("text-slate-500 leading-relaxed", compact ? "text-xs" : "text-sm")}>
              {hasFiles 
                ? t('upload.selectFiles') 
                : t('upload.subtitle')}
            </p>
          </div>
          
          <div className={cn("flex text-xs", compact ? "gap-2 flex-wrap justify-center" : "gap-4")}>
            <div className={cn("flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700", compact ? "px-2 py-1" : "px-3 py-1.5")}>
              <Car className="w-3.5 h-3.5" />
              <span>*trip*.csv</span>
            </div>
            <div className={cn("flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-700", compact ? "px-2 py-1" : "px-3 py-1.5")}>
              <CreditCard className="w-3.5 h-3.5" />
              <span>*payment*.csv</span>
            </div>
          </div>
        </div>
      </div>

      {dateWarning && (
        <div 
          className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3"
          data-testid="date-range-warning"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">{t('upload.periodWarning')}</p>
            <p className="text-sm text-amber-700 mt-1">
              {t('upload.periodWarningText')} {dateWarning.months.join(', ')}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              {t('upload.uploadTripsHint')}
            </p>
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="upload-summary">
          {tripFiles.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4" data-testid="trips-summary">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">{t('upload.trips')}</span>
                <span className="ml-auto text-sm text-emerald-600">{totalTrips.toLocaleString('de-DE')} {t('upload.records')}</span>
              </div>
              {tripDateRange.min && tripDateRange.max && (
                <p className="text-xs text-emerald-600 mb-2">
                  Zeitraum: {format(tripDateRange.min, 'dd.MM.yyyy', { locale: de })} - {format(tripDateRange.max, 'dd.MM.yyyy', { locale: de })}
                </p>
              )}
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
                <span className="font-semibold text-purple-800">{t('upload.payments')}</span>
                <span className="ml-auto text-sm text-purple-600">{totalPayments.toLocaleString('de-DE')} {t('upload.records')}</span>
              </div>
              {paymentDateRange.min && paymentDateRange.max && (
                <p className="text-xs text-purple-600 mb-2">
                  Zeitraum: {format(paymentDateRange.min, 'dd.MM.yyyy', { locale: de })} - {format(paymentDateRange.max, 'dd.MM.yyyy', { locale: de })}
                </p>
              )}
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
