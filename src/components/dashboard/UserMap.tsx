import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  share: string;
  growth: string;
}

interface UserMapProps {
  locations?: Location[];
}

export const UserMap: React.FC<UserMapProps> = ({ locations = [] }) => {
  return (
    <Card className="col-span-1 border-border bg-card/50 backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Global Activity
          </CardTitle>
          <CardDescription>Live active user sessions by geographic region.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-6">
        <div className="relative aspect-video w-full group">
          {/* Simple stylized map background */}
          <svg viewBox="0 0 1000 500" className="w-full h-full opacity-20 transition-opacity group-hover:opacity-30 duration-500 fill-muted-foreground/20">
            {/* Very simplified world map path for aesthetic */}
            <path d="M150,150 L200,140 L250,160 L280,180 L300,220 L280,250 L250,280 L200,300 L150,280 L120,250 L130,200 Z" />
            <path d="M400,100 L450,90 L500,110 L550,140 L580,180 L550,250 L500,300 L450,320 L400,300 L350,250 L360,180 Z" />
            <path d="M700,200 L750,180 L800,200 L850,250 L830,320 L780,350 L720,330 L680,280 L690,220 Z" />
            
            {/* Standard dots */}
            <circle cx="200" cy="180" r="4" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="450" cy="220" r="6" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="750" cy="150" r="3" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="820" cy="300" r="5" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="300" cy="350" r="4" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="550" cy="400" r="3" fill="hsl(var(--primary))" className="animate-pulse" />

            {/* Custom dots from database */}
            {locations.map((loc) => (
              <circle 
                key={loc.id} 
                cx={(loc.lat % 1000)} 
                cy={(loc.lng % 500)} 
                r="6" 
                fill="hsl(var(--primary))" 
                className="animate-bounce"
              >
                <title>{loc.name}</title>
              </circle>
            ))}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             {/* This could be replaced with a real map lib but we use stylized dots for "Linear" feel */}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Region</p>
            <p className="text-sm font-bold">North America</p>
            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[65%] rounded-full"></div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Growth</p>
            <p className="text-sm font-bold text-emerald-500">+24.8%</p>
            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[42%] rounded-full"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};