import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { FileText, Download, Car, CreditCard, Megaphone, File, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'trips': return <Car className="w-4 h-4 text-emerald-600" />;
    case 'payments': return <CreditCard className="w-4 h-4 text-blue-600" />;
    case 'campaign': return <Megaphone className="w-4 h-4 text-purple-600" />;
    default: return <File className="w-4 h-4 text-slate-400" />;
  }
}

function FileTypeBadge({ type, t }: { type: string; t: (key: string) => string }) {
  const labels: Record<string, string> = {
    trips: t('files.trips'),
    payments: t('files.payments'),
    campaign: t('files.campaign'),
  };
  const colors: Record<string, string> = {
    trips: 'bg-emerald-100 text-emerald-700',
    payments: 'bg-blue-100 text-blue-700',
    campaign: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[type] || 'bg-slate-100 text-slate-600')}>
      {labels[type] || t('files.unknown')}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    uber: 'bg-black text-white',
    bolt: 'bg-green-600 text-white',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[platform] || 'bg-slate-100 text-slate-600')}>
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  );
}

export default function FilesPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('files.title')} - MU-Dash`;
  }, [t]);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const { data: filesData, isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!sessionData?.vorgangsId,
  });

  const files = filesData?.files || [];

  const handleDownload = (fileId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/download`;
    link.download = filename;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('files.title')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('files.subtitle')}
          </p>
        </div>

        {!sessionData?.vorgangsId ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t('files.noSession')}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            </CardContent>
          </Card>
        ) : files.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t('files.noFiles')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {t('files.filename')}
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {t('files.type')}
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {t('files.platform')}
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {t('files.size')}
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {t('files.uploadedAt')}
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {files.map((file: any) => (
                      <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileTypeIcon type={file.fileType} />
                            <span className="text-sm text-slate-800 truncate max-w-[300px]" title={file.filename}>
                              {file.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <FileTypeBadge type={file.fileType} t={t} />
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={file.platform} />
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {formatBytes(file.size)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {new Date(file.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file.id, file.filename)}
                            className="h-8 px-2 text-slate-500 hover:text-emerald-600"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
