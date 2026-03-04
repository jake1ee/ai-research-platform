import React, { useState } from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';

interface HeaderProps {
  activeSection: string;
}

export const Header: React.FC<HeaderProps> = ({ activeSection }) => {
  const { user, logout } = useAuth();
  const [hasNotification, setHasNotification] = useState(true);
  const formattedSection = activeSection.charAt(0).toUpperCase() + activeSection.slice(1);

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md z-40">
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'overview' })); }}>Nexus</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{formattedSection}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground/50 transition-colors group"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search...</span>
          <Kbd className="ml-2 bg-background border-border group-hover:border-muted-foreground/30 transition-colors">
            <span className="text-[10px]">⌘</span>K
          </Kbd>
        </button>

        <div className="flex items-center gap-2 ml-2">
          <button 
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors relative"
            onClick={() => {
              if (hasNotification) {
                toast.info('Notifications', { description: 'You have no new notifications.' });
                setHasNotification(false);
              } else {
                toast.info('All caught up!', { description: 'No new notifications.' });
              }
            }}
          >
            <Bell className="w-5 h-5" />
            {hasNotification && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-background"></span>}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full border border-border bg-secondary flex items-center justify-center overflow-hidden hover:border-muted-foreground/50 transition-colors">
                <User className="w-6 h-6 p-1 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName || 'Nexus User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'settings' }));
              }}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};