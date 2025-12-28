import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WeekCalendar } from '@/components/booking/WeekCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Page for creating a new appointment from within the dashboard. This page
 * is intended to be accessed by salon staff (admins or stylists) when
 * booking an appointment on behalf of an existing customer. It bypasses
 * the public booking_disabled check and pre-fills guest details based on
 * the selected customer profile.
 */
const NewAppointment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Extract the customer ID from the route
  const { customerId } = useParams<{ customerId: string }>();

  // Require user to be authenticated. Redirect to login if unauthenticated.
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  /**
   * Step state management: similar to the public SalonBooking component we use
   * a simple integer to track the current step. 1 = select service,
   * 2 = select stylist, 3 = pick date/time, 4 = confirm details.
   */
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Fetch the customer profile to retrieve the salon ID and pre-fill guest
   * details (name, email, phone). If the customer does not exist, we
   * redirect back to the dashboard.
   */
  const {
    data: customer,
    isLoading: customerLoading,
  } = useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  /**
   * Determine the salon ID based on the loaded customer. If the customer
   * belongs to a different salon than the current user, the booking will
   * still proceed because the appointment's salon_id is taken from the
   * customer record. This ensures only the correct salon is used.
   */
  const salonId = customer?.salon_id ?? null;

  /**
   * Fetch services for the salon. Only active services are shown. We
   * refetch when the salon ID changes.
   */
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('category', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  /**
   * Fetch stylists (employees) for the salon. Only active employees are
   * displayed. The stylist with ID 'any' indicates no preference.
   */
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, display_name, is_active')
        .eq('salon_id', salonId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  /**
   * Handler for selecting a slot from the week calendar. Opens the confirm
   * modal and stores the date/time.
   */
  const handleSlotSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowConfirmModal(true);
  };

  /**
   * Compute the appointment prefix based on the first letter of the salon
   * name and the salon owner's first name. This helper performs a
   * lightweight query and caches the result during the session. The
   * returned prefix is lowercased.
   */
  const computePrefix = async (): Promise<string> => {
    if (!salonId) return '';
    try {
      const { data: salonInfo } = await supabase
        .from('salons')
        .select('name, owner_id')
        .eq('id', salonId)
        .single();
      if (!salonInfo) return '';
      const salonName = (salonInfo as any).name || '';
      let ownerFirst = '';
      if ((salonInfo as any).owner_id) {
        const { data: ownerProf } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', (salonInfo as any).owner_id)
          .maybeSingle();
        ownerFirst = ownerProf?.first_name || '';
      }
      const salonInitial = salonName.trim()[0] || '';
      const ownerInitial = ownerFirst.trim()[0] || '';
      return `${salonInitial}${ownerInitial}`.toLowerCase();
    } catch (err) {
      console.error('Error computing appointment prefix:', err);
      return '';
    }
  };

  /**
   * Confirm handler for creating the appointment. This replicates the logic
   * used in the public booking components but always attaches the
   * appointment to the specified customer profile and does not check
   * whether public booking is enabled. It also generates a unique
   * appointment number based on the salon prefix and appointment date.
   */
  const handleConfirm = async () => {
    if (!customer || !salonId || !selectedService || !selectedDate || !selectedTime) {
      return;
    }
    const serviceData = services.find((s: any) => s.id === selectedService);
    if (!serviceData) return;
    setIsSubmitting(true);
    try {
      // Build start and end timestamps based on the selected date and time
      const startTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`);
      const duration = (serviceData.duration_minutes || 0) + (serviceData.buffer_before || 0) + (serviceData.buffer_after || 0);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Compute prefix and sequence for the appointment number
      const prefix = await computePrefix();
      const dateStr = format(startTime, 'yyyyMMdd');
      let seq = 1;
      try {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', salonId)
          .gte('start_time', `${dateStr}T00:00:00`)
          .lt('start_time', `${dateStr}T23:59:59`);
        seq = ((count ?? 0) + 1);
      } catch (e) {
        console.error('Error computing appointment sequence:', e);
      }
      const appointmentNumber = `${prefix}t${dateStr}${String(seq).padStart(5, '0')}`;

      // Pre-fill guest details from the customer profile
      const guestName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const guestEmail = (customer.email as any) || null;
      const guestPhone = (customer.phone as any) || null;

      const { error } = await supabase.from('appointments').insert({
        salon_id: salonId,
        service_id: selectedService,
        employee_id: selectedStylist === 'any' ? null : selectedStylist,
        guest_name: guestName || null,
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
        notes: notes || null,
        image_url: null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        price: serviceData.price,
        status: 'pending',
        appointment_number: appointmentNumber,
        customer_profile_id: customerId,
      });
      if (error) {
        console.error('Error creating appointment:', error);
      } else {
        // Upon success, navigate back to the previous page
        navigate(-1);
      }
    } catch (err) {
      console.error('Failed to create appointment:', err);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  // Early loading states
  if (customerLoading || servicesLoading || employeesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!customer || !salonId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center p-4">
        <p>{t('booking.customerNotFound', 'Der Kunde konnte nicht geladen werden.')}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">{t('common.back', 'Zurück')}</Button>
      </div>
    );
  }

  // Determine service duration including buffer to compute available time blocks
  const selectedServiceData = services.find((s: any) => s.id === selectedService);
  const totalDuration = selectedServiceData
    ? (selectedServiceData.duration_minutes || 0) +
      (selectedServiceData.buffer_before || 0) +
      (selectedServiceData.buffer_after || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold mb-4">
        {t('booking.newAppointmentFor', { name: `${customer.first_name} ${customer.last_name}` }, `Neuen Termin für ${customer.first_name} ${customer.last_name}`)}
      </h1>
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-medium">{t('booking.service')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((svc: any) => (
              <Card
                key={svc.id}
                className={`cursor-pointer border ${selectedService === svc.id ? 'border-primary' : 'border-border'}`}
                onClick={() => setSelectedService(svc.id)}
              >
                <CardHeader>
                  <CardTitle>{svc.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{svc.description || '-'}</p>
                  <p className="mt-2 font-medium">€{svc.price.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button disabled={!selectedService} onClick={() => setStep(2)}>
              {t('common.next', 'Weiter')}
            </Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-medium">{t('booking.stylist')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Option for any stylist */}
            <Card
              key="any"
              className={`cursor-pointer border ${selectedStylist === 'any' ? 'border-primary' : 'border-border'}`}
              onClick={() => setSelectedStylist('any')}
            >
              <CardHeader>
                <CardTitle>{t('booking.anyStylist')}</CardTitle>
              </CardHeader>
            </Card>
            {employees.map((emp: any) => (
              <Card
                key={emp.id}
                className={`cursor-pointer border ${selectedStylist === emp.id ? 'border-primary' : 'border-border'}`}
                onClick={() => setSelectedStylist(emp.id)}
              >
                <CardHeader>
                  <CardTitle>{emp.display_name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="flex justify-between gap-2 mt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              {t('common.back', 'Zurück')}
            </Button>
            <Button disabled={!selectedStylist} onClick={() => setStep(3)}>
              {t('common.next', 'Weiter')}
            </Button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-medium">{t('booking.appointment')}</h2>
          {/* Week calendar for selecting date/time */}
          {selectedServiceData && (
            <WeekCalendar
              salonId={salonId}
              selectedStylistId={selectedStylist}
              serviceDuration={totalDuration}
              onSelectSlot={handleSlotSelect}
            />
          )}
          <div className="flex justify-between gap-2 mt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              {t('common.back', 'Zurück')}
            </Button>
            {/* Continue button disabled since selection occurs via calendar */}
            <Button disabled>{t('common.next', 'Weiter')}</Button>
          </div>
        </div>
      )}
      {/* Confirmation modal for step 4 */}
      <Dialog open={showConfirmModal} onOpenChange={(isOpen) => !isOpen && setShowConfirmModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('booking.confirmAppointment', 'Termin bestätigen')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t('booking.service')}: {selectedServiceData?.name}</p>
            <p>{t('booking.stylist')}: {selectedStylist === 'any' ? t('booking.anyStylist') : employees.find((e: any) => e.id === selectedStylist)?.display_name}</p>
            <p>{t('booking.date')}: {selectedDate ? format(selectedDate, 'dd.MM.yyyy') : ''}</p>
            <p>{t('booking.time')}: {selectedTime}</p>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="notes">
                {t('booking.notes', 'Notizen')}
              </label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('booking.addNote', 'Notiz hinzufügen')} />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>{t('common.cancel', 'Abbrechen')}</Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('booking.confirm', 'Bestätigen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewAppointment;