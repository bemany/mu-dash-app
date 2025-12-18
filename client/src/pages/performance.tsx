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
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
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

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  testId: string;
  className?: string;
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
}

function DatePickerWithRange({ date, onDateChange }: DatePickerWithRangeProps) {
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
                {format(date.from, "dd.MM.yyyy", { locale: de })} -{" "}
                {format(date.to, "dd.MM.yyyy", { locale: de })}
              </>
            ) : (
              format(date.from, "dd.MM.yyyy", { locale: de })
            )
          ) : (
            <span>Zeitraum wählen</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={onDateChange}
          numberOfMonths={2}
          locale={de}
        />
      </PopoverContent>
    </Popover>
  );
}

export default function PerformancePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Performance - U-Retter";
  }, []);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: kpisData, isLoading: kpisLoading } = useQuery<KpisResponse>({
    queryKey: ["performance-kpis", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/kpis?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch KPIs");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: driversData, isLoading: driversLoading } = useQuery<DriversResponse>({
    queryKey: ["performance-drivers", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/drivers?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<VehiclesResponse>({
    queryKey: ["performance-vehicles", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/vehicles?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery<ShiftsResponse>({
    queryKey: ["performance-shifts", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/performance/shifts?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const isLoading = kpisLoading || driversLoading || vehiclesLoading || shiftsLoading;

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

  return (
    <DashboardLayout>
      <div className="max-w-[1920px] mx-auto space-y-6 pb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="performance-title">
              Performance Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Kennzahlen und Leistungsübersicht
            </p>
          </div>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
            <Spinner className="w-8 h-8 text-emerald-500" />
          </div>
        ) : !kpis ? (
          <Card className="p-12 text-center" data-testid="empty-state">
            <p className="text-slate-500">
              Keine Daten für den ausgewählten Zeitraum verfügbar.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              testId="kpi-revenue-per-hour"
              title="€/Stunde"
              value={formatCurrency(kpis.revenuePerHour * 100)}
              subtitle="Umsatz pro Arbeitsstunde"
              icon={<Clock className="w-6 h-6" />}
              onClick={() => setActiveModal("hourly")}
            />
            <KpiCard
              testId="kpi-revenue-per-km"
              title="€/km"
              value={`${formatNumber(kpis.revenuePerKm)} €`}
              subtitle="Umsatz pro Kilometer"
              icon={<Route className="w-6 h-6" />}
              onClick={() => setActiveModal("km")}
            />
            <KpiCard
              testId="kpi-revenue-per-day"
              title="€/Tag"
              value={formatCurrency(kpis.revenuePerDay * 100)}
              subtitle="Durchschnitt pro Tag"
              icon={<CalendarIconSolid className="w-6 h-6" />}
              onClick={() => setActiveModal("daily")}
            />
            <KpiCard
              testId="kpi-revenue-per-driver"
              title="€/Fahrer"
              value={formatCurrency(kpis.revenuePerDriver * 100)}
              subtitle={`${driversData?.drivers?.length || 0} Fahrer`}
              icon={<User className="w-6 h-6" />}
              onClick={() => setActiveModal("drivers")}
            />
            <KpiCard
              testId="kpi-revenue-per-vehicle"
              title="€/Fahrzeug"
              value={formatCurrency(kpis.revenuePerVehicle * 100)}
              subtitle={`${vehiclesData?.vehicles?.length || 0} Fahrzeuge`}
              icon={<Car className="w-6 h-6" />}
              onClick={() => setActiveModal("vehicles")}
            />
            <KpiCard
              testId="kpi-shifts"
              title="Schichten"
              value={kpis.totalShifts.toString()}
              subtitle={`${kpis.dayShifts} Tag / ${kpis.nightShifts} Nacht`}
              icon={<Sun className="w-6 h-6" />}
              onClick={() => setActiveModal("shifts")}
            />
          </div>
        )}

        <Dialog open={activeModal === "hourly"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-2xl" data-testid="modal-hourly">
            <DialogHeader>
              <DialogTitle>€/Stunde - Details</DialogTitle>
              <DialogDescription>Umsatz pro Arbeitsstunde nach Tag</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead className="text-right">€/Stunde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpisData?.byDay?.map((day) => (
                    <TableRow key={day.day}>
                      <TableCell>{format(new Date(day.day), "dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(day.hoursWorked, 1)}</TableCell>
                      <TableCell className="text-right">
                        {day.hoursWorked > 0 ? formatCurrency(day.revenue / day.hoursWorked) : "-"}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        Keine Daten
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "km"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-2xl" data-testid="modal-km">
            <DialogHeader>
              <DialogTitle>€/km - Details</DialogTitle>
              <DialogDescription>Umsatz pro Kilometer nach Tag</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead className="text-right">Kilometer</TableHead>
                    <TableHead className="text-right">€/km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpisData?.byDay?.map((day) => {
                    const km = cmToKm(day.distance);
                    return (
                      <TableRow key={day.day}>
                        <TableCell>{format(new Date(day.day), "dd.MM.yyyy", { locale: de })}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                        <TableCell className="text-right">{formatNumber(km, 1)} km</TableCell>
                        <TableCell className="text-right">
                          {km > 0 ? `${formatNumber(centsToEur(day.revenue) / km)} €` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  }) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        Keine Daten
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "daily"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-2xl" data-testid="modal-daily">
            <DialogHeader>
              <DialogTitle>€/Tag - Details</DialogTitle>
              <DialogDescription>Tagesübersicht</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead className="text-right">Fahrten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpisData?.byDay?.map((day) => (
                    <TableRow key={day.day}>
                      <TableCell>{format(new Date(day.day), "dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                      <TableCell className="text-right">{day.tripCount}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        Keine Daten
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "drivers"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-3xl" data-testid="modal-drivers">
            <DialogHeader>
              <DialogTitle>€/Fahrer - Details</DialogTitle>
              <DialogDescription>Umsatz pro Fahrer</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fahrer</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead className="text-right">Fahrten</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead className="text-right">€/Stunde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driversData?.drivers?.map((driver) => (
                    <TableRow key={driver.driverName}>
                      <TableCell className="font-medium">{driver.driverName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(driver.revenue)}</TableCell>
                      <TableCell className="text-right">{driver.tripCount}</TableCell>
                      <TableCell className="text-right">{formatNumber(driver.hoursWorked, 1)}</TableCell>
                      <TableCell className="text-right">
                        {driver.hoursWorked > 0 ? formatCurrency(driver.revenue / driver.hoursWorked) : "-"}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        Keine Daten
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "vehicles"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-3xl" data-testid="modal-vehicles">
            <DialogHeader>
              <DialogTitle>€/Fahrzeug - Details</DialogTitle>
              <DialogDescription>Umsatz pro Fahrzeug</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kennzeichen</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead className="text-right">Fahrten</TableHead>
                    <TableHead className="text-right">Kilometer</TableHead>
                    <TableHead className="text-right">€/km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesData?.vehicles?.map((vehicle) => {
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
                  }) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        Keine Daten
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "shifts"} onOpenChange={() => closeModal()}>
          <DialogContent className="max-w-4xl" data-testid="modal-shifts">
            <DialogHeader>
              <DialogTitle>Schichten - Details</DialogTitle>
              <DialogDescription>
                Übersicht aller Schichten ({shiftsData?.summary?.totalShifts || 0} gesamt)
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4 flex gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                <Sun className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {shiftsData?.summary?.dayShifts || 0} Tagschichten
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  {shiftsData?.summary?.nightShifts || 0} Nachtschichten
                </span>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fahrer</TableHead>
                    <TableHead>Fahrzeug</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Ende</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftsData?.shifts?.map((shift, index) => (
                    <TableRow key={`${shift.driverName}-${shift.shiftStart}-${index}`}>
                      <TableCell className="font-medium">{shift.driverName}</TableCell>
                      <TableCell className="font-mono">{shift.licensePlate}</TableCell>
                      <TableCell>{format(new Date(shift.shiftStart), "dd.MM. HH:mm", { locale: de })}</TableCell>
                      <TableCell>{format(new Date(shift.shiftEnd), "dd.MM. HH:mm", { locale: de })}</TableCell>
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
                              <Sun className="w-3 h-3" /> Tag
                            </>
                          ) : (
                            <>
                              <Moon className="w-3 h-3" /> Nacht
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(shift.revenue)}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        Keine Daten
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
