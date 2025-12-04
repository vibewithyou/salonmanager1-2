import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CalendarView } from '@/components/calendar/CalendarView';
import { AppointmentDetailModal } from '@/components/calendar/AppointmentDetailModal';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Scissors, LogOut, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  price: number | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  } | null;
}

const CalendarPage = () => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

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
      // Check if user is an employee
      const { data: empData } = await supabase
        .from('employees')
        .select('id, salon_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empData) {
        setIsEmployee(true);
        setEmployeeId(empData.id);

        // Fetch appointments for this employee
        const { data: apptData } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(name, duration_minutes, price)
          `)
          .eq('employee_id', empData.id)
          .order('start_time', { ascending: true });

        setAppointments(apptData || []);
      } else {
        // Check if admin - fetch all appointments
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleData) {
          const { data: apptData } = await supabase
            .from('appointments')
            .select(`
              *,
              service:services(name, duration_minutes, price)
            `)
            .order('start_time', { ascending: true });

          setAppointments(apptData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('calendar.appointmentApproved') });
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', notes: reason || null })
      .eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('calendar.appointmentRejected') });
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    }
  };

  const handleSuggestNewTime = async (id: string, newTime: string) => {
    // For now, update the appointment with the new time and mark as pending
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    const duration = apt.service?.duration_minutes || 30;
    const startDate = new Date(newTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const { error } = await supabase
      .from('appointments')
      .update({
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        notes: `${apt.notes || ''}\n[Neue Zeit vorgeschlagen]`,
      })
      .eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('calendar.newTimeSuggested') });
      fetchData();
    }
  };

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
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">
          {t('nav.calendar')}
        </h1>
        
        <CalendarView
          appointments={appointments}
          onAppointmentClick={(apt) => setSelectedAppointment(apt as Appointment)}
        />

        <AppointmentDetailModal
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onSuggestNewTime={handleSuggestNewTime}
          canApprove={isEmployee}
        />
      </main>
    </div>
  );
};

export default CalendarPage;
