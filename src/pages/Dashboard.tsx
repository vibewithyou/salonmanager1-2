import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { 
  Calendar, 
  Users, 
  Clock, 
  BarChart3, 
  Settings, 
  Bell,
  Plus,
  Scissors,
  Package,
  LogOut,
  FileText,
  CalendarDays,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasSalon, setHasSalon] = useState(false);
  const [salon, setSalon] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      checkUserStatusAndRedirect();
    }
  }, [user, authLoading]);

  const checkUserStatusAndRedirect = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = roleData?.role || 'customer';
      setUserRole(role);

      if (role === 'admin') {
        // Check if admin has a salon
        const { data: salonData } = await supabase
          .from('salons')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (salonData) {
          setSalon(salonData);
          setHasSalon(true);
          // Redirect to admin dashboard
          navigate('/admin');
        } else {
          // No salon - redirect to setup
          navigate('/salon-setup');
        }
      } else if (role === 'stylist') {
        // Employee - redirect to employee dashboard
        navigate('/employee-dashboard');
      } else {
        // Customer - show customer dashboard
        setHasSalon(false);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Customer Dashboard
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
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {t('dashboard.welcome')}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale })}
          </p>
        </div>

        {/* Customer Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/booking" className="group">
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all hover:border-primary/50">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                {t('landing.roles.customer.features.0', 'Termin buchen')}
              </h3>
              <p className="text-muted-foreground">
                {t('dashboard.bookAppointmentDesc', 'Buchen Sie jetzt einen Termin bei Ihrem Lieblingssalon.')}
              </p>
            </div>
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-14 h-14 rounded-xl bg-sage/10 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-sage" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              {t('dashboard.myAppointments', 'Meine Termine')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard.myAppointmentsDesc', 'Verwalten Sie Ihre gebuchten Termine.')}
            </p>
            <p className="text-sm text-muted-foreground italic">
              {t('dashboard.noAppointments', 'Keine Termine vorhanden')}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
              <Settings className="w-7 h-7 text-gold" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              {t('nav.settings')}
            </h3>
            <p className="text-muted-foreground">
              {t('dashboard.settingsDesc', 'Profil und Einstellungen verwalten.')}
            </p>
          </div>
        </div>

        {/* Upgrade to Salon Owner */}
        {userRole === 'customer' && (
          <div className="mt-8 bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-display font-bold text-foreground mb-1">
                  {t('dashboard.becomeSalonOwner', 'Saloninhaber werden?')}
                </h3>
                <p className="text-muted-foreground">
                  {t('dashboard.becomeSalonOwnerDesc', 'Erstellen Sie Ihren eigenen Salon und verwalten Sie Termine, Mitarbeiter und mehr.')}
                </p>
              </div>
              <Button onClick={() => navigate('/salon-setup')}>
                {t('dashboard.startNow', 'Jetzt starten')}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
