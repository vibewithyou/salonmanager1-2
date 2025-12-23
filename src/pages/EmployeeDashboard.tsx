import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { TimeTracking } from '@/components/dashboard/TimeTracking';
import { LeaveRequestForm } from '@/components/dashboard/LeaveRequestForm';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import { LeaveRequestsList } from '@/components/dashboard/LeaveRequestsList';
// Removed ProfileSettings import; profile editing is now handled on a dedicated page
import { POSDashboard } from '@/components/pos/POSDashboard';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, LogOut, User, Calendar, BarChart3, CreditCard, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const EmployeeDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language === 'de' ? de : enUS;
  const [activeTab, setActiveTab] = useState('dashboard');

  const {
    employee,
    profile,
    appointments,
    todayTimeEntry,
    leaveRequests,
    loading,
    checkIn,
    checkOut,
    submitLeaveRequest,
    refetch,
  } = useEmployeeData();

  // Fetch services for POS
  const { data: services = [] } = useQuery({
    queryKey: ['employee-salon-services', employee?.salon_id],
    queryFn: async () => {
      if (!employee?.salon_id) return [];
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('salon_id', employee.salon_id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employee?.salon_id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">{t('dashboard.notAnEmployee')}</h2>
            <p className="text-muted-foreground mb-4">{t('dashboard.contactAdmin')}</p>
            <Button onClick={() => navigate('/')}>{t('common.backToHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">
              Salon<span className="text-primary">Manager</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {/* Profile link in header */}
            <Link to="/profile" className="flex items-center gap-2 text-sm hover:underline">
              <User className="w-4 h-4" />
              {t('nav.profile', 'Profil')}
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {t('dashboard.welcome')}, {profile?.first_name || user?.user_metadata?.first_name || t('dashboard.employee')}!
          </h1>
          <p className="text-muted-foreground">
            {format(today, 'EEEE, d. MMMM yyyy', { locale })}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t('nav.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-2">
              <CreditCard className="w-4 h-4" />
              {t('pos.terminal')}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{appointments.length}</p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.appointmentsToday')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-sage" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">
                        {appointments.filter(a => a.status === 'completed').length}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.completed')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{employee.position || '-'}</p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.position')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Appointments */}
              <div className="lg:col-span-2 space-y-6">
                <AppointmentsList appointments={appointments} />
              </div>

              {/* Right Column - Time & Leave */}
              <div className="space-y-6">
                <TimeTracking
                  todayTimeEntry={todayTimeEntry}
                  onCheckIn={checkIn}
                  onCheckOut={checkOut}
                  loading={loading}
                />
                <LeaveRequestForm onSubmit={submitLeaveRequest} />
                <LeaveRequestsList leaveRequests={leaveRequests.slice(0, 3)} />
              </div>
            </div>
          </TabsContent>

          {/* POS Tab */}
          <TabsContent value="pos">
            {employee?.salon_id && (
              <POSDashboard
                salonId={employee.salon_id}
                services={services.map(s => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  price: s.price,
                  duration_minutes: s.duration_minutes,
                  category: s.category,
                }))}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
