import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Scissors, Image as ImageIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  serviceDuration: number;
  service: { id: string; name: string; price: number; duration_minutes: number } | null;
  stylist: { id: string; name: string } | null;
  salonId: string;
  salonName: string;
  openingHours: { open: string; close: string } | null;
  onConfirm: (data: {
    date: Date;
    time: string;
    notes: string;
    imageUrl: string | null;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
  }) => void;
}

// Convert time string to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function BookingDetailModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  serviceDuration,
  service,
  stylist,
  salonId,
  salonName,
  openingHours,
  onConfirm,
}: BookingDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [time, setTime] = useState(selectedTime || '');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Fetch existing appointments for the selected date
  const { data: dayAppointments = [] } = useQuery({
    queryKey: ['day-appointments', salonId, selectedDate, stylist?.id],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startOfDay = `${dateStr}T00:00:00`;
      const endOfDay = `${dateStr}T23:59:59`;
      
      let query = supabase
        .from('appointments')
        .select('start_time, end_time, employee_id')
        .eq('salon_id', salonId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .neq('status', 'cancelled');
      
      if (stylist && stylist.id !== 'any') {
        query = query.eq('employee_id', stylist.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!selectedDate && !!salonId,
  });

  // Update time when selectedTime changes
  useEffect(() => {
    if (selectedTime) {
      setTime(selectedTime);
      setTimeError(null);
    }
  }, [selectedTime]);

  // Validate time whenever it changes
  useEffect(() => {
    if (!time || !openingHours || !selectedDate) {
      setTimeError(null);
      return;
    }

    const timeMinutes = timeToMinutes(time);
    const openMinutes = timeToMinutes(openingHours.open);
    const closeMinutes = timeToMinutes(openingHours.close);
    const latestBookable = closeMinutes - serviceDuration;

    // Check if time is within opening hours
    if (timeMinutes < openMinutes) {
      setTimeError(t('booking.timeTooEarly', { time: openingHours.open }));
      return;
    }

    if (timeMinutes > latestBookable) {
      const latestTime = `${Math.floor(latestBookable / 60).toString().padStart(2, '0')}:${(latestBookable % 60).toString().padStart(2, '0')}`;
      setTimeError(t('booking.timeTooLate', { time: latestTime }));
      return;
    }

    // Check if time conflicts with existing appointments
    const endMinutes = timeMinutes + serviceDuration;
    
    for (const apt of dayAppointments) {
      const aptStart = timeToMinutes(format(new Date(apt.start_time), 'HH:mm'));
      const aptEnd = timeToMinutes(format(new Date(apt.end_time), 'HH:mm'));
      
      // Check for overlap
      if (timeMinutes < aptEnd && endMinutes > aptStart) {
        const aptStartTime = format(new Date(apt.start_time), 'HH:mm');
        const aptEndTime = format(new Date(apt.end_time), 'HH:mm');
        setTimeError(t('booking.timeConflict', { start: aptStartTime, end: aptEndTime }));
        return;
      }
    }

    setTimeError(null);
  }, [time, openingHours, serviceDuration, dayAppointments, selectedDate, t]);

  const endTime = selectedDate && time && !timeError
    ? format(addMinutes(new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`), serviceDuration), 'HH:mm')
    : '';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('booking.invalidImageType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('booking.imageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const fileName = `appointments/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success(t('booking.imageUploaded'));
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(t('booking.imageUploadError'));
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || !time || !guestName || !guestEmail || timeError) {
      toast.error(t('booking.fillRequired'));
      return;
    }

    setSubmitting(true);
    
    onConfirm({
      date: selectedDate,
      time,
      notes,
      imageUrl,
      guestName,
      guestEmail,
      guestPhone,
    });
  };

  // Handle time input change with validation
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  if (!selectedDate || !service) return null;

  const isValid = time && !timeError && guestName && guestEmail;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">{t('booking.confirmBooking')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('booking.fillDetailsBelow')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Booking Summary */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('booking.date')}</p>
                <p className="font-semibold text-foreground">
                  {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('booking.time')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="time"
                    value={time}
                    onChange={handleTimeChange}
                    className={`w-32 ${timeError ? 'border-destructive' : ''}`}
                    step="60"
                  />
                  {time && !timeError && (
                    <span className="text-sm text-muted-foreground">
                      - {endTime} ({serviceDuration} Min)
                    </span>
                  )}
                </div>
                {timeError && (
                  <div className="flex items-center gap-1 mt-1 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{timeError}</span>
                  </div>
                )}
                {openingHours && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('booking.openingHours')}: {openingHours.open} - {openingHours.close}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('booking.service')}</p>
                <p className="font-semibold text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {service.duration_minutes} Min • €{service.price.toFixed(2)}
                </p>
              </div>
            </div>
            
            {stylist && stylist.id !== 'any' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('booking.stylist')}</p>
                  <p className="font-semibold text-foreground">{stylist.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t('booking.yourDetails')}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">{t('booking.name')} *</Label>
              <Input
                id="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t('booking.namePlaceholder')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('booking.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder={t('booking.emailPlaceholder')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">{t('booking.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder={t('booking.phonePlaceholder')}
              />
            </div>
          </div>

          {/* Notes and Image */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t('booking.additionalInfo')}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">{t('booking.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('booking.notesPlaceholder')}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('booking.referenceImage')}</Label>
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img
                    src={imagePreview}
                    alt="Reference"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('booking.addImage')}</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !isValid}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('booking.confirmBooking')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
