import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

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
}

interface AppointmentsListProps {
  appointments: Appointment[];
  title?: string;
  showViewAll?: boolean;
  showingAll?: boolean;
  onToggleAll?: () => void;
}

export function AppointmentsList({ 
  appointments, 
  title, 
  showViewAll = true,
  showingAll = false,
  onToggleAll 
}: AppointmentsListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

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
            {title || (showingAll ? t('dashboard.allAppointments') : t('dashboard.todayAppointments'))}
          </CardTitle>
          {showViewAll && onToggleAll && (
            <Button variant="ghost" size="sm" onClick={onToggleAll}>
              {showingAll ? t('common.showToday') : t('common.viewAll')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {showingAll ? t('dashboard.noAppointments') : t('dashboard.noAppointmentsToday')}
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="text-center min-w-[70px]">
                  {showingAll && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(apt.start_time), 'dd.MM.yy', { locale })}
                    </p>
                  )}
                  <p className="text-lg font-semibold text-foreground">
                    {format(new Date(apt.start_time), 'HH:mm', { locale })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {apt.service?.duration_minutes || 30} min
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
    </Card>
  );
}
