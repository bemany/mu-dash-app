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
    date: "10.02.2026",
    version: "3.0.0",
    items: [
      { type: 'feature', text: "Bolt-Integration: Automatische Erkennung und Import von Bolt CSV-Dateien" },
      { type: 'feature', text: "Multi-Plattform: Uber- und Bolt-Daten in einem Vorgang kombinierbar" },
      { type: 'feature', text: "Bolt Fahrtenübersicht: Vollständiger Import mit Status-Normalisierung" },
      { type: 'feature', text: "Bolt Finanzdaten: Umsatz pro Fahrer_in mit automatischer Kennzeichen-Zuordnung" },
      { type: 'feature', text: "Bolt Kampagnen: Import von Bonuskampagnen als einzelne Transaktionen" },
      { type: 'improvement', text: "Plattform-Feld in allen Tabellen für saubere Datentrennung" },
      { type: 'improvement', text: "Self-Hosted auf eigener Infrastruktur (Proxmox VM, lokale PostgreSQL)" },
      { type: 'fix', text: "Session-Persistenz: Admin-Login funktioniert jetzt zuverlässig über Cloudflare Tunnel" },
    ]
  },
  {
    date: "15.01.2025",
    version: "2.6.0",
    items: [
      { type: 'feature', text: "KI-Assistent: Neuer Chat-Button für Datenanalyse mit künstlicher Intelligenz" },
      { type: 'feature', text: "Demo-Modus Warnung: Hinweis wenn KI-Assistent ohne geladenen Vorgang genutzt wird" },
      { type: 'feature', text: "Dokumentation: Neue Berechnungs-Logik Dokumentation für externe KI-Agenten" },
      { type: 'feature', text: "Datenbank-Schema Dokumentation für API-Zugriffe" },
    ]
  },
  {
    date: "08.01.2025",
    version: "2.5.0",
    items: [
      { type: 'feature', text: "Batch-Upload: Große Dateimengen werden automatisch in kleinere Pakete aufgeteilt" },
      { type: 'fix', text: "Fahrtenzählung korrigiert: Fahrzeuge- und Fahrer-Tab zeigen jetzt korrekte Werte" },
      { type: 'feature', text: "Excel-Export enthält jetzt Fahrtenzahlen pro Monat und Fahrzeug" },
      { type: 'improvement', text: "Excel-Export vereinfacht: Firmenname und Zeitraum nur noch im Dateinamen" },
      { type: 'fix', text: "Prämienberechnung korrigiert: 150€ für 250-699 Fahrten, 400€ ab 700 Fahrten" },
      { type: 'improvement', text: "Verbessertes Logging bei Upload-Fehlern mit klaren Fehlermeldungen" },
    ]
  },
  {
    date: "25.12.2024",
    version: "2.1.0",
    items: [
      { type: 'feature', text: "Performance-Logging: Dauer und Durchsatz für Import- und Lade-Operationen" },
      { type: 'feature', text: "Admin-Panel zeigt Performance-Metriken pro Session (Ladezeit, Records/s)" },
      { type: 'feature', text: "Lade-Hinweis mit Mindest-Anzeigezeit für bessere Sichtbarkeit" },
      { type: 'improvement', text: "Deutsche Zahlenformatierung (Komma als Dezimaltrennzeichen)" },
      { type: 'improvement', text: "Records/s-Metrik nur bei Import-Operationen (konzeptionell korrekt)" },
    ]
  },
  {
    date: "24.12.2024",
    version: "2.0.0",
    items: [
      { type: 'feature', text: "Admin-Panel: CSV-Dateien anzeigen und herunterladen" },
      { type: 'feature', text: "Admin-Panel: Daten aus gespeicherten CSV-Dateien neu einlesen" },
      { type: 'feature', text: "Session beenden ohne Vorgangsdaten zu löschen" },
      { type: 'improvement', text: "Admin-Panel lädt nur aggregierte Statistiken (schneller bei 298k+ Fahrten)" },
      { type: 'fix', text: "Demo-Banner überlappt Sidebar nicht mehr" },
    ]
  },
  {
    date: "22.12.2024",
    version: "1.9.5",
    items: [
      { type: 'feature', text: "Datei-Vorschau vor dem Upload (Anzahl Fahrten/Zahlungen)" },
      { type: 'feature', text: "Eindeutige Constraints verhindern doppelte Einträge in der Datenbank" },
      { type: 'improvement', text: "Duplikat-Erkennung verbessert für zuverlässigeren Import" },
      { type: 'improvement', text: "Batch-Größe optimiert für schnelleren Import großer Dateien" },
      { type: 'fix', text: "Automatische Weiterleitung nach Upload entfernt (manuell starten)" },
    ]
  },
  {
    date: "20.12.2024",
    version: "1.9.2",
    items: [
      { type: 'feature', text: "Tooltips zeigen Berechnungsdetails für alle KPIs" },
      { type: 'feature', text: "Bereinigter Umsatz (Nettoumsatz) als neue Metrik" },
      { type: 'improvement', text: "Schichten-Anzeige verbessert mit Tag/Nacht-Aufschlüsselung" },
      { type: 'improvement', text: "Performance-Seite füllt gesamte Bildschirmbreite" },
      { type: 'improvement', text: "Tabellen sind scrollbar bei vielen Einträgen" },
    ]
  },
  {
    date: "19.12.2024",
    version: "1.9.0",
    items: [
      { type: 'feature', text: "Neuer 'Unternehmen' Tab mit umfassender Unternehmensübersicht" },
      { type: 'feature', text: "12 KPI-Kacheln: Umsatz, Provision, Fahrten, Fahrer, Fahrzeuge, Werbegelder und mehr" },
      { type: 'feature', text: "Summenzeile 'Gesamt (alle)' in Fahrer- und Fahrzeuge-Tabellen" },
      { type: 'improvement', text: "KPI-Kacheln größer und übersichtlicher (4 pro Zeile)" },
    ]
  },
  {
    date: "19.12.2024",
    version: "1.8.0",
    items: [
      { type: 'feature', text: "Neuer 'Provision' Tab im Performance Dashboard zur Analyse der Uber-Provision" },
      { type: 'feature', text: "Anzeige von Fahrpreis, Umsatz, Provisionsbeträge und Provisionsprozent" },
      { type: 'feature', text: "Aufschlüsselung nach Monat, Fahrzeug und Fahrer" },
      { type: 'feature', text: "Excel-Export für Provisionsdaten" },
    ]
  },
  {
    date: "18.12.2024",
    version: "1.7.0",
    items: [
      { type: 'feature', text: "App umbenannt zu MU-Dash (Mietwagen Unternehmer Dashboard)" },
      { type: 'feature', text: "Schichten-Popup beim Klick auf die Schichten-KPI-Kachel" },
      { type: 'feature', text: "Vorgangs-ID Eingabefeld in Sidebar wenn kein Vorgang geladen" },
      { type: 'feature', text: "Excel-Export für alle Tabellen (Fahrer, Fahrzeuge, Werbegelder)" },
      { type: 'improvement', text: "KPI-Kacheln zeigen Hover-Effekt nur wenn anklickbar" },
    ]
  },
  {
    date: "18.12.2024",
    version: "1.6.0",
    items: [
      { type: 'feature', text: "Vorgangs-ID und Firmenname werden in der Sidebar angezeigt" },
      { type: 'feature', text: "Multi-Select Filter für Fahrer und Fahrzeuge im Performance Dashboard" },
      { type: 'feature', text: "'Leere Sessions auswählen' Button im Admin-Panel" },
      { type: 'improvement', text: "Filter zwischen Tabs und Datumsauswahl verschoben für bessere Bedienung" },
      { type: 'improvement', text: "Tabellenzeilen bleiben einzeilig für bessere Lesbarkeit" },
      { type: 'fix', text: "KPI-Berechnungen korrigiert (€/km, €/Stunde)" },
    ]
  },
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
      { type: 'feature', text: "Erste Version von MU-Dash" },
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
    document.title = `${t('updates.title')} - MU-Dash`;
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
