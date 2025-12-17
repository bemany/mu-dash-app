import React, { useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  FileDown, 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Car,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import dashboardNavImage from "@assets/generated_images/dashboard_navigation_to_reports.png";
import csvExportImage from "@assets/generated_images/csv_export_button_interface.png";
import fileUploadImage from "@assets/generated_images/file_upload_drop_zone.png";

export default function HelpPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Hilfe - U-Retter";
  }, []);
  
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="help-title">{t('help.title')}</h1>
              <p className="text-slate-500 text-sm mt-1">{t('help.subtitle')}</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              {t('help.overviewTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('help.overviewText')}
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">{t('help.tripsReport')}</span>
                </div>
                <p className="text-sm text-emerald-700">
                  {t('help.tripsReportDesc')}
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  {t('help.tripsFileName')}
                </p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">{t('help.paymentsReport')}</span>
                </div>
                <p className="text-sm text-purple-700">
                  {t('help.paymentsReportDesc')}
                </p>
                <p className="text-xs text-purple-600 mt-2">
                  {t('help.paymentsFileName')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileDown className="w-5 h-5 text-blue-600" />
              {t('help.step1Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('help.step1Text')}
            </p>
            
            <a 
              href="https://fleet.uber.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              data-testid="link-uber-fleet"
            >
              <ExternalLink className="w-4 h-4" />
              {t('help.openFleetDashboard')}
            </a>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">{t('help.importantNote')}</p>
                <p className="text-sm text-amber-700">
                  {t('help.step1Warning')}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
              <img 
                src={dashboardNavImage} 
                alt={t('help.step1ImageCaption')} 
                className="w-full h-auto"
                data-testid="img-dashboard-navigation"
              />
              <p className="text-xs text-slate-500 p-2 bg-slate-50 text-center">{t('help.step1ImageCaption')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5 text-emerald-600" />
              {t('help.step2Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step number={1} title={t('help.step2_1')}>
                {t('help.step2_1Desc')}
              </Step>
              
              <Step number={2} title={t('help.step2_2')}>
                {t('help.step2_2Desc')}
              </Step>
              
              <Step number={3} title={t('help.step2_3')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {t('help.step2_3Desc')}
                </div>
              </Step>
              
              <Step number={4} title={t('help.step2_4')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Filter className="w-4 h-4" />
                  {t('help.step2_4Desc')}
                </div>
              </Step>
              
              <Step number={5} title={t('help.step2_5')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Download className="w-4 h-4" />
                  {t('help.step2_5Desc')}
                </div>
              </Step>
            </div>
            
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">{t('help.expectedColumns')}</p>
              <div className="flex flex-wrap gap-2">
                <CodeChip>Kennzeichen</CodeChip>
                <CodeChip>Zeitpunkt der Fahrtbestellung</CodeChip>
                <CodeChip>Fahrtstatus</CodeChip>
              </div>
            </div>

            <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
              <img 
                src={csvExportImage} 
                alt={t('help.step2ImageCaption')} 
                className="w-full h-auto"
                data-testid="img-csv-export"
              />
              <p className="text-xs text-slate-500 p-2 bg-slate-50 text-center">{t('help.step2ImageCaption')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
              {t('help.step3Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step number={1} title={t('help.step3_1')}>
                {t('help.step3_1Desc')}
              </Step>
              
              <Step number={2} title={t('help.step3_2')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {t('help.step3_2Desc')}
                </div>
              </Step>
              
              <Step number={3} title={t('help.step3_3')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Download className="w-4 h-4" />
                  {t('help.step3_3Desc')}
                </div>
              </Step>
            </div>
            
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">{t('help.expectedColumns')}</p>
              <div className="flex flex-wrap gap-2">
                <CodeChip>Beschreibung</CodeChip>
                <CodeChip>An dein Unternehmen gezahlt</CodeChip>
                <CodeChip>vs-Berichterstattung</CodeChip>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>{t('common.tip')}:</strong> {t('help.step3Tip')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {t('help.step4Title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('help.step4Text')}
            </p>
            
            <ol className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <span className="text-slate-600" dangerouslySetInnerHTML={{ __html: t('help.step4_1') }} />
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <span className="text-slate-600">{t('help.step4_2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <span className="text-slate-600">{t('help.step4_3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">4</span>
                <span className="text-slate-600">{t('help.step4_4')}</span>
              </li>
            </ol>

            <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
              <img 
                src={fileUploadImage} 
                alt={t('help.step4ImageCaption')} 
                className="w-full h-auto"
                data-testid="img-file-upload"
              />
              <p className="text-xs text-slate-500 p-2 bg-slate-50 text-center">{t('help.step4ImageCaption')}</p>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700">
                <strong>{t('common.hint')}:</strong> {t('help.step4Hint')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              {t('help.faqTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FaqItem 
              question={t('help.faq1Q')}
              answer={t('help.faq1A')}
            />
            <FaqItem 
              question={t('help.faq2Q')}
              answer={t('help.faq2A')}
            />
            <FaqItem 
              question={t('help.faq3Q')}
              answer={t('help.faq3A')}
            />
            <FaqItem 
              question={t('help.faq4Q')}
              answer={t('help.faq4A')}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Step({ number, title, children }: { number: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
        {number}
      </span>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{title}</p>
        {children && <div className="mt-1 text-sm">{children}</div>}
      </div>
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-mono">
      {children}
    </span>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <p className="font-medium text-slate-800 mb-1">{question}</p>
      <p className="text-sm text-slate-600">{answer}</p>
    </div>
  );
}
