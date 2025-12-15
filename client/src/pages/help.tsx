import React from "react";
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

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="help-title">Hilfe & Anleitung</h1>
              <p className="text-slate-500 text-sm mt-1">So generieren Sie die benötigten Berichte bei Uber</p>
            </div>
          </div>
        </div>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Übersicht: Welche Dateien werden benötigt?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Um Ihre Werbeprämien korrekt zu berechnen, benötigen wir zwei Arten von CSV-Dateien aus Ihrem Uber-Konto:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Fahrtenbericht (Trips)</span>
                </div>
                <p className="text-sm text-emerald-700">
                  Enthält alle durchgeführten Fahrten mit Datum, Kennzeichen und Status.
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Dateiname enthält meist "trip"
                </p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Zahlungsbericht (Payments)</span>
                </div>
                <p className="text-sm text-purple-700">
                  Enthält alle erhaltenen Zahlungen und Bonusauszahlungen.
                </p>
                <p className="text-xs text-purple-600 mt-2">
                  Dateiname enthält meist "payment"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileDown className="w-5 h-5 text-blue-600" />
              Schritt 1: Uber Fleet Dashboard öffnen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Melden Sie sich im Uber Fleet Dashboard an, um auf Ihre Berichte zuzugreifen.
            </p>
            
            <a 
              href="https://fleet.uber.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              data-testid="link-uber-fleet"
            >
              <ExternalLink className="w-4 h-4" />
              Uber Fleet Dashboard öffnen
            </a>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Wichtig</p>
                <p className="text-sm text-amber-700">
                  Stellen Sie sicher, dass Sie als Flottenbesitzer/Admin angemeldet sind, um Zugriff auf alle Berichte zu haben.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5 text-emerald-600" />
              Schritt 2: Fahrtenbericht herunterladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step number={1} title="Navigieren Sie zu 'Berichte' oder 'Reports'">
                Im linken Menü finden Sie den Bereich für Berichte.
              </Step>
              
              <Step number={2} title="Wählen Sie 'Fahrten' oder 'Trips'">
                Klicken Sie auf den Fahrten-Bericht, um die Fahrtdaten einzusehen.
              </Step>
              
              <Step number={3} title="Zeitraum auswählen">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  Wählen Sie den gewünschten Zeitraum (z.B. die letzten 6 Monate).
                </div>
              </Step>
              
              <Step number={4} title="Filter anpassen (optional)">
                <div className="flex items-center gap-2 text-slate-600">
                  <Filter className="w-4 h-4" />
                  Sie können nach Fahrer oder Fahrzeug filtern, wenn nötig.
                </div>
              </Step>
              
              <Step number={5} title="Als CSV exportieren">
                <div className="flex items-center gap-2 text-slate-600">
                  <Download className="w-4 h-4" />
                  Klicken Sie auf "Exportieren" oder "Download" und wählen Sie CSV-Format.
                </div>
              </Step>
            </div>
            
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Erwartete Spalten in der Datei:</p>
              <div className="flex flex-wrap gap-2">
                <CodeChip>Kennzeichen</CodeChip>
                <CodeChip>Zeitpunkt der Fahrtbestellung</CodeChip>
                <CodeChip>Fahrtstatus</CodeChip>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Schritt 3: Zahlungsbericht herunterladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Step number={1} title="Navigieren Sie zu 'Zahlungen' oder 'Payments'">
                Im Berichtsbereich finden Sie auch die Zahlungsübersicht.
              </Step>
              
              <Step number={2} title="Zeitraum auswählen">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  Wählen Sie denselben Zeitraum wie beim Fahrtenbericht.
                </div>
              </Step>
              
              <Step number={3} title="Als CSV exportieren">
                <div className="flex items-center gap-2 text-slate-600">
                  <Download className="w-4 h-4" />
                  Exportieren Sie die Zahlungsdaten als CSV-Datei.
                </div>
              </Step>
            </div>
            
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Erwartete Spalten in der Datei:</p>
              <div className="flex flex-wrap gap-2">
                <CodeChip>Beschreibung</CodeChip>
                <CodeChip>An dein Unternehmen gezahlt</CodeChip>
                <CodeChip>vs-Berichterstattung</CodeChip>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Tipp:</strong> Das Kennzeichen wird automatisch aus der "Beschreibung"-Spalte extrahiert. 
                Stellen Sie sicher, dass die Bonuszahlungen das Kennzeichen in der Beschreibung enthalten.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Schritt 4: Dateien hochladen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Nachdem Sie beide Dateien heruntergeladen haben, können Sie diese im Prüfvorgang hochladen:
            </p>
            
            <ol className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <span className="text-slate-600">Gehen Sie zum <strong>Prüfvorgang</strong> (Hauptseite)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <span className="text-slate-600">Ziehen Sie alle CSV-Dateien in den Upload-Bereich oder klicken Sie zum Auswählen</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <span className="text-slate-600">Die Dateien werden automatisch als Fahrten oder Zahlungen erkannt</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">4</span>
                <span className="text-slate-600">Klicken Sie auf "Weiter" um die Berechnung zu starten</span>
              </li>
            </ol>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700">
                <strong>Hinweis:</strong> Sie erhalten eine Vorgangs-ID, mit der Sie Ihren Vorgang später wieder aufrufen können. 
                Notieren Sie sich diese ID!
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              Häufige Fragen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FaqItem 
              question="Wie werden die Bonusprämien berechnet?"
              answer="Die Bonusprämien basieren auf der Anzahl der abgeschlossenen Fahrten pro Monat und Fahrzeug. Ab 250 Fahrten im Monat gibt es 250€ Bonus, ab 700 Fahrten gibt es 400€ Bonus."
            />
            <FaqItem 
              question="Was passiert, wenn meine Dateien nicht erkannt werden?"
              answer="Stellen Sie sicher, dass 'trip' oder 'payment' im Dateinamen enthalten ist. Alternativ erkennt das System die Dateien auch anhand der Spaltenüberschriften."
            />
            <FaqItem 
              question="Kann ich mehrere Dateien gleichzeitig hochladen?"
              answer="Ja! Sie können alle Dateien auf einmal per Drag & Drop hochladen. Das System sortiert diese automatisch."
            />
            <FaqItem 
              question="Was bedeutet die Zeitraum-Warnung?"
              answer="Wenn Zahlungen aus Monaten gefunden werden, für die keine Fahrtdaten vorhanden sind, erscheint eine Warnung. Laden Sie dann auch die Fahrtdaten für diese Monate hoch."
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
