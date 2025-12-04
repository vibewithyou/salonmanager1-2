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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Scissors,
  LogOut,
  ArrowLeft,
  CalendarOff,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface Closure {
  id: string;
  salon_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

const ClosuresPage = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locale = i18n.language === 'de' ? de : enUS;

  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<Closure | null>(null);
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
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
      // Get salon ID
      const { data: salonData } = await supabase
        .from('salons')
        .select('id')
        .or(`owner_id.eq.${user.id},is_active.eq.true`)
        .limit(1)
        .maybeSingle();

      if (salonData) {
        setSalonId(salonData.id);

        const { data: closureData } = await supabase
          .from('salon_closures')
          .select('*')
          .eq('salon_id', salonData.id)
          .order('start_date', { ascending: true });

        setClosures(closureData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!salonId || !form.start_date || !form.end_date) return;

    const { data, error } = await supabase
      .from('salon_closures')
      .insert({
        salon_id: salonId,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('closures.created') });
      setClosures([...closures, data].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingClosure) return;

    const { data, error } = await supabase
      .from('salon_closures')
      .update({
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      })
      .eq('id', editingClosure.id)
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('closures.updated') });
      setClosures(closures.map(c => c.id === editingClosure.id ? data : c));
      resetForm();
      setEditingClosure(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('salon_closures').delete().eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('closures.deleted') });
      setClosures(closures.filter(c => c.id !== id));
    }
  };

  const resetForm = () => {
    setForm({
      start_date: '',
      end_date: '',
      reason: '',
    });
  };

  const openEditDialog = (closure: Closure) => {
    setEditingClosure(closure);
    setForm({
      start_date: closure.start_date,
      end_date: closure.end_date,
      reason: closure.reason || '',
    });
  };

  const getClosureStatus = (closure: Closure) => {
    const now = new Date();
    const start = new Date(closure.start_date);
    const end = new Date(closure.end_date);
    
    if (isPast(end)) return 'past';
    if (isFuture(start)) return 'upcoming';
    if (isWithinInterval(now, { start, end })) return 'active';
    return 'unknown';
  };

  const upcomingClosures = closures.filter(c => getClosureStatus(c) === 'upcoming');
  const activeClosures = closures.filter(c => getClosureStatus(c) === 'active');
  const pastClosures = closures.filter(c => getClosureStatus(c) === 'past');

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
            {t('closures.title')}
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                {t('closures.addClosure')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('closures.addClosure')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('dashboard.startDate')}</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('dashboard.endDate')}</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('closures.reason')}</Label>
                  <Textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder={t('closures.reasonPlaceholder')}
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  {t('common.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Closures */}
        {activeClosures.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-rose mb-4 flex items-center gap-2">
              <CalendarOff className="w-5 h-5" />
              {t('closures.currentlyClosed')}
            </h2>
            <div className="grid gap-4">
              {activeClosures.map(closure => (
                <Card key={closure.id} className="border-rose bg-rose/5">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {format(new Date(closure.start_date), 'd. MMMM yyyy', { locale })} - {format(new Date(closure.end_date), 'd. MMMM yyyy', { locale })}
                        </p>
                        {closure.reason && (
                          <p className="text-sm text-muted-foreground">{closure.reason}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(closure)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(closure.id)}>
                          <Trash2 className="w-4 h-4 text-rose" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Closures */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('closures.upcoming')}</h2>
          {upcomingClosures.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('closures.noUpcoming')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingClosures.map(closure => (
                <Card key={closure.id} className="border-border">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {format(new Date(closure.start_date), 'd. MMMM yyyy', { locale })} - {format(new Date(closure.end_date), 'd. MMMM yyyy', { locale })}
                        </p>
                        {closure.reason && (
                          <p className="text-sm text-muted-foreground">{closure.reason}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(closure)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(closure.id)}>
                          <Trash2 className="w-4 h-4 text-rose" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Closures */}
        {pastClosures.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">{t('closures.past')}</h2>
            <div className="grid gap-4 opacity-60">
              {pastClosures.slice(0, 5).map(closure => (
                <Card key={closure.id} className="border-border">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {format(new Date(closure.start_date), 'd. MMMM yyyy', { locale })} - {format(new Date(closure.end_date), 'd. MMMM yyyy', { locale })}
                        </p>
                        {closure.reason && (
                          <p className="text-sm text-muted-foreground">{closure.reason}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(closure.id)}>
                        <Trash2 className="w-4 h-4 text-rose" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingClosure} onOpenChange={(open) => !open && setEditingClosure(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('closures.editClosure')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('dashboard.startDate')}</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('dashboard.endDate')}</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('closures.reason')}</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
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

export default ClosuresPage;
