import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Play, Square, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, differenceInMinutes } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface TimeTrackingProps {
  todayTimeEntry: {
    id: string;
    check_in: string;
    check_out: string | null;
    break_minutes: number;
    notes: string | null;
  } | null;
  onCheckIn: () => Promise<any>;
  onCheckOut: () => Promise<any>;
  loading?: boolean;
}

export function TimeTracking({ todayTimeEntry, onCheckIn, onCheckOut, loading }: TimeTrackingProps) {
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const locale = i18n.language === 'de' ? de : enUS;

  const handleCheckIn = async () => {
    setIsProcessing(true);
    await onCheckIn();
    setIsProcessing(false);
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    await onCheckOut();
    setIsProcessing(false);
  };

  const isCheckedIn = todayTimeEntry && !todayTimeEntry.check_out;
  const isCheckedOut = todayTimeEntry && todayTimeEntry.check_out;

  const calculateWorkedTime = () => {
    if (!todayTimeEntry) return '0h 0m';
    const checkIn = new Date(todayTimeEntry.check_in);
    const checkOut = todayTimeEntry.check_out ? new Date(todayTimeEntry.check_out) : new Date();
    const totalMinutes = differenceInMinutes(checkOut, checkIn) - (todayTimeEntry.break_minutes || 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Clock className="w-5 h-5 text-primary" />
          {t('dashboard.timeTracking')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">{t('dashboard.status')}</p>
            <p className="text-lg font-semibold text-foreground">
              {isCheckedIn ? (
                <span className="text-sage">{t('dashboard.checkedIn')}</span>
              ) : isCheckedOut ? (
                <span className="text-muted-foreground">{t('dashboard.checkedOut')}</span>
              ) : (
                <span className="text-gold">{t('dashboard.notCheckedIn')}</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('dashboard.workedToday')}</p>
            <p className="text-2xl font-display font-bold text-foreground">{calculateWorkedTime()}</p>
          </div>
        </div>

        {/* Time Details */}
        {todayTimeEntry && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-sage/10">
              <Play className="w-4 h-4 text-sage mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{t('dashboard.checkIn')}</p>
              <p className="font-semibold text-foreground">
                {format(new Date(todayTimeEntry.check_in), 'HH:mm', { locale })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gold/10">
              <Coffee className="w-4 h-4 text-gold mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{t('dashboard.break')}</p>
              <p className="font-semibold text-foreground">{todayTimeEntry.break_minutes || 0}m</p>
            </div>
            <div className="p-3 rounded-lg bg-rose/10">
              <Square className="w-4 h-4 text-rose mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{t('dashboard.checkOut')}</p>
              <p className="font-semibold text-foreground">
                {todayTimeEntry.check_out 
                  ? format(new Date(todayTimeEntry.check_out), 'HH:mm', { locale })
                  : '--:--'
                }
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {!todayTimeEntry ? (
            <Button 
              onClick={handleCheckIn} 
              disabled={isProcessing || loading}
              className="w-full"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              {t('dashboard.startWork')}
            </Button>
          ) : !todayTimeEntry.check_out ? (
            <Button 
              onClick={handleCheckOut} 
              disabled={isProcessing || loading}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Square className="w-4 h-4 mr-2" />
              {t('dashboard.endWork')}
            </Button>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              {t('dashboard.workdayComplete')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
