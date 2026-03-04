import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../dashboard/CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  activeSection, 
  onSectionChange 
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeSection={activeSection} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
      
      <CommandPalette onSectionChange={onSectionChange} />
    </div>
  );
};
