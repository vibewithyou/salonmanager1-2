import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppointmentInfoModal from '@/components/dashboard/AppointmentInfoModal';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  guest_name: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  price?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  image_url?: string | null;
  /**
   * Human-readable appointment number used for searches and invoices.
   */
  appointment_number?: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  customer_profile_id?: string | null;
}

interface PastAppointmentsTabProps {
  appointments: Appointment[];
}

/**
 * Displays a searchable list of past (archived) appointments. This component
 * can be used in admin and employee dashboards to browse historical data.
 * The list can be filtered by guest name, contact info, service name or
 * date (DD.MM.YYYY).
 */
export default function PastAppointmentsTab({ appointments }: PastAppointmentsTabProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  const [search, setSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const filteredAppointments = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return appointments;
    return appointments.filter((apt) => {
      const dateStr = format(new Date(apt.start_time), 'dd.MM.yyyy', { locale });
      return (
        (apt.guest_name || '').toLowerCase().includes(term) ||
        (apt.guest_email || '').toLowerCase().includes(term) ||
        (apt.guest_phone || '').toLowerCase().includes(term) ||
        (apt.service?.name || '').toLowerCase().includes(term) ||
        (apt.appointment_number || '').toLowerCase().includes(term) ||
        dateStr.includes(term)
      );
    });
  }, [appointments, search, locale]);

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
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('pastAppointments.searchPlaceholder')}
          className="pl-4"
        />
      </div>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-display">
              {t('pastAppointments.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('pastAppointments.noResults')}
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(apt.start_time), 'dd.MM.yy', { locale })}
                    </p>
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
        {/* Detail modal for appointment */}
        <AppointmentInfoModal
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      </Card>
    </div>
  );
}