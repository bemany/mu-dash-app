import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bug, Zap } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useEffect } from "react";

interface Update {
  date: string;
  version: string;
  items: {
    type: 'feature' | 'fix' | 'improvement';
    text: string;
  }[];
}

const updates: Update[] = [
  {
    date: "17.12.2024",
    version: "1.5.0",
    items: [
      { type: 'feature', text: "Neue 'Gezahlt'-Spalte zeigt ausgezahlte Boni mit grüner Hervorhebung" },
      { type: 'fix', text: "Bonus-Berechnung korrigiert: 150€ ab 250 Fahrten, 400€ ab 700 Fahrten" },
    ]
  },
  {
    date: "17.12.2024",
    version: "1.4.0",
    items: [
      { type: 'feature', text: "URL-basierte Sitzungsverwaltung - Vorgänge können jetzt per Link geteilt werden" },
      { type: 'feature', text: "Updates-Seite für Neuigkeiten und Änderungen" },
      { type: 'fix', text: "Einzelne Datei-Uploads ersetzen vorherige Dateien nicht mehr" },
      { type: 'improvement', text: "Verbesserte Navigation mit Zurück-Buttons" },
    ]
  },
  {
    date: "16.12.2024",
    version: "1.3.0",
    items: [
      { type: 'feature', text: "Server-seitige Aggregation für große Datensätze (260k+ Fahrten)" },
      { type: 'feature', text: "Lade-Animationen beim Wechseln zwischen Schritten" },
      { type: 'improvement', text: "Performance-Optimierung verhindert Browser-Einfrieren" },
    ]
  },
  {
    date: "15.12.2024",
    version: "1.2.0",
    items: [
      { type: 'feature', text: "Mehrsprachige Unterstützung: Deutsch, Englisch, Türkisch, Arabisch" },
      { type: 'feature', text: "RTL-Unterstützung für Arabisch" },
      { type: 'feature', text: "Originaldateien werden im System gespeichert und können heruntergeladen werden" },
    ]
  },
  {
    date: "14.12.2024",
    version: "1.1.0",
    items: [
      { type: 'feature', text: "Excel-Export für Auswertungstabellen" },
      { type: 'feature', text: "Vorgangs-ID zum Laden bestehender Sitzungen" },
      { type: 'feature', text: "Admin-Panel zur Sitzungsverwaltung" },
      { type: 'fix', text: "Nur abgeschlossene Fahrten werden importiert" },
    ]
  },
  {
    date: "13.12.2024",
    version: "1.0.0",
    items: [
      { type: 'feature', text: "Erste Version von U-Retter" },
      { type: 'feature', text: "CSV-Import für Fahrten und Zahlungen" },
      { type: 'feature', text: "Automatische Bonusberechnung basierend auf Fahrtenzahl" },
      { type: 'feature', text: "Abgleich zwischen erwarteten und tatsächlichen Zahlungen" },
    ]
  },
];

function getIcon(type: 'feature' | 'fix' | 'improvement') {
  switch (type) {
    case 'feature':
      return <Sparkles className="w-4 h-4" />;
    case 'fix':
      return <Bug className="w-4 h-4" />;
    case 'improvement':
      return <Zap className="w-4 h-4" />;
  }
}

function getBadgeVariant(type: 'feature' | 'fix' | 'improvement') {
  switch (type) {
    case 'feature':
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case 'fix':
      return "bg-red-100 text-red-700 border-red-200";
    case 'improvement':
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

export default function UpdatesPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('updates.title')} - U-Retter`;
  }, [t]);

  const getTypeLabel = (type: 'feature' | 'fix' | 'improvement') => {
    switch (type) {
      case 'feature':
        return t('updates.typeNew');
      case 'fix':
        return t('updates.typeFix');
      case 'improvement':
        return t('updates.typeImproved');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900" data-testid="updates-title">{t('updates.title')}</h1>
          <p className="text-slate-600 mt-2">{t('updates.subtitle')}</p>
        </div>

        <div className="space-y-6">
          {updates.map((update, idx) => (
            <Card key={idx} data-testid={`update-card-${idx}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {t('updates.version')} {update.version}
                  </CardTitle>
                  <span className="text-sm text-slate-500">{update.date}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {update.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3">
                      <Badge 
                        variant="outline" 
                        className={`shrink-0 flex items-center gap-1 ${getBadgeVariant(item.type)}`}
                      >
                        {getIcon(item.type)}
                        {getTypeLabel(item.type)}
                      </Badge>
                      <span className="text-slate-700">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
