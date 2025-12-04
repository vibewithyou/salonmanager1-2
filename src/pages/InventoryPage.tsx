import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Scissors,
  LogOut,
  ArrowLeft,
  Package,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number | null;
  min_quantity: number | null;
  price: number | null;
  unit: string | null;
  expiry_date: string | null;
  salon_id: string;
}

const InventoryPage = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locale = i18n.language === 'de' ? de : enUS;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    quantity: '',
    min_quantity: '5',
    price: '',
    unit: 'Stück',
    expiry_date: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get salon ID from employee or admin
      const { data: empData } = await supabase
        .from('employees')
        .select('salon_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let currentSalonId = empData?.salon_id;

      if (!currentSalonId) {
        // Check if admin
        const { data: salonData } = await supabase
          .from('salons')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        currentSalonId = salonData?.id;
      }

      if (currentSalonId) {
        setSalonId(currentSalonId);

        const { data: invData } = await supabase
          .from('inventory')
          .select('*')
          .eq('salon_id', currentSalonId)
          .order('name', { ascending: true });

        setItems(invData || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!salonId || !form.name) return;

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        salon_id: salonId,
        name: form.name,
        description: form.description || null,
        quantity: parseInt(form.quantity) || 0,
        min_quantity: parseInt(form.min_quantity) || 5,
        price: parseFloat(form.price) || null,
        unit: form.unit || 'Stück',
        expiry_date: form.expiry_date || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('inventory.itemCreated') });
      setItems([...items, data]);
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    const { data, error } = await supabase
      .from('inventory')
      .update({
        name: form.name,
        description: form.description || null,
        quantity: parseInt(form.quantity) || 0,
        min_quantity: parseInt(form.min_quantity) || 5,
        price: parseFloat(form.price) || null,
        unit: form.unit || 'Stück',
        expiry_date: form.expiry_date || null,
      })
      .eq('id', editingItem.id)
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('inventory.itemUpdated') });
      setItems(items.map(i => i.id === editingItem.id ? data : i));
      resetForm();
      setEditingItem(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('inventory.itemDeleted') });
      setItems(items.filter(i => i.id !== id));
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      quantity: '',
      min_quantity: '5',
      price: '',
      unit: 'Stück',
      expiry_date: '',
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity?.toString() || '',
      min_quantity: item.min_quantity?.toString() || '5',
      price: item.price?.toString() || '',
      unit: item.unit || 'Stück',
      expiry_date: item.expiry_date || '',
    });
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter(item => 
    (item.quantity || 0) <= (item.min_quantity || 5)
  );

  const expiringItems = items.filter(item => {
    if (!item.expiry_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold text-foreground">
                Salon<span className="text-primary">Manager</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t('nav.inventory')}
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                {t('inventory.addItem')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('inventory.addItem')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>{t('inventory.name')}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('inventory.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('inventory.description')}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('inventory.quantity')}</Label>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('inventory.minQuantity')}</Label>
                    <Input
                      type="number"
                      value={form.min_quantity}
                      onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('inventory.price')} (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('inventory.unit')}</Label>
                    <Input
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('inventory.expiryDate')}</Label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  {t('common.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts */}
        {(lowStockItems.length > 0 || expiringItems.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {lowStockItems.length > 0 && (
              <Card className="border-gold bg-gold/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-gold mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">{t('inventory.lowStock')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lowStockItems.length} {t('inventory.itemsLowStock')}
                  </p>
                </CardContent>
              </Card>
            )}
            {expiringItems.length > 0 && (
              <Card className="border-rose bg-rose/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-rose mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">{t('inventory.expiringSoon')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {expiringItems.length} {t('inventory.itemsExpiring')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.length === 0 ? (
            <Card className="col-span-full border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('inventory.noItems')}
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const stockPercentage = Math.min(
                ((item.quantity || 0) / (item.min_quantity || 5)) * 100,
                100
              );
              const isLowStock = (item.quantity || 0) <= (item.min_quantity || 5);
              const isExpiring = item.expiry_date && 
                Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30;

              return (
                <Card key={item.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {isLowStock && (
                          <Badge variant="outline" className="text-gold border-gold">
                            {t('inventory.low')}
                          </Badge>
                        )}
                        {isExpiring && (
                          <Badge variant="outline" className="text-rose border-rose">
                            {t('inventory.expiring')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-foreground">
                        {item.quantity || 0} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                      </span>
                      {item.price && (
                        <span className="text-muted-foreground">€{item.price.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('inventory.stock')}</span>
                        <span>{t('inventory.min')}: {item.min_quantity}</span>
                      </div>
                      <Progress value={stockPercentage} className={isLowStock ? '[&>div]:bg-gold' : ''} />
                    </div>
                    {item.expiry_date && (
                      <p className="text-xs text-muted-foreground">
                        {t('inventory.expires')}: {format(new Date(item.expiry_date), 'dd.MM.yyyy', { locale })}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('inventory.editItem')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t('inventory.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('inventory.description')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('inventory.quantity')}</Label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('inventory.minQuantity')}</Label>
                  <Input
                    type="number"
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('inventory.price')} (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('inventory.unit')}</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('inventory.expiryDate')}</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full">
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default InventoryPage;
