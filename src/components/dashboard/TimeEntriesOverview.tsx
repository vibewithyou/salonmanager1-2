import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { format, differenceInMinutes } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface TimeEntriesOverviewProps {
  /**
   * The current salon ID. Used to filter the employees and ensure we only
   * pull time entries belonging to this salon. When undefined, the
   * component will render nothing.
   */
  salonId?: string;
  /**
   * Mapping of employee IDs to display names. This is passed from
   * AdminDashboard so we don't need to query profiles again. If an ID
   * is not present, the ID itself will be shown.
   */
  employeeNameMap: Record<string, string>;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  break_minutes: number | null;
  notes: string | null;
}

/**
 * Admin overview component that lists time entries for all employees of
 * a salon. It fetches time entries from the Supabase `time_entries`
 * table and displays them in a simple table, showing check-in,
 * check-out, break and total duration. The list is sorted by
 * descending check-in time so the most recent entries appear first.
 */
export function TimeEntriesOverview({ salonId, employeeNameMap }: TimeEntriesOverviewProps) {
  const { t, i18n } = useTranslation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const locale = i18n.language === 'de' ? de : enUS;

  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (!salonId) return;
      setLoading(true);
      try {
        // Fetch employees for this salon to get their IDs.
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id')
          .eq('salon_id', salonId);

        const employeeIds = employeesData?.map(e => e.id) || [];
        if (employeeIds.length === 0) {
          setTimeEntries([]);
          return;
        }
        // Fetch time entries for these employees
        const { data: entries } = await supabase
          .from('time_entries')
          .select('*')
          .in('employee_id', employeeIds)
          .order('check_in', { ascending: false });
        setTimeEntries(entries || []);
      } catch (error) {
        console.error('Error fetching time entries:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeEntries();
  }, [salonId]);

  const renderDuration = (entry: TimeEntry) => {
    const checkIn = new Date(entry.check_in);
    const checkOut = entry.check_out ? new Date(entry.check_out) : new Date();
    const breakMinutes = entry.break_minutes || 0;
    const totalMinutes = differenceInMinutes(checkOut, checkIn) - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (!salonId) return null;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{t('admin.timeEntriesOverview', 'Zeiterfassung Übersicht')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-4">{t('common.loading', 'Lädt...')}</div>
        ) : timeEntries.length === 0 ? (
          <div className="p-4 text-muted-foreground">
            {t('admin.noTimeEntries', 'Keine Zeiterfassungen vorhanden')}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left">{t('common.employee', 'Mitarbeiter')}</th>
                <th className="px-3 py-2 text-left">{t('dashboard.checkIn', 'Check-in')}</th>
                <th className="px-3 py-2 text-left">{t('dashboard.checkOut', 'Check-out')}</th>
                <th className="px-3 py-2 text-left">{t('dashboard.break', 'Pause')}</th>
                <th className="px-3 py-2 text-left">{t('dashboard.total', 'Gesamt')}</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map(entry => (
                <tr key={entry.id} className="border-b border-border">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {employeeNameMap[entry.employee_id] || entry.employee_id}
                  </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {format(new Date(entry.check_in), 'dd.MM.yyyy HH:mm', { locale })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.check_out ? format(new Date(entry.check_out), 'dd.MM.yyyy HH:mm', { locale }) : '--'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {(entry.break_minutes || 0) + t('dashboard.minutesAbbrev', 'm')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderDuration(entry)}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}