import React, { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User,
  Search,
  LayoutDashboard,
  BarChart3,
  Users,
  Zap,
  Mail,
  Loader2
} from 'lucide-react';
import { blink } from '@/lib/blink';

interface Customer {
  id: string;
  name: string;
  email: string;
}

export const CommandPalette: React.FC<{ onSectionChange?: (section: string) => void }> = ({ onSectionChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const toggleHandler = () => setOpen((prev) => !prev);

    document.addEventListener('keydown', down);
    window.addEventListener('toggle-command-palette', toggleHandler);
    
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('toggle-command-palette', toggleHandler);
    };
  }, []);

  useEffect(() => {
    if (search.length > 1) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [search]);

  const searchCustomers = async () => {
    setIsSearching(true);
    try {
      const allCustomers = await blink.db.table<Customer>('customers').list();
      const searchLower = search.toLowerCase();
      const filtered = allCustomers.filter(
        c => c.name.toLowerCase().includes(searchLower) || c.email.toLowerCase().includes(searchLower)
      ).slice(0, 5);
      setCustomers(filtered);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search customers..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.map((customer) => (
              <CommandItem 
                key={customer.id} 
                onSelect={() => runCommand(() => onSectionChange?.('customers'))}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{customer.name}</span>
                  <span className="text-[10px] text-muted-foreground">{customer.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {isSearching && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <CommandSeparator />

        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('overview'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('analytics'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Detailed Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('customers'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Customer Management</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('settings'))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('billing'))}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing & Subscription</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSectionChange?.('settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>System Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
