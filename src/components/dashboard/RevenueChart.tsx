import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 32000, users: 800 },
  { month: 'Feb', revenue: 35000, users: 850 },
  { month: 'Mar', revenue: 33000, users: 820 },
  { month: 'Apr', revenue: 38000, users: 950 },
  { month: 'May', revenue: 42000, users: 1050 },
  { month: 'Jun', revenue: 40000, users: 1000 },
  { month: 'Jul', revenue: 45000, users: 1100 },
  { month: 'Aug', revenue: 48000, users: 1200 },
  { month: 'Sep', revenue: 46000, users: 1150 },
  { month: 'Oct', revenue: 52000, users: 1300 },
  { month: 'Nov', revenue: 50000, users: 1250 },
  { month: 'Dec', revenue: 55000, users: 1400 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-foreground">
          ${payload[0].value.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <p className="text-xs text-muted-foreground">Monthly Revenue</p>
        </div>
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  currentMRR?: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ currentMRR }) => {
  const chartData = [...data];
  if (currentMRR !== undefined) {
    // Update the last month with real data if available
    chartData[chartData.length - 1] = { 
      ...chartData[chartData.length - 1], 
      revenue: currentMRR 
    };
  }

  return (
    <Card className="col-span-1 lg:col-span-2 border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight">Revenue Growth</CardTitle>
          <CardDescription>Monthly recurring revenue for the current fiscal year.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 border border-border">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-xs font-medium">Revenue</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[400px] w-full pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="hsl(var(--border))" 
              opacity={0.5}
            />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
              dx={-10}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
