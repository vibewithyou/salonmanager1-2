import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Scissors,
  LogOut,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Euro,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

const ReportsPage = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language === 'de' ? de : enUS;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    averageBookingValue: 0,
    topServices: [] as { name: string; count: number; revenue: number }[],
    dailyRevenue: [] as { date: string; revenue: number; appointments: number }[],
    employeeStats: [] as { name: string; appointments: number; revenue: number }[],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchReportData();
    }
  }, [user, authLoading, navigate]);

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get current month date range
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch appointments for the current month
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(name, price)
        `)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      if (!appointments) {
        setLoading(false);
        return;
      }

      // Calculate stats
      const completed = appointments.filter(a => a.status === 'completed');
      const cancelled = appointments.filter(a => a.status === 'cancelled');
      
      const totalRevenue = completed.reduce((sum, a) => sum + (a.price || a.service?.price || 0), 0);
      const averageBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0;

      // Service stats
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      appointments.forEach(apt => {
        const serviceName = apt.service?.name || 'Unknown';
        const current = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
        serviceMap.set(serviceName, {
          count: current.count + 1,
          revenue: current.revenue + (apt.price || apt.service?.price || 0),
        });
      });
      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Daily revenue
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const dailyRevenue = days.map(day => {
        const dayAppts = appointments.filter(a => 
          format(new Date(a.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );
        const dayCompleted = dayAppts.filter(a => a.status === 'completed');
        return {
          date: format(day, 'd', { locale }),
          revenue: dayCompleted.reduce((sum, a) => sum + (a.price || a.service?.price || 0), 0),
          appointments: dayAppts.length,
        };
      });

      // Employee stats
      const employeeMap = new Map<string, { appointments: number; revenue: number }>();
      appointments.forEach(apt => {
        const empId = apt.employee_id || 'Unassigned';
        const current = employeeMap.get(empId) || { appointments: 0, revenue: 0 };
        employeeMap.set(empId, {
          appointments: current.appointments + 1,
          revenue: apt.status === 'completed' 
            ? current.revenue + (apt.price || apt.service?.price || 0)
            : current.revenue,
        });
      });
      const employeeStats = Array.from(employeeMap.entries())
        .map(([name, data]) => ({ name: name.slice(0, 8) + '...', ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      setStats({
        totalRevenue,
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled.length,
        averageBookingValue,
        topServices,
        dailyRevenue,
        employeeStats,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--sage))', 'hsl(var(--gold))', 'hsl(var(--rose))', 'hsl(var(--muted-foreground))'];

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
          {t('nav.reports')} - {format(new Date(), 'MMMM yyyy', { locale })}
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Euro className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">€{stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.totalRevenue')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-sage" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.totalAppointments')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">€{stats.averageBookingValue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.avgBooking')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-rose" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalAppointments > 0 
                      ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('reports.completionRate')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="mb-6">
            <TabsTrigger value="revenue">{t('reports.revenue')}</TabsTrigger>
            <TabsTrigger value="services">{t('reports.services')}</TabsTrigger>
            <TabsTrigger value="employees">{t('reports.employees')}</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('reports.dailyRevenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>{t('reports.topServices')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.topServices}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="revenue"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {stats.topServices.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>{t('reports.serviceBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topServices.map((service, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-foreground">{service.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">€{service.revenue.toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">{service.count} {t('reports.bookings')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{t('reports.employeePerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.employeeStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ReportsPage;
