import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAccent } from '../accent-provider';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  Bell, 
  Lock, 
  User,
  Check,
  RefreshCw,
  Loader2,
  Database,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const accentColors = [
  { id: 'blue', color: 'bg-blue-500', label: 'Blue' },
  { id: 'purple', color: 'bg-purple-500', label: 'Purple' },
  { id: 'rose', color: 'bg-rose-500', label: 'Rose' },
  { id: 'amber', color: 'bg-amber-500', label: 'Amber' },
  { id: 'emerald', color: 'bg-emerald-500', label: 'Emerald' },
] as const;

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false
  });

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      const settings = await blink.db.table('user_settings').get(user?.id || '');
      if (settings) {
        if (settings.theme) setTheme(settings.theme);
        if (settings.accent) setAccent(settings.accent as any);
        setNotifications({
          email: Boolean(Number(settings.emailNotifications)),
          push: Boolean(Number(settings.pushNotifications)),
          marketing: Boolean(Number(settings.marketingEmails))
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Saving settings...');
    try {
      await blink.db.table('user_settings').upsert({
        userId: user?.id,
        theme,
        accent,
        emailNotifications: String(Number(notifications.email)),
        pushNotifications: String(Number(notifications.push)),
        marketingEmails: String(Number(notifications.marketing)),
        updatedAt: new Date().toISOString()
      });
      toast.success('Settings saved successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to save settings', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    const toastId = toast.loading('Seeding mock data...');
    try {
      // Seed Customers
      const mockCustomers = [
        { name: 'Acme Corp', email: 'billing@acme.com', status: 'Active', plan: 'Enterprise', amount: 1200 },
        { name: 'Global Tech', email: 'finance@global.io', status: 'Active', plan: 'Pro', amount: 499 },
        { name: 'Umbrella Inc', email: 'accounts@umbrella.com', status: 'Active', plan: 'Starter', amount: 99 },
        { name: 'Wayne Enterprises', email: 'billing@wayne.com', status: 'Active', plan: 'Enterprise', amount: 2500 },
        { name: 'Stark Industries', email: 'pepper@stark.com', status: 'Active', plan: 'Enterprise', amount: 1800 },
      ];

      for (const customer of mockCustomers) {
        await blink.db.table('customers').create({
          ...customer,
          userId: user?.id,
          createdAt: new Date().toISOString()
        });
      }

      // Seed Locations
      const mockLocations = [
        { name: 'San Francisco', lat: 37.7749, lng: -122.4194, share: '32%', growth: '+12%' },
        { name: 'London', lat: 51.5074, lng: -0.1278, share: '18%', growth: '+5%' },
        { name: 'Tokyo', lat: 35.6762, lng: 139.6503, share: '12%', growth: '+22%' },
        { name: 'Berlin', lat: 52.5200, lng: 13.4050, share: '8%', growth: '+8%' },
        { name: 'New York', lat: 40.7128, lng: -74.0060, share: '24%', growth: '+15%' },
      ];

      for (const loc of mockLocations) {
        await blink.db.table('locations').create({
          ...loc,
          userId: user?.id,
          createdAt: new Date().toISOString()
        });
      }

      // Seed Integrations
      const mockIntegrations = [
        { name: 'github', status: 'Connected' },
        { name: 'slack', status: 'Connected' },
        { name: 'stripe', status: 'Connected' },
      ];

      for (const integration of mockIntegrations) {
        await blink.db.table('integrations').create({
          ...integration,
          userId: user?.id,
          createdAt: new Date().toISOString()
        });
      }

      toast.success('Database seeded with mock data', { id: toastId });
      window.location.reload(); 
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data', { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    const toastId = toast.loading('Clearing your data...');
    try {
      const customers = await blink.db.table('customers').list();
      const locations = await blink.db.table('locations').list();
      const integrations = await blink.db.table('integrations').list();

      for (const c of customers) await blink.db.table('customers').delete(c.id);
      for (const l of locations) await blink.db.table('locations').delete(l.id);
      for (const i of integrations) await blink.db.table('integrations').delete(i.id);

      toast.success('All data cleared', { id: toastId });
      window.location.reload();
    } catch (error) {
      toast.error('Failed to clear data', { id: toastId });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadUserSettings} className="gap-2">
          <RefreshCw className="w-3 h-3" />
          Reload Settings
        </Button>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Appearance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Theme</CardTitle>
                <CardDescription>Choose how Nexus looks to you.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs">System</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Accent Color</CardTitle>
                <CardDescription>Personalize your primary action color.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {accentColors.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAccent(item.id)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      item.color,
                      accent === item.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                    )}
                    title={item.label}
                  >
                    {accent === item.id && <Check className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h2>
          <Card className="bg-card/50 border-border">
            <CardContent className="divide-y divide-border pt-6">
              <div className="flex items-center justify-between pb-4">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive weekly analytics reports via email.</p>
                </div>
                <Switch 
                  checked={notifications.email} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })} 
                />
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get alerted when significant churn is detected.</p>
                </div>
                <Switch 
                  checked={notifications.push} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })} 
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label>Marketing Emails</Label>
                  <p className="text-xs text-muted-foreground">Stay updated with new features and offers.</p>
                </div>
                <Switch 
                  checked={notifications.marketing} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })} 
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Account & Security
          </h2>
          <Card className="bg-card/50 border-border">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.displayName || 'Nexus User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info('Profile editing', { description: 'Profile editing is managed through your authentication provider.' })}>Edit Profile</Button>
              </div>
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.info('Two-Factor Authentication', { description: '2FA setup will be available in a future update. Your account is secured via your auth provider.' })}>Enable</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Management
          </h2>
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>Actions related to your dashboard data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Seed Mock Data</p>
                  <p className="text-xs text-muted-foreground">Populate your dashboard with sample customers, locations, and integrations.</p>
                </div>
                <Button variant="secondary" onClick={handleSeedData} disabled={isSeeding} className="gap-2">
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Seed Data
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-destructive">Clear All Data</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all customers, locations, and integrations from your account.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleClearData}>Delete All Data</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="ghost" onClick={loadUserSettings}>Reset Defaults</Button>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
