import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears
} from "date-fns";
import { de, enUS, tr, ar, type Locale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/context";
import {
  mockPerformanceKpis,
  mockPerformanceDrivers,
  mockPerformanceVehicles,
  mockPerformanceShifts,
  mockBonusPayouts,
  mockBonusSummary,
} from "@/lib/mock-data";
import {
  CalendarIcon,
  Clock,
  Car,
  User,
  Euro,
  Sun,
  Moon,
  TrendingUp,
  Route,
  Calendar as CalendarIconSolid,
  AlertCircle,
  Gift,
  Upload,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import type { DateRange } from "react-day-picker";

interface KpiTotals {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  tripCount: number;
}

interface DayKpi {
  day: string;
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

interface MonthKpi {
  month: string;
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

interface KpisResponse {
  totals: KpiTotals;
  byDay: DayKpi[];
  byMonth: MonthKpi[];
}

interface DriverData {
  driverName: string;
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

interface DriversResponse {
  drivers: DriverData[];
  totals: KpiTotals;
}

interface VehicleData {
  licensePlate: string;
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

interface VehiclesResponse {
  vehicles: VehicleData[];
  totals: KpiTotals;
}

interface ShiftData {
  driverName: string;
  licensePlate: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "day" | "night";
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

interface ShiftsSummary {
  totalShifts: number;
  dayShifts: number;
  nightShifts: number;
  avgShiftDuration: number;
  avgRevenuePerShift: number;
}

interface ShiftsResponse {
  shifts: ShiftData[];
  summary: ShiftsSummary;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function cmToKm(cm: number): number {
  return cm / 100000;
}

function centsToEur(cents: number): number {
  return cents / 100;
}

function safeFormatDate(dateStr: string | Date, formatStr: string, locale: Locale): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr, { locale });
  } catch {
    return '-';
  }
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  testId: string;
  className?: string;
}

function VorgangsIdDisplay({ vorgangsId }: { vorgangsId: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(vorgangsId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Alert className="bg-emerald-50 border-emerald-200" data-testid="banner-vorgangs-id">
      <Check className="h-4 w-4 text-emerald-600" />
      <AlertDescription className="text-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>
          {t('performance.yourVorgangsId')}:{" "}
          <span className="font-mono font-bold text-lg">{vorgangsId}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-2 border-emerald-300 hover:bg-emerald-100"
          data-testid="button-copy-vorgangs-id"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t('performance.copied') : t('performance.copyId')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function KpiCard({ title, value, subtitle, icon, onClick, testId, className }: KpiCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-emerald-300",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900" data-testid={`${testId}-value`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-400" data-testid={`${testId}-subtitle`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DatePickerWithRangeProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  placeholder: string;
  dateLocale: Locale;
  presets: { label: string; from: Date; to: Date }[];
}

function DatePickerWithRange({ date, onDateChange, placeholder, dateLocale, presets }: DatePickerWithRangeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-testid="date-range-picker"
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "dd.MM.yyyy", { locale: dateLocale })} -{" "}
                {format(date.to, "dd.MM.yyyy", { locale: dateLocale })}
              </>
            ) : (
              format(date.from, "dd.MM.yyyy", { locale: dateLocale })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r border-slate-200 p-2 space-y-1 min-w-[140px]">
            {presets.map((preset) => (
              <button
                key={preset.label}
                data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => onDateChange({ from: preset.from, to: preset.to })}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-100",
                  date?.from?.getTime() === preset.from.getTime() && 
                  date?.to?.getTime() === preset.to.getTime() && 
                  "bg-emerald-50 text-emerald-700 font-medium"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={dateLocale}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const dateLocaleMap: Record<string, Locale> = {
  de: de,
  en: enUS,
  tr: tr,
  ar: ar,
};

interface SessionData {
  sessionId: string;
  vorgangsId: string | null;
  currentStep: number;
  tripCount: number;
}

interface DateRangeData {
  minDate: string | null;
  maxDate: string | null;
  availableMonths: string[];
}

function getLastFullMonth(availableMonths: string[]): { from: Date; to: Date } | null {
  if (!availableMonths || availableMonths.length === 0) return null;
  
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  
  const fullMonths = availableMonths.filter(m => m < currentMonth);
  
  if (fullMonths.length > 0) {
    const lastMonth = fullMonths[fullMonths.length - 1];
    const [year, month] = lastMonth.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    return {
      from: startOfMonth(monthDate),
      to: endOfMonth(monthDate),
    };
  }
  
  const lastMonth = availableMonths[availableMonths.length - 1];
  const [year, month] = lastMonth.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);
  if (lastMonth === currentMonth) {
    return {
      from: startOfMonth(monthDate),
      to: today,
    };
  }
  return {
    from: startOfMonth(monthDate),
    to: endOfMonth(monthDate),
  };
}

export default function PerformancePage() {
  const { t, language } = useTranslation();
  const dateLocale = dateLocaleMap[language] || de;
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [hasInitializedDateRange, setHasInitializedDateRange] = useState(false);
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<"all" | "day" | "night">("all");
  
  type SortDirection = "asc" | "desc";
  type SortConfig = { key: string; direction: SortDirection };
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "", direction: "desc" });
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };
  
  const sortData = <T extends Record<string, any>>(data: T[] | undefined, key: string): T[] => {
    if (!data || !key) return data || [];
    return [...data].sort((a, b) => {
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  };
  
  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: string; className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer hover:bg-slate-100 select-none", className)}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  const { data: sessionData } = useQuery<SessionData>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const isDemo = !sessionData?.vorgangsId || sessionData?.tripCount === 0;

  const { data: dateRangeData } = useQuery<DateRangeData>({
    queryKey: ["performance-daterange"],
    queryFn: async () => {
      const res = await fetch("/api/performance/daterange");
      if (!res.ok) throw new Error("Failed to fetch date range");
      return res.json();
    },
    enabled: !isDemo,
  });

  useEffect(() => {
    if (!hasInitializedDateRange) {
      if (isDemo) {
        setDateRange({
          from: startOfMonth(subMonths(new Date(), 1)),
          to: endOfMonth(subMonths(new Date(), 1)),
        });
        setHasInitializedDateRange(true);
      } else if (dateRangeData) {
        if (dateRangeData.availableMonths?.length) {
          const lastMonth = getLastFullMonth(dateRangeData.availableMonths);
          if (lastMonth) {
            setDateRange(lastMonth);
          }
        } else {
          setDateRange({
            from: startOfMonth(subMonths(new Date(), 1)),
            to: endOfMonth(subMonths(new Date(), 1)),
          });
        }
        setHasInitializedDateRange(true);
      }
    }
  }, [isDemo, dateRangeData, hasInitializedDateRange]);

  useEffect(() => {
    document.title = `${t('performance.title')} - U-Retter`;
  }, [t]);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: apiKpisData, isLoading: kpisLoading } = useQuery<KpisResponse>({
    queryKey: ["performance-kpis", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/kpis?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch KPIs");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const { data: apiDriversData, isLoading: driversLoading } = useQuery<DriversResponse>({
    queryKey: ["performance-drivers", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/drivers?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const { data: apiVehiclesData, isLoading: vehiclesLoading } = useQuery<VehiclesResponse>({
    queryKey: ["performance-vehicles", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/vehicles?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const { data: apiShiftsData, isLoading: shiftsLoading } = useQuery<ShiftsResponse>({
    queryKey: ["performance-shifts", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/shifts?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const kpisData = isDemo ? mockPerformanceKpis : apiKpisData;
  const driversData = isDemo ? mockPerformanceDrivers : apiDriversData;
  const vehiclesData = isDemo ? mockPerformanceVehicles : apiVehiclesData;
  const shiftsData = isDemo ? mockPerformanceShifts : apiShiftsData;

  const isLoading = !isDemo && (kpisLoading || driversLoading || vehiclesLoading || shiftsLoading);

  const kpis = useMemo(() => {
    if (!kpisData?.totals) return null;
    
    const { totalRevenue, totalDistance, totalHoursWorked, tripCount } = kpisData.totals;
    const driverCount = driversData?.drivers?.length || 1;
    const vehicleCount = vehiclesData?.vehicles?.length || 1;
    const numDays = dateRange?.from && dateRange?.to 
      ? Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;

    const totalKm = cmToKm(totalDistance);
    const totalEur = centsToEur(totalRevenue);

    return {
      revenuePerHour: totalHoursWorked > 0 ? totalEur / totalHoursWorked : 0,
      revenuePerKm: totalKm > 0 ? totalEur / totalKm : 0,
      revenuePerDay: totalEur / numDays,
      revenuePerDriver: totalEur / driverCount,
      revenuePerVehicle: totalEur / vehicleCount,
      totalShifts: shiftsData?.summary?.totalShifts || 0,
      dayShifts: shiftsData?.summary?.dayShifts || 0,
      nightShifts: shiftsData?.summary?.nightShifts || 0,
    };
  }, [kpisData, driversData, vehiclesData, shiftsData, dateRange]);

  const closeModal = () => setActiveModal(null);

  const presets = useMemo(() => {
    const availableMonths = isDemo ? [] : (dateRangeData?.availableMonths || []);
    
    if (isDemo || availableMonths.length === 0) {
      const today = new Date();
      return [
        { label: t('performance.presetLastMonth'), from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
        { label: t('performance.presetThisYear'), from: startOfYear(today), to: endOfYear(today) },
      ];
    }

    const monthNames: Record<string, string> = {
      '01': language === 'de' ? 'Januar' : language === 'tr' ? 'Ocak' : language === 'ar' ? 'يناير' : 'January',
      '02': language === 'de' ? 'Februar' : language === 'tr' ? 'Şubat' : language === 'ar' ? 'فبراير' : 'February',
      '03': language === 'de' ? 'März' : language === 'tr' ? 'Mart' : language === 'ar' ? 'مارس' : 'March',
      '04': language === 'de' ? 'April' : language === 'tr' ? 'Nisan' : language === 'ar' ? 'أبريل' : 'April',
      '05': language === 'de' ? 'Mai' : language === 'tr' ? 'Mayıs' : language === 'ar' ? 'مايو' : 'May',
      '06': language === 'de' ? 'Juni' : language === 'tr' ? 'Haziran' : language === 'ar' ? 'يونيو' : 'June',
      '07': language === 'de' ? 'Juli' : language === 'tr' ? 'Temmuz' : language === 'ar' ? 'يوليو' : 'July',
      '08': language === 'de' ? 'August' : language === 'tr' ? 'Ağustos' : language === 'ar' ? 'أغسطس' : 'August',
      '09': language === 'de' ? 'September' : language === 'tr' ? 'Eylül' : language === 'ar' ? 'سبتمبر' : 'September',
      '10': language === 'de' ? 'Oktober' : language === 'tr' ? 'Ekim' : language === 'ar' ? 'أكتوبر' : 'October',
      '11': language === 'de' ? 'November' : language === 'tr' ? 'Kasım' : language === 'ar' ? 'نوفمبر' : 'November',
      '12': language === 'de' ? 'Dezember' : language === 'tr' ? 'Aralık' : language === 'ar' ? 'ديسمبر' : 'December',
    };

    const monthPresets = availableMonths.map(monthStr => {
      const [year, month] = monthStr.split("-");
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        label: `${monthNames[month]} ${year}`,
        from: startOfMonth(monthDate),
        to: endOfMonth(monthDate),
      };
    }).reverse();

    if (availableMonths.length > 1) {
      const firstMonth = availableMonths[0];
      const lastMonth = availableMonths[availableMonths.length - 1];
      const [firstYear, firstMonthNum] = firstMonth.split("-").map(Number);
      const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number);
      
      monthPresets.unshift({
        label: t('performance.presetAllData'),
        from: new Date(firstYear, firstMonthNum - 1, 1),
        to: endOfMonth(new Date(lastYear, lastMonthNum - 1, 1)),
      });
    }

    return monthPresets;
  }, [isDemo, dateRangeData, t, language]);

  return (
    <DashboardLayout>
      <div className="max-w-[1920px] mx-auto space-y-6 pb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="performance-title">
              {t('performance.title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('performance.subtitle')}
            </p>
          </div>
          <DatePickerWithRange 
            date={dateRange} 
            onDateChange={setDateRange} 
            placeholder={t('performance.datePickerPlaceholder')}
            dateLocale={dateLocale}
            presets={presets}
          />
        </div>

        {isDemo ? (
          <Alert className="bg-amber-50 border-amber-200" data-testid="banner-demo-mode">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{t('performance.demoMode')}</span>
              <Link href="/process">
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  data-testid="button-start-import"
                >
                  <Upload className="h-4 w-4" />
                  {t('performance.startImport')}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        ) : sessionData?.vorgangsId && (
          <VorgangsIdDisplay vorgangsId={sessionData.vorgangsId} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
            <Spinner className="w-8 h-8 text-emerald-500" />
          </div>
        ) : !kpis ? (
          <Card className="p-12 text-center" data-testid="empty-state">
            <p className="text-slate-500">
              {t('performance.emptyState')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              testId="kpi-revenue-per-hour"
              title={t('performance.kpiRevenuePerHour')}
              value={formatCurrency(kpis.revenuePerHour * 100)}
              subtitle={t('performance.kpiRevenuePerHourSubtitle')}
              icon={<Clock className="w-6 h-6" />}
              onClick={() => setActiveModal("hourly")}
            />
            <KpiCard
              testId="kpi-revenue-per-km"
              title={t('performance.kpiRevenuePerKm')}
              value={`${formatNumber(kpis.revenuePerKm)} €`}
              subtitle={t('performance.kpiRevenuePerKmSubtitle')}
              icon={<Route className="w-6 h-6" />}
              onClick={() => setActiveModal("km")}
            />
            <KpiCard
              testId="kpi-revenue-per-day"
              title={t('performance.kpiRevenuePerDay')}
              value={formatCurrency(kpis.revenuePerDay * 100)}
              subtitle={t('performance.kpiRevenuePerDaySubtitle')}
              icon={<CalendarIconSolid className="w-6 h-6" />}
              onClick={() => setActiveModal("daily")}
            />
            <KpiCard
              testId="kpi-revenue-per-driver"
              title={t('performance.kpiRevenuePerDriver')}
              value={formatCurrency(kpis.revenuePerDriver * 100)}
              subtitle={`${driversData?.drivers?.length || 0} ${t('performance.drivers')}`}
              icon={<User className="w-6 h-6" />}
              onClick={() => setActiveModal("drivers")}
            />
            <KpiCard
              testId="kpi-revenue-per-vehicle"
              title={t('performance.kpiRevenuePerVehicle')}
              value={formatCurrency(kpis.revenuePerVehicle * 100)}
              subtitle={`${vehiclesData?.vehicles?.length || 0} ${t('performance.vehicles')}`}
              icon={<Car className="w-6 h-6" />}
              onClick={() => setActiveModal("vehicles")}
            />
            <KpiCard
              testId="kpi-shifts"
              title={t('performance.kpiShifts')}
              value={kpis.totalShifts.toString()}
              subtitle={`${kpis.dayShifts} ${t('performance.shiftDay')} / ${kpis.nightShifts} ${t('performance.shiftNight')}`}
              icon={<Sun className="w-6 h-6" />}
              onClick={() => setActiveModal("shifts")}
            />
          </div>
        )}

        {(isDemo || kpis) && (
          <Card className="mt-6" data-testid="bonus-payouts-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                {t('performance.bonusTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">{t('performance.bonusTheoretical')}</p>
                  <p className="text-2xl font-bold text-slate-900" data-testid="bonus-theoretical">
                    {formatCurrency(mockBonusSummary.totalTheoretical)}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">{t('performance.bonusActual')}</p>
                  <p className="text-2xl font-bold text-emerald-600" data-testid="bonus-actual">
                    {formatCurrency(mockBonusSummary.totalActual)}
                  </p>
                </div>
                <div className={cn(
                  "p-4 rounded-lg",
                  mockBonusSummary.totalDifference < 0 ? "bg-red-50" : "bg-green-50"
                )}>
                  <p className="text-sm text-slate-500">{t('performance.bonusDifference')}</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    mockBonusSummary.totalDifference < 0 ? "text-red-600" : "text-green-600"
                  )} data-testid="bonus-difference">
                    {formatCurrency(mockBonusSummary.totalDifference)}
                  </p>
                </div>
              </div>
              <div className="overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('performance.tableLicensePlate')}</TableHead>
                      <TableHead>{t('performance.tableMonth')}</TableHead>
                      <TableHead className="text-right">{t('performance.tableTrips')}</TableHead>
                      <TableHead className="text-right">{t('performance.bonusTheoretical')}</TableHead>
                      <TableHead className="text-right">{t('performance.bonusActual')}</TableHead>
                      <TableHead className="text-right">{t('performance.bonusDifference')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockBonusPayouts.map((payout, idx) => (
                      <TableRow key={`${payout.licensePlate}-${payout.month}-${idx}`}>
                        <TableCell className="font-mono">{payout.licensePlate}</TableCell>
                        <TableCell>{payout.month}</TableCell>
                        <TableCell className="text-right">{payout.tripCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payout.theoreticalBonus)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payout.actualPayment)}</TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          payout.difference < 0 ? "text-red-600" : payout.difference > 0 ? "text-green-600" : "text-slate-500"
                        )}>
                          {formatCurrency(payout.difference)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={activeModal === "hourly"} onOpenChange={() => { closeModal(); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-2xl" data-testid="modal-hourly">
            <DialogHeader>
              <DialogTitle>{t('performance.modalHourlyTitle')}</DialogTitle>
              <DialogDescription>{t('performance.modalHourlyDescription')}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableDay')} sortKey="day" />
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                    <SortHeader label={t('performance.tableHours')} sortKey="hoursWorked" className="text-right" />
                    <TableHead className="text-right">{t('performance.kpiRevenuePerHour')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(kpisData?.byDay, sortConfig.key).map((day) => (
                    <TableRow key={day.day}>
                      <TableCell>{safeFormatDate(day.day, "dd.MM.yyyy", dateLocale)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(day.hoursWorked, 1)}</TableCell>
                      <TableCell className="text-right">
                        {day.hoursWorked > 0 ? formatCurrency(day.revenue / day.hoursWorked) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!kpisData?.byDay || kpisData.byDay.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "km"} onOpenChange={() => { closeModal(); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-2xl" data-testid="modal-km">
            <DialogHeader>
              <DialogTitle>{t('performance.modalKmTitle')}</DialogTitle>
              <DialogDescription>{t('performance.modalKmDescription')}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableDay')} sortKey="day" />
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                    <SortHeader label={t('performance.tableKilometers')} sortKey="distance" className="text-right" />
                    <TableHead className="text-right">{t('performance.kpiRevenuePerKm')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(kpisData?.byDay, sortConfig.key).map((day) => {
                    const km = cmToKm(day.distance);
                    return (
                      <TableRow key={day.day}>
                        <TableCell>{safeFormatDate(day.day, "dd.MM.yyyy", dateLocale)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                        <TableCell className="text-right">{formatNumber(km, 1)} km</TableCell>
                        <TableCell className="text-right">
                          {km > 0 ? `${formatNumber(centsToEur(day.revenue) / km)} €` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!kpisData?.byDay || kpisData.byDay.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "daily"} onOpenChange={() => { closeModal(); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-2xl" data-testid="modal-daily">
            <DialogHeader>
              <DialogTitle>{t('performance.modalDailyTitle')}</DialogTitle>
              <DialogDescription>{t('performance.modalDailyDescription')}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableDay')} sortKey="day" />
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                    <SortHeader label={t('performance.tableTrips')} sortKey="tripCount" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(kpisData?.byDay, sortConfig.key).map((day) => (
                    <TableRow key={day.day}>
                      <TableCell>{safeFormatDate(day.day, "dd.MM.yyyy", dateLocale)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                      <TableCell className="text-right">{day.tripCount}</TableCell>
                    </TableRow>
                  ))}
                  {(!kpisData?.byDay || kpisData.byDay.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "drivers"} onOpenChange={() => { closeModal(); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-3xl" data-testid="modal-drivers">
            <DialogHeader>
              <DialogTitle>{t('performance.modalDriversTitle')}</DialogTitle>
              <DialogDescription>{t('performance.modalDriversDescription')}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableDriver')} sortKey="driverName" />
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                    <SortHeader label={t('performance.tableTrips')} sortKey="tripCount" className="text-right" />
                    <SortHeader label={t('performance.tableShifts')} sortKey="shiftCount" className="text-right" />
                    <SortHeader label={t('performance.tableHours')} sortKey="hoursWorked" className="text-right" />
                    <TableHead className="text-right">{t('performance.kpiRevenuePerHour')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(driversData?.drivers, sortConfig.key).map((driver) => (
                    <TableRow key={driver.driverName}>
                      <TableCell className="font-medium">{driver.driverName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(driver.revenue)}</TableCell>
                      <TableCell className="text-right">{driver.tripCount}</TableCell>
                      <TableCell className="text-right">{driver.shiftCount || 0}</TableCell>
                      <TableCell className="text-right">{formatNumber(driver.hoursWorked, 1)}</TableCell>
                      <TableCell className="text-right">
                        {driver.hoursWorked > 0 ? formatCurrency(driver.revenue / driver.hoursWorked) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!driversData?.drivers || driversData.drivers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "vehicles"} onOpenChange={() => { closeModal(); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-3xl" data-testid="modal-vehicles">
            <DialogHeader>
              <DialogTitle>{t('performance.modalVehiclesTitle')}</DialogTitle>
              <DialogDescription>{t('performance.modalVehiclesDescription')}</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableLicensePlate')} sortKey="licensePlate" />
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                    <SortHeader label={t('performance.tableTrips')} sortKey="tripCount" className="text-right" />
                    <SortHeader label={t('performance.tableKilometers')} sortKey="distance" className="text-right" />
                    <TableHead className="text-right">{t('performance.kpiRevenuePerKm')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(vehiclesData?.vehicles, sortConfig.key).map((vehicle) => {
                    const km = cmToKm(vehicle.distance);
                    return (
                      <TableRow key={vehicle.licensePlate}>
                        <TableCell className="font-medium font-mono">{vehicle.licensePlate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(vehicle.revenue)}</TableCell>
                        <TableCell className="text-right">{vehicle.tripCount}</TableCell>
                        <TableCell className="text-right">{formatNumber(km, 1)} km</TableCell>
                        <TableCell className="text-right">
                          {km > 0 ? `${formatNumber(centsToEur(vehicle.revenue) / km)} €` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!vehiclesData?.vehicles || vehiclesData.vehicles.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "shifts"} onOpenChange={() => { closeModal(); setShiftFilter("all"); setSortConfig({ key: "", direction: "desc" }); }}>
          <DialogContent className="max-w-4xl" data-testid="modal-shifts">
            <DialogHeader>
              <DialogTitle>{t('performance.modalShiftsTitle')}</DialogTitle>
              <DialogDescription>
                {t('performance.modalShiftsDescription')} ({shiftsData?.summary?.totalShifts || 0} {t('performance.total')})
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShiftFilter("all")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  shiftFilter === "all"
                    ? "bg-slate-200 text-slate-800 ring-2 ring-slate-400"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
                data-testid="filter-all-shifts"
              >
                {t('performance.allShifts')}
              </button>
              <button
                onClick={() => setShiftFilter("day")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  shiftFilter === "day"
                    ? "bg-amber-200 text-amber-800 ring-2 ring-amber-400"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                )}
                data-testid="filter-day-shifts"
              >
                <Sun className="w-4 h-4" />
                {shiftsData?.summary?.dayShifts || 0} {t('performance.dayShifts')}
              </button>
              <button
                onClick={() => setShiftFilter("night")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  shiftFilter === "night"
                    ? "bg-indigo-200 text-indigo-800 ring-2 ring-indigo-400"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                )}
                data-testid="filter-night-shifts"
              >
                <Moon className="w-4 h-4" />
                {shiftsData?.summary?.nightShifts || 0} {t('performance.nightShifts')}
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label={t('performance.tableDriver')} sortKey="driverName" />
                    <SortHeader label={t('performance.tableVehicle')} sortKey="licensePlate" />
                    <SortHeader label={t('performance.tableStart')} sortKey="shiftStart" />
                    <SortHeader label={t('performance.tableEnd')} sortKey="shiftEnd" />
                    <TableHead>{t('performance.tableType')}</TableHead>
                    <SortHeader label={t('performance.tableRevenue')} sortKey="revenue" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(shiftsData?.shifts?.filter(shift => shiftFilter === "all" || shift.shiftType === shiftFilter), sortConfig.key).map((shift, index) => (
                    <TableRow key={`${shift.driverName}-${shift.shiftStart}-${index}`}>
                      <TableCell className="font-medium">{shift.driverName}</TableCell>
                      <TableCell className="font-mono">{shift.licensePlate}</TableCell>
                      <TableCell>{safeFormatDate(shift.shiftStart, "dd.MM. HH:mm", dateLocale)}</TableCell>
                      <TableCell>{safeFormatDate(shift.shiftEnd, "dd.MM. HH:mm", dateLocale)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            shift.shiftType === "day"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                          )}
                        >
                          {shift.shiftType === "day" ? (
                            <>
                              <Sun className="w-3 h-3" /> {t('performance.shiftDay')}
                            </>
                          ) : (
                            <>
                              <Moon className="w-3 h-3" /> {t('performance.shiftNight')}
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(shift.revenue)}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        {t('performance.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
