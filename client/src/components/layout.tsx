import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">U</span>
              Uber-Retter
            </h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Dashboard" 
              active={location === '/'} 
              onClick={() => setLocation('/')}
            />
            <NavItem 
              icon={<Shield className="w-5 h-5" />} 
              label="Admin" 
              active={location === '/admin'} 
              onClick={() => setLocation('/admin')}
            />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <h1 className="text-lg font-bold text-slate-900">Uber-Retter</h1>
           <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
             <LayoutDashboard className="w-6 h-6" />
           </Button>
        </header>

        <main className="flex-1 overflow-auto p-2 md:p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
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
