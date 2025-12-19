import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  format, 
  startOfMonth, 
  endOfMonth,
  subMonths
} from "date-fns";
import { de, enUS, tr, ar, type Locale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/context";
import {
  mockDriverReport,
  mockVehicleReport,
  mockPromoReport,
  mockShiftReport,
  type DriverReportRow,
  type DriverReportSummary,
  type VehicleReportRow,
  type VehicleReportSummary,
  type PromoReportRow,
  type PromoReportSummary,
} from "@/lib/mock-data";
import {
  CalendarIcon,
  Clock,
  Car,
  User,
  Users,
  Route,
  AlertCircle,
  Gift,
  Upload,
  Copy,
  Check,
  ChevronDown,
  Filter,
  Download,
  Sun,
  Moon,
  X,
  Search,
} from "lucide-react";
import { Link } from "wouter";
import type { DateRange } from "react-day-picker";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  testId: string;
  className?: string;
  tags?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  onClick?: () => void;
}

function KpiCard({ title, value, icon, testId, className, tags, onClick }: KpiCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:shadow-lg hover:border-emerald-300 hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {tags ? (
              <div className="flex flex-wrap gap-1" data-testid={`${testId}-tags`}>
                {tags.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      tags.onChange(opt.value);
                    }}
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full transition-all",
                      tags.value === opt.value
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                    data-testid={`${testId}-tag-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">{title}</p>
            )}
            <p className="text-2xl font-bold text-slate-900" data-testid={`${testId}-value`}>
              {value}
            </p>
          </div>
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MultiSelectProps {
  items: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  allSelectedLabel: string;
  selectedCountLabel: (count: number) => string;
  searchPlaceholder?: string;
  selectAllLabel?: string;
  deselectAllLabel?: string;
  noResultsLabel?: string;
  testId: string;
}

function MultiSelect({ 
  items, 
  selectedValues, 
  onSelectionChange, 
  placeholder, 
  allSelectedLabel,
  selectedCountLabel,
  searchPlaceholder,
  selectAllLabel,
  deselectAllLabel,
  noResultsLabel,
  testId 
}: MultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('performance.searchPlaceholder');
  const resolvedSelectAllLabel = selectAllLabel ?? t('performance.selectAll');
  const resolvedDeselectAllLabel = deselectAllLabel ?? t('performance.deselectAll');
  const resolvedNoResultsLabel = noResultsLabel ?? t('performance.noResults');
  
  const allSelected = selectedValues.length === items.length;
  const noneSelected = selectedValues.length === 0;
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => item.label.toLowerCase().includes(query));
  }, [items, searchQuery]);
  
  const toggleItem = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };
  
  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(i => i.value));
    }
  };
  
  const displayText = allSelected 
    ? allSelectedLabel 
    : noneSelected 
      ? placeholder 
      : selectedCountLabel(selectedValues.length);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery("");
    }}>
      <PopoverTrigger asChild>
        <Button
          data-testid={testId}
          variant="outline"
          className={cn(
            "min-w-[180px] justify-between text-left font-normal",
            noneSelected && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid={`${testId}-search`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={resolvedSearchPlaceholder}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="p-2 border-b border-slate-200">
          <button
            data-testid={`${testId}-select-all`}
            onClick={toggleAll}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-slate-100 transition-colors"
          >
            <Checkbox 
              checked={allSelected}
              className="border-emerald-500 data-[state=checked]:bg-emerald-500"
            />
            <span className="text-sm font-medium">
              {allSelected ? resolvedDeselectAllLabel : resolvedSelectAllLabel}
            </span>
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">{resolvedNoResultsLabel}</p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.value}
                data-testid={`${testId}-item-${item.value}`}
                onClick={() => toggleItem(item.value)}
                className="flex items-center gap-3 w-full px-2 py-2.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <Checkbox 
                  checked={selectedValues.includes(item.value)}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
                <span className="text-sm">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
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
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(date?.from);

  const handlePresetClick = (preset: { from: Date; to: Date }) => {
    onDateChange({ from: preset.from, to: preset.to });
    setMonth(preset.from);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="date-range-picker"
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
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
          <div className="border-r border-slate-200 p-3 space-y-1 min-w-[160px] max-h-[340px] overflow-y-auto">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 mb-2">Zeitraum</p>
            {presets.map((preset) => (
              <button
                key={preset.label}
                data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors",
                  date?.from?.getTime() === preset.from.getTime() && 
                  date?.to?.getTime() === preset.to.getTime() 
                    ? "bg-emerald-500 text-white font-medium"
                    : "hover:bg-slate-100"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              month={month}
              onMonthChange={setMonth}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={1}
              locale={dateLocale}
              captionLayout="dropdown-months"
            />
          </div>
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

type SortDirection = "asc" | "desc";
type SortConfig = { key: string; direction: SortDirection };

interface SortHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

function SortHeader({ label, sortKey, sortConfig, onSort, className }: SortHeaderProps) {
  return (
    <TableHead 
      className={cn("cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );
}

function sortData<T extends Record<string, any>>(data: T[] | undefined, sortConfig: SortConfig): T[] {
  if (!data || !sortConfig.key) return data || [];
  return [...data].sort((a, b) => {
    const aVal = a[sortConfig.key] ?? 0;
    const bVal = b[sortConfig.key] ?? 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortConfig.direction === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
  });
}

interface DriversTabProps {
  data: { summary: DriverReportSummary; drivers: DriverReportRow[] } | undefined;
  isLoading: boolean;
  isDemo: boolean;
  timeMetric: string;
  setTimeMetric: (value: string) => void;
  distanceMetric: string;
  setDistanceMetric: (value: string) => void;
  tripsMetric: string;
  setTripsMetric: (value: string) => void;
  selectedDrivers: string[];
  setSelectedDrivers: (drivers: string[]) => void;
}

function recalculateDriverSummary(drivers: DriverReportRow[]): DriverReportSummary {
  if (drivers.length === 0) {
    return {
      avgRevenuePerHour: 0,
      avgRevenuePerDay: 0,
      avgRevenuePerMonth: 0,
      avgRevenuePerKm: 0,
      avgRevenuePerTrip: 0,
      avgRevenuePerDriver: 0,
      totalShifts: 0,
      totalRevenue: 0,
      totalDistance: 0,
      totalHoursWorked: 0,
      totalTrips: 0,
      uniqueDrivers: 0,
    };
  }
  
  const totalDrivers = drivers.length;
  const totalRevenue = drivers.reduce((acc, d) => acc + (d.avgFarePerTrip * d.completedTrips), 0);
  const totalDistanceKm = drivers.reduce((acc, d) => acc + d.distanceInTrip, 0);
  const totalHours = drivers.reduce((acc, d) => acc + d.timeInTrip, 0);
  const totalTrips = drivers.reduce((acc, d) => acc + d.completedTrips, 0);
  const totalShifts = drivers.reduce((acc, d) => acc + (d.shiftCount || 0), 0);
  
  const activeDaysEstimate = Math.max(1, totalShifts);
  const activeMonthsEstimate = Math.max(1, Math.ceil(activeDaysEstimate / 22));
  
  return {
    avgRevenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
    avgRevenuePerDay: activeDaysEstimate > 0 ? totalRevenue / activeDaysEstimate : 0,
    avgRevenuePerMonth: activeMonthsEstimate > 0 ? totalRevenue / activeMonthsEstimate : 0,
    avgRevenuePerKm: totalDistanceKm > 0 ? totalRevenue / totalDistanceKm : 0,
    avgRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0,
    avgRevenuePerDriver: totalDrivers > 0 ? totalRevenue / totalDrivers : 0,
    totalShifts,
    totalRevenue,
    totalDistance: totalDistanceKm,
    totalHoursWorked: totalHours,
    totalTrips,
    uniqueDrivers: totalDrivers,
  };
}

interface ShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: DriverReportRow[];
  isDemo: boolean;
}

function ShiftsDialog({ open, onOpenChange, drivers, isDemo }: ShiftsDialogProps) {
  const { t } = useTranslation();
  const [shiftFilter, setShiftFilter] = useState<"all" | "day" | "night">("all");
  
  const driverShiftData = useMemo(() => {
    return drivers.map(d => ({
      name: `${d.firstName} ${d.lastName}`,
      shiftCount: d.shiftCount || 0,
      dayShiftCount: d.dayShiftCount || 0,
      nightShiftCount: d.nightShiftCount || 0,
      hoursWorked: d.timeInTrip,
      revenue: d.avgFarePerTrip * d.completedTrips,
      trips: d.completedTrips,
      isNightDriver: (d.nightShiftCount || 0) > (d.dayShiftCount || 0),
    }));
  }, [drivers]);

  const filteredData = useMemo(() => {
    if (shiftFilter === "all") return driverShiftData;
    if (shiftFilter === "day") return driverShiftData.filter(d => !d.isNightDriver);
    return driverShiftData.filter(d => d.isNightDriver);
  }, [driverShiftData, shiftFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            {t('performance.shiftsOverview')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 pb-3 border-b">
          <span className="text-sm text-slate-500">{t('performance.filterLabel')}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setShiftFilter("all")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                shiftFilter === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t('performance.allShifts')}
            </button>
            <button
              onClick={() => setShiftFilter("day")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all inline-flex items-center gap-1",
                shiftFilter === "day"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Sun className="w-3.5 h-3.5" />
              {t('performance.dayShift')}
            </button>
            <button
              onClick={() => setShiftFilter("night")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-all inline-flex items-center gap-1",
                shiftFilter === "night"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Moon className="w-3.5 h-3.5" />
              {t('performance.nightShift')}
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('performance.tableDriver')}</TableHead>
                <TableHead className="text-center">{t('performance.tableType')}</TableHead>
                <TableHead className="text-right">{t('performance.tableShifts')}</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    {t('performance.shiftDay')}
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    {t('performance.shiftNight')}
                  </div>
                </TableHead>
                <TableHead className="text-right">{t('performance.workHours')}</TableHead>
                <TableHead className="text-right">{t('performance.tableTrips')}</TableHead>
                <TableHead className="text-right">{t('performance.tableRevenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((driver, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium whitespace-nowrap">{driver.name}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {driver.isNightDriver ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        <Moon className="w-3 h-3" />
                        {t('performance.shiftNight')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        <Sun className="w-3 h-3" />
                        {t('performance.shiftDay')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.shiftCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.dayShiftCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.nightShiftCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.hoursWorked, 0)} h</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.trips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(driver.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DriversTab({ data, isLoading, isDemo, timeMetric, setTimeMetric, distanceMetric, setDistanceMetric, tripsMetric, setTripsMetric, selectedDrivers, setSelectedDrivers }: DriversTabProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "completedTrips", direction: "desc" });
  const [showShiftsDialog, setShowShiftsDialog] = useState(false);
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };
  
  const reportData = isDemo ? mockDriverReport : data;
  
  const allDrivers = useMemo(() => {
    if (!reportData?.drivers) return [];
    return reportData.drivers.map(d => ({
      value: `${d.firstName} ${d.lastName}`,
      label: `${d.firstName} ${d.lastName}`,
    }));
  }, [reportData?.drivers]);
  
  const filteredDrivers = useMemo(() => {
    if (!reportData?.drivers) return [];
    const drivers = selectedDrivers.length === 0 
      ? reportData.drivers 
      : reportData.drivers.filter(d => selectedDrivers.includes(`${d.firstName} ${d.lastName}`));
    return drivers.map(d => ({
      ...d,
      totalRevenue: d.avgFarePerTrip * d.completedTrips,
    }));
  }, [reportData?.drivers, selectedDrivers]);
  
  const filteredSummary = useMemo(() => {
    // If no drivers selected (meaning ALL are shown) or all explicitly selected, use original summary
    if ((selectedDrivers.length === 0 || selectedDrivers.length === allDrivers.length) && reportData?.summary) {
      return reportData.summary;
    }
    return recalculateDriverSummary(filteredDrivers);
  }, [filteredDrivers, selectedDrivers.length, allDrivers.length, reportData?.summary]);
  
  const exportToExcel = () => {
    const dataToExport = sortData(filteredDrivers, sortConfig).map(driver => ({
      [t('performance.tableFirstName')]: driver.firstName,
      [t('performance.tableLastName')]: driver.lastName,
      [t('performance.tableCompletedTrips')]: driver.completedTrips,
      [t('performance.tableCancelled')]: driver.cancelledTrips,
      [t('performance.tableTotal')]: driver.totalTrips,
      [t('performance.tableAvgFare')]: driver.avgFarePerTrip,
      [t('performance.tableDrivenKm')]: driver.distanceInTrip,
      [t('performance.tablePricePerKm')]: driver.pricePerKm,
      [t('performance.tableRevenuePerDay')]: driver.revenuePerDay,
      [t('performance.tableRevenuePerHour')]: driver.revenuePerHour,
      [t('performance.tableTripsPerHour')]: driver.tripsPerHour,
      [t('performance.tableAcceptanceRate')]: driver.acceptanceRate,
      [t('performance.tableTimeInTrip')]: driver.timeInTrip,
      [t('performance.tableTotalRevenue')]: driver.totalRevenue,
    }));
    dataToExport.push({} as any);
    dataToExport.push({ [t('performance.tableFirstName')]: t('performance.excelFooter') } as any);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('performance.excelSheetDrivers'));
    XLSX.writeFile(wb, `${t('performance.excelSheetDrivers')}_Report.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">{t('performance.noDataAvailable')}</p>
      </Card>
    );
  }
  
  const timeValue = timeMetric === "hour" 
    ? filteredSummary.avgRevenuePerHour 
    : timeMetric === "day" 
      ? filteredSummary.avgRevenuePerDay 
      : filteredSummary.avgRevenuePerMonth;
      
  const distanceValue = distanceMetric === "km" 
    ? filteredSummary.avgRevenuePerKm 
    : filteredSummary.avgRevenuePerTrip;
  
  const tripsPerHour = filteredSummary.totalHoursWorked > 0 
    ? filteredSummary.totalTrips / filteredSummary.totalHoursWorked 
    : 0;
  const activeDays = Math.max(1, filteredSummary.totalShifts);
  const tripsPerDay = filteredSummary.totalTrips / activeDays;
  const tripsPerWeek = tripsPerDay * 7;
  const activeMonths = Math.max(1, Math.ceil(activeDays / 22));
  const tripsPerMonth = filteredSummary.totalTrips / activeMonths;
  
  const tripsValue = tripsMetric === "hour" 
    ? tripsPerHour 
    : tripsMetric === "day" 
      ? tripsPerDay 
      : tripsMetric === "week"
        ? tripsPerWeek
        : tripsPerMonth;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          testId="kpi-driver-time"
          title=""
          value={formatCurrency(timeValue)}
          icon={<Clock className="w-5 h-5" />}
          tags={{
            value: timeMetric,
            options: [
              { value: "hour", label: t('performance.kpiRevenuePerHour') },
              { value: "day", label: t('performance.kpiRevenuePerDay') },
              { value: "month", label: t('performance.kpiPerMonth') },
            ],
            onChange: setTimeMetric,
          }}
        />
        <KpiCard
          testId="kpi-driver-distance"
          title=""
          value={`${formatNumber(distanceValue)} €`}
          icon={<Route className="w-5 h-5" />}
          tags={{
            value: distanceMetric,
            options: [
              { value: "km", label: t('performance.kpiRevenuePerKm') },
              { value: "trip", label: t('performance.kpiPerTrip') },
            ],
            onChange: setDistanceMetric,
          }}
        />
        <KpiCard
          testId="kpi-driver-revenue"
          title={t('performance.kpiRevenuePerDriver')}
          value={formatCurrency(filteredSummary.avgRevenuePerDriver)}
          icon={<User className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-driver-trips"
          title=""
          value={formatNumber(tripsValue, 1)}
          icon={<Car className="w-5 h-5" />}
          tags={{
            value: tripsMetric,
            options: [
              { value: "hour", label: t('performance.kpiTripsPerHour') },
              { value: "day", label: t('performance.kpiTripsPerDay') },
              { value: "week", label: t('performance.kpiTripsPerWeek') },
              { value: "month", label: t('performance.kpiTripsPerMonth') },
            ],
            onChange: setTripsMetric,
          }}
        />
        <KpiCard
          testId="kpi-driver-shifts"
          title={t('performance.kpiShifts')}
          value={filteredSummary.totalShifts.toString()}
          icon={<Clock className="w-5 h-5" />}
          onClick={() => setShowShiftsDialog(true)}
        />
      </div>
      
      <ShiftsDialog
        open={showShiftsDialog}
        onOpenChange={setShowShiftsDialog}
        drivers={filteredDrivers}
        isDemo={isDemo}
      />
      
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label={t('performance.tableFirstName')} sortKey="firstName" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label={t('performance.tableLastName')} sortKey="lastName" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead className="text-center whitespace-nowrap">{t('performance.tableShiftType')}</TableHead>
                <SortHeader label={t('performance.tableCompletedTrips')} sortKey="completedTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableCancelled')} sortKey="cancelledTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTotal')} sortKey="totalTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableAvgFare')} sortKey="avgFarePerTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableDrivenKm')} sortKey="distanceInTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tablePricePerKm')} sortKey="pricePerKm" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenuePerDay')} sortKey="revenuePerDay" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenuePerHour')} sortKey="revenuePerHour" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTripsPerHour')} sortKey="tripsPerHour" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableAcceptanceRate')} sortKey="acceptanceRate" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTimeInTrip')} sortKey="timeInTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTotalRevenue')} sortKey="totalRevenue" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortData(filteredDrivers, sortConfig).map((driver, idx) => {
                const isNightDriver = (driver.nightShiftCount || 0) > (driver.dayShiftCount || 0);
                const isMixed = (driver.nightShiftCount || 0) === (driver.dayShiftCount || 0) && (driver.shiftCount || 0) > 0;
                return (
                <TableRow key={`${driver.firstName}-${driver.lastName}-${idx}`}>
                  <TableCell className="font-medium whitespace-nowrap">{driver.firstName}</TableCell>
                  <TableCell className="whitespace-nowrap">{driver.lastName}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {isMixed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        <Sun className="w-3 h-3" />/<Moon className="w-3 h-3" />
                        {t('performance.shiftMixed')}
                      </span>
                    ) : isNightDriver ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        <Moon className="w-3 h-3" />
                        {t('performance.shiftNight')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        <Sun className="w-3 h-3" />
                        {t('performance.shiftDay')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.completedTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.cancelledTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{driver.totalTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(driver.avgFarePerTrip)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.distanceInTrip, 0)} km</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.pricePerKm)} €</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(driver.revenuePerDay)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(driver.revenuePerHour)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.tripsPerHour)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.acceptanceRate, 1)}%</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(driver.timeInTrip, 0)} h</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(driver.totalRevenue)}</TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="export-drivers">
            <Download className="w-4 h-4 mr-2" />
            {t('performance.exportExcel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface VehiclesTabProps {
  data: { summary: VehicleReportSummary; vehicles: VehicleReportRow[] } | undefined;
  isLoading: boolean;
  isDemo: boolean;
  timeMetric: string;
  setTimeMetric: (value: string) => void;
  distanceMetric: string;
  setDistanceMetric: (value: string) => void;
  tripsMetric: string;
  setTripsMetric: (value: string) => void;
  selectedVehicles: string[];
  setSelectedVehicles: (vehicles: string[]) => void;
}

function recalculateVehicleSummary(vehicles: VehicleReportRow[], originalSummary?: VehicleReportSummary): VehicleReportSummary {
  if (vehicles.length === 0) {
    return {
      avgRevenuePerHour: 0,
      avgRevenuePerDay: 0,
      avgRevenuePerMonth: 0,
      avgRevenuePerKm: 0,
      avgRevenuePerTrip: 0,
      avgRevenuePerVehicle: 0,
      totalShifts: 0,
      totalRevenue: 0,
      totalDistance: 0,
      totalHoursWorked: 0,
      totalTrips: 0,
      uniqueVehicles: 0,
      avgOccupancyRate: 0,
    };
  }
  
  const totalVehicles = vehicles.length;
  const totalRevenue = vehicles.reduce((acc, v) => acc + v.totalRevenue, 0);
  const totalDistanceKm = vehicles.reduce((acc, v) => acc + v.distanceInTrip, 0);
  const totalHours = vehicles.reduce((acc, v) => acc + v.timeInTrip, 0);
  const totalTrips = vehicles.reduce((acc, v) => acc + v.completedTrips, 0);
  const totalShifts = vehicles.reduce((acc, v) => acc + (v.shiftCount || 0), 0);
  
  const activeDaysEstimate = Math.max(1, totalShifts);
  const activeMonthsEstimate = Math.max(1, Math.ceil(activeDaysEstimate / 22));
  
  return {
    avgRevenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
    avgRevenuePerDay: activeDaysEstimate > 0 ? totalRevenue / activeDaysEstimate : 0,
    avgRevenuePerMonth: activeMonthsEstimate > 0 ? totalRevenue / activeMonthsEstimate : 0,
    avgRevenuePerKm: totalDistanceKm > 0 ? totalRevenue / totalDistanceKm : 0,
    avgRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0,
    avgRevenuePerVehicle: totalVehicles > 0 ? totalRevenue / totalVehicles : 0,
    totalShifts,
    totalRevenue,
    totalDistance: totalDistanceKm,
    totalHoursWorked: totalHours,
    totalTrips,
    uniqueVehicles: totalVehicles,
    avgOccupancyRate: originalSummary?.avgOccupancyRate || 0,
  };
}

interface VehicleShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleReportRow[];
  isDemo: boolean;
}

function VehicleShiftsDialog({ open, onOpenChange, vehicles, isDemo }: VehicleShiftsDialogProps) {
  const { t } = useTranslation();
  const vehicleShiftData = useMemo(() => {
    return vehicles.map(v => ({
      licensePlate: v.licensePlate,
      shiftCount: v.shiftCount || 0,
      dayShifts: v.dayShiftCount || 0,
      nightShifts: v.nightShiftCount || 0,
      hoursWorked: v.timeInTrip,
      revenue: v.totalRevenue,
      trips: v.completedTrips,
    }));
  }, [vehicles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            {t('performance.shiftsByVehicle')}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('performance.tableLicensePlate')}</TableHead>
                <TableHead className="text-right">{t('performance.tableShifts')}</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    {t('performance.shiftDay')}
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Moon className="w-3.5 h-3.5 text-blue-500" />
                    {t('performance.shiftNight')}
                  </div>
                </TableHead>
                <TableHead className="text-right">{t('performance.workHours')}</TableHead>
                <TableHead className="text-right">{t('performance.tableTrips')}</TableHead>
                <TableHead className="text-right">{t('performance.tableRevenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicleShiftData.map((vehicle, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{vehicle.licensePlate}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.shiftCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.dayShifts}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.nightShifts}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.hoursWorked, 0)} h</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.trips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VehiclesTab({ data, isLoading, isDemo, timeMetric, setTimeMetric, distanceMetric, setDistanceMetric, tripsMetric, setTripsMetric, selectedVehicles, setSelectedVehicles }: VehiclesTabProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "completedTrips", direction: "desc" });
  const [showShiftsDialog, setShowShiftsDialog] = useState(false);
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };
  
  const reportData = isDemo ? mockVehicleReport : data;
  
  const allVehicles = useMemo(() => {
    if (!reportData?.vehicles) return [];
    return reportData.vehicles.map(v => ({
      value: v.licensePlate,
      label: v.licensePlate,
    }));
  }, [reportData?.vehicles]);
  
  const filteredVehicles = useMemo(() => {
    if (!reportData?.vehicles) return [];
    if (selectedVehicles.length === 0) return reportData.vehicles;
    return reportData.vehicles.filter(v => selectedVehicles.includes(v.licensePlate));
  }, [reportData?.vehicles, selectedVehicles]);
  
  const filteredSummary = useMemo(() => {
    // If no vehicles selected (meaning ALL are shown) or all explicitly selected, use original summary
    if ((selectedVehicles.length === 0 || selectedVehicles.length === allVehicles.length) && reportData?.summary) {
      return reportData.summary;
    }
    return recalculateVehicleSummary(filteredVehicles, reportData?.summary);
  }, [filteredVehicles, selectedVehicles.length, allVehicles.length, reportData?.summary]);
  
  const exportToExcel = () => {
    const dataToExport = sortData(filteredVehicles, sortConfig).map(vehicle => ({
      [t('performance.tableLicensePlate')]: vehicle.licensePlate,
      [t('performance.tableCompletedTrips')]: vehicle.completedTrips,
      [t('performance.tableCancelled')]: vehicle.cancelledTrips,
      [t('performance.tableTotal')]: vehicle.totalTrips,
      [t('performance.tableAvgFare')]: vehicle.avgFarePerTrip,
      [t('performance.tableDrivenKm')]: vehicle.distanceInTrip,
      [t('performance.tablePricePerKm')]: vehicle.pricePerKm,
      [t('performance.tableRevenuePerDay')]: vehicle.revenuePerDay,
      [t('performance.tableRevenueNight')]: vehicle.revenueNightShift,
      [t('performance.tableRevenueDay')]: vehicle.revenueDayShift,
      [t('performance.tableTotalRevenue')]: vehicle.totalRevenue,
      [t('performance.tableRevenuePerHour')]: vehicle.revenuePerHour,
      [t('performance.tableTripsPerHour')]: vehicle.tripsPerHour,
      [t('performance.tableAcceptanceRate')]: vehicle.acceptanceRate,
      [t('performance.tableTimeInTrip')]: vehicle.timeInTrip,
    }));
    dataToExport.push({} as any);
    dataToExport.push({ [t('performance.tableLicensePlate')]: t('performance.excelFooter') } as any);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('performance.excelSheetVehicles'));
    XLSX.writeFile(wb, `${t('performance.excelSheetVehicles')}_Report.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">{t('performance.noDataAvailable')}</p>
      </Card>
    );
  }
  
  const timeValue = timeMetric === "hour" 
    ? filteredSummary.avgRevenuePerHour 
    : timeMetric === "day" 
      ? filteredSummary.avgRevenuePerDay 
      : filteredSummary.avgRevenuePerMonth;
      
  const distanceValue = distanceMetric === "km" 
    ? filteredSummary.avgRevenuePerKm 
    : filteredSummary.avgRevenuePerTrip;
  
  const tripsPerHour = filteredSummary.totalHoursWorked > 0 
    ? filteredSummary.totalTrips / filteredSummary.totalHoursWorked 
    : 0;
  const activeDays = Math.max(1, filteredSummary.totalShifts);
  const tripsPerDay = filteredSummary.totalTrips / activeDays;
  const tripsPerWeek = tripsPerDay * 7;
  const activeMonths = Math.max(1, Math.ceil(activeDays / 22));
  const tripsPerMonth = filteredSummary.totalTrips / activeMonths;
  
  const tripsValue = tripsMetric === "hour" 
    ? tripsPerHour 
    : tripsMetric === "day" 
      ? tripsPerDay 
      : tripsMetric === "week"
        ? tripsPerWeek
        : tripsPerMonth;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard
          testId="kpi-vehicle-time"
          title=""
          value={formatCurrency(timeValue)}
          icon={<Clock className="w-5 h-5" />}
          tags={{
            value: timeMetric,
            options: [
              { value: "hour", label: t('performance.kpiRevenuePerHour') },
              { value: "day", label: t('performance.kpiRevenuePerDay') },
              { value: "month", label: t('performance.kpiPerMonth') },
            ],
            onChange: setTimeMetric,
          }}
        />
        <KpiCard
          testId="kpi-vehicle-distance"
          title=""
          value={`${formatNumber(distanceValue)} €`}
          icon={<Route className="w-5 h-5" />}
          tags={{
            value: distanceMetric,
            options: [
              { value: "km", label: t('performance.kpiRevenuePerKm') },
              { value: "trip", label: t('performance.kpiPerTrip') },
            ],
            onChange: setDistanceMetric,
          }}
        />
        <KpiCard
          testId="kpi-vehicle-revenue"
          title={t('performance.kpiRevenuePerVehicle')}
          value={formatCurrency(filteredSummary.avgRevenuePerVehicle)}
          icon={<Car className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-vehicle-shifts"
          title={t('performance.kpiShifts')}
          value={filteredSummary.totalShifts.toString()}
          icon={<Clock className="w-5 h-5" />}
          onClick={() => setShowShiftsDialog(true)}
        />
        <KpiCard
          testId="kpi-vehicle-trips"
          title=""
          value={formatNumber(tripsValue, 1)}
          icon={<Car className="w-5 h-5" />}
          tags={{
            value: tripsMetric,
            options: [
              { value: "hour", label: t('performance.kpiTripsPerHour') },
              { value: "day", label: t('performance.kpiTripsPerDay') },
              { value: "week", label: t('performance.kpiTripsPerWeek') },
              { value: "month", label: t('performance.kpiTripsPerMonth') },
            ],
            onChange: setTripsMetric,
          }}
        />
        <KpiCard
          testId="kpi-vehicle-occupancy"
          title={t('performance.kpiOccupancyRate')}
          value={`${formatNumber(filteredSummary.avgOccupancyRate, 1)}%`}
          icon={<Users className="w-5 h-5" />}
        />
      </div>
      
      <VehicleShiftsDialog
        open={showShiftsDialog}
        onOpenChange={setShowShiftsDialog}
        vehicles={filteredVehicles}
        isDemo={isDemo}
      />
      
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label={t('performance.tableLicensePlate')} sortKey="licensePlate" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label={t('performance.tableCompletedTrips')} sortKey="completedTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableCancelled')} sortKey="cancelledTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTotal')} sortKey="totalTrips" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableAvgFare')} sortKey="avgFarePerTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableDrivenKm')} sortKey="distanceInTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tablePricePerKm')} sortKey="pricePerKm" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenuePerDay')} sortKey="revenuePerDay" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenueNight')} sortKey="revenueNightShift" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenueDay')} sortKey="revenueDayShift" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTotalRevenue')} sortKey="totalRevenue" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableRevenuePerHour')} sortKey="revenuePerHour" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTripsPerHour')} sortKey="tripsPerHour" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableAcceptanceRate')} sortKey="acceptanceRate" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTimeInTrip')} sortKey="timeInTrip" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortData(filteredVehicles, sortConfig).map((vehicle) => (
                <TableRow key={vehicle.licensePlate}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{vehicle.licensePlate}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.completedTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.cancelledTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{vehicle.totalTrips}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.avgFarePerTrip)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.distanceInTrip, 0)} km</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.pricePerKm)} €</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.revenuePerDay)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.revenueNightShift)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.revenueDayShift)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(vehicle.totalRevenue)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.revenuePerHour)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.tripsPerHour)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.acceptanceRate, 1)}%</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatNumber(vehicle.timeInTrip, 0)} h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="export-vehicles">
            <Download className="w-4 h-4 mr-2" />
            {t('performance.exportExcel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface PromoTabProps {
  data: { summary: PromoReportSummary; rows: PromoReportRow[] } | undefined;
  isLoading: boolean;
  isDemo: boolean;
  selectedVehicles: string[];
}

function PromoTab({ data, isLoading, isDemo, selectedVehicles }: PromoTabProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "month", direction: "desc" });
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };
  
  const reportData = isDemo ? mockPromoReport : data;
  
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (selectedVehicles.length === 0) return reportData.rows;
    return reportData.rows.filter(row => selectedVehicles.includes(row.licensePlate));
  }, [reportData?.rows, selectedVehicles]);
  
  const filteredSummary = useMemo(() => {
    if (!reportData?.summary) return { totalTheoreticalBonus: 0, totalActualPaid: 0, totalDifference: 0 };
    const uniqueVehiclesInData = new Set(reportData.rows.map(r => r.licensePlate)).size;
    const allVehiclesSelected = selectedVehicles.length === 0 || selectedVehicles.length === uniqueVehiclesInData;
    if (allVehiclesSelected) {
      return reportData.summary;
    }
    return {
      totalTheoreticalBonus: filteredRows.reduce((sum, r) => sum + r.theoreticalBonus, 0),
      totalActualPaid: filteredRows.reduce((sum, r) => sum + r.actualPaid, 0),
      totalDifference: filteredRows.reduce((sum, r) => sum + r.difference, 0),
    };
  }, [reportData, filteredRows, selectedVehicles]);
  
  const exportToExcel = () => {
    if (!filteredRows.length) return;
    const dataToExport = sortData(filteredRows, sortConfig).map(row => ({
      [t('performance.tableLicensePlate')]: row.licensePlate,
      [t('performance.tableMonth')]: row.month,
      [t('performance.tableTrips')]: row.tripCount,
      [t('performance.tableTheoBonus')]: row.theoreticalBonus,
      [t('performance.tablePaid')]: row.actualPaid,
      [t('performance.tableDifference')]: row.difference,
    }));
    dataToExport.push({} as any);
    dataToExport.push({ [t('performance.tableLicensePlate')]: t('performance.excelFooter') } as any);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('performance.excelSheetPromo'));
    XLSX.writeFile(wb, `${t('performance.excelSheetPromo')}_Report.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">{t('performance.noDataAvailable')}</p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          testId="kpi-promo-theoretical"
          title={t('performance.promoTheoreticalTitle')}
          value={formatCurrency(filteredSummary.totalTheoreticalBonus)}
          icon={<Gift className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-promo-paid"
          title={t('performance.promoPaidTitle')}
          value={formatCurrency(filteredSummary.totalActualPaid)}
          icon={<Gift className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-promo-difference"
          title={t('performance.promoDifferenceTitle')}
          value={formatCurrency(filteredSummary.totalDifference)}
          icon={<Gift className="w-5 h-5" />}
          className={filteredSummary.totalDifference < 0 ? "border-red-200 bg-red-50" : ""}
        />
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label={t('performance.tableLicensePlate')} sortKey="licensePlate" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label={t('performance.tableMonth')} sortKey="month" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label={t('performance.tableTrips')} sortKey="tripCount" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableTheoBonus')} sortKey="theoreticalBonus" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tablePaid')} sortKey="actualPaid" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.tableDifference')} sortKey="difference" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortData(filteredRows, sortConfig).map((row, idx) => (
                <TableRow key={`${row.licensePlate}-${row.month}-${idx}`}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{row.licensePlate}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.tripCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.theoreticalBonus)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.actualPaid)}</TableCell>
                  <TableCell className={cn("text-right font-medium whitespace-nowrap", row.difference < 0 && "text-red-600")}>
                    {formatCurrency(row.difference)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="export-promo">
            <Download className="w-4 h-4 mr-2" />
            {t('performance.exportExcel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function PerformancePage() {
  const { t, language } = useTranslation();
  const dateLocale = dateLocaleMap[language] || de;
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [hasInitializedDateRange, setHasInitializedDateRange] = useState(false);
  const [activeTab, setActiveTab] = useState("drivers");
  const [timeMetric, setTimeMetric] = useState<string>("hour");
  const [distanceMetric, setDistanceMetric] = useState<string>("km");
  const [tripsMetric, setTripsMetric] = useState<string>("hour");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [lastVorgangsId, setLastVorgangsId] = useState<string | null>(null);
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

  const { data: sessionData } = useQuery<SessionData>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const isDemo = !sessionData?.vorgangsId || sessionData?.tripCount === 0;

  useEffect(() => {
    const currentVorgangsId = sessionData?.vorgangsId || null;
    if (currentVorgangsId !== lastVorgangsId) {
      if (lastVorgangsId !== null || (selectedDrivers.length > 0 || selectedVehicles.length > 0)) {
        setSelectedDrivers([]);
        setSelectedVehicles([]);
        setHasInitializedDateRange(false);
        setHasInitializedFilters(false);
      }
      setLastVorgangsId(currentVorgangsId);
    }
  }, [sessionData?.vorgangsId, lastVorgangsId]);

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
    document.title = `${t('performance.title')} - MU-Dash`;
  }, [t]);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: driversData, isLoading: driversLoading } = useQuery<{ summary: DriverReportSummary; drivers: DriverReportRow[] }>({
    queryKey: ["reports-drivers", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/drivers?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch drivers report");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<{ summary: VehicleReportSummary; vehicles: VehicleReportRow[] }>({
    queryKey: ["reports-vehicles", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/vehicles?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles report");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
  });

  const { data: promoData, isLoading: promoLoading } = useQuery<{ summary: PromoReportSummary; rows: PromoReportRow[] }>({
    queryKey: ["reports-promo"],
    queryFn: async () => {
      const res = await fetch("/api/reports/promo");
      if (!res.ok) throw new Error("Failed to fetch promo report");
      return res.json();
    },
    enabled: !isDemo,
  });

  const allDrivers = useMemo(() => {
    const reportData = isDemo ? mockDriverReport : driversData;
    if (!reportData?.drivers) return [];
    return reportData.drivers.map(d => ({
      value: `${d.firstName} ${d.lastName}`,
      label: `${d.firstName} ${d.lastName}`,
    }));
  }, [isDemo, driversData]);

  const allVehicles = useMemo(() => {
    const reportData = isDemo ? mockVehicleReport : vehiclesData;
    if (!reportData?.vehicles) return [];
    return reportData.vehicles.map(v => ({
      value: v.licensePlate,
      label: v.licensePlate,
    }));
  }, [isDemo, vehiclesData]);

  useEffect(() => {
    if (!hasInitializedFilters && allDrivers.length > 0 && allVehicles.length > 0) {
      setSelectedDrivers(allDrivers.map(d => d.value));
      setSelectedVehicles(allVehicles.map(v => v.value));
      setHasInitializedFilters(true);
    }
  }, [allDrivers, allVehicles, hasInitializedFilters]);

  const presets = useMemo(() => {
    const availableMonths = isDemo ? [] : (dateRangeData?.availableMonths || []);
    
    if (isDemo || availableMonths.length === 0) {
      const today = new Date();
      return [
        { label: t('performance.presetLastMonth'), from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-[1920px] mx-auto space-y-4 pb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="performance-title">
              {t('performance.title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('performance.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="drivers" data-testid="tab-drivers">{t('performance.tabDrivers')}</TabsTrigger>
              <TabsTrigger value="vehicles" data-testid="tab-vehicles">{t('performance.tabVehicles')}</TabsTrigger>
              <TabsTrigger value="promo" data-testid="tab-promo">{t('performance.tabPromo')}</TabsTrigger>
            </TabsList>
            {activeTab === "drivers" && (
              <MultiSelect
                items={allDrivers}
                selectedValues={selectedDrivers}
                onSelectionChange={setSelectedDrivers}
                placeholder={t('performance.filterSelectDrivers')}
                allSelectedLabel={t('performance.filterAllDrivers')}
                selectedCountLabel={(count) => t('performance.filterDriversCount').replace('{count}', count.toString())}
                searchPlaceholder={t('performance.searchPlaceholder')}
                selectAllLabel={t('performance.selectAll')}
                deselectAllLabel={t('performance.deselectAll')}
                noResultsLabel={t('performance.noResults')}
                testId="filter-drivers"
              />
            )}
            {(activeTab === "vehicles" || activeTab === "promo") && (
              <MultiSelect
                items={allVehicles}
                selectedValues={selectedVehicles}
                onSelectionChange={setSelectedVehicles}
                placeholder={t('performance.filterSelectVehicles')}
                allSelectedLabel={t('performance.filterAllVehicles')}
                selectedCountLabel={(count) => t('performance.filterVehiclesCount').replace('{count}', count.toString())}
                searchPlaceholder={t('performance.searchPlaceholder')}
                selectAllLabel={t('performance.selectAll')}
                deselectAllLabel={t('performance.deselectAll')}
                noResultsLabel={t('performance.noResults')}
                testId="filter-vehicles"
              />
            )}
            <DatePickerWithRange 
              date={dateRange} 
              onDateChange={setDateRange} 
              placeholder={t('performance.datePickerPlaceholder')}
              dateLocale={dateLocale}
              presets={presets}
            />
          </div>
        </div>

        {isDemo && (
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
        )}

        <TabsContent value="drivers" className="mt-0">
          <DriversTab 
            data={driversData} 
            isLoading={driversLoading} 
            isDemo={isDemo}
            timeMetric={timeMetric}
            setTimeMetric={setTimeMetric}
            distanceMetric={distanceMetric}
            setDistanceMetric={setDistanceMetric}
            tripsMetric={tripsMetric}
            setTripsMetric={setTripsMetric}
            selectedDrivers={selectedDrivers}
            setSelectedDrivers={setSelectedDrivers}
          />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-0">
          <VehiclesTab 
            data={vehiclesData} 
            isLoading={vehiclesLoading} 
            isDemo={isDemo}
            timeMetric={timeMetric}
            setTimeMetric={setTimeMetric}
            distanceMetric={distanceMetric}
            setDistanceMetric={setDistanceMetric}
            tripsMetric={tripsMetric}
            setTripsMetric={setTripsMetric}
            selectedVehicles={selectedVehicles}
            setSelectedVehicles={setSelectedVehicles}
          />
        </TabsContent>
        <TabsContent value="promo" className="mt-0">
          <PromoTab 
            data={promoData} 
            isLoading={promoLoading} 
            isDemo={isDemo}
            selectedVehicles={selectedVehicles}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
