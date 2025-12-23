import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Scissors, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Check,
  MapPin,
  Loader2
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { WeekCalendar } from "@/components/booking/WeekCalendar";
import { BookingDetailModal } from "@/components/booking/BookingDetailModal";
import { format, addMinutes, isSameDay, startOfWeek, addDays } from "date-fns";
import { de, enUS } from "date-fns/locale";

const Booking = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const [step, setStep] = useState(1);
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all active salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch services for selected salon
  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedSalon],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('salon_id', selectedSalon)
        .eq('is_active', true)
        .order('category');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSalon,
  });

  // Fetch employees for selected salon - using display_name directly
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', selectedSalon],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, display_name, position, is_active')
        .eq('salon_id', selectedSalon)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSalon,
  });

  const selectedSalonData = salons.find((s: any) => s.id === selectedSalon);
  const selectedServiceData = services.find((s: any) => s.id === selectedService);

  // Compute total duration including buffer times. If buffer fields are undefined, default to 0.
  const selectedServiceTotalDuration = selectedServiceData
    ? (selectedServiceData.duration_minutes || 0) +
      (selectedServiceData.buffer_before || 0) +
      (selectedServiceData.buffer_after || 0)
    : 0;
  const selectedEmployeeData = employees.find((e: any) => e.id === selectedStylist);

  // Get stylist display name
  const getStylistName = () => {
    if (!selectedEmployeeData) return t('booking.anyStylist');
    return selectedEmployeeData.display_name || t('booking.stylist');
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSlotSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowDetailModal(true);
  };

  const handleBookingConfirm = async (data: {
    date: Date;
    time: string;
    notes: string;
    imageUrl: string | null;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
  }) => {
    if (!selectedServiceData || !selectedSalon) {
      toast.error(t('booking.fillRequired'));
      return;
    }

    setIsSubmitting(true);

    const startTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.time}:00`);
    const endTime = new Date(startTime.getTime() + selectedServiceTotalDuration * 60000);

    const { error } = await supabase.from('appointments').insert({
      salon_id: selectedSalon,
      service_id: selectedService,
      employee_id: selectedStylist === "any" ? null : selectedStylist,
      guest_name: data.guestName,
      guest_email: data.guestEmail,
      guest_phone: data.guestPhone,
      notes: data.notes,
      image_url: data.imageUrl,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      // include price from the selected service
      price: selectedServiceData.price,
      status: 'pending',
      // store buffer values on the appointment record to allow auditing
      buffer_before: selectedServiceData.buffer_before || 0,
      buffer_after: selectedServiceData.buffer_after || 0,
    });

    setIsSubmitting(false);
    setShowDetailModal(false);

    if (error) {
      toast.error(t('booking.bookingError'));
      console.error(error);
    } else {
      toast.success(t('booking.bookingSuccess'));
      // Reset form
      setStep(1);
      setSelectedSalon(null);
      setSelectedService(null);
      setSelectedStylist(null);
      setSelectedDate(null);
      setSelectedTime(null);
    }
  };

  // Get opening hours for the selected date
  const getOpeningHoursForDate = (): { open: string; close: string } | null => {
    if (!selectedDate || !selectedSalonData?.opening_hours) return null;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[selectedDate.getDay()];
    const hours = (selectedSalonData.opening_hours as any)?.[dayName];
    if (!hours || hours.closed) return null;
    return { open: hours.open || '09:00', close: hours.close || '18:00' };
  };

  const steps = [
    { num: 1, label: t('booking.salon') },
    { num: 2, label: t('booking.service') },
    { num: 3, label: t('booking.stylist') },
    { num: 4, label: t('booking.appointment') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">
              Salon<span className="text-primary">Manager</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s.num 
                    ? "gradient-primary text-primary-foreground shadow-glow" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs mt-2 ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 md:w-16 h-0.5 mx-1 md:mx-2 ${step > s.num ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="animate-fade-in">
          {/* Step 1: Salon Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold mb-2">{t('booking.selectSalon')}</h1>
                <p className="text-muted-foreground">{t('booking.whereToBbook')}</p>
              </div>
              {salonsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : salons.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('booking.noSalons')}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {salons.map((salon: any) => (
                    <button
                      key={salon.id}
                      onClick={() => setSelectedSalon(salon.id)}
                      className={`p-6 rounded-2xl border text-left transition-all ${
                        selectedSalon === salon.id
                          ? "border-primary bg-primary/5 shadow-lg"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground">{salon.name}</h3>
                          {salon.address && (
                            <p className="text-muted-foreground truncate">
                              {salon.address}, {salon.postal_code} {salon.city}
                            </p>
                          )}
                          {salon.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{salon.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Service Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold mb-2">{t('booking.selectService')}</h1>
                <p className="text-muted-foreground">{t('booking.whatToBook')}</p>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('booking.noServices')}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map((service: any) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={`p-6 rounded-2xl border text-left transition-all ${
                        selectedService === service.id
                          ? "border-primary bg-primary/5 shadow-lg"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        {service.category && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                            {service.category}
                          </span>
                        )}
                        <span className="text-lg font-bold text-primary">€{service.price}</span>
                      </div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{service.duration_minutes} Min</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Stylist Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold mb-2">{t('booking.selectStylist')}</h1>
                <p className="text-muted-foreground">{t('booking.orLetUsChoose')}</p>
              </div>
              <button
                onClick={() => setSelectedStylist("any")}
                className={`w-full p-6 rounded-2xl border text-left transition-all mb-4 ${
                  selectedStylist === "any"
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                    ?
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{t('booking.anyAvailable')}</h3>
                    <p className="text-muted-foreground">{t('booking.weChooseBest')}</p>
                  </div>
                </div>
              </button>
              {employees.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                  {employees.map((employee: any) => {
                    const displayName = employee.display_name || t('booking.stylist');
                    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'SM';
                    
                    return (
                      <button
                        key={employee.id}
                        onClick={() => setSelectedStylist(employee.id)}
                        className={`p-6 rounded-2xl border text-center transition-all ${
                          selectedStylist === employee.id
                            ? "border-primary bg-primary/5 shadow-lg"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center text-xl font-semibold text-secondary-foreground">
                          {initials}
                        </div>
                        <h3 className="font-semibold text-foreground">{displayName}</h3>
                        {employee.position && (
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Calendar Selection */}
          {step === 4 && selectedSalon && selectedServiceData && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold mb-2">{t('booking.selectDateTime')}</h1>
                <p className="text-muted-foreground">{t('booking.clickToBook')}</p>
              </div>
              
              <WeekCalendar
                salonId={selectedSalon}
                selectedStylistId={selectedStylist}
                serviceDuration={selectedServiceTotalDuration}
                onSelectSlot={handleSlotSelect}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </Button>
          {step < 4 && (
            <Button
              onClick={nextStep}
              disabled={
                (step === 1 && !selectedSalon) ||
                (step === 2 && !selectedService) ||
                (step === 3 && !selectedStylist)
              }
              className="gap-2"
            >
              {t('common.next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        serviceDuration={selectedServiceTotalDuration}
        service={selectedServiceData ? {
          id: selectedServiceData.id,
          name: selectedServiceData.name,
          price: selectedServiceData.price,
          duration_minutes: selectedServiceData.duration_minutes,
        } : null}
        stylist={selectedStylist && selectedStylist !== 'any' ? {
          id: selectedStylist,
          name: getStylistName(),
        } : null}
        salonId={selectedSalon || ''}
        salonName={selectedSalonData?.name || ''}
        openingHours={getOpeningHoursForDate()}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
};

export default Booking;
