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
import { Button } from '@/components/ui/button';

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
  /** Whether the current user can reschedule this appointment. */
  canReschedule?: boolean;
  /** Whether the current user can reassign this appointment to a different stylist (admin only). */
  canReassign?: boolean;
  /** List of employees available for reassignment. Only used when canReassign is true. */
  employees?: { id: string; display_name: string }[];
  /** Callback to update the appointment. Required when rescheduling is enabled. */
  onUpdate?: (id: string, updates: Partial<AppointmentInfo>) => Promise<any>;
}

/**
 * Displays detailed information about an appointment. This modal is used
 * throughout the dashboard views when clicking on an appointment entry.
 */
export function AppointmentInfoModal({ appointment, open, onClose, canReschedule = false, canReassign = false, employees = [], onUpdate }: AppointmentInfoModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  // Local state for fetching the customer's birthday information when
  // customer_profile_id is provided.
  const [customerBirthdate, setCustomerBirthdate] = useState<Date | null>(null);

  // Editing state for rescheduling. When true, show editing form.
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editEmployee, setEditEmployee] = useState('');

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

          {/* Reschedule controls */}
          {canReschedule && (
            <div className="mt-4">
              {!editing ? (
                <Button onClick={() => {
                  if (!appointment) return;
                  // Pre-fill form values with current appointment data
                  setEditDate(appointment.start_time.split('T')[0]);
                  setEditTime(format(parseISO(appointment.start_time), 'HH:mm'));
                  // For reassigning, default to current employee id (if provided)
                  setEditEmployee((appointment as any).employee_id || '');
                  setEditing(true);
                }}>
                  {t('appointments.reschedule', 'Termin verschieben')}
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" htmlFor="editDate">{t('appointments.newDate', 'Neues Datum')}</label>
                    <input
                      id="editDate"
                      type="date"
                      className="border border-input rounded px-2 py-1"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                    <label className="text-sm font-medium" htmlFor="editTime">{t('appointments.newTime', 'Neue Zeit')}</label>
                    <input
                      id="editTime"
                      type="time"
                      className="border border-input rounded px-2 py-1"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                    />
                    {canReassign && employees.length > 0 && (
                      <>
                        <label className="text-sm font-medium" htmlFor="editEmployee">{t('appointments.newStylist', 'Neuer Stylist')}</label>
                        <select
                          id="editEmployee"
                          className="border border-input rounded px-2 py-1"
                          value={editEmployee}
                          onChange={(e) => setEditEmployee(e.target.value)}
                        >
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={async () => {
                        if (!onUpdate || !appointment) return;
                        // Compute new start and end times
                        const newStart = new Date(`${editDate}T${editTime}`);
                        const duration = appointment.service?.duration_minutes ?? 30;
                        const newEnd = new Date(newStart.getTime() + duration * 60000);
                        const updates: any = {
                          start_time: newStart.toISOString(),
                          end_time: newEnd.toISOString(),
                        };
                        if (canReassign) {
                          updates.employee_id = editEmployee || null;
                        }
                        try {
                          await onUpdate(appointment.id, updates);
                          setEditing(false);
                          // Close modal as we have updated data in the parent lists
                          onClose();
                        } catch (err) {
                          console.error('Failed to update appointment', err);
                        }
                      }}
                    >
                      {t('common.save', 'Speichern')}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)}>
                      {t('common.cancel', 'Abbrechen')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentInfoModal;