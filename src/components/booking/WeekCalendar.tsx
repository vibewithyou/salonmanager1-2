import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isBefore, addWeeks, startOfDay } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface WeekCalendarProps {
  salonId: string;
  selectedStylistId: string | null;
  serviceDuration: number;
  onSelectSlot: (date: Date, time: string) => void;
}

interface TimeBlock {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'absent' | 'closed';
}

interface DaySchedule {
  date: Date;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  blocks: TimeBlock[];
}

// Convert time string to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes since midnight to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export function WeekCalendar({ salonId, selectedStylistId, serviceDuration, onSelectSlot }: WeekCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const today = startOfDay(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(today, { weekStartsOn: 1 })
  );

  // Fetch salon opening hours
  const { data: salon } = useQuery({
    queryKey: ['salon-hours', salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salons')
        .select('opening_hours')
        .eq('id', salonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });

  // Fetch salon closures
  const { data: closures = [] } = useQuery({
    queryKey: ['salon-closures', salonId, currentWeekStart],
    queryFn: async () => {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from('salon_closures')
        .select('start_date, end_date')
        .eq('salon_id', salonId)
        .lte('start_date', weekEnd.toISOString().split('T')[0])
        .gte('end_date', currentWeekStart.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch existing appointments for the week
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments-week', salonId, selectedStylistId, currentWeekStart],
    queryFn: async () => {
      const weekEnd = addDays(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 1);
      let query = supabase
        .from('appointments')
        .select('start_time, end_time, employee_id, status')
        .eq('salon_id', salonId)
        .gte('start_time', currentWeekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .neq('status', 'cancelled');
      
      if (selectedStylistId && selectedStylistId !== 'any') {
        query = query.eq('employee_id', selectedStylistId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      console.log('Fetched appointments:', data);
      return data || [];
    },
    enabled: !!salonId,
  });

  // Fetch leave requests (approved ones)
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests', salonId, selectedStylistId, currentWeekStart],
    queryFn: async () => {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from('leave_requests')
        .select('start_date, end_date, employee_id')
        .eq('status', 'approved')
        .lte('start_date', weekEnd.toISOString().split('T')[0])
        .gte('end_date', currentWeekStart.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Calculate week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  // Check if a date is closed
  const isDateClosed = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return closures.some(c => {
      return dateStr >= c.start_date && dateStr <= c.end_date;
    });
  };

  // Check if stylist is on leave
  const isStylistOnLeave = (date: Date): boolean => {
    if (!selectedStylistId || selectedStylistId === 'any') return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return leaveRequests.some(l => {
      if (selectedStylistId !== 'any' && l.employee_id !== selectedStylistId) return false;
      return dateStr >= l.start_date && dateStr <= l.end_date;
    });
  };

  // Get opening hours for a day
  const getOpeningHours = (dayOfWeek: number): { open: string; close: string } | null => {
    if (!salon?.opening_hours) return null;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const hours = (salon.opening_hours as any)?.[dayName];
    
    if (!hours || hours.closed) return null;
    return { open: hours.open || '09:00', close: hours.close || '18:00' };
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Array<{ startTime: string; endTime: string }> => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      const aptStart = new Date(apt.start_time);
      const aptDateStr = format(aptStart, 'yyyy-MM-dd');
      return aptDateStr === dateStr;
    }).map(apt => ({
      startTime: format(new Date(apt.start_time), 'HH:mm'),
      endTime: format(new Date(apt.end_time), 'HH:mm'),
    }));
  };

  // Generate schedule for a day with time blocks
  const getDaySchedule = (date: Date): DaySchedule => {
    const isPast = isBefore(date, today);
    const isClosed = isDateClosed(date);
    const isOnLeave = isStylistOnLeave(date);
    const openingHours = getOpeningHours(date.getDay());
    
    // If day is past, closed, or no opening hours
    if (isPast || isClosed || !openingHours) {
      return {
        date,
        isOpen: false,
        openTime: null,
        closeTime: null,
        blocks: [{
          startTime: '00:00',
          endTime: '24:00',
          status: 'closed',
        }],
      };
    }
    
    // If stylist is on leave
    if (isOnLeave) {
      return {
        date,
        isOpen: false,
        openTime: openingHours.open,
        closeTime: openingHours.close,
        blocks: [{
          startTime: openingHours.open,
          endTime: openingHours.close,
          status: 'absent',
        }],
      };
    }
    
    const dayAppointments = getAppointmentsForDate(date);
    const blocks: TimeBlock[] = [];
    
    const openMinutes = timeToMinutes(openingHours.open);
    const closeMinutes = timeToMinutes(openingHours.close);
    
    // Calculate latest bookable time based on service duration
    const latestBookableMinutes = closeMinutes - serviceDuration;
    
    // Determine start time (for today, start from current time)
    let dayStartMinutes = openMinutes;
    if (isSameDay(date, today)) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      dayStartMinutes = Math.max(openMinutes, Math.ceil(currentMinutes / 15) * 15);
    }
    
    // Sort appointments by start time
    const sortedApts = [...dayAppointments].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    let currentMinutes = dayStartMinutes;
    
    // Build blocks based on appointments
    for (const apt of sortedApts) {
      const aptStartMinutes = timeToMinutes(apt.startTime);
      const aptEndMinutes = timeToMinutes(apt.endTime);
      
      // Skip appointments outside of working hours
      if (aptEndMinutes <= dayStartMinutes || aptStartMinutes >= closeMinutes) continue;
      
      // If there's available time before this appointment
      if (aptStartMinutes > currentMinutes && currentMinutes < latestBookableMinutes) {
        blocks.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(Math.min(aptStartMinutes, closeMinutes)),
          status: 'available',
        });
      }
      
      // Add booked block (clip to working hours)
      const bookedStart = Math.max(aptStartMinutes, dayStartMinutes);
      const bookedEnd = Math.min(aptEndMinutes, closeMinutes);
      if (bookedEnd > bookedStart) {
        blocks.push({
          startTime: minutesToTime(bookedStart),
          endTime: minutesToTime(bookedEnd),
          status: 'booked',
        });
      }
      
      currentMinutes = Math.max(currentMinutes, aptEndMinutes);
    }
    
    // Add remaining available time after last appointment
    if (currentMinutes < latestBookableMinutes) {
      blocks.push({
        startTime: minutesToTime(currentMinutes),
        endTime: openingHours.close,
        status: 'available',
      });
    } else if (currentMinutes < closeMinutes && blocks.length === 0) {
      // Day has no appointments but also can't fit service duration
      blocks.push({
        startTime: minutesToTime(currentMinutes),
        endTime: openingHours.close,
        status: 'closed',
      });
    }
    
    // If no blocks were created but we have open time, the whole day is available
    if (blocks.length === 0 && dayStartMinutes < latestBookableMinutes) {
      blocks.push({
        startTime: minutesToTime(dayStartMinutes),
        endTime: openingHours.close,
        status: 'available',
      });
    }
    
    return {
      date,
      isOpen: true,
      openTime: openingHours.open,
      closeTime: openingHours.close,
      blocks,
    };
  };

  // Generate week schedule
  const weekSchedule = useMemo(() => {
    return weekDays.map(day => getDaySchedule(day));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, appointments, closures, leaveRequests, salon, selectedStylistId, serviceDuration, today]);

  // Navigation handlers
  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToPrevWeek = () => {
    const prevWeek = addWeeks(currentWeekStart, -1);
    const minDate = startOfWeek(today, { weekStartsOn: 1 });
    if (!isBefore(prevWeek, minDate)) {
      setCurrentWeekStart(prevWeek);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && !isBefore(date, today)) {
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    }
  };

  const canGoBack = !isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }));

  const handleBlockClick = (date: Date, block: TimeBlock) => {
    if (block.status === 'available') {
      onSelectSlot(date, block.startTime);
    }
  };

  // Calculate block height based on duration
  const getBlockStyle = (block: TimeBlock, openTime: string, closeTime: string) => {
    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);
    const totalMinutes = closeMinutes - openMinutes;
    
    if (totalMinutes <= 0) return { top: '0%', height: '100%' };
    
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    
    const startOffset = Math.max(0, startMinutes - openMinutes);
    const duration = Math.min(endMinutes, closeMinutes) - Math.max(startMinutes, openMinutes);
    
    const topPercent = (startOffset / totalMinutes) * 100;
    const heightPercent = Math.max((duration / totalMinutes) * 100, 8);
    
    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  if (appointmentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevWeek}
          disabled={!canGoBack}
          className="shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 flex items-center justify-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {format(currentWeekStart, 'd. MMM', { locale })} - {format(addDays(currentWeekStart, 6), 'd. MMM yyyy', { locale })}
                </span>
                <span className="sm:hidden">
                  {format(currentWeekStart, 'd.M.', { locale })} - {format(addDays(currentWeekStart, 6), 'd.M.yy', { locale })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={currentWeekStart}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(date, today)}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={locale}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextWeek}
          className="shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/30 border border-primary" />
          <span className="text-muted-foreground">{t('booking.available')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted border border-border" />
          <span className="text-muted-foreground">{t('booking.booked')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500" />
          <span className="text-muted-foreground">{t('booking.absent')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/30 border border-border" />
          <span className="text-muted-foreground">{t('booking.closed')}</span>
        </div>
      </div>

      {/* Service Duration Info */}
      <div className="text-center text-xs text-muted-foreground">
        {t('booking.serviceDuration')}: {serviceDuration} {t('booking.minutes')}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekSchedule.map((day, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "text-center py-2 rounded-lg",
                  isSameDay(day.date, today) && "bg-primary/10",
                  !day.isOpen && "opacity-60"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day.date, 'EEE', { locale })}
                </div>
                <div className={cn(
                  "text-sm font-semibold",
                  isSameDay(day.date, today) ? "text-primary" : "text-foreground"
                )}>
                  {format(day.date, 'd', { locale })}
                </div>
                {day.openTime && day.closeTime && (
                  <div className="text-[10px] text-muted-foreground">
                    {day.openTime} - {day.closeTime}
                  </div>
                )}
                {!day.isOpen && !day.openTime && (
                  <div className="text-[10px] text-destructive font-medium">
                    {t('booking.closed')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Time Blocks Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekSchedule.map((day, dayIdx) => (
              <div 
                key={dayIdx} 
                className={cn(
                  "relative rounded-lg border min-h-[300px] overflow-hidden",
                  day.isOpen ? "bg-card border-border" : "bg-muted/20 border-border/50"
                )}
              >
                {day.isOpen && day.openTime && day.closeTime ? (
                  <div className="relative h-full">
                    {day.blocks.map((block, blockIdx) => {
                      const style = getBlockStyle(block, day.openTime!, day.closeTime!);
                      const statusClass = {
                        'available': 'bg-primary/20 hover:bg-primary/30 border-l-2 border-l-primary cursor-pointer',
                        'booked': 'bg-muted/50 border-l-2 border-l-muted-foreground/50',
                        'absent': 'bg-amber-500/20 border-l-2 border-l-amber-500',
                        'closed': 'bg-muted/30',
                      }[block.status];
                      
                      return (
                        <button
                          key={blockIdx}
                          onClick={() => handleBlockClick(day.date, block)}
                          disabled={block.status !== 'available'}
                          className={cn(
                            "absolute left-0 right-0 mx-1 rounded transition-all flex flex-col items-center justify-center text-[10px]",
                            statusClass,
                            block.status !== 'available' && "cursor-default"
                          )}
                          style={style}
                        >
                          {block.status === 'available' && (
                            <>
                              <span className="font-medium text-primary">{block.startTime}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="font-medium text-primary">{block.endTime}</span>
                            </>
                          )}
                          {block.status === 'booked' && (
                            <span className="text-muted-foreground">{t('booking.booked')}</span>
                          )}
                          {block.status === 'absent' && (
                            <span className="text-amber-600">{t('booking.absent')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {isStylistOnLeave(day.date) ? t('booking.absent') : t('booking.closed')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
