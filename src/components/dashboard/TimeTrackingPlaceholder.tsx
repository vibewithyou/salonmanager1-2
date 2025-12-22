import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

/**
 * A simple placeholder component for the admin time‑tracking tab.  This
 * component does not attempt to fetch any data from Supabase. Instead
 * it renders a card with a heading and a short description to inform
 * administrators that the feature is unavailable or will be implemented
 * later.  Using this lightweight component avoids runtime errors that
 * might occur if the environment is not fully configured for data
 * access (for example when Supabase tables are not accessible or
 * row‑level security is in place).
 */
export default function TimeTrackingPlaceholder() {
  const { t } = useTranslation();
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{t('admin.timeTracking', 'Zeiterfassung')}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 text-muted-foreground">
        {t(
          'admin.timeTrackingUnavailable',
          'Die Zeiterfassung ist derzeit nicht verfügbar. Bitte stellen Sie sicher, dass alle Berechtigungen korrekt gesetzt sind oder kontaktieren Sie den Support.'
        )}
      </CardContent>
    </Card>
  );
}