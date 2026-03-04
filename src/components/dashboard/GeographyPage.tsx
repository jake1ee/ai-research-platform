import React, { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/use-auth';
import { UserMap } from './UserMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Plus, MapPin, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  share: string;
  growth: string;
  createdAt: string;
}

export const GeographyPage: React.FC = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newLocation, setNewCustomer] = useState({
    name: '',
    share: '10%',
    growth: '+5%'
  });

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const data = await blink.db.table<Location>('locations').list({
        orderBy: { createdAt: 'desc' }
      });
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name) {
      toast.error('Please enter a region name');
      return;
    }

    setIsAdding(true);
    const toastId = toast.loading('Adding region...');
    try {
      // Mock lat/lng for simplicity since we don't have a real map picker yet
      const lat = Math.random() * 100 + 100;
      const lng = Math.random() * 100 + 100;
      
      const loc = await blink.db.table<Location>('locations').create({
        ...newLocation,
        lat,
        lng,
        userId: user?.id
      } as any);
      setLocations([loc, ...locations]);
      setNewCustomer({ name: '', share: '10%', growth: '+5%' });
      toast.success('Location set successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to set location', { id: toastId });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    setDeletingId(id);
    const toastId = toast.loading('Removing region...');
    try {
      await blink.db.table('locations').delete(id);
      setLocations(locations.filter(l => l.id !== id));
      toast.success('Location removed', { id: toastId });
    } catch (error) {
      toast.error('Failed to remove location', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(locations, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "geography_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Downloading data...');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-48 bg-muted/50" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[450px] w-full rounded-xl bg-muted/50" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl bg-muted/50" />
            <Skeleton className="h-[250px] w-full rounded-xl bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2 border-border bg-card/50" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Download Geography JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserMap locations={locations} />
        </div>
        
        <div className="space-y-6">
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Set Location</CardTitle>
              <CardDescription>Add a new region to your analytics tracking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="region-name">Region Name</Label>
                <Input 
                  id="region-name" 
                  value={newLocation.name} 
                  onChange={(e) => setNewCustomer({ ...newLocation, name: e.target.value })}
                  placeholder="e.g. Western Europe" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Market Share</Label>
                  <Input 
                    value={newLocation.share} 
                    onChange={(e) => setNewCustomer({ ...newLocation, share: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Growth</Label>
                  <Input 
                    value={newLocation.growth} 
                    onChange={(e) => setNewCustomer({ ...newLocation, growth: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleAddLocation} disabled={isAdding}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isAdding ? 'Adding...' : 'Add Region'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Configured Regions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {locations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">No custom regions set.</div>
                ) : (
                  locations.map((loc) => (
                    <div key={loc.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">{loc.share} share • {loc.growth}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLocation(loc.id)}
                        disabled={deletingId === loc.id}
                      >
                        {deletingId === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
