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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Scissors,
  LogOut,
  ArrowLeft,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkSchedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean | null;
  specific_date: string | null;
}

interface Employee {
  id: string;
  position: string | null;
  user_id: string | null;
}

const DAYS_OF_WEEK = [
  { value: 1, labelDe: 'Montag', labelEn: 'Monday' },
  { value: 2, labelDe: 'Dienstag', labelEn: 'Tuesday' },
  { value: 3, labelDe: 'Mittwoch', labelEn: 'Wednesday' },
  { value: 4, labelDe: 'Donnerstag', labelEn: 'Thursday' },
  { value: 5, labelDe: 'Freitag', labelEn: 'Friday' },
  { value: 6, labelDe: 'Samstag', labelEn: 'Saturday' },
  { value: 0, labelDe: 'Sonntag', labelEn: 'Sunday' },
];

const SchedulePage = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [form, setForm] = useState({
    employee_id: '',
    day_of_week: '1',
    start_time: '09:00',
    end_time: '17:00',
    is_recurring: true,
    specific_date: '',
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
      // Get employees
      const { data: empData } = await supabase
        .from('employees')
        .select('id, position, user_id')
        .eq('is_active', true);

      setEmployees(empData || []);

      // Get schedules
      const { data: schedData } = await supabase
        .from('work_schedules')
        .select('*')
        .order('day_of_week', { ascending: true });

      setSchedules(schedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.employee_id) return;

    const { data, error } = await supabase
      .from('work_schedules')
      .insert({
        employee_id: form.employee_id,
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        is_recurring: form.is_recurring,
        specific_date: form.is_recurring ? null : form.specific_date || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('schedule.created') });
      setSchedules([...schedules, data]);
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;

    const { data, error } = await supabase
      .from('work_schedules')
      .update({
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        is_recurring: form.is_recurring,
        specific_date: form.is_recurring ? null : form.specific_date || null,
      })
      .eq('id', editingSchedule.id)
      .select()
      .single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('schedule.updated') });
      setSchedules(schedules.map(s => s.id === editingSchedule.id ? data : s));
      resetForm();
      setEditingSchedule(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('work_schedules').delete().eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('schedule.deleted') });
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: '',
      day_of_week: '1',
      start_time: '09:00',
      end_time: '17:00',
      is_recurring: true,
      specific_date: '',
    });
  };

  const openEditDialog = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setForm({
      employee_id: schedule.employee_id,
      day_of_week: schedule.day_of_week.toString(),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_recurring: schedule.is_recurring ?? true,
      specific_date: schedule.specific_date || '',
    });
  };

  const getDayLabel = (day: number) => {
    const dayObj = DAYS_OF_WEEK.find(d => d.value === day);
    return i18n.language === 'de' ? dayObj?.labelDe : dayObj?.labelEn;
  };

  const getEmployeeSchedules = (employeeId: string) => {
    return schedules.filter(s => s.employee_id === employeeId);
  };

  const filteredSchedules = selectedEmployee 
    ? schedules.filter(s => s.employee_id === selectedEmployee)
    : schedules;

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
            {t('schedule.title')}
          </h1>
          <div className="flex items-center gap-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('schedule.allEmployees')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('schedule.allEmployees')}</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.position || emp.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('schedule.addSchedule')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('schedule.addSchedule')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('staff.title')}</Label>
                    <Select 
                      value={form.employee_id} 
                      onValueChange={(v) => setForm({ ...form, employee_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('schedule.selectEmployee')} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.position || emp.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t('schedule.recurring')}</Label>
                    <Switch
                      checked={form.is_recurring}
                      onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
                    />
                  </div>
                  {form.is_recurring ? (
                    <div>
                      <Label>{t('schedule.dayOfWeek')}</Label>
                      <Select 
                        value={form.day_of_week} 
                        onValueChange={(v) => setForm({ ...form, day_of_week: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {i18n.language === 'de' ? day.labelDe : day.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>{t('schedule.specificDate')}</Label>
                      <Input
                        type="date"
                        value={form.specific_date}
                        onChange={(e) => setForm({ ...form, specific_date: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('schedule.startTime')}</Label>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('schedule.endTime')}</Label>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full">
                    {t('common.create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="grid md:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map(day => {
            const daySchedules = filteredSchedules.filter(s => s.day_of_week === day.value);
            return (
              <Card key={day.value} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {i18n.language === 'de' ? day.labelDe : day.labelEn}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {t('schedule.noSchedule')}
                    </p>
                  ) : (
                    daySchedules.map(schedule => {
                      const emp = employees.find(e => e.id === schedule.employee_id);
                      return (
                        <div
                          key={schedule.id}
                          className="p-2 rounded-lg bg-primary/10 border border-primary/20"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {emp?.position || schedule.employee_id.slice(0, 8)}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openEditDialog(schedule)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-rose"
                                onClick={() => handleDelete(schedule.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('schedule.editSchedule')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label>{t('schedule.recurring')}</Label>
                <Switch
                  checked={form.is_recurring}
                  onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
                />
              </div>
              {form.is_recurring ? (
                <div>
                  <Label>{t('schedule.dayOfWeek')}</Label>
                  <Select 
                    value={form.day_of_week} 
                    onValueChange={(v) => setForm({ ...form, day_of_week: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {i18n.language === 'de' ? day.labelDe : day.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>{t('schedule.specificDate')}</Label>
                  <Input
                    type="date"
                    value={form.specific_date}
                    onChange={(e) => setForm({ ...form, specific_date: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('schedule.startTime')}</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('schedule.endTime')}</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
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

export default SchedulePage;
