import React, { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Users, Plus, MoreHorizontal, Mail, DollarSign, Trash2 } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Customer {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  amount: number;
  createdAt: string;
}

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    plan: 'Pro',
    amount: 499
  });

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const data = await blink.db.table<Customer>('customers').list({
        orderBy: { createdAt: 'desc' }
      });
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);
    try {
      const customer = await blink.db.table<Customer>('customers').create({
        ...newCustomer,
        status: 'Active',
        userId: user?.id
      } as any);
      
      // Emit realtime notification
      try {
        const channel = blink.realtime.channel('notifications');
        await channel.publish('new-customer', {
          name: customer.name,
          plan: customer.plan
        });
      } catch (rtError) {
        console.error('Failed to emit realtime event:', rtError);
      }

      setCustomers([customer, ...customers]);
      setNewCustomer({ name: '', email: '', plan: 'Pro', amount: 499 });
      toast.success('Customer added successfully');
    } catch (error) {
      toast.error('Failed to add customer');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setDeletingId(id);
    const toastId = toast.loading('Removing customer...');
    try {
      await blink.db.table('customers').delete(id);
      setCustomers(customers.filter(c => c.id !== id));
      toast.success('Customer removed successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to remove customer', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[250px]"><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className="border-border">
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={newCustomer.name} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Acme Corp" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newCustomer.email} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="billing@acme.com" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Input 
                    id="plan" 
                    value={newCustomer.plan} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, plan: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    value={newCustomer.amount} 
                    onChange={(e) => setNewCustomer({ ...newCustomer, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer} disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center space-y-4 bg-card/30">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">No customers yet</h2>
            <p className="text-muted-foreground max-w-sm">Start by adding your first customer to track their performance.</p>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[250px]">Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="border-border hover:bg-secondary/30">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{customer.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-0">
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.plan}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-mono">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      {customer.amount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={deletingId === customer.id}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border bg-card">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
