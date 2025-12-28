import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import AppointmentInfoModal from '@/components/dashboard/AppointmentInfoModal';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  guest_name: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  guest_email?: string | null;
  guest_phone?: string | null;
  price?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  image_url?: string | null;
  /**
   * Human-readable appointment number unique per salon. Optional for legacy records.
   */
  appointment_number?: string | null;
  /**
   * Optional reference to a customer profile. When present, additional
   * information like the customer's birthday can be fetched for display
   * in the appointment detail modal.
   */
  customer_profile_id?: string | null;

  /**
   * ID of the salon to which this appointment belongs. This is needed
   * when applying extra charges or generating invoices and ensures that
   * salon‑specific settings are respected.
   */
  salon_id: string;
}

interface AppointmentsListProps {
  appointments: Appointment[];
  /** Optional title. If omitted, a default label is chosen based on the view. */
  title?: string;
  /** Show the toggle button for switching views. Defaults to true. */
  showToggle?: boolean;
  /** Whether the week view (next 7 days) is active. If false, shows next 5 appointments. */
  showingWeek?: boolean;
  /** Callback fired when the toggle button is clicked. */
  onToggleWeek?: () => void;

  /**
   * Whether the current user can reschedule appointments. If true, an edit
   * option will appear in the appointment detail modal. Defaults to false.
   */
  canReschedule?: boolean;
  /**
   * Whether the current user can reassign appointments to another stylist.
   * This should only be true for admins. Defaults to false.
   */
  canReassign?: boolean;
  /**
   * List of employees available for reassignment. Required only when
   * canReassign is true.
   */
  employees?: { id: string; display_name: string }[];
  /**
   * Handler to update an appointment. It receives the appointment id and
   * a partial updates object. Should return a promise. Required when
   * rescheduling is enabled.
   */
  onUpdate?: (id: string, updates: any) => Promise<any>;

  /**
   * Whether the current user can mark appointments as completed. When
   * true, a completion option will appear in the appointment detail
   * modal. Defaults to false.
   */
  canComplete?: boolean;
  /**
   * Handler fired when an appointment is marked as completed. It
   * receives the appointment id, the final price, a list of applied
   * extra charges (with id and amount) and an internal note. The
   * internal note is stored in the transaction but not included on
   * the invoice. Should return a promise. Required when `canComplete` is true.
   */
  onComplete?: (id: string, finalPrice: number, extras: { id: string; amount: number }[], internalNote: string) => Promise<any>;
}

export function AppointmentsList({ 
  appointments, 
  title, 
  showToggle = true,
  showingWeek = false,
  onToggleWeek,
  canReschedule = false,
  canReassign = false,
  employees = [],
  onUpdate,
  canComplete = false,
  onComplete,
}: AppointmentsListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-sage-light text-sage';
      case 'pending':
        return 'bg-gold-light text-gold';
      case 'cancelled':
        return 'bg-rose-light text-rose';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return t('appointments.confirmed');
      case 'pending':
        return t('appointments.pending');
      case 'cancelled':
        return t('appointments.cancelled');
      case 'completed':
        return t('appointments.completed');
      default:
        return status;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Calendar className="w-5 h-5 text-primary" />
            {title || (showingWeek ? t('dashboard.weekAppointments') : t('dashboard.nextAppointments'))}
          </CardTitle>
          {showToggle && onToggleWeek && (
            <Button variant="ghost" size="sm" onClick={onToggleWeek}>
              {showingWeek ? t('common.showNext') : t('common.viewWeek')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {showingWeek ? t('dashboard.noWeekAppointments') : t('dashboard.noNextAppointments')}
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setSelectedAppointment(apt)}
              >
                <div className="text-center min-w-[80px]">
                  {/* Always display the date of the appointment */}
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(apt.start_time), 'dd.MM.yy', { locale })}
                  </p>
                  {/* Always display the time of the appointment */}
                  <p className="text-lg font-semibold text-foreground">
                    {format(new Date(apt.start_time), 'HH:mm', { locale })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {apt.service?.duration_minutes || 30} {t('time.minutes')}
                  </p>
                </div>
                <div className={`w-1 h-12 rounded-full ${
                  apt.status === 'confirmed' ? 'bg-sage' : 
                  apt.status === 'pending' ? 'bg-gold' : 'bg-muted-foreground'
                }`} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {apt.guest_name || t('dashboard.anonymousCustomer')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {apt.service?.name || t('dashboard.noService')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    €{apt.service?.price?.toFixed(2) || '0.00'}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(apt.status || 'pending')}`}>
                    {getStatusLabel(apt.status || 'pending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {/* Detail modal for appointment */}
      <AppointmentInfoModal
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        canReschedule={canReschedule}
        canReassign={canReassign}
        employees={employees}
        onUpdate={onUpdate}
        canComplete={canComplete}
        onComplete={onComplete}
      />
    </Card>
  );
}
