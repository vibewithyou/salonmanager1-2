import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Grid3X3,
  List
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  getHours,
  getMinutes
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  guest_name: string | null;
  service?: {
    name: string;
    duration_minutes: number;
  } | null;
  employee?: {
    id: string;
    position: string | null;
  } | null;
}

interface CalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
}

type ViewMode = 'week' | 'month';

export function CalendarView({ appointments, onAppointmentClick, onDateClick }: CalendarViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthStart = startOfWeek(start, { weekStartsOn: 1 });
      const monthEnd = endOfWeek(end, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [currentDate, viewMode]);

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.start_time);
      return isSameDay(aptDate, day);
    });
  };

  const getAppointmentPosition = (appointment: Appointment) => {
    const start = parseISO(appointment.start_time);
    const end = parseISO(appointment.end_time);
    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60;
    const top = ((startHour - 8) / 12) * 100;
    const height = ((endHour - startHour) / 12) * 100;
    return { top: `${top}%`, height: `${height}%` };
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed': return 'bg-sage/80 border-sage';
      case 'pending': return 'bg-gold/80 border-gold';
      case 'cancelled': return 'bg-rose/80 border-rose';
      case 'completed': return 'bg-muted border-muted-foreground';
      default: return 'bg-primary/80 border-primary';
    }
  };

  return (
    <Card className="border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {viewMode === 'week' 
              ? `${format(days[0], 'd. MMM', { locale })} - ${format(days[6], 'd. MMM yyyy', { locale })}`
              : format(currentDate, 'MMMM yyyy', { locale })
            }
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('common.today')}
            </Button>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('week')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('month')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {viewMode === 'week' ? (
          <div className="flex flex-col h-[600px]">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 text-xs text-muted-foreground text-center border-r border-border">
                {t('time.hours')}
              </div>
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-2 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/50 ${
                    isToday(day) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => onDateClick?.(day)}
                >
                  <p className="text-xs text-muted-foreground">
                    {format(day, 'EEE', { locale })}
                  </p>
                  <p className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-8 relative" style={{ minHeight: '720px' }}>
                {/* Time Column */}
                <div className="border-r border-border">
                  {hours.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-border p-1 text-xs text-muted-foreground text-right pr-2">
                      {`${hour}:00`}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {days.map((day, dayIdx) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  return (
                    <div
                      key={dayIdx}
                      className="relative border-r border-border last:border-r-0"
                      onClick={() => onDateClick?.(day)}
                    >
                      {hours.map(hour => (
                        <div key={hour} className="h-[60px] border-b border-border hover:bg-muted/30" />
                      ))}
                      {dayAppointments.map(apt => {
                        const pos = getAppointmentPosition(apt);
                        return (
                          <div
                            key={apt.id}
                            className={`absolute left-1 right-1 rounded-md p-1 cursor-pointer border-l-4 text-xs overflow-hidden ${getStatusColor(apt.status)}`}
                            style={{ top: pos.top, height: pos.height, minHeight: '20px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick?.(apt);
                            }}
                          >
                            <p className="font-medium text-foreground truncate">
                              {format(parseISO(apt.start_time), 'HH:mm')}
                            </p>
                            <p className="truncate text-foreground/80">
                              {apt.guest_name || apt.service?.name || '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Month View */
          <div className="grid grid-cols-7 gap-px bg-border">
            {/* Day Headers */}
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, idx) => (
              <div key={idx} className="bg-card p-2 text-center text-sm font-medium text-muted-foreground">
                {i18n.language === 'de' ? day : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}
              </div>
            ))}
            
            {/* Days */}
            {days.map((day, idx) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={idx}
                  className={`bg-card min-h-[100px] p-1 cursor-pointer hover:bg-muted/50 ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  } ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''}`}
                  onClick={() => onDateClick?.(day)}
                >
                  <p className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(apt => (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(apt.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(apt);
                        }}
                      >
                        {format(parseISO(apt.start_time), 'HH:mm')} {apt.guest_name || apt.service?.name}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{dayAppointments.length - 3} {t('common.more')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
