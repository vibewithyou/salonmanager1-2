import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, Scissors, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface AppointmentInfo {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  guest_name: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  price?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  image_url?: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  } | null;
  /**
   * Reference to an associated customer profile. When present, we can fetch
   * additional information about the customer (e.g. birthdate) to show
   * contextual details in the modal.
   */
  customer_profile_id?: string | null;

  /**
   * Human-readable appointment number unique per salon. Used for searching and invoices.
   */
  appointment_number?: string | null;
}

interface AppointmentInfoModalProps {
  appointment: AppointmentInfo | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Displays detailed information about an appointment. This modal is used
 * throughout the dashboard views when clicking on an appointment entry.
 */
export function AppointmentInfoModal({ appointment, open, onClose }: AppointmentInfoModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  // Local state for fetching the customer's birthday information when
  // customer_profile_id is provided.
  const [customerBirthdate, setCustomerBirthdate] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchBirthdate() {
      if (appointment?.customer_profile_id) {
        const { data, error } = await supabase
          .from('customer_profiles')
          .select('birthdate')
          .eq('id', appointment.customer_profile_id)
          .maybeSingle();
        if (!error && data && data.birthdate) {
          setCustomerBirthdate(new Date(data.birthdate));
        } else {
          setCustomerBirthdate(null);
        }
      } else {
        setCustomerBirthdate(null);
      }
    }
    fetchBirthdate();
  }, [appointment?.customer_profile_id]);

  if (!appointment) return null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-sage text-sage-foreground">{t('appointments.confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-gold text-gold-foreground">{t('appointments.pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose text-rose-foreground">{t('appointments.cancelled')}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{t('appointments.completed')}</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const price = appointment.price ?? appointment.service?.price ?? 0;
  const bufferBefore = appointment.buffer_before ?? 0;
  const bufferAfter = appointment.buffer_after ?? 0;

  // Determine whether the associated customer (if any) has a birthday today or later this month.
  const todayDate = new Date();
  const isBirthdayToday =
    !!customerBirthdate &&
    customerBirthdate.getDate() === todayDate.getDate() &&
    customerBirthdate.getMonth() === todayDate.getMonth();
  const isBirthdayMonth =
    !!customerBirthdate &&
    customerBirthdate.getMonth() === todayDate.getMonth() &&
    customerBirthdate.getDate() !== todayDate.getDate();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('appointments.details')}</span>
            {getStatusBadge(appointment.status)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {format(parseISO(appointment.start_time), 'EEEE, d. MMMM yyyy', { locale })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(appointment.start_time), 'HH:mm')} - {format(parseISO(appointment.end_time), 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Service & Price */}
          {appointment.service && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Scissors className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{appointment.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service.duration_minutes} {t('time.minutes')}
                </p>
              </div>
              <span className="font-semibold text-foreground">
                €{price.toFixed(2)}
              </span>
            </div>
          )}

          {/* Buffer Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.bufferBefore') || t('services.bufferBefore')}</p>
              <p className="font-medium text-foreground">{bufferBefore} {t('time.minutes')}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.bufferAfter') || t('services.bufferAfter')}</p>
              <p className="font-medium text-foreground">{bufferAfter} {t('time.minutes')}</p>
            </div>
          </div>

          {/* Appointment number */}
          {appointment.appointment_number && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.appointmentNumber', 'Terminnummer')}</p>
              <p className="font-medium text-foreground">{appointment.appointment_number}</p>
            </div>
          )}

          {/* Customer Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {appointment.guest_name || t('dashboard.anonymousCustomer')}
              </span>
          {/* Birthday badge if applicable */}
          {isBirthdayToday && (
            <Badge className="ml-2 bg-sage text-sage-foreground">
              {t('customersPage.todayBirthdays')}
            </Badge>
          )}
          {!isBirthdayToday && isBirthdayMonth && (
            <Badge className="ml-2 bg-gold text-gold-foreground">
              {t('customersPage.monthBirthdays')}
            </Badge>
          )}
            </div>
            {appointment.guest_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{appointment.guest_email}</span>
              </div>
            )}
            {appointment.guest_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{appointment.guest_phone}</span>
              </div>
            )}
          </div>

          {/* Image */}
          {appointment.image_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('appointments.image')}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appointment.image_url}
                alt={t('appointments.image')}
                className="w-full rounded-lg max-h-60 object-cover"
              />
            </div>
          )}

          {/* Customer notes provided during booking */}
          {appointment.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('appointments.customerNotes')}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Stylist/Admin notes placeholder */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('appointments.stylistNotes')}</span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {t('appointments.noStylistNotes')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentInfoModal;