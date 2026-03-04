import React, { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Zap, 
  Github, 
  Slack, 
  Cloud, 
  Database, 
  Mail, 
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  status: string;
}

const availableIntegrations = [
  { id: 'github', name: 'GitHub', icon: Github, description: 'Connect your repositories to track deployment frequency.', category: 'DevOps' },
  { id: 'slack', name: 'Slack', icon: Slack, description: 'Send real-time alerts and daily summaries to your channels.', category: 'Communication' },
  { id: 'stripe', name: 'Stripe', icon: CreditCard, description: 'Sync revenue data and billing lifecycle events.', category: 'Finance' },
  { id: 'aws', name: 'AWS', icon: Cloud, description: 'Monitor infrastructure costs and resource utilization.', category: 'Cloud' },
  { id: 'postgresql', name: 'PostgreSQL', icon: Database, description: 'Direct connection to your primary application database.', category: 'Database' },
  { id: 'sendgrid', name: 'SendGrid', icon: Mail, description: 'Track email delivery performance and engagement.', category: 'Marketing' },
];

export const IntegrationsPage: React.FC = () => {
  const { user } = useAuth();
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    try {
      const data = await blink.db.table<Integration>('integrations').list();
      setConnectedIds(data.map(i => i.name.toLowerCase()));
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (integrationId: string, integrationDisplayName: string) => {
    const isConnected = connectedIds.includes(integrationId);
    setTogglingId(integrationId);
    const toastId = toast.loading(isConnected ? `Disconnecting ${integrationDisplayName}...` : `Connecting ${integrationDisplayName}...`);
    
    try {
      if (isConnected) {
        const list = await blink.db.table<Integration>('integrations').list();
        const match = list.find(i => i.name.toLowerCase() === integrationId);
        if (match) {
          await blink.db.table('integrations').delete(match.id);
        }
        setConnectedIds(connectedIds.filter(id => id !== integrationId));
        toast.success(`${integrationDisplayName} disconnected`, { id: toastId });
      } else {
        await blink.db.table('integrations').create({
          name: integrationId,
          status: 'Connected',
          userId: user?.id
        });
        setConnectedIds([...connectedIds, integrationId]);
        toast.success(`${integrationDisplayName} connected successfully`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to update integration', { id: toastId });
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card/50 border-border flex flex-col h-[200px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="w-10 h-10 rounded-xl bg-muted/50" />
              <Skeleton className="w-10 h-6 rounded-full bg-muted/50" />
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <Skeleton className="h-5 w-24 bg-muted/50" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-muted/50" />
                <Skeleton className="h-3 w-2/3 bg-muted/50" />
              </div>
            </CardContent>
            <CardFooter className="pt-0 border-t border-border mt-4 py-3 flex justify-between items-center bg-secondary/20">
              <Skeleton className="h-3 w-16 bg-muted/50" />
              <Skeleton className="h-6 w-12 bg-muted/50" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableIntegrations.map((integration) => {
          const isConnected = connectedIds.includes(integration.id.toLowerCase());
          return (
            <Card key={integration.id} className="bg-card/50 border-border flex flex-col hover:border-muted-foreground/30 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <integration.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 flex gap-1 items-center">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </Badge>
                  )}
                  {togglingId === integration.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch 
                      checked={isConnected} 
                      onCheckedChange={() => handleToggle(integration.id, integration.name)} 
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {integration.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="pt-0 border-t border-border mt-4 py-3 flex justify-between items-center bg-secondary/20">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{integration.category}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-background" onClick={() => toast.info(`${integration.name} documentation`, { description: 'External documentation links coming soon.' })}>
                  Docs
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
