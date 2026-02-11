import React, { useState, createContext, useContext, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ClipboardCheck, HelpCircle, Shield, Menu, Globe, ChevronDown, Sparkles, TrendingUp, Copy, Check, Building2, Search, Loader2, LogOut, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useTranslation, type Language } from '@/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { playNotificationSound } from '@/lib/notification-sound';
import { logger } from '@/lib/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const APP_VERSION = "3.1.0";
const BUILD_NUMBER = "260211-1";

interface LayoutLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LayoutLoadingContext = createContext<LayoutLoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
});

export function useLayoutLoading() {
  return useContext(LayoutLoadingContext);
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function DashboardLayout({ children, fullHeight = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [location, setLocation] = useLocation();
  const { t, language, setLanguage, languages } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [inputVorgangsId, setInputVorgangsId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    staleTime: 30000,
  });

  const hasSessionData = sessionData?.tripCount > 0;
  const currentLanguage = languages.find(l => l.code === language);

  useEffect(() => {
    logger.init();
  }, []);
  
  const copyVorgangsId = () => {
    if (sessionData?.vorgangsId) {
      logger.ui(`Copying Vorgangs-ID: ${sessionData.vorgangsId}`);
      navigator.clipboard.writeText(sessionData.vorgangsId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exitSession = async () => {
    logger.session('Exiting session...');
    try {
      const res = await fetch('/api/session/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        logger.session('Session exited successfully');
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        toast.success(t('layout.exitSuccess'));
        setLocation('/');
      }
    } catch (err) {
      logger.error('Error exiting session', err);
      toast.error(t('layout.exitError'));
    }
  };

  const handleNavClick = (path: string, label: string) => {
    logger.nav(`Navigating to: ${path} (${label})`);
    setLocation(path);
  };

  const handleLanguageChange = (langCode: Language) => {
    logger.ui(`Language changed to: ${langCode}`);
    setLanguage(langCode);
  };

  const handleSidebarToggle = () => {
    logger.ui(`Sidebar ${sidebarOpen ? 'closed' : 'opened'}`);
    setSidebarOpen(!sidebarOpen);
  };

  const loadVorgangsId = async () => {
    if (!inputVorgangsId.trim()) return;
    setIsLoading(true);
    setError('');
    const loadedId = inputVorgangsId.trim().toUpperCase();
    const startTime = Date.now();
    const MIN_LOADING_TIME = 800;
    
    logger.session(`Starting session load for: ${loadedId}`);
    
    try {
      logger.api('POST /api/session/load - sending request');
      const res = await fetch('/api/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vorgangsId: loadedId }),
      });
      
      logger.api(`POST /api/session/load - response: ${res.status} ${res.ok ? 'OK' : 'FAILED'}`);
      
      if (!res.ok) {
        const data = await res.json();
        logger.error('Session load failed', data);
        setError(data.error || t('layout.notFound'));
        setIsLoading(false);
        return;
      }
      
      const responseData = await res.json();
      logger.session('Session load success', { data: responseData });
      
      logger.session('Invalidating session query...');
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      logger.session('Refetching session data...');
      
      const newSessionData = await queryClient.fetchQuery({ 
        queryKey: ['session'],
        queryFn: async () => {
          logger.api('GET /api/session - fetching');
          const res = await fetch('/api/session');
          logger.api(`GET /api/session - response: ${res.status} ${res.ok ? 'OK' : 'FAILED'}`);
          if (!res.ok) {
            const text = await res.text();
            logger.error(`GET /api/session error body: ${text.substring(0, 500)}`);
            throw new Error(`Failed to fetch session: ${res.status}`);
          }
          const data = await res.json();
          logger.session('Session data received', { data: { vorgangsId: data.vorgangsId, tripCount: data.tripCount } });
          return data;
        },
        staleTime: 0 
      });
      logger.session('Session loaded successfully', { data: { vorgangsId: newSessionData.vorgangsId, tripCount: newSessionData.tripCount } });
      
      playNotificationSound();
      setInputVorgangsId('');
      toast.success(t('layout.loadSuccess', { id: loadedId }));
      
      const elapsed = Date.now() - startTime;
      logger.session(`Total load time: ${elapsed}ms`);
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }
    } catch (err) {
      logger.error('Error loading session', err);
      setError(t('layout.loadError'));
    } finally {
      logger.ui('Session load complete, hiding overlay');
      setIsLoading(false);
    }
  };

  return (
    <LayoutLoadingContext.Provider value={{ isLoading, setIsLoading }}>
    <div className={cn(
      "bg-slate-50 flex font-sans text-slate-900",
      fullHeight ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:block shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">MU</span>
              MU-Dash
            </h1>
          </div>
          
          {sessionData?.vorgangsId ? (
            <div className="mx-4 my-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{t('layout.processId')}</span>
                  <span className="font-mono font-bold text-emerald-400">{sessionData.vorgangsId}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copyVorgangsId}
                    className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
                    data-testid="sidebar-copy-vorgangs-id"
                    title={t('layout.copyId')}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400/70" />}
                  </button>
                  <button
                    onClick={exitSession}
                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                    data-testid="sidebar-exit-session"
                    title={t('layout.exitSession')}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400/70" />
                  </button>
                </div>
              </div>
              {sessionData.companyName && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400/50" />
                  <span className="text-xs text-slate-300 truncate">{sessionData.companyName}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-4 my-3 p-3 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <Input
                  value={inputVorgangsId}
                  onChange={(e) => {
                    setInputVorgangsId(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && loadVorgangsId()}
                  placeholder={t('layout.vorgangsIdPlaceholder')}
                  className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-mono text-sm"
                  maxLength={6}
                  data-testid="sidebar-vorgangs-id-input"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadVorgangsId}
                  disabled={isLoading || !inputVorgangsId.trim()}
                  className="h-8 px-2 hover:bg-slate-700"
                  data-testid="sidebar-load-vorgangs-id"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-400" />
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </div>
          )}
          
          <nav className="flex-1 p-4 flex flex-col">
            <div className="space-y-1 flex-1">
              <NavItem 
                icon={<TrendingUp className="w-5 h-5" />} 
                label={t('layout.navPerformance')} 
                active={location === '/' || location === '/performance'} 
                onClick={() => setLocation('/')}
                testId="nav-performance"
              />
              <NavItem 
                icon={<ClipboardCheck className="w-5 h-5" />} 
                label={t('layout.navProcess')} 
                active={location === '/import' || location.startsWith('/v/')} 
                onClick={() => setLocation('/import')}
                testId="nav-pruefvorgang"
              />
              {sessionData?.vorgangsId && (
                <NavItem
                  icon={<FileText className="w-5 h-5" />}
                  label={t('layout.navFiles')}
                  active={location === '/files'}
                  onClick={() => setLocation('/files')}
                  testId="nav-files"
                />
              )}
              <NavItem
                icon={<HelpCircle className="w-5 h-5" />}
                label={t('layout.navHelp')}
                active={location === '/help'}
                onClick={() => setLocation('/help')}
                testId="nav-help"
              />
            </div>
            
            <div className="pt-4 border-t border-slate-800 space-y-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    data-testid="language-switcher"
                    className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    <span className="text-lg">{currentLanguage?.flag}</span>
                    <span className="ml-3 flex-1 text-left">{currentLanguage?.nativeName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      data-testid={`language-option-${lang.code}`}
                      onClick={() => setLanguage(lang.code)}
                      className={cn(
                        "cursor-pointer",
                        language === lang.code && "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      <span className="text-lg mr-2">{lang.flag}</span>
                      {lang.nativeName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <NavItem 
                icon={<Sparkles className="w-5 h-5" />} 
                label={t('layout.navUpdates')} 
                active={location === '/updates'} 
                onClick={() => setLocation('/updates')}
                testId="nav-updates"
              />
              
              <NavItem 
                icon={<Shield className="w-5 h-5" />} 
                label={t('layout.navAdmin')} 
                active={location === '/admin'} 
                onClick={() => setLocation('/admin')}
                testId="nav-admin"
              />
              
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="px-4 text-xs text-slate-500">
                  <div className="font-mono">v{APP_VERSION}</div>
                  <div className="text-slate-600">Build {BUILD_NUMBER}</div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
             <Menu className="w-6 h-6" />
           </Button>
           <h1 className="text-lg font-bold text-slate-900">{t('layout.appName')}</h1>
           <div className="w-10" />
        </header>

        <main className={cn(
          "flex-1 p-2 md:p-4 lg:p-6 relative",
          fullHeight ? "overflow-hidden flex flex-col" : "overflow-auto"
        )}>
          {children}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-2xl">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <span className="text-lg font-semibold text-slate-800">{t('layout.loadingSession')}</span>
                <span className="text-sm text-slate-500">{t('layout.loadingSessionHint')}</span>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
    </LayoutLoadingContext.Provider>
  );
}

function NavItem({ icon, label, active, onClick, testId }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, testId?: string }) {
  return (
    <button 
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "hover:bg-slate-800 hover:text-white"
      )}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  )
}
