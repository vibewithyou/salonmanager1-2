import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminData } from '@/hooks/useAdminData';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import { LeaveRequestsList } from '@/components/dashboard/LeaveRequestsList';
import { POSDashboard } from '@/components/pos/POSDashboard';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomersTab from '@/components/customers/CustomersTab';
import {
  Scissors,
  LogOut,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Shield,
  CreditCard,
  Share2,
  Download,
  Copy,
  Check,
  Clock,
  User,
} from 'lucide-react';
// Removed ProfileSettings import and unused query hooks

import BookingQRCode from '@/components/dashboard/BookingQRCode';
// Import a lightweight placeholder component for the time tracking tab.
import TimeTrackingPlaceholder from '@/components/dashboard/TimeTrackingPlaceholder';
import PastAppointmentsTab from '@/components/dashboard/PastAppointmentsTab';
import SalonSettingsTab from '@/components/dashboard/SalonSettingsTab';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  // We no longer fetch the admin's profile here. Profile editing is handled on the dedicated profile page.

  const navigate = useNavigate();
  const { toast } = useToast();
  const locale = i18n.language === 'de' ? de : enUS;

  const {
    isAdmin,
    salon,
    employees,
    services,
    leaveRequests,
    appointments,
    archivedAppointments,
    showWeek,
    toggleShowWeek,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createService,
    updateService,
    deleteService,
    updateLeaveRequest,
    refetch,
    updateAppointment,
    completeAppointment,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    display_name: '',
    position: '',
    bio: '',
    hourly_rate: '',
    weekly_hours: '40',
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '30',
    category: '',
    // Buffer times in minutes. Defaults to 0 when creating a new service.
    buffer_before: '',
    buffer_after: '',
  });

  // Reference to the QR code container. Declaring this hook along with the
  // other hooks ensures React calls hooks in the same order on every render.
  // If this is declared after an early return, React would see a different
  // number of hooks on subsequent renders (causing error #310).
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/employee-dashboard');
    }
  }, [isAdmin, loading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const resetEmployeeForm = () => {
    setEmployeeForm({ email: '', first_name: '', last_name: '', display_name: '', position: '', bio: '', hourly_rate: '', weekly_hours: '40' });
  };

  const handleCreateEmployee = async () => {
    if (!salon) return;
    
    // Create employee with invitation email
    const result = await createEmployee({
      salon_id: salon.id,
      display_name: employeeForm.display_name,
      position: employeeForm.position || null,
      bio: employeeForm.bio || null,
      hourly_rate: employeeForm.hourly_rate ? parseFloat(employeeForm.hourly_rate) : null,
      weekly_hours: parseInt(employeeForm.weekly_hours) || 40,
    }, {
      email: employeeForm.email,
      first_name: employeeForm.first_name,
      last_name: employeeForm.last_name,
    });

    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.employeeCreated') });
      setIsEmployeeDialogOpen(false);
      resetEmployeeForm();
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    const result = await updateEmployee(editingEmployee.id, {
      display_name: employeeForm.display_name || null,
      position: employeeForm.position || null,
      bio: employeeForm.bio || null,
      hourly_rate: employeeForm.hourly_rate ? parseFloat(employeeForm.hourly_rate) : null,
      weekly_hours: parseInt(employeeForm.weekly_hours) || 40,
    });

    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.employeeUpdated') });
      setEditingEmployee(null);
      resetEmployeeForm();
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const result = await deleteEmployee(id);
    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.employeeDeleted') });
    }
  };

  const handleCreateService = async () => {
    if (!salon) return;
    const result = await createService({
      salon_id: salon.id,
      name: serviceForm.name,
      description: serviceForm.description || null,
      price: parseFloat(serviceForm.price) || 0,
      duration_minutes: parseInt(serviceForm.duration_minutes) || 30,
      category: serviceForm.category || null,
      // Convert buffer fields to integers; default to 0 if empty
      buffer_before: serviceForm.buffer_before
        ? parseInt(serviceForm.buffer_before)
        : 0,
      buffer_after: serviceForm.buffer_after
        ? parseInt(serviceForm.buffer_after)
        : 0,
    });

    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.serviceCreated') });
      setIsServiceDialogOpen(false);
      setServiceForm({
        name: '',
        description: '',
        price: '',
        duration_minutes: '30',
        category: '',
        buffer_before: '',
        buffer_after: '',
      });
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    const result = await updateService(editingService.id, {
      name: serviceForm.name,
      description: serviceForm.description || null,
      price: parseFloat(serviceForm.price) || 0,
      duration_minutes: parseInt(serviceForm.duration_minutes) || 30,
      category: serviceForm.category || null,
      buffer_before: serviceForm.buffer_before
        ? parseInt(serviceForm.buffer_before)
        : 0,
      buffer_after: serviceForm.buffer_after
        ? parseInt(serviceForm.buffer_after)
        : 0,
    });

    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.serviceUpdated') });
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        price: '',
        duration_minutes: '30',
        category: '',
        buffer_before: '',
        buffer_after: '',
      });
    }
  };

  const handleDeleteService = async (id: string) => {
    const result = await deleteService(id);
    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.serviceDeleted') });
    }
  };

  const handleLeaveApprove = async (id: string) => {
    const result = await updateLeaveRequest(id, 'approved');
    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.leaveApproved') });
    }
  };

  const handleLeaveReject = async (id: string) => {
    const result = await updateLeaveRequest(id, 'rejected');
    if (result.error) {
      toast({ title: t('common.error'), description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.leaveRejected') });
    }
  };

  const today = new Date();
  const pendingLeaveRequests = leaveRequests.filter(l => l.status === 'pending');

  // When using HashRouter we need to include the hash in the link to
  // ensure deep linking works on static hosts. Otherwise the user will
  // encounter a 404 when navigating directly to /salon/:id.
  //
  // Use both `origin` and the current pathname when building the link.
  // On some hosts the app may be served from a subdirectory (for example
  // `https://example.com/my-app/`). If we omit the pathname when
  // constructing the booking link, the browser will navigate to the
  // domain root (e.g. `https://example.com/#/salon/…`), which often
  // results in a 404 because the static assets are served from
  // `/my-app/` instead of `/`. Including the pathname ensures the link
  // points back into the correct subdirectory.
  //
  // We also strip a trailing slash from the pathname to avoid double
  // slashes in the generated URL. See https://vitejs.dev/guide/deploy.html
  // for more details about base paths.
  const basePath = (() => {
    const { origin, pathname } = window.location;
    // Remove trailing slash from pathname, except when it's just '/'
    const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    return `${origin}${cleanPath}`;
  })();
  const bookingLink = salon ? `${basePath}/#/salon/${salon.id}` : '';

  // Build a lookup map from employee IDs to their display names. We
  // attempt to use the employee's profile first and last name if
  // available; otherwise we fall back to the employee's display_name.
  const employeeNameMap = employees.reduce<Record<string, string>>((map, emp) => {
    const fullName = emp.profile ? `${emp.profile.first_name || ''} ${emp.profile.last_name || ''}`.trim() : '';
    map[emp.id] = fullName || emp.display_name || 'Mitarbeiter';
    return map;
  }, {});

  // qrRef is declared earlier with the other hooks.

  /**
   * Download the generated QR code as an SVG file. We locate the
   * underlying <svg> element inside the qrRef, serialize it to a
   * string, create a Blob and then trigger a download. The filename
   * includes the salon name or ID to make it recognizable for
   * administrators.
   */
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filenameBase = salon?.name?.replace(/\s+/g, '-').toLowerCase() || salon?.id || 'booking';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenameBase}-qr-code.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Share the booking link using the Web Share API if available. On
   * supported devices (mobile browsers), this will open the native
   * share sheet. If the API isn't available, we fall back to copying
   * the link to the clipboard and showing a toast to inform the user.
   */
  const shareBookingLink = async () => {
    if (!bookingLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('admin.shareBookingLink', 'Buchungslink teilen'),
          url: bookingLink,
        });
        toast({ title: t('common.success'), description: t('admin.linkShared', 'Buchungslink wurde geteilt!') });
      } catch (err) {
        // user cancelled or there was an error
        toast({ title: t('common.error'), description: 'Link konnte nicht geteilt werden', variant: 'destructive' });
      }
    } else {
      // fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(bookingLink);
        toast({ title: t('common.success'), description: t('admin.linkCopied', 'Buchungslink kopiert!') });
      } catch {
        toast({ title: t('common.error'), description: 'Link konnte nicht kopiert werden', variant: 'destructive' });
      }
    }
  };

  const copyBookingLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setLinkCopied(true);
      toast({ title: t('common.success'), description: t('admin.linkCopied', 'Buchungslink kopiert!') });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: t('common.error'), description: 'Link konnte nicht kopiert werden', variant: 'destructive' });
    }
  };

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
            <span className="flex items-center gap-1 text-sm text-primary">
              <Shield className="w-4 h-4" />
              Admin
            </span>
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {t('admin.dashboard')}
            </h1>
            <p className="text-muted-foreground">
              {salon?.name} • {format(today, 'EEEE, d. MMMM yyyy', { locale })}
            </p>
          </div>
          
          {/* Share Booking Link */}
          {salon && (
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t('admin.shareBookingLink', 'Buchungslink teilen')}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{bookingLink}</p>
                    {/* Display a QR code for the booking link so customers can scan it directly. */}
                    <BookingQRCode value={bookingLink} svgRef={qrRef} />
                  </div>
                  {/*
                    Actions: copy, share, download. We group them in a
                    vertical stack on small screens and horizontal on larger
                    screens via flex classes. Each button uses an icon
                    from lucide-react and triggers its respective handler.
                  */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" variant="outline" onClick={copyBookingLink} aria-label={t('admin.copyLink', 'Link kopieren')}>
                      {linkCopied ? (
                        <Check className="w-4 h-4 text-sage" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={shareBookingLink} aria-label={t('admin.shareLink', 'Link teilen')}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadQRCode} aria-label={t('admin.downloadQr', 'QR-Code herunterladen')}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('admin.overview')}
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
              {t('admin.employees')}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Scissors className="w-4 h-4" />
              {t('admin.services')}
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <Calendar className="w-4 h-4" />
              {t('admin.leaveManagement')}
              {pendingLeaveRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose text-rose-foreground rounded-full">
                  {pendingLeaveRequests.length}
                </span>
              )}
            </TabsTrigger>
          <TabsTrigger value="pos" className="gap-2">
              <CreditCard className="w-4 h-4" />
              {t('pos.terminal')}
            </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <User className="w-4 h-4" />
            {t('nav.customers', 'Kunden')}
          </TabsTrigger>
            <TabsTrigger value="time" className="gap-2">
              <Clock className="w-4 h-4" />
              {t('admin.timeTracking', 'Zeiterfassung')}
            </TabsTrigger>
            {/* New tab for past appointments */}
            <TabsTrigger value="past" className="gap-2">
              <Calendar className="w-4 h-4" />
              {t('dashboard.pastAppointments', 'Vergangene Termine')}
            </TabsTrigger>
            {/* Salon settings tab */}
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {t('salonSettings.title', 'Salon Settings')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* The profile settings card has been moved to the dedicated profile page */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{appointments.length}</p>
                      {/* The label dynamically reflects whether we are viewing upcoming appointments or this week's appointments. */}
                      <p className="text-sm text-muted-foreground">
                        {showWeek ? t('dashboard.weekAppointments') : t('dashboard.nextAppointments')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-sage" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">
                        {employees.filter(e => e.is_active).length}/{employees.length}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('admin.activeEmployees')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                      <Scissors className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{services.length}</p>
                      <p className="text-sm text-muted-foreground">{t('admin.totalServices')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-rose" />
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{pendingLeaveRequests.length}</p>
                      <p className="text-sm text-muted-foreground">{t('admin.pendingLeave')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <AppointmentsList
                appointments={appointments.map(a => ({
                  ...a,
                  status: a.status || 'pending',
                }))}
                showingWeek={showWeek}
                onToggleWeek={toggleShowWeek}
                /* Allow admins to reschedule and reassign appointments */
                canReschedule
                canReassign
                /* Provide a list of employees to select when reassigning */
                employees={employees.map(emp => ({ id: emp.id, display_name: employeeNameMap[emp.id] }))}
                /* Pass the update handler to persist changes */
                onUpdate={updateAppointment}
                /* Allow admins to complete appointments (generate invoice) */
                canComplete
                onComplete={completeAppointment}
                /* Provide list of services so the appointment modal can allow selecting different or multiple services when completing */
                services={services}
              />
              <LeaveRequestsList
                leaveRequests={pendingLeaveRequests.map(l => ({
                  ...l,
                  status: l.status || 'pending'
                }))}
                showActions
                onApprove={handleLeaveApprove}
                onReject={handleLeaveReject}
              />
            </div>

            {/* Archived appointments are now displayed in their own tab */}
          </TabsContent>
          {/* Past Appointments Tab */}
          <TabsContent value="past">
            <PastAppointmentsTab
              appointments={archivedAppointments.map((a) => ({
                ...a,
                status: a.status || 'pending',
              }))}
            />
          </TabsContent>

          {/* Salon Settings Tab */}
          <TabsContent value="settings">
            {/* Pass current salon ID to load correct settings */}
            <SalonSettingsTab salonId={salon?.id} />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            {/* Pass the current salon ID so the customers hook knows which records to fetch */}
            <CustomersTab salonId={salon?.id || null} />
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-bold">{t('admin.manageEmployees')}</h2>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addEmployee')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.addEmployee')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('auth.firstName')}</Label>
                        <Input
                          value={employeeForm.first_name}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                          placeholder="Max"
                          required
                        />
                      </div>
                      <div>
                        <Label>{t('auth.lastName')}</Label>
                        <Input
                          value={employeeForm.last_name}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                          placeholder="Mustermann"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('staff.displayName')}</Label>
                      <Input
                        value={employeeForm.display_name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, display_name: e.target.value })}
                        placeholder={t('staff.displayNamePlaceholder')}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('staff.displayNameHint')}
                      </p>
                    </div>
                    <div>
                      <Label>{t('auth.email')}</Label>
                      <Input
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        placeholder="mitarbeiter@email.de"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.employeeEmailHint', 'Der Mitarbeiter kann sich mit dieser E-Mail registrieren')}
                      </p>
                    </div>
                    <div>
                      <Label>{t('staff.position')}</Label>
                      <Input
                        value={employeeForm.position}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                        placeholder={t('staff.positionPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label>{t('staff.bio')}</Label>
                      <Textarea
                        value={employeeForm.bio}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, bio: e.target.value })}
                        placeholder={t('staff.bioPlaceholder')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('staff.hourlyRate')}</Label>
                        <Input
                          type="number"
                          value={employeeForm.hourly_rate}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, hourly_rate: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>{t('staff.weeklyHours')}</Label>
                        <Input
                          type="number"
                          value={employeeForm.weekly_hours}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, weekly_hours: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateEmployee} className="w-full" disabled={!employeeForm.email || !employeeForm.first_name || !employeeForm.display_name}>
                      {t('common.create')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {employees.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t('admin.noEmployees')}
                  </CardContent>
                </Card>
              ) : (
              employees.map((emp) => (
                  <Card key={emp.id} className="border-border">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                            {emp.display_name?.[0] || emp.profile?.first_name?.[0] || 'E'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {emp.profile?.first_name} {emp.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('staff.displayName')}: <span className="text-primary">{emp.display_name || '-'}</span>
                              {emp.position && ` • ${emp.position}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${emp.is_active ? 'bg-sage-light text-sage' : 'bg-muted text-muted-foreground'}`}>
                            {emp.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setEmployeeForm({
                                email: emp.profile?.email || '',
                                first_name: emp.profile?.first_name || '',
                                last_name: emp.profile?.last_name || '',
                                display_name: emp.display_name || '',
                                position: emp.position || '',
                                bio: emp.bio || '',
                                hourly_rate: emp.hourly_rate?.toString() || '',
                                weekly_hours: emp.weekly_hours?.toString() || '40',
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(emp.id)}
                          >
                            <Trash2 className="w-4 h-4 text-rose" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Edit Employee Dialog */}
            <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('admin.editEmployee')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('staff.displayName')}</Label>
                    <Input
                      value={employeeForm.display_name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, display_name: e.target.value })}
                      placeholder={t('staff.displayNamePlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('staff.displayNameHint')}
                    </p>
                  </div>
                  <div>
                    <Label>{t('staff.position')}</Label>
                    <Input
                      value={employeeForm.position}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('staff.bio')}</Label>
                    <Textarea
                      value={employeeForm.bio}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, bio: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('staff.hourlyRate')}</Label>
                      <Input
                        type="number"
                        value={employeeForm.hourly_rate}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, hourly_rate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('staff.weeklyHours')}</Label>
                      <Input
                        type="number"
                        value={employeeForm.weekly_hours}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, weekly_hours: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateEmployee} className="w-full">
                    {t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-bold">{t('admin.manageServices')}</h2>
              <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addService')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('admin.addService')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>{t('services.name')}</Label>
                      <Input
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        placeholder={t('services.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <Label>{t('services.description')}</Label>
                      <Textarea
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('services.price')} (€)</Label>
                        <Input
                          type="number"
                          value={serviceForm.price}
                          onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>{t('services.duration')} (min)</Label>
                        <Input
                          type="number"
                          value={serviceForm.duration_minutes}
                          onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                        />
                      </div>
                    </div>
                    {/* Buffer times for services */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('services.bufferBefore', 'Puffer vor (Min)')}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={serviceForm.buffer_before}
                          onChange={(e) => setServiceForm({ ...serviceForm, buffer_before: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                        <div>
                          <Label>{t('services.bufferAfter', 'Puffer nach (Min)')}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={serviceForm.buffer_after}
                            onChange={(e) => setServiceForm({ ...serviceForm, buffer_after: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                    </div>
                    <div>
                      <Label>{t('services.category')}</Label>
                      <Input
                        value={serviceForm.category}
                        onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                        placeholder={t('services.categoryPlaceholder')}
                      />
                    </div>
                    <Button onClick={handleCreateService} className="w-full">
                      {t('common.create')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {services.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t('admin.noServices')}
                  </CardContent>
                </Card>
              ) : (
                services.map((service) => (
                  <Card key={service.id} className="border-border">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.duration_minutes} min • €{service.price.toFixed(2)}
                            {service.category && ` • ${service.category}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${service.is_active ? 'bg-sage-light text-sage' : 'bg-muted text-muted-foreground'}`}>
                            {service.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingService(service);
                              setServiceForm({
                                name: service.name,
                                description: service.description || '',
                                price: service.price.toString(),
                                duration_minutes: service.duration_minutes.toString(),
                                category: service.category || '',
                                buffer_before: service.buffer_before?.toString() ?? '',
                                buffer_after: service.buffer_after?.toString() ?? '',
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="w-4 h-4 text-rose" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Edit Service Dialog */}
            <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('admin.editService')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('services.name')}</Label>
                    <Input
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('services.description')}</Label>
                    <Textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('services.price')} (€)</Label>
                      <Input
                        type="number"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('services.duration')} (min)</Label>
                      <Input
                        type="number"
                        value={serviceForm.duration_minutes}
                        onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Buffer times for services */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('services.bufferBefore', 'Puffer vor (Min)')}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={serviceForm.buffer_before}
                        onChange={(e) => setServiceForm({ ...serviceForm, buffer_before: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>{t('services.bufferAfter', 'Puffer nach (Min)')}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={serviceForm.buffer_after}
                        onChange={(e) => setServiceForm({ ...serviceForm, buffer_after: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t('services.category')}</Label>
                    <Input
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleUpdateService} className="w-full">
                    {t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Leave Management Tab */}
          <TabsContent value="leave">
            <h2 className="text-xl font-display font-bold mb-6">{t('admin.leaveManagement')}</h2>
            <LeaveRequestsList
              leaveRequests={leaveRequests.map(l => ({
                ...l,
                status: l.status || 'pending'
              }))}
              showActions
              onApprove={handleLeaveApprove}
              onReject={handleLeaveReject}
            />
          </TabsContent>

          {/* POS Tab */}
          <TabsContent value="pos">
            {salon && (
              <POSDashboard
                salonId={salon.id}
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

          {/* Time Tracking / Zeiterfassung Tab */}
          <TabsContent value="time">
            {/*
              We use a lightweight placeholder instead of a full data‑fetching
              component here.  Loading time entries from Supabase requires
              row‑level security rules and proper API configuration.  Until
              those are configured, rendering a simple card avoids runtime
              errors that would otherwise blank out the entire admin page.
            */}
            <TimeTrackingPlaceholder />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
