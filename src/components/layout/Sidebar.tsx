import React from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Globe,
  CreditCard,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'customers', icon: Users, label: 'Customers' },
  { id: 'geography', icon: Globe, label: 'Geography' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'integrations', icon: Zap, label: 'Integrations' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, activeSection, onSectionChange }) => {
  return (
    <aside 
      className={cn(
        "relative h-screen border-r border-border bg-background/50 backdrop-blur-xl transition-[width] duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-[70px]" : "w-64"
      )}
    >
      <div className={cn(
        "h-16 flex items-center px-4 border-b border-border mb-4 overflow-hidden",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[150px]"
          )}>
            <span className="font-bold text-xl tracking-tight whitespace-nowrap">Nexus</span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className="h-8 w-8 hover:bg-secondary shrink-0 z-10"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-x-hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors group relative overflow-hidden",
              activeSection === item.id 
                ? "bg-secondary text-foreground" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <item.icon className={cn("w-5 h-5", activeSection === item.id ? "text-primary" : "")} />
            </div>
            <div className={cn(
              "flex-1 overflow-hidden transition-all duration-300 ease-in-out text-left",
              isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-full"
            )}>
              <span className="text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
            </div>
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-border shadow-lg">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};
