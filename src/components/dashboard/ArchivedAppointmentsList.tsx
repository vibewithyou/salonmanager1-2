import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
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
}

interface ArchivedAppointmentsListProps {
  /** The list of archived appointments to display */
  appointments: Appointment[];
  /** Optional title override. If not provided, a default translation key is used. */
  title?: string;
}

/**
 * Displays a list of past appointments. This component is used in both the admin
 * and employee dashboards to show all appointments that occurred in the past
 * (up to four years ago). Unlike the main AppointmentsList, this component
 * does not offer a toggle because archived data is always historical.
 */
export function ArchivedAppointmentsList({ appointments, title }: ArchivedAppointmentsListProps) {
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
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-display">
            {title || t('dashboard.archivedAppointments')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('dashboard.noArchivedAppointments')}
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
                <div
                  className={`w-1 h-12 rounded-full ${
                    apt.status === 'confirmed'
                      ? 'bg-sage'
                      : apt.status === 'pending'
                      ? 'bg-gold'
                      : 'bg-muted-foreground'
                  }`}
                />
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
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                      apt.status || 'pending'
                    )}`}
                  >
                    {getStatusLabel(apt.status || 'pending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {/* Appointment details modal */}
      <AppointmentInfoModal
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />
    </Card>
  );
}

export default ArchivedAppointmentsList;