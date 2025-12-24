import React, { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
// DataTable removed - no longer needed in admin panel
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2, Eye, Users, Database, Lock, LogIn, Calendar, X, Copy, Check, Download, FileText, Car, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
// processTripsAndTransactions no longer needed - stats come pre-aggregated from backend
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslation } from "@/i18n";

export default function AdminPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Admin - MU-Dash";
  }, []);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [checkedSessions, setCheckedSessions] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'multiple'; sessionId?: string } | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleReprocessData = async () => {
    if (!selectedSession) return;
    setIsReprocessing(true);
    try {
      const res = await fetch(`/api/admin/sessions/${selectedSession}/reprocess`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Reprocess failed');
      }
      // Refresh session data
      await queryClient.invalidateQueries({ queryKey: ['admin-session-details', selectedSession] });
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    } catch (error) {
      console.error('Reprocess error:', error);
    } finally {
      setIsReprocessing(false);
    }
  };

  const copyVorgangsId = (vorgangsId: string) => {
    navigator.clipboard.writeText(vorgangsId);
    setCopiedId(vorgangsId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: authStatus, isLoading: isCheckingAuth } = useQuery({
    queryKey: ["admin-auth"],
    queryFn: async () => {
      const res = await fetch("/api/admin/check");
      if (!res.ok) throw new Error("Failed to check auth");
      return res.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('admin.loginFailed'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-auth"] });
      setPassword("");
      setLoginError("");
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loginMutation.mutate(password);
    }
  };

  const isAdmin = authStatus?.isAdmin;

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: performanceLogs } = useQuery({
    queryKey: ["admin-performance-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/performance-logs");
      if (!res.ok) throw new Error("Failed to fetch performance logs");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: sessionDetails } = useQuery({
    queryKey: ["admin-session-details", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return null;
      const res = await fetch(`/api/admin/sessions/${selectedSession}`);
      if (!res.ok) throw new Error("Failed to fetch session details");
      return res.json();
    },
    enabled: !!selectedSession && detailsModalOpen,
  });

  const { data: sessionUploads } = useQuery({
    queryKey: ["admin-session-uploads", selectedSession],
    queryFn: async () => {
      if (!selectedSession) return null;
      const res = await fetch(`/api/admin/sessions/${selectedSession}/uploads`);
      if (!res.ok) throw new Error("Failed to fetch uploads");
      return res.json();
    },
    enabled: !!selectedSession && detailsModalOpen,
  });

  const handleDownloadFile = (uploadId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/admin/uploads/${uploadId}/download`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      if (selectedSession) {
        setSelectedSession(null);
        setDetailsModalOpen(false);
      }
    },
  });

  const handleDeleteSession = (sessionId: string) => {
    setDeleteTarget({ type: 'single', sessionId });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'single' && deleteTarget.sessionId) {
      await deleteSessionMutation.mutateAsync(deleteTarget.sessionId);
      setCheckedSessions(prev => {
        const next = new Set(prev);
        next.delete(deleteTarget.sessionId!);
        return next;
      });
    } else if (deleteTarget.type === 'multiple') {
      await deleteMultipleMutation.mutateAsync(Array.from(checkedSessions));
    }
    
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const deleteMultipleMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const res = await fetch("/api/admin/sessions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds }),
      });
      if (!res.ok) throw new Error("Failed to delete sessions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      setCheckedSessions(new Set());
      setSelectedSession(null);
      setDetailsModalOpen(false);
    },
  });

  const handleDeleteSelected = () => {
    if (checkedSessions.size === 0) return;
    setDeleteTarget({ type: 'multiple' });
    setDeleteDialogOpen(true);
  };

  const toggleSession = (sessionId: string) => {
    setCheckedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!sessions) return;
    if (checkedSessions.size === sessions.length) {
      setCheckedSessions(new Set());
    } else {
      setCheckedSessions(new Set(sessions.map((s: any) => s.sessionId)));
    }
  };

  const allChecked = sessions && sessions.length > 0 && checkedSessions.size === sessions.length;
  const someChecked = checkedSessions.size > 0 && checkedSessions.size < (sessions?.length || 0);

  const selectEmptySessions = () => {
    if (!sessions) return;
    const emptySessions = sessions.filter((s: any) => s.tripCount === 0 && s.transactionCount === 0);
    if (emptySessions.length === 0) return;
    setCheckedSessions(new Set(emptySessions.map((s: any) => s.sessionId)));
  };

  const emptySessionsCount = sessions?.filter((s: any) => s.tripCount === 0 && s.transactionCount === 0).length || 0;

  const groupedSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return {};
    
    const sortedSessions = [...sessions].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const groups: Record<string, any[]> = {};
    const orderedKeys: string[] = [];
    
    for (const session of sortedSessions) {
      const dateKey = format(new Date(session.createdAt), "dd.MM.yyyy", { locale: de });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
        orderedKeys.push(dateKey);
      }
      groups[dateKey].push(session);
    }
    
    const sortedGroups: Record<string, any[]> = {};
    for (const key of orderedKeys) {
      sortedGroups[key] = groups[key];
    }
    
    return sortedGroups;
  }, [sessions]);

  const processedData = useMemo(() => {
    if (!sessionDetails?.stats) return null;
    
    const { stats } = sessionDetails;
    
    // Transform stats to DriverSummary format for DataTable
    const summaries = stats.summaries.map((s: any) => {
      const statsObj: Record<string, { monthKey: string; count: number; bonus: number; paidAmount: number; difference: number }> = {};
      let totalCount = 0;
      let totalBonus = 0;
      let totalPaid = 0;
      let totalDifference = 0;
      
      for (const [month, data] of Object.entries(s.months) as [string, any][]) {
        const bonus = data.bonus / 100; // Convert from cents
        const paid = data.paid / 100; // Convert from cents
        const diff = bonus - paid;
        
        statsObj[month] = {
          monthKey: month,
          count: data.tripCount,
          bonus,
          paidAmount: paid,
          difference: diff,
        };
        
        totalCount += data.tripCount;
        totalBonus += bonus;
        totalPaid += paid;
        totalDifference += diff;
      }
      
      return {
        licensePlate: s.licensePlate,
        stats: statsObj,
        totalCount,
        totalBonus,
        totalPaid,
        totalDifference,
      };
    });

    return {
      summaries,
      monthHeaders: stats.monthHeaders,
      totals: { 
        trips: stats.tripCount, 
        bonus: stats.totalBonus / 100, 
        paid: stats.totalPaid / 100, 
        diff: (stats.totalBonus - stats.totalPaid) / 100 
      }
    };
  }, [sessionDetails]);

  const openSessionDetails = (sessionId: string) => {
    setSelectedSession(sessionId);
    setDetailsModalOpen(true);
  };

  if (isCheckingAuth || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md border-slate-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto p-4 bg-emerald-50 rounded-full w-fit mb-4">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">{t('admin.loginTitle')}</CardTitle>
              <p className="text-slate-500 text-sm mt-2">
                {t('admin.loginSubtitle')}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="password"
                  placeholder={t('admin.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                  data-testid="input-admin-password"
                />
                {loginError && (
                  <p className="text-sm text-red-600 text-center" data-testid="text-login-error">
                    {loginError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!password.trim() || loginMutation.isPending}
                  data-testid="button-admin-login"
                >
                  {loginMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  {t('admin.login')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1920px] mx-auto space-y-4 pb-20">
        
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('admin.title')}</h1>
              <p className="text-slate-500 text-sm mt-1">{t('admin.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('admin.activeSessions')}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">{(sessions?.length || 0).toLocaleString('de-DE')}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('admin.totalTrips')}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">
                    {(sessions?.reduce((acc: number, s: any) => acc + s.tripCount, 0) || 0).toLocaleString('de-DE')}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{t('admin.totalPayments')}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2">
                    {(sessions?.reduce((acc: number, s: any) => acc + s.transactionCount, 0) || 0).toLocaleString('de-DE')}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <Database className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">{t('admin.allSessions')}</CardTitle>
            {checkedSessions.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteMultipleMutation.isPending}
                data-testid="button-delete-selected"
              >
                {deleteMultipleMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {checkedSessions.size} {t('admin.deleteSelected')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {sessions && sessions.length > 0 && (
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-200">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked ? "indeterminate" : undefined}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-slate-600">
                  {allChecked ? t('admin.deselectAll') : t('admin.selectAll')}
                </span>
                {emptySessionsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectEmptySessions}
                    data-testid="button-select-empty"
                    className="ml-2"
                  >
                    {t('admin.selectEmpty')} ({emptySessionsCount})
                  </Button>
                )}
                {checkedSessions.size > 0 && (
                  <span className="text-sm text-emerald-600 font-medium">
                    ({checkedSessions.size} {t('admin.selected')})
                  </span>
                )}
              </div>
            )}
            <div className="space-y-4">
              {Object.keys(groupedSessions).length > 0 ? (
                Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
                  <div key={dateKey} className="space-y-2">
                    <div className="flex items-center gap-2 py-2 sticky top-0 bg-white z-10">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">{dateKey}</span>
                      <span className="text-xs text-slate-400">({daySessions.length} {daySessions.length > 1 ? t('admin.sessions') : t('admin.session')})</span>
                    </div>
                    <div className="space-y-2 pl-6 border-l-2 border-slate-100">
                      {daySessions.map((session: any) => (
                        <div
                          key={session.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
                            checkedSessions.has(session.sessionId)
                              ? "border-emerald-500 bg-emerald-50/50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                          onClick={() => openSessionDetails(session.sessionId)}
                        >
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={checkedSessions.has(session.sessionId)}
                              onCheckedChange={() => toggleSession(session.sessionId)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-session-${session.sessionId}`}
                            />
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                session.currentStep === 4 ? "bg-emerald-500" : "bg-amber-500"
                              )} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-sm font-semibold text-slate-700">
                                    {session.vorgangsId ? (
                                      <span className="text-emerald-700">{session.vorgangsId}</span>
                                    ) : (
                                      <span className="text-slate-400 italic">{t('admin.noProcess')}</span>
                                    )}
                                  </p>
                                  {session.vorgangsId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyVorgangsId(session.vorgangsId!);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                                      data-testid={`button-copy-vorgangsid-${session.vorgangsId}`}
                                    >
                                      {copiedId === session.vorgangsId ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </button>
                                  )}
                                  {session.companyName && (
                                    <span className="text-sm text-slate-600 font-medium">
                                      — {session.companyName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  {format(new Date(session.createdAt), "HH:mm", { locale: de })} {t('admin.time')}
                                  {" • "}
                                  {t('admin.lastActivity')}: {format(new Date(session.lastActivityAt), "HH:mm", { locale: de })} {t('admin.time')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-600">
                                {session.tripCount.toLocaleString('de-DE')} {t('admin.trips')} • {session.transactionCount.toLocaleString('de-DE')} {t('admin.payments')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{session.uploadCount || 0} CSV-Dateien</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSessionDetails(session.sessionId);
                                }}
                                data-testid={`button-view-session-${session.sessionId}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.sessionId);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-session-${session.sessionId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('admin.noSessions')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Logs Section */}
        <Card className="border-slate-100 shadow-sm mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Performance Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceLogs && performanceLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Zeitpunkt</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Typ</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Vorgangs-ID</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Version</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Dauer</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Fahrten</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Zahlungen</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Records/s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceLogs.map((log: any) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">
                          {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                        </td>
                        <td className="py-2 px-3">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            log.operationType === 'import' 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-emerald-100 text-emerald-700"
                          )}>
                            {log.operationType === 'import' ? 'Import' : 'Laden'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">
                          {log.vorgangsId || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {log.softwareVersion}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {log.durationMs < 1000 
                            ? `${log.durationMs}ms` 
                            : `${(log.durationMs / 1000).toFixed(1)}s`}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {log.tripCount.toLocaleString('de-DE')}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {log.transactionCount.toLocaleString('de-DE')}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600">
                          {log.recordsPerSecond?.toLocaleString('de-DE') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Keine Performance-Logs vorhanden</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'multiple' 
                ? t('admin.deleteMultipleConfirm', { count: checkedSessions.size })
                : t('admin.deleteConfirm')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detailsModalOpen} onOpenChange={(open) => {
        setDetailsModalOpen(open);
        if (!open) {
          setSelectedSession(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {t('admin.sessionDetails')}: {sessionDetails?.session?.vorgangsId || selectedSession}
                {sessionDetails?.session?.companyName && (
                  <span className="text-slate-500 font-normal ml-2">— {sessionDetails.session.companyName}</span>
                )}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Uploaded Files Section */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Hochgeladene Dateien
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {sessionUploads?.uploads && sessionUploads.uploads.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sessionUploads.uploads.map((upload: any) => (
                        <div
                          key={upload.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                          data-testid={`upload-file-${upload.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {upload.fileType === 'trips' ? (
                              <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {upload.filename}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(upload.size / 1024).toFixed(1)} KB • {format(new Date(upload.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(upload.id, upload.filename)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                            data-testid={`button-download-${upload.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprocessData()}
                        disabled={isReprocessing}
                        className="w-full"
                        data-testid="button-reprocess-data"
                      >
                        {isReprocessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Daten werden neu verarbeitet...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Daten neu einlesen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Keine Dateien hochgeladen
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            {processedData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-100 shadow-sm bg-blue-50/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('admin.trips')}</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {processedData.totals.trips.toLocaleString('de-DE')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-purple-50/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('admin.bonus')}</p>
                    <p className="text-2xl font-bold text-purple-700 mt-1">
                      {processedData.totals.bonus.toLocaleString('de-DE')} €
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-emerald-50/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('admin.paid')}</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {processedData.totals.paid.toLocaleString('de-DE')} €
                    </p>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border-slate-100 shadow-sm",
                  processedData.totals.diff > 0 ? "bg-amber-50/50" : "bg-emerald-50/50"
                )}>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('admin.difference')}</p>
                    <p className={cn(
                      "text-2xl font-bold mt-1",
                      processedData.totals.diff > 0 ? "text-amber-700" : "text-emerald-700"
                    )}>
                      {processedData.totals.diff > 0 ? '+' : ''}{processedData.totals.diff.toLocaleString('de-DE')} €
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
