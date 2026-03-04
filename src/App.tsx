import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { StatCardsGrid } from './components/dashboard/StatCards';
import { RevenueChart } from './components/dashboard/RevenueChart';
import { UserMap } from './components/dashboard/UserMap';
import { SettingsPage } from './components/dashboard/SettingsPage';
import { CustomersPage } from './components/dashboard/CustomersPage';
import { GeographyPage } from './components/dashboard/GeographyPage';
import { IntegrationsPage } from './components/dashboard/IntegrationsPage';
import { LandingPage } from './components/landing/LandingPage';
import { Skeleton } from './components/ui/skeleton';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, Download } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  share: string;
  growth: string;
}

function App() {
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeSection, setActiveSection] = useState('overview');
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentMRR, setCurrentMRR] = useState<number>(0);

  useEffect(() => {
    if (!authLoading) {
      // Simulate initial load for premium skeleton feel after auth is ready
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // Listen for navigation events from Header profile dropdown
  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent).detail;
      if (section) setActiveSection(section);
    };
    window.addEventListener('navigate-section', handler);
    return () => window.removeEventListener('navigate-section', handler);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchLocations();
      const channel = blink.realtime.channel('notifications');
      
      const setupRealtime = async () => {
        await channel.subscribe({ userId: user.id });
        
        channel.onMessage((msg: any) => {
          if (msg.type === 'new-customer') {
            toast.success(`New customer: ${msg.data.name}`, {
              description: `A new customer signed up for the ${msg.data.plan} plan.`,
              duration: 5000,
            });
          }
        });
      };
      
      setupRealtime();
      
      return () => {
        channel.unsubscribe();
      };
    }
  }, [user?.id]);

  const fetchLocations = async () => {
    try {
      const data = await blink.db.table<Location>('locations').list();
      setLocations(data);
      
      const customers = await blink.db.table('customers').list();
      const mrr = customers.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
      setCurrentMRR(mrr);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  if (authLoading) return null;

  if (!isAuthenticated) {
    return <LandingPage onLogin={login} />;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl bg-muted/50" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[450px] lg:col-span-2 w-full rounded-xl bg-muted/50" />
            <Skeleton className="h-[450px] w-full rounded-xl bg-muted/50" />
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <>
            <StatCardsGrid />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RevenueChart currentMRR={currentMRR} />
              <UserMap locations={locations} />
            </div>
          </>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RevenueChart />
              <div className="bg-card/50 border border-border rounded-xl p-6 h-full flex flex-col justify-center">
                <StatCardsGrid />
              </div>
            </div>
          </div>
        );
      case 'customers':
        return <CustomersPage />;
      case 'geography':
        return <GeographyPage />;
      case 'integrations':
        return <IntegrationsPage />;
      case 'billing':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Payment History</h3>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Invoice #INV-2024-00{i}</span>
                        <span className="text-xs text-muted-foreground">Paid on May {10 + i}, 2024</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">$499.00</span>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toast.info('Invoice PDF generated', { description: `Invoice #INV-2024-00${i} is ready for download.` })}>View PDF</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-primary text-primary-foreground rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold">Pro Plan</h3>
                <p className="text-sm opacity-90">Your next billing date is June 12, 2024.</p>
                <div className="pt-4">
                  <span className="text-3xl font-bold">$499</span>
                  <span className="text-sm opacity-80 ml-1">/mo</span>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => toast.info('Plan upgrade', { description: 'Contact sales@nexus.com to upgrade your plan.' })}>Upgrade Plan</Button>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <div className="p-24 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-bold">Section Under Development</h2>
            <p className="text-muted-foreground">We are working on bringing this feature to you soon.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h1>
            <p className="text-muted-foreground">Monitor your business performance and growth metrics.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal border-border bg-card/50",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-border" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="icon" className="border-border bg-card/50" onClick={() => toast.info('Filters coming soon', { description: 'Advanced filters will be available in the next update.' })}>
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-border bg-card/50" onClick={() => {
              const data = { section: activeSection, date: date?.toISOString(), exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `nexus-${activeSection}-export.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Data exported successfully');
            }}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {renderContent()}
      </div>
    </DashboardLayout>
  );
}

export default App;
