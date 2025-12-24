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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  mockCommissionData,
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
  Banknote,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import type { DateRange } from "react-day-picker";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  tooltip?: string;
}

function KpiCard({ title, value, icon, testId, className, tags, onClick, tooltip }: KpiCardProps) {
  const cardContent = (
    <Card
      data-testid={testId}
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:shadow-lg hover:border-emerald-300 hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 min-h-[100px]">
        <div className="flex items-start justify-between h-full">
          <div className="space-y-3 flex-1">
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
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-800 text-white">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
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
          <div className="border-r border-slate-200 p-3 space-y-1 w-fit max-h-[340px] overflow-y-auto">
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
          <div className="p-3">
            <Calendar
              mode="range"
              month={month}
              onMonthChange={setMonth}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
              locale={dateLocale}
              captionLayout="dropdown"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
                month: "space-y-4",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-10 w-10 text-center text-sm p-0 relative",
                day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
              }}
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
  shiftFilter: "all" | "day" | "night";
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
      totalActiveDays: 0,
    };
  }
  
  const totalDrivers = drivers.length;
  const totalRevenue = drivers.reduce((acc, d) => acc + (d.totalRevenue || (d.avgRevenuePerTrip || 0) * d.completedTrips), 0);
  const totalDistanceKm = drivers.reduce((acc, d) => acc + d.distanceInTrip, 0);
  const totalHours = drivers.reduce((acc, d) => acc + d.timeInTrip, 0);
  const totalTrips = drivers.reduce((acc, d) => acc + d.completedTrips, 0);
  const totalShifts = drivers.reduce((acc, d) => acc + (d.shiftCount || 0), 0);
  const totalActiveDays = drivers.reduce((acc, d) => acc + (d.activeDays || 0), 0);
  
  const activeDaysEstimate = Math.max(1, totalActiveDays || totalShifts);
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
    totalActiveDays,
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

function DriversTab({ data, isLoading, isDemo, timeMetric, setTimeMetric, distanceMetric, setDistanceMetric, tripsMetric, setTripsMetric, selectedDrivers, setSelectedDrivers, shiftFilter }: DriversTabProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "completedTrips", direction: "desc" });
  const [showShiftsDialog, setShowShiftsDialog] = useState(false);
  const [cleanedRevenueMetric, setCleanedRevenueMetric] = useState<"day" | "week" | "month">("day");
  const [kmTimeMetric, setKmTimeMetric] = useState<"day" | "week" | "month">("day");
  
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
    let drivers = selectedDrivers.length === 0 
      ? reportData.drivers 
      : reportData.drivers.filter(d => selectedDrivers.includes(`${d.firstName} ${d.lastName}`));
    
    if (shiftFilter === "day") {
      drivers = drivers.filter(d => (d.dayShiftCount || 0) > (d.nightShiftCount || 0));
    } else if (shiftFilter === "night") {
      drivers = drivers.filter(d => (d.nightShiftCount || 0) > (d.dayShiftCount || 0));
    }
    
    return drivers.map(d => ({
      ...d,
      totalRevenue: d.totalRevenue || (d.avgRevenuePerTrip || 0) * d.completedTrips,
    }));
  }, [reportData?.drivers, selectedDrivers, shiftFilter]);
  
  const filteredSummary = useMemo(() => {
    // If no drivers selected (meaning ALL are shown) or all explicitly selected, and no shift filter, use original summary
    if ((selectedDrivers.length === 0 || selectedDrivers.length === allDrivers.length) && shiftFilter === "all" && reportData?.summary) {
      return reportData.summary;
    }
    return recalculateDriverSummary(filteredDrivers);
  }, [filteredDrivers, selectedDrivers.length, allDrivers.length, shiftFilter, reportData?.summary]);
  
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
  
  const cleanedRevenuePerDay = filteredSummary.totalActiveDays > 0 
    ? filteredSummary.totalRevenue / filteredSummary.totalActiveDays 
    : 0;
  const getCleanedRevenueValue = (metric: "day" | "week" | "month") => {
    switch (metric) {
      case "day": return cleanedRevenuePerDay;
      case "week": return cleanedRevenuePerDay * 7;
      case "month": return cleanedRevenuePerDay * 30;
    }
  };
  
  const getCleanedRevenueTooltip = (metric: "day" | "week" | "month") => {
    const revenue = formatCurrency(filteredSummary.totalRevenue);
    const days = filteredSummary.totalActiveDays;
    const result = formatCurrency(getCleanedRevenueValue(metric));
    const tooltipKey = metric === "day" ? 'performance.kpiCleanedTooltipDay' 
      : metric === "week" ? 'performance.kpiCleanedTooltipWeek' 
      : 'performance.kpiCleanedTooltipMonth';
    return t(tooltipKey)
      .replace('{{revenue}}', revenue)
      .replace('{{days}}', days.toString())
      .replace('{{result}}', result);
  };

  const kmPerTrip = filteredSummary.totalTrips > 0 
    ? filteredSummary.totalDistance / filteredSummary.totalTrips 
    : 0;
  
  const kmPerDay = filteredSummary.totalActiveDays > 0 
    ? filteredSummary.totalDistance / filteredSummary.totalActiveDays 
    : 0;
  
  const getKmTimeValue = (metric: "day" | "week" | "month") => {
    switch (metric) {
      case "day": return kmPerDay;
      case "week": return kmPerDay * 7;
      case "month": return kmPerDay * 30;
    }
  };

  const kmPerDriver = filteredSummary.uniqueDrivers > 0 
    ? filteredSummary.totalDistance / filteredSummary.uniqueDrivers 
    : 0;

  const shiftsTooltip = t('performance.kpiShiftsTooltip')
    .replace('{{trips}}', formatNumber(filteredSummary.totalTrips, 0))
    .replace('{{revenue}}', formatCurrency(filteredSummary.totalRevenue));
  
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-shrink-0">
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
          tooltip={shiftsTooltip}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <KpiCard
          testId="kpi-driver-cleaned-revenue"
          title={t('performance.kpiCleanedRevenue')}
          value={formatCurrency(getCleanedRevenueValue(cleanedRevenueMetric))}
          icon={<TrendingUp className="w-5 h-5" />}
          tags={{
            value: cleanedRevenueMetric,
            options: [
              { value: "day", label: t('performance.kpiCleanedDay') },
              { value: "week", label: t('performance.kpiCleanedWeek') },
              { value: "month", label: t('performance.kpiCleanedMonth') },
            ],
            onChange: (v) => setCleanedRevenueMetric(v as "day" | "week" | "month"),
          }}
          tooltip={getCleanedRevenueTooltip(cleanedRevenueMetric)}
        />
        <KpiCard
          testId="kpi-driver-km-per-trip"
          title={t('performance.kpiKmPerTrip')}
          value={`${formatNumber(kmPerTrip, 1)} km`}
          icon={<Route className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-driver-km-per-time"
          title=""
          value={`${formatNumber(getKmTimeValue(kmTimeMetric), 0)} km`}
          icon={<Route className="w-5 h-5" />}
          tags={{
            value: kmTimeMetric,
            options: [
              { value: "day", label: t('performance.kpiKmPerDay') },
              { value: "week", label: t('performance.kpiKmPerWeek') },
              { value: "month", label: t('performance.kpiKmPerMonth') },
            ],
            onChange: (v) => setKmTimeMetric(v as "day" | "week" | "month"),
          }}
        />
        <KpiCard
          testId="kpi-driver-km-per-driver"
          title={t('performance.kpiKmPerDriver')}
          value={`${formatNumber(kmPerDriver, 0)} km`}
          icon={<User className="w-5 h-5" />}
        />
      </div>
      
      <ShiftsDialog
        open={showShiftsDialog}
        onOpenChange={setShowShiftsDialog}
        drivers={filteredDrivers}
        isDemo={isDemo}
      />
      
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
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
              {(() => {
                const totalCompletedTrips = filteredDrivers.reduce((acc, d) => acc + d.completedTrips, 0);
                const totalCancelledTrips = filteredDrivers.reduce((acc, d) => acc + d.cancelledTrips, 0);
                const totalAllTrips = filteredDrivers.reduce((acc, d) => acc + d.totalTrips, 0);
                const totalDistance = filteredDrivers.reduce((acc, d) => acc + d.distanceInTrip, 0);
                const totalTime = filteredDrivers.reduce((acc, d) => acc + d.timeInTrip, 0);
                const totalRev = filteredDrivers.reduce((acc, d) => acc + (d.totalRevenue || 0), 0);
                const avgFare = totalCompletedTrips > 0 ? totalRev / totalCompletedTrips : 0;
                const avgPricePerKm = totalDistance > 0 ? totalRev / totalDistance : 0;
                const avgTripsPerHour = totalTime > 0 ? totalCompletedTrips / totalTime : 0;
                const avgAcceptance = totalAllTrips > 0 ? (totalCompletedTrips / totalAllTrips) * 100 : 0;
                return (
                  <TableRow className="bg-emerald-50 font-semibold border-b-2 border-emerald-200">
                    <TableCell className="whitespace-nowrap" colSpan={2}>{t('performance.tableSummaryRow')}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">—</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalCompletedTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalCancelledTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalAllTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(avgFare)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(totalDistance, 0)} km</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgPricePerKm)} €</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(filteredSummary.avgRevenuePerDay)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(filteredSummary.avgRevenuePerHour)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgTripsPerHour)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgAcceptance, 1)}%</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(totalTime, 0)} h</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(totalRev)}</TableCell>
                  </TableRow>
                );
              })()}
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
        <div className="p-3 border-t flex justify-end flex-shrink-0">
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
      totalActiveDays: 0,
    };
  }
  
  const totalVehicles = vehicles.length;
  const totalRevenue = vehicles.reduce((acc, v) => acc + v.totalRevenue, 0);
  const totalDistanceKm = vehicles.reduce((acc, v) => acc + v.distanceInTrip, 0);
  const totalHours = vehicles.reduce((acc, v) => acc + v.timeInTrip, 0);
  const totalTrips = vehicles.reduce((acc, v) => acc + v.completedTrips, 0);
  const totalShifts = vehicles.reduce((acc, v) => acc + (v.shiftCount || 0), 0);
  
  const totalActiveDays = Math.max(1, totalShifts);
  const activeMonthsEstimate = Math.max(1, Math.ceil(totalActiveDays / 22));
  
  return {
    avgRevenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
    avgRevenuePerDay: totalActiveDays > 0 ? totalRevenue / totalActiveDays : 0,
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
    totalActiveDays,
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
  const [showOccupancyDialog, setShowOccupancyDialog] = useState(false);
  const [cleanedRevenueMetric, setCleanedRevenueMetric] = useState<"day" | "week" | "month">("day");
  
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

  const vehicleActiveDays = filteredSummary.totalActiveDays || filteredSummary.totalShifts || 1;
  const cleanedRevenuePerDay = vehicleActiveDays > 0 
    ? filteredSummary.totalRevenue / vehicleActiveDays
    : 0;
  const getCleanedRevenueValue = (metric: "day" | "week" | "month") => {
    switch (metric) {
      case "day": return cleanedRevenuePerDay;
      case "week": return cleanedRevenuePerDay * 7;
      case "month": return cleanedRevenuePerDay * 30;
    }
  };
  
  const getCleanedRevenueTooltip = (metric: "day" | "week" | "month") => {
    const revenue = formatCurrency(filteredSummary.totalRevenue);
    const days = vehicleActiveDays;
    const result = formatCurrency(getCleanedRevenueValue(metric));
    const tooltipKey = metric === "day" ? 'performance.kpiCleanedTooltipDay' 
      : metric === "week" ? 'performance.kpiCleanedTooltipWeek' 
      : 'performance.kpiCleanedTooltipMonth';
    return t(tooltipKey)
      .replace('{{revenue}}', revenue)
      .replace('{{days}}', days.toString())
      .replace('{{result}}', result);
  };
  
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 flex-shrink-0">
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
          onClick={() => setShowOccupancyDialog(true)}
        />
        <KpiCard
          testId="kpi-vehicle-cleaned-revenue"
          title={t('performance.kpiCleanedRevenue')}
          value={formatCurrency(getCleanedRevenueValue(cleanedRevenueMetric))}
          icon={<TrendingUp className="w-5 h-5" />}
          tags={{
            value: cleanedRevenueMetric,
            options: [
              { value: "day", label: t('performance.kpiCleanedDay') },
              { value: "week", label: t('performance.kpiCleanedWeek') },
              { value: "month", label: t('performance.kpiCleanedMonth') },
            ],
            onChange: (v) => setCleanedRevenueMetric(v as "day" | "week" | "month"),
          }}
          tooltip={getCleanedRevenueTooltip(cleanedRevenueMetric)}
        />
      </div>
      
      <Dialog open={showOccupancyDialog} onOpenChange={setShowOccupancyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('performance.occupancyDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('performance.tableLicensePlate')}</TableHead>
                  <TableHead className="text-right">{t('performance.tableOccupancyRate')}</TableHead>
                  <TableHead className="text-right">{t('performance.tableCompletedTrips')}</TableHead>
                  <TableHead className="text-right">{t('performance.tableTotalRevenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...filteredVehicles].sort((a, b) => b.occupancyRate - a.occupancyRate).map((vehicle) => (
                  <TableRow key={vehicle.licensePlate}>
                    <TableCell className="font-mono font-medium whitespace-nowrap">{vehicle.licensePlate}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        vehicle.occupancyRate >= 75 ? "bg-emerald-100 text-emerald-700" :
                        vehicle.occupancyRate >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {formatNumber(vehicle.occupancyRate, 1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{vehicle.completedTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(vehicle.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      
      <VehicleShiftsDialog
        open={showShiftsDialog}
        onOpenChange={setShowShiftsDialog}
        vehicles={filteredVehicles}
        isDemo={isDemo}
      />
      
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
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
              {(() => {
                const totalCompletedTrips = filteredVehicles.reduce((acc, v) => acc + v.completedTrips, 0);
                const totalCancelledTrips = filteredVehicles.reduce((acc, v) => acc + v.cancelledTrips, 0);
                const totalAllTrips = filteredVehicles.reduce((acc, v) => acc + v.totalTrips, 0);
                const totalDistance = filteredVehicles.reduce((acc, v) => acc + v.distanceInTrip, 0);
                const totalTime = filteredVehicles.reduce((acc, v) => acc + v.timeInTrip, 0);
                const totalRev = filteredVehicles.reduce((acc, v) => acc + v.totalRevenue, 0);
                const totalNightRev = filteredVehicles.reduce((acc, v) => acc + (v.revenueNightShift || 0), 0);
                const totalDayRev = filteredVehicles.reduce((acc, v) => acc + (v.revenueDayShift || 0), 0);
                const avgFare = totalCompletedTrips > 0 ? totalRev / totalCompletedTrips : 0;
                const avgPricePerKm = totalDistance > 0 ? totalRev / totalDistance : 0;
                const avgTripsPerHour = totalTime > 0 ? totalCompletedTrips / totalTime : 0;
                const avgAcceptance = totalAllTrips > 0 ? (totalCompletedTrips / totalAllTrips) * 100 : 0;
                return (
                  <TableRow className="bg-emerald-50 font-semibold border-b-2 border-emerald-200">
                    <TableCell className="whitespace-nowrap">{t('performance.tableSummaryRow')}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalCompletedTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalCancelledTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{totalAllTrips}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(avgFare)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(totalDistance, 0)} km</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgPricePerKm)} €</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(filteredSummary.avgRevenuePerDay)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(totalNightRev)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(totalDayRev)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(totalRev)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(filteredSummary.avgRevenuePerHour)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgTripsPerHour)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(avgAcceptance, 1)}%</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatNumber(totalTime, 0)} h</TableCell>
                  </TableRow>
                );
              })()}
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
        <div className="p-3 border-t flex justify-end flex-shrink-0">
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
  dateRange?: DateRange;
}

function PromoTab({ data, isLoading, isDemo, selectedVehicles, dateRange }: PromoTabProps) {
  const { t } = useTranslation();
  
  const reportData = isDemo ? mockPromoReport : data;
  
  const parseMonth = (monthStr: string): { year: number; month: number } => {
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-').map(Number);
      return { year, month };
    } else {
      const [month, year] = monthStr.split('/').map(Number);
      return { year, month };
    }
  };

  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    let rows = reportData.rows;
    
    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      rows = rows.filter(row => {
        const { year, month } = parseMonth(row.month);
        // Create date for first day of month
        const rowDate = new Date(year, month - 1, 1);
        
        if (dateRange?.from) {
          const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1);
          if (rowDate < fromDate) return false;
        }
        if (dateRange?.to) {
          const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1);
          if (rowDate > toDate) return false;
        }
        return true;
      });
    }
    
    // Filter by selected vehicles
    if (selectedVehicles.length > 0) {
      rows = rows.filter(row => selectedVehicles.includes(row.licensePlate));
    }
    
    return rows;
  }, [reportData?.rows, selectedVehicles, dateRange]);
  
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
  
  const { pivotData, months, monthTotals } = useMemo(() => {
    if (!filteredRows.length) return { pivotData: [], months: [], monthTotals: {} as Record<string, { theo: number; paid: number; diff: number }> };
    
    const monthSet = new Set<string>();
    const vehicleMap = new Map<string, Record<string, { theo: number; paid: number; diff: number; trips: number }>>();
    
    filteredRows.forEach(row => {
      monthSet.add(row.month);
      if (!vehicleMap.has(row.licensePlate)) {
        vehicleMap.set(row.licensePlate, {});
      }
      const vehicleData = vehicleMap.get(row.licensePlate)!;
      if (!vehicleData[row.month]) {
        vehicleData[row.month] = { theo: 0, paid: 0, diff: 0, trips: 0 };
      }
      vehicleData[row.month].theo += row.theoreticalBonus;
      vehicleData[row.month].paid += row.actualPaid;
      vehicleData[row.month].diff += row.difference;
      vehicleData[row.month].trips += row.tripCount;
    });
    
    const sortedMonths = Array.from(monthSet).sort((a, b) => {
      const parsedA = parseMonth(a);
      const parsedB = parseMonth(b);
      // Use numeric comparison: year * 100 + month for proper chronological sort
      const valueA = parsedA.year * 100 + parsedA.month;
      const valueB = parsedB.year * 100 + parsedB.month;
      return valueA - valueB;
    });
    
    const totals: Record<string, { theo: number; paid: number; diff: number }> = {};
    sortedMonths.forEach(month => {
      totals[month] = { theo: 0, paid: 0, diff: 0 };
    });
    
    const pivotRows = Array.from(vehicleMap.entries()).map(([licensePlate, monthData]) => {
      let vehicleTotal = { theo: 0, paid: 0, diff: 0 };
      sortedMonths.forEach(month => {
        if (monthData[month]) {
          vehicleTotal.theo += monthData[month].theo;
          vehicleTotal.paid += monthData[month].paid;
          vehicleTotal.diff += monthData[month].diff;
          totals[month].theo += monthData[month].theo;
          totals[month].paid += monthData[month].paid;
          totals[month].diff += monthData[month].diff;
        }
      });
      return { licensePlate, monthData, total: vehicleTotal };
    }).sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    
    return { pivotData: pivotRows, months: sortedMonths, monthTotals: totals };
  }, [filteredRows]);
  
  const exportToExcel = () => {
    if (!pivotData.length) return;
    const headers: Record<string, any> = { [t('performance.tableLicensePlate')]: '' };
    months.forEach(month => {
      headers[`${month} ${t('performance.tableTheoBonus')}`] = '';
      headers[`${month} ${t('performance.tablePaid')}`] = '';
      headers[`${month} ${t('performance.tableDifference')}`] = '';
    });
    headers[`${t('performance.total')} ${t('performance.tableTheoBonus')}`] = '';
    headers[`${t('performance.total')} ${t('performance.tablePaid')}`] = '';
    headers[`${t('performance.total')} ${t('performance.tableDifference')}`] = '';
    
    const dataToExport = pivotData.map(row => {
      const rowData: Record<string, any> = { [t('performance.tableLicensePlate')]: row.licensePlate };
      months.forEach(month => {
        const data = row.monthData[month] || { theo: 0, paid: 0, diff: 0 };
        rowData[`${month} ${t('performance.tableTheoBonus')}`] = data.theo;
        rowData[`${month} ${t('performance.tablePaid')}`] = data.paid;
        rowData[`${month} ${t('performance.tableDifference')}`] = data.diff;
      });
      rowData[`${t('performance.total')} ${t('performance.tableTheoBonus')}`] = row.total.theo;
      rowData[`${t('performance.total')} ${t('performance.tablePaid')}`] = row.total.paid;
      rowData[`${t('performance.total')} ${t('performance.tableDifference')}`] = row.total.diff;
      return rowData;
    });
    
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
  
  const grandTotal = {
    theo: Object.values(monthTotals).reduce((sum, m) => sum + m.theo, 0),
    paid: Object.values(monthTotals).reduce((sum, m) => sum + m.paid, 0),
    diff: Object.values(monthTotals).reduce((sum, m) => sum + m.diff, 0),
  };
  
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
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
      
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10 min-w-[80px]">{t('performance.tableLicensePlate')}</TableHead>
                <TableHead colSpan={3} className="text-center border-l bg-slate-50 font-bold whitespace-nowrap text-xs px-1">
                  {t('performance.total')}
                </TableHead>
                {months.map(month => (
                  <TableHead key={month} colSpan={3} className="text-center border-l whitespace-nowrap text-xs px-1">
                    {month}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="bg-slate-50/50">
                <TableHead className="sticky left-0 bg-slate-50/50 z-10"></TableHead>
                <TableHead className="text-right text-xs border-l bg-slate-100 px-1 whitespace-nowrap">{t('performance.tableTheoShort')}</TableHead>
                <TableHead className="text-right text-xs bg-slate-100 px-1 whitespace-nowrap">{t('performance.tablePaidShort')}</TableHead>
                <TableHead className="text-right text-xs bg-slate-100 px-1 whitespace-nowrap">{t('performance.tableDiffShort')}</TableHead>
                {months.map(month => (
                  <React.Fragment key={`sub-${month}`}>
                    <TableHead className="text-right text-xs border-l px-1 whitespace-nowrap">{t('performance.tableTrips')}</TableHead>
                    <TableHead className="text-right text-xs px-1 whitespace-nowrap">{t('performance.tablePaidShort')}</TableHead>
                    <TableHead className="text-right text-xs px-1 whitespace-nowrap">{t('performance.tableDiffShort')}</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotData.map((row) => (
                <TableRow key={row.licensePlate}>
                  <TableCell className="sticky left-0 bg-white z-10 font-mono font-medium whitespace-nowrap">{row.licensePlate}</TableCell>
                  <TableCell className="text-right border-l bg-slate-50 font-medium px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(row.total.theo)}</TableCell>
                  <TableCell className="text-right bg-slate-50 font-medium px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(row.total.paid)}</TableCell>
                  <TableCell className={cn("text-right bg-slate-50 font-medium px-1 whitespace-nowrap text-xs", row.total.diff < 0 && "text-red-600")}>
                    {formatCurrencyCompact(row.total.diff)}
                  </TableCell>
                  {months.map(month => {
                    const data = row.monthData[month] || { theo: 0, paid: 0, diff: 0, trips: 0 };
                    const tripBgClass = data.trips >= 700 
                      ? "bg-emerald-100" 
                      : data.trips >= 250 
                        ? "bg-amber-100" 
                        : "";
                    const paidBgClass = data.paid > 0 ? "bg-emerald-100" : "";
                    const diffBgClass = data.diff < 0 ? "bg-orange-100" : "";
                    return (
                      <React.Fragment key={`${row.licensePlate}-${month}`}>
                        <TableCell className={cn("text-right border-l px-1 whitespace-nowrap text-xs", tripBgClass)}>
                          {data.trips > 0 ? data.trips : '-'}
                        </TableCell>
                        <TableCell className={cn("text-right px-1 whitespace-nowrap text-xs", paidBgClass)}>{data.paid ? formatCurrencyCompact(data.paid) : '-'}</TableCell>
                        <TableCell className={cn("text-right px-1 whitespace-nowrap text-xs", diffBgClass, data.diff < 0 && "text-red-600")}>
                          {data.diff !== 0 ? formatCurrencyCompact(data.diff) : '-'}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow className="bg-slate-100 font-bold border-t-2">
                <TableCell className="sticky left-0 bg-slate-100 z-10 text-xs">{t('performance.total')}</TableCell>
                <TableCell className="text-right border-l bg-slate-200 px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(grandTotal.theo)}</TableCell>
                <TableCell className="text-right bg-slate-200 px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(grandTotal.paid)}</TableCell>
                <TableCell className={cn("text-right bg-slate-200 px-1 whitespace-nowrap text-xs", grandTotal.diff < 0 && "text-red-600")}>
                  {formatCurrencyCompact(grandTotal.diff)}
                </TableCell>
                {months.map(month => {
                  const data = monthTotals[month] || { theo: 0, paid: 0, diff: 0 };
                  return (
                    <React.Fragment key={`total-${month}`}>
                      <TableCell className="text-right border-l px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(data.theo)}</TableCell>
                      <TableCell className="text-right px-1 whitespace-nowrap text-xs">{formatCurrencyCompact(data.paid)}</TableCell>
                      <TableCell className={cn("text-right px-1 whitespace-nowrap text-xs", data.diff < 0 && "text-red-600")}>
                        {formatCurrencyCompact(data.diff)}
                      </TableCell>
                    </React.Fragment>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="export-promo">
            <Download className="w-4 h-4 mr-2" />
            {t('performance.exportExcel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface CommissionAnalysis {
  summary: {
    totalFarePrice: number;
    totalRevenue: number;
    totalCommission: number;
    commissionPercent: number;
    tripCount: number;
  };
  byDriver: Array<{
    driverName: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byVehicle: Array<{
    licensePlate: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byMonth: Array<{
    month: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
}

interface CompanyTabProps {
  commissionsData: CommissionAnalysis | undefined;
  driversData: { summary: DriverReportSummary; drivers: DriverReportRow[] } | undefined;
  vehiclesData: { summary: VehicleReportSummary; vehicles: VehicleReportRow[] } | undefined;
  promoData: { summary: PromoReportSummary; rows: PromoReportRow[] } | undefined;
  isLoading: boolean;
  isDemo: boolean;
  dateRange: DateRange | undefined;
}

function CompanyTab({ commissionsData, driversData, vehiclesData, promoData, isLoading, isDemo, dateRange }: CompanyTabProps) {
  const { t } = useTranslation();
  const [fareMetric, setFareMetric] = useState<"total" | "day" | "week" | "month">("total");
  const [revenueMetric, setRevenueMetric] = useState<"total" | "day" | "week" | "month">("total");
  const [shiftsMetric, setShiftsMetric] = useState<"total" | "day" | "week" | "month">("total");
  const [tripsMetric, setTripsMetric] = useState<"total" | "day" | "week" | "month">("total");
  const [cleanedRevenueMetric, setCleanedRevenueMetric] = useState<"day" | "week" | "month">("day");
  const [expectedFeePercent, setExpectedFeePercent] = useState<number>(30);

  const effectiveCommissionsData = isDemo ? mockCommissionData : commissionsData;
  const effectiveDriversData = isDemo ? mockDriverReport : driversData;
  const effectiveVehiclesData = isDemo ? mockVehicleReport : vehiclesData;
  const effectivePromoData = isDemo ? mockPromoReport : promoData;

  const daysInRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 30;
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }, [dateRange]);

  const weeksInRange = Math.max(1, daysInRange / 7);
  const monthsInRange = Math.max(1, daysInRange / 30);

  const summary = useMemo(() => {
    const commSummary = effectiveCommissionsData?.summary || { totalFarePrice: 0, totalRevenue: 0, commissionPercent: 0, tripCount: 0 };
    const driverSummary = effectiveDriversData?.summary || { totalShifts: 0, avgRevenuePerKm: 0, totalActiveDays: 0, totalRevenue: 0 };
    const vehicleSummary = effectiveVehiclesData?.summary || { avgOccupancyRate: 0 };
    const drivers = effectiveDriversData?.drivers || [];
    
    const totalCompletedTrips = drivers.length > 0 
      ? drivers.reduce((sum, d) => sum + d.completedTrips, 0)
      : 0;
    const totalCancelledTrips = drivers.length > 0 
      ? drivers.reduce((sum, d) => sum + d.cancelledTrips, 0)
      : 0;
    const totalTripsForRate = totalCompletedTrips + totalCancelledTrips;
    const cancellationRate = totalTripsForRate > 0 ? (totalCancelledTrips / totalTripsForRate) * 100 : 0;
    const revenuePerTrip = commSummary.tripCount > 0 ? commSummary.totalRevenue / commSummary.tripCount : 0;
    const pricePerKm = (driverSummary as any).avgRevenuePerKm || 0;
    
    const totalFees = commSummary.totalFarePrice - commSummary.totalRevenue;
    
    const totalActiveDays = (driverSummary as any).totalActiveDays || 0;
    const cleanedRevenuePerDay = totalActiveDays > 0 ? (driverSummary as any).totalRevenue / totalActiveDays : 0;
    
    return {
      totalFare: commSummary.totalFarePrice,
      totalRevenue: commSummary.totalRevenue,
      totalFees,
      feesPercent: commSummary.commissionPercent,
      totalShifts: driverSummary.totalShifts,
      totalTrips: commSummary.tripCount,
      cancellationRate,
      occupancyRate: vehicleSummary.avgOccupancyRate || 0,
      pricePerKm,
      revenuePerTrip,
      totalActiveDays,
      cleanedRevenuePerDay,
    };
  }, [effectiveCommissionsData, effectiveDriversData, effectiveVehiclesData]);

  const getValueByMetric = (total: number, metric: "total" | "day" | "week" | "month") => {
    switch (metric) {
      case "day": return total / daysInRange;
      case "week": return total / weeksInRange;
      case "month": return total / monthsInRange;
      default: return total;
    }
  };

  const getMetricLabel = (metric: "total" | "day" | "week" | "month", baseLabel: string) => {
    switch (metric) {
      case "day": return baseLabel + t('performance.companyPerDay');
      case "week": return baseLabel + t('performance.companyPerWeek');
      case "month": return baseLabel + t('performance.companyPerMonth');
      default: return baseLabel;
    }
  };

  const getCleanedRevenueValue = (metric: "day" | "week" | "month") => {
    const perDay = summary.cleanedRevenuePerDay;
    switch (metric) {
      case "day": return perDay;
      case "week": return perDay * 7;
      case "month": return perDay * 30;
    }
  };

  const getCleanedRevenueTooltip = (metric: "day" | "week" | "month") => {
    const revenue = formatCurrency(summary.totalRevenue || 0);
    const days = summary.totalActiveDays || 0;
    const result = formatCurrency(getCleanedRevenueValue(metric));
    const tooltipKey = metric === "day" ? 'performance.kpiCleanedTooltipDay' 
      : metric === "week" ? 'performance.kpiCleanedTooltipWeek' 
      : 'performance.kpiCleanedTooltipMonth';
    return t(tooltipKey)
      .replace('{{revenue}}', revenue)
      .replace('{{days}}', days.toString())
      .replace('{{result}}', result);
  };

  const cleanedRevenueMetricOptions = [
    { value: "day", label: t('performance.companyCleanedPerDay') },
    { value: "week", label: t('performance.companyCleanedPerWeek') },
    { value: "month", label: t('performance.companyCleanedPerMonth') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    );
  }

  if (!effectiveCommissionsData && !effectiveDriversData && !effectiveVehiclesData) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">{t('performance.companyNoData')}</p>
      </Card>
    );
  }

  const metricOptions = [
    { value: "total", label: t('performance.tableTotal') },
    { value: "day", label: t('performance.companyPerDay').replace('/', '') },
    { value: "week", label: t('performance.companyPerWeek').replace('/', '') },
    { value: "month", label: t('performance.companyPerMonth').replace('/', '') },
  ];

  const promoDiff = effectivePromoData?.summary?.totalDifference || 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('performance.categoryRevenue')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            testId="kpi-company-fare"
            title=""
            value={formatCurrency(getValueByMetric(summary.totalFare, fareMetric))}
            icon={<Car className="w-5 h-5" />}
            tags={{
              value: fareMetric,
              options: metricOptions.map(o => ({ value: o.value, label: o.value === "total" ? t('performance.companyTotalFare') : getMetricLabel(o.value as any, t('performance.companyTotalFare')) })),
              onChange: (v) => setFareMetric(v as any),
            }}
          />
          <KpiCard
            testId="kpi-company-revenue"
            title=""
            value={formatCurrency(getValueByMetric(summary.totalRevenue, revenueMetric))}
            icon={<Banknote className="w-5 h-5" />}
            tags={{
              value: revenueMetric,
              options: metricOptions.map(o => ({ value: o.value, label: o.value === "total" ? t('performance.companyYourRevenue') : getMetricLabel(o.value as any, t('performance.companyYourRevenue')) })),
              onChange: (v) => setRevenueMetric(v as any),
            }}
          />
          <KpiCard
            testId="kpi-company-pertrip"
            title={t('performance.companyPerTrip')}
            value={formatCurrency(summary.revenuePerTrip)}
            icon={<Car className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-perkm"
            title={t('performance.companyPerKm')}
            value={`${formatNumber(summary.pricePerKm, 2)} €`}
            icon={<Route className="w-5 h-5" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('performance.categoryFees')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            testId="kpi-company-fees"
            title={t('performance.companyFeesPercent')}
            value={`${summary.feesPercent.toFixed(1)}%`}
            icon={<Car className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-total-fees"
            title={t('performance.companyTotalFees')}
            value={formatCurrency(summary.totalFees)}
            icon={<Banknote className="w-5 h-5" />}
          />
          <Card data-testid="kpi-company-excess-fees">
            <CardContent className="p-5 min-h-[100px]">
              <div className="flex items-start justify-between h-full">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">{t('performance.expectedFees')}</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={expectedFeePercent}
                        onChange={(e) => setExpectedFeePercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-14 px-2 py-1 text-sm border rounded text-center"
                        min="0"
                        max="100"
                        data-testid="input-expected-fee"
                      />
                      <span className="ml-1 text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">{t('performance.excessFees')}</p>
                  <p 
                    className={cn(
                      "text-2xl font-bold",
                      (summary.feesPercent - expectedFeePercent) > 0 ? "text-red-600" : "text-slate-900"
                    )}
                    data-testid="kpi-company-excess-fees-value"
                  >
                    {formatCurrency((summary.feesPercent - expectedFeePercent) / 100 * summary.totalFare)}
                  </p>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('performance.categoryPromo')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            testId="kpi-company-promo-earned"
            title={t('performance.companyPromoEarned')}
            value={formatCurrency(promoData?.summary?.totalTheoreticalBonus || 0)}
            icon={<Gift className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-promo-paid"
            title={t('performance.companyPromoPaid')}
            value={formatCurrency(promoData?.summary?.totalActualPaid || 0)}
            icon={<Banknote className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-promo-diff"
            title={t('performance.companyPromoDiff')}
            value={formatCurrency(promoDiff)}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('performance.categoryPerformance')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            testId="kpi-company-shifts"
            title=""
            value={formatNumber(getValueByMetric(summary.totalShifts, shiftsMetric), 0)}
            icon={<Clock className="w-5 h-5" />}
            tags={{
              value: shiftsMetric,
              options: metricOptions.map(o => ({ value: o.value, label: o.value === "total" ? t('performance.companyShifts') : getMetricLabel(o.value as any, t('performance.companyShifts')) })),
              onChange: (v) => setShiftsMetric(v as any),
            }}
          />
          <KpiCard
            testId="kpi-company-trips"
            title=""
            value={formatNumber(getValueByMetric(summary.totalTrips, tripsMetric), 0)}
            icon={<Route className="w-5 h-5" />}
            tags={{
              value: tripsMetric,
              options: metricOptions.map(o => ({ value: o.value, label: o.value === "total" ? t('performance.companyTrips') : getMetricLabel(o.value as any, t('performance.companyTrips')) })),
              onChange: (v) => setTripsMetric(v as any),
            }}
          />
          <KpiCard
            testId="kpi-company-cancellation"
            title={t('performance.companyCancellationRate')}
            value={`${summary.cancellationRate.toFixed(1)}%`}
            icon={<X className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-occupancy"
            title={t('performance.companyOccupancyRate')}
            value={`${summary.occupancyRate.toFixed(1)}%`}
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            testId="kpi-company-cleaned-revenue"
            title=""
            value={formatCurrency(getCleanedRevenueValue(cleanedRevenueMetric))}
            icon={<TrendingUp className="w-5 h-5" />}
            tags={{
              value: cleanedRevenueMetric,
              options: cleanedRevenueMetricOptions,
              onChange: (v) => setCleanedRevenueMetric(v as any),
            }}
            tooltip={getCleanedRevenueTooltip(cleanedRevenueMetric)}
          />
        </div>
      </div>
    </div>
  );
}

interface CommissionsTabProps {
  data: CommissionAnalysis | undefined;
  isLoading: boolean;
  isDemo: boolean;
  selectedVehicles: string[];
}

function CommissionsTab({ data, isLoading, isDemo, selectedVehicles }: CommissionsTabProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "month", direction: "desc" });
  const [viewMode, setViewMode] = useState<"byMonth" | "byVehicle" | "byDriver">("byMonth");
  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };
  
  const commissionData = isDemo ? mockCommissionData : data;
  
  const filteredByVehicle = useMemo(() => {
    if (!commissionData?.byVehicle) return [];
    if (selectedVehicles.length === 0) return commissionData.byVehicle;
    return commissionData.byVehicle.filter(row => selectedVehicles.includes(row.licensePlate));
  }, [commissionData?.byVehicle, selectedVehicles]);
  
  const filteredSummary = useMemo(() => {
    if (!commissionData?.summary) return { totalFarePrice: 0, totalRevenue: 0, totalCommission: 0, commissionPercent: 0, tripCount: 0 };
    
    if (viewMode === "byVehicle" && selectedVehicles.length > 0) {
      const totalFarePrice = filteredByVehicle.reduce((sum, r) => sum + r.farePrice, 0);
      const totalRevenue = filteredByVehicle.reduce((sum, r) => sum + r.revenue, 0);
      const totalCommission = filteredByVehicle.reduce((sum, r) => sum + r.commission, 0);
      const tripCount = filteredByVehicle.reduce((sum, r) => sum + r.tripCount, 0);
      return {
        totalFarePrice,
        totalRevenue,
        totalCommission,
        commissionPercent: totalFarePrice > 0 ? (totalCommission / totalFarePrice) * 100 : 0,
        tripCount,
      };
    }
    
    return commissionData.summary;
  }, [commissionData, filteredByVehicle, selectedVehicles, viewMode]);
  
  const exportToExcel = () => {
    let dataToExport: any[] = [];
    if (viewMode === "byMonth" && commissionData?.byMonth) {
      dataToExport = sortData(commissionData.byMonth, sortConfig).map(row => ({
        [t('performance.tableMonth')]: row.month,
        [t('performance.tableTrips')]: row.tripCount,
        [t('performance.commissionFarePrice')]: row.farePrice,
        [t('performance.commissionRevenue')]: row.revenue,
        [t('performance.commissionAmount')]: row.commission,
        [t('performance.commissionPercent')]: `${row.commissionPercent.toFixed(1)}%`,
      }));
    } else if (viewMode === "byVehicle") {
      dataToExport = sortData(filteredByVehicle, sortConfig).map(row => ({
        [t('performance.tableLicensePlate')]: row.licensePlate,
        [t('performance.tableTrips')]: row.tripCount,
        [t('performance.commissionFarePrice')]: row.farePrice,
        [t('performance.commissionRevenue')]: row.revenue,
        [t('performance.commissionAmount')]: row.commission,
        [t('performance.commissionPercent')]: `${row.commissionPercent.toFixed(1)}%`,
      }));
    } else if (viewMode === "byDriver" && commissionData?.byDriver) {
      dataToExport = sortData(commissionData.byDriver, sortConfig).map(row => ({
        [t('performance.tableDriver')]: row.driverName,
        [t('performance.tableTrips')]: row.tripCount,
        [t('performance.commissionFarePrice')]: row.farePrice,
        [t('performance.commissionRevenue')]: row.revenue,
        [t('performance.commissionAmount')]: row.commission,
        [t('performance.commissionPercent')]: `${row.commissionPercent.toFixed(1)}%`,
      }));
    }
    if (!dataToExport.length) return;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('performance.tabCommissions'));
    XLSX.writeFile(wb, `${t('performance.tabCommissions')}_Report.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    );
  }
  
  if (!commissionData || commissionData.summary.tripCount === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">{t('performance.commissionNoData')}</p>
      </Card>
    );
  }
  
  const avgFeePerTrip = filteredSummary.tripCount > 0 
    ? filteredSummary.totalCommission / filteredSummary.tripCount 
    : 0;
  
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-shrink-0">
        <KpiCard
          testId="kpi-commission-fareprice"
          title={t('performance.commissionFarePrice')}
          value={formatCurrency(filteredSummary.totalFarePrice)}
          icon={<Car className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-commission-revenue"
          title={t('performance.commissionRevenue')}
          value={formatCurrency(filteredSummary.totalRevenue)}
          icon={<Car className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-commission-amount"
          title={t('performance.commissionAmount')}
          value={formatCurrency(filteredSummary.totalCommission)}
          icon={<Car className="w-5 h-5" />}
          className="border-amber-200 bg-amber-50"
        />
        <KpiCard
          testId="kpi-commission-percent"
          title={t('performance.commissionPercent')}
          value={`${filteredSummary.commissionPercent.toFixed(1)}%`}
          icon={<Car className="w-5 h-5" />}
        />
        <KpiCard
          testId="kpi-commission-avg-per-trip"
          title={t('performance.commissionAvgPerTrip')}
          value={formatCurrency(avgFeePerTrip)}
          icon={<Car className="w-5 h-5" />}
          className="border-amber-200 bg-amber-50"
        />
      </div>
      
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === "byMonth" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("byMonth")}
              data-testid="commission-view-month"
            >
              {t('performance.tableMonth')}
            </Button>
            <Button 
              variant={viewMode === "byVehicle" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("byVehicle")}
              data-testid="commission-view-vehicle"
            >
              {t('performance.tabVehicles')}
            </Button>
            <Button 
              variant={viewMode === "byDriver" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("byDriver")}
              data-testid="commission-view-driver"
            >
              {t('performance.tabDrivers')}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {viewMode === "byMonth" && (
                  <SortHeader label={t('performance.tableMonth')} sortKey="month" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {viewMode === "byVehicle" && (
                  <SortHeader label={t('performance.tableLicensePlate')} sortKey="licensePlate" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {viewMode === "byDriver" && (
                  <SortHeader label={t('performance.tableDriver')} sortKey="driverName" sortConfig={sortConfig} onSort={handleSort} />
                )}
                <SortHeader label={t('performance.tableTrips')} sortKey="tripCount" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.commissionFarePrice')} sortKey="farePrice" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.commissionRevenue')} sortKey="revenue" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.commissionAmount')} sortKey="commission" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <SortHeader label={t('performance.commissionPercent')} sortKey="commissionPercent" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === "byMonth" && commissionData?.byMonth && sortData(commissionData.byMonth, sortConfig).map((row, idx) => (
                <TableRow key={`${row.month}-${idx}`}>
                  <TableCell className="whitespace-nowrap">{row.month}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.tripCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.farePrice)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-amber-600">{formatCurrency(row.commission)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.commissionPercent.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {viewMode === "byVehicle" && sortData(filteredByVehicle, sortConfig).map((row, idx) => (
                <TableRow key={`${row.licensePlate}-${idx}`}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{row.licensePlate}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.tripCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.farePrice)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-amber-600">{formatCurrency(row.commission)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.commissionPercent.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {viewMode === "byDriver" && commissionData?.byDriver && sortData(commissionData.byDriver, sortConfig).map((row, idx) => (
                <TableRow key={`${row.driverName}-${idx}`}>
                  <TableCell className="font-medium whitespace-nowrap">{row.driverName}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.tripCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.farePrice)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-amber-600">{formatCurrency(row.commission)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{row.commissionPercent.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="export-commissions">
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
  const [activeTab, setActiveTab] = useState("company");
  const [timeMetric, setTimeMetric] = useState<string>("hour");
  const [distanceMetric, setDistanceMetric] = useState<string>("km");
  const [tripsMetric, setTripsMetric] = useState<string>("hour");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [shiftFilter, setShiftFilter] = useState<"all" | "day" | "night">("all");
  const [lastVorgangsId, setLastVorgangsId] = useState<string | null>(null);
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);

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

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery<CommissionAnalysis>({
    queryKey: ["performance-commissions", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/commissions?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch commissions");
      return res.json();
    },
    enabled: !!startDate && !!endDate && !isDemo,
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
    <DashboardLayout fullHeight>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 overflow-hidden gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 flex-shrink-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="performance-title">
                  {t('performance.title')}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {t('performance.subtitle')}
                </p>
              </div>
              <TabsList>
                <TabsTrigger value="company" data-testid="tab-company">{t('performance.tabCompany')}</TabsTrigger>
                <TabsTrigger value="drivers" data-testid="tab-drivers">{t('performance.tabDrivers')}</TabsTrigger>
                <TabsTrigger value="vehicles" data-testid="tab-vehicles">{t('performance.tabVehicles')}</TabsTrigger>
                <TabsTrigger value="promo" data-testid="tab-promo">{t('performance.tabPromo')}</TabsTrigger>
                <TabsTrigger value="commissions" data-testid="tab-commissions">{t('performance.tabCommissions')}</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap min-h-[40px]">
            <DatePickerWithRange 
              date={dateRange} 
              onDateChange={setDateRange} 
              placeholder={t('performance.datePickerPlaceholder')}
              dateLocale={dateLocale}
              presets={presets}
            />
            {activeTab === "drivers" && (
              <>
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
                <Select value={shiftFilter} onValueChange={(value: "all" | "day" | "night") => setShiftFilter(value)}>
                  <SelectTrigger className="w-auto min-w-[160px] gap-2" data-testid="filter-shift-type">
                    {shiftFilter === "day" ? <Sun className="h-4 w-4" /> : shiftFilter === "night" ? <Moon className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                    <SelectValue placeholder={t('performance.filterShiftType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="filter-shift-all">{t('performance.filterAllShifts')}</SelectItem>
                    <SelectItem value="day" data-testid="filter-shift-day">{t('performance.filterDayShift')}</SelectItem>
                    <SelectItem value="night" data-testid="filter-shift-night">{t('performance.filterNightShift')}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {(activeTab === "vehicles" || activeTab === "promo" || activeTab === "commissions") && (
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
            {activeTab === "company" && (
              <>
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
                  testId="filter-drivers-company"
                />
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
                  testId="filter-vehicles-company"
                />
              </>
            )}
          </div>
        </div>


        <TabsContent value="drivers" className="mt-0 flex-1 overflow-auto">
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
            shiftFilter={shiftFilter}
          />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-0 flex-1 overflow-auto">
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
        <TabsContent value="promo" className="mt-0 flex-1 overflow-auto">
          <PromoTab 
            data={promoData} 
            isLoading={promoLoading} 
            isDemo={isDemo}
            selectedVehicles={selectedVehicles}
            dateRange={dateRange}
          />
        </TabsContent>
        <TabsContent value="commissions" className="mt-0 flex-1 overflow-auto">
          <CommissionsTab 
            data={commissionsData} 
            isLoading={commissionsLoading} 
            isDemo={isDemo}
            selectedVehicles={selectedVehicles}
          />
        </TabsContent>
        <TabsContent value="company" className="mt-0 flex-1 overflow-auto">
          <CompanyTab 
            commissionsData={commissionsData}
            driversData={driversData}
            vehiclesData={vehiclesData}
            promoData={promoData}
            isLoading={commissionsLoading || driversLoading || vehiclesLoading || promoLoading}
            isDemo={isDemo}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>

      {isDemo && showDemoBanner && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t-2 border-amber-300 shadow-lg"
          data-testid="banner-demo-mode"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-amber-800 font-medium">{t('performance.demoMode')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/process">
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  data-testid="button-start-import"
                >
                  <Upload className="h-4 w-4" />
                  {t('performance.startImport')}
                </Button>
              </Link>
              <button
                onClick={() => setShowDemoBanner(false)}
                className="p-2 rounded-full hover:bg-amber-100 text-amber-600"
                data-testid="button-close-demo-banner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
