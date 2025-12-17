import React from 'react';
import { cn } from '@/lib/utils';
import { DriverSummary, MonthlyStats } from '@/lib/types';
import { formatMonthHeader } from '@/lib/data-processor';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface DataTableProps {
  summaries: DriverSummary[];
  monthHeaders: string[];
  totals: { trips: number; bonus: number; paid: number; diff: number };
  showDiff?: boolean;
}

export function DataTable({ summaries, monthHeaders, totals, showDiff = false }: DataTableProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-2 py-2 font-bold text-slate-700 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] w-[140px]">
                {t('dataTable.licensePlate')}
              </th>
              
              {/* Total Column Moved to Start */}
              <th colSpan={showDiff ? 4 : 2} className="px-2 py-2 text-center border-l border-slate-200 bg-slate-100/50 font-bold text-slate-800 min-w-[120px]">
                {t('dataTable.total')}
              </th>

              {monthHeaders.map(month => (
                <th key={month} colSpan={showDiff ? 3 : 1} className="px-1 py-2 text-center border-l border-slate-200 min-w-[80px]">
                  <div className="font-semibold text-slate-700">{formatMonthHeader(month)}</div>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-2 py-1 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"></th>
              
              {/* Total Subheaders */}
              <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-l border-slate-200 bg-slate-100/50">{t('dataTable.trips')}</th>
              <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100/50">{t('dataTable.bonus')}</th>
              {showDiff && <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-emerald-500 bg-emerald-50/50">{t('dataTable.paid')}</th>}
              {showDiff && <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100/50">{t('dataTable.difference')}</th>}

              {/* Monthly Subheaders */}
              {monthHeaders.map(month => (
                <React.Fragment key={month + '-sub'}>
                  <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 border-l border-slate-200">{t('dataTable.trips')}</th>
                  {showDiff && <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-emerald-500 bg-emerald-50/50">{t('dataTable.paid')}</th>}
                  {showDiff && <th className="px-1 py-1 text-center text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100/30">{t('dataTable.difference')}</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {summaries.map((driver) => (
              <tr key={driver.licensePlate} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-2 py-1 font-semibold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 whitespace-nowrap shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r border-transparent text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-emerald-400 transition-colors" />
                    {driver.licensePlate}
                  </div>
                </td>
                
                {/* Row Totals moved to Start */}
                <td className="px-1 py-1 text-center border-l border-slate-200 bg-slate-50/30 font-mono font-medium text-slate-600 text-xs">
                  {driver.totalCount.toLocaleString()}
                </td>
                <td className="px-1 py-1 text-center bg-slate-50/30 font-mono font-bold text-slate-700 text-xs">
                  {driver.totalBonus > 0 ? driver.totalBonus + " €" : "-"}
                </td>
                {showDiff && (
                  <td className={cn(
                    "px-1 py-1 text-center bg-slate-50/30 font-mono font-bold text-xs",
                    driver.totalPaid > 0 
                      ? driver.totalPaid >= driver.totalBonus 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-emerald-50 text-emerald-600"
                      : "text-slate-300"
                  )}>
                     {driver.totalPaid > 0 ? `${driver.totalPaid} €` : "—"}
                  </td>
                )}
                {showDiff && (
                  <td className={cn(
                    "px-1 py-1 text-center bg-slate-50/30 font-mono font-bold text-xs border-r border-slate-50",
                    getDiffColor(driver.totalDifference)
                  )}>
                     {formatDiff(driver.totalDifference)}
                  </td>
                )}

                {monthHeaders.map(month => {
                  const stat = driver.stats[month];
                  return (
                    <DataCell 
                      key={month + driver.licensePlate} 
                      stat={stat} 
                      showDiff={showDiff} 
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Footer */}
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] clip-path-inset-top">
             <tr>
                <td className="px-2 py-2 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] text-xs">{t('dataTable.total')}</td>
                
                {/* Total Footer moved to Start */}
                <td className="px-1 py-2 text-center border-l border-slate-200 bg-slate-100/50 font-mono text-xs">
                  {totals.trips.toLocaleString()}
                </td>
                <td className="px-1 py-2 text-center bg-slate-100/50 font-mono text-xs text-emerald-700">
                  {totals.bonus.toLocaleString()} €
                </td>
                {showDiff && (
                  <td className={cn(
                    "px-1 py-2 text-center bg-slate-100/50 font-mono text-xs",
                    totals.paid > 0 
                      ? totals.paid >= totals.bonus 
                        ? "bg-emerald-100 text-emerald-700 font-bold" 
                        : "bg-emerald-50 text-emerald-600 font-bold"
                      : totals.bonus > 0 
                        ? "text-slate-300" 
                        : "text-slate-200"
                  )}>
                    {totals.paid > 0 ? `${totals.paid.toLocaleString()} €` : totals.bonus > 0 ? "—" : "-"}
                  </td>
                )}
                {showDiff && (
                  <td className={cn("px-1 py-2 text-center bg-slate-100/50 font-mono text-xs", getDiffColor(totals.diff))}>
                    {formatDiff(totals.diff)}
                  </td>
                )}

                {monthHeaders.map(month => {
                  const monthTotalCount = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.count || 0), 0);
                  const monthTotalBonus = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.bonus || 0), 0);
                  const monthTotalPaid = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.paidAmount || 0), 0);
                  const monthTotalDiff = summaries.reduce((acc, curr) => acc + (curr.stats[month]?.difference || 0), 0);
                  
                  return (
                    <React.Fragment key={'total-'+month}>
                      <td className="px-1 py-2 text-center border-l border-slate-200 font-mono text-xs text-slate-600">
                        {monthTotalCount.toLocaleString()}
                      </td>
                      {showDiff && (
                        <td className={cn(
                          "px-1 py-2 text-center font-mono text-xs",
                          monthTotalPaid > 0 
                            ? monthTotalPaid >= monthTotalBonus 
                              ? "bg-emerald-100 text-emerald-700 font-bold" 
                              : "bg-emerald-50 text-emerald-600 font-bold"
                            : monthTotalBonus > 0 
                              ? "text-slate-300" 
                              : "text-slate-200"
                        )}>
                          {monthTotalPaid > 0 ? `${monthTotalPaid} €` : monthTotalBonus > 0 ? "—" : "-"}
                        </td>
                      )}
                      {showDiff && (
                        <td className={cn("px-1 py-2 text-center font-mono text-xs", getDiffColor(monthTotalDiff))}>
                          {formatDiff(monthTotalDiff)}
                        </td>
                      )}
                    </React.Fragment>
                  )
                })}
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DataCell({ stat, showDiff }: { stat: MonthlyStats | undefined, showDiff: boolean }) {
  const count = stat?.count || 0;
  const bonus = stat?.bonus || 0;
  const paidAmount = stat?.paidAmount || 0;
  const diff = stat?.difference || 0;

  // Conditional Styling Logic for trip count
  let countColorClass = "text-slate-600";
  if (count >= 700) {
    countColorClass = "bg-emerald-100 text-emerald-800 font-bold"; 
  } else if (count >= 250) {
    countColorClass = "bg-yellow-100 text-yellow-800 font-bold";
  } else if (count === 0) {
    countColorClass = "text-slate-200";
  }

  // Paid amount styling - highlight matched payments
  const isPaid = paidAmount > 0;
  const isFullyPaid = bonus > 0 && paidAmount >= bonus;

  return (
    <React.Fragment>
      <td className="p-0 text-center border-l border-slate-100 font-mono text-xs">
        <div className={cn("flex items-center justify-center w-full h-full py-1 px-1", countColorClass)}>
          {count > 0 ? count : "-"}
        </div>
      </td>
      {showDiff && (
        <>
          {/* Paid column - visually highlight matched payments */}
          <td className={cn(
            "px-1 py-1 text-center font-mono text-xs",
            isPaid 
              ? isFullyPaid 
                ? "bg-emerald-100 text-emerald-700 font-bold" 
                : "bg-emerald-50 text-emerald-600"
              : bonus > 0 
                ? "text-slate-300" 
                : "text-slate-200"
          )}>
            {isPaid ? (
              <span className="flex items-center justify-center gap-0.5">
                {paidAmount} €
              </span>
            ) : bonus > 0 ? "—" : "-"}
          </td>
          {/* Difference column */}
          <td className={cn("px-1 py-1 text-center font-mono text-xs border-r border-slate-50", getDiffColor(diff))}>
            {diff !== 0 ? formatDiff(diff) : bonus > 0 ? <span className="text-emerald-400">OK</span> : "-"}
          </td>
        </>
      )}
    </React.Fragment>
  );
}

function getDiffColor(diff: number) {
  if (diff > 0) return "text-amber-600 font-bold bg-amber-50/50"; // Owed money
  if (diff < 0) return "text-blue-600 font-medium bg-blue-50/30"; // Overpaid
  if (diff === 0) return "text-emerald-600 bg-emerald-50/30"; // Perfect
  return "text-slate-300";
}

function formatDiff(diff: number) {
  if (diff === 0) return <span className="text-emerald-400">OK</span>;
  return `${diff > 0 ? '+' : ''}${diff} €`;
}
