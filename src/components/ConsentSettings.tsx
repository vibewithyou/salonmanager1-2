import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Allows users to review and update their consent preferences from
 * within the profile page.  When loaded, it reads the current
 * consent values from the profile and reflects them in the form.
 * Saving will persist the updated values back to the `profiles`
 * table via `useProfile` and display a success message.
 */
const ConsentSettings = () => {
  const { profile, loading, updateProfile } = useProfile();
  const { t } = useTranslation();
  const [consents, setConsents] = useState({
    cookie_consent: false,
    privacy_consent: false,
    terms_consent: false,
  });

  // Initialise local state when the profile is available.  We
  // explicitly convert nullish values to booleans.
  useEffect(() => {
    if (profile) {
      setConsents({
        cookie_consent: !!profile.cookie_consent,
        privacy_consent: !!profile.privacy_consent,
        terms_consent: !!profile.terms_consent,
      });
    }
  }, [profile]);

  const handleChange = (field: keyof typeof consents) => (value: boolean) => {
    setConsents(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile(consents);
      toast.success(t('consent.saved', { defaultValue: 'Einwilligungen gespeichert.' }));
    } catch (err: any) {
      console.error('Failed to update consents:', err);
      toast.error(t('consent.saveError', { defaultValue: 'Fehler beim Speichern der Einwilligungen.' }));
    }
  };

  if (loading || !profile) {
    // Show nothing if the profile is still loading or the user is not signed in.
    return null;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">
          {t('consent.settingsTitle', { defaultValue: 'Einwilligungen' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cookie consent */}
        <div className="flex items-start gap-3">
          <Checkbox id="cookie_consent" checked={consents.cookie_consent} onCheckedChange={handleChange('cookie_consent')} />
          <div className="space-y-1">
            <Label htmlFor="cookie_consent" className="cursor-pointer">
              {t('consent.cookie', { defaultValue: 'Cookies akzeptieren' })}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('consent.cookieDescription', { defaultValue: 'Wir verwenden Cookies, um dir ein bestmögliches Erlebnis zu bieten.' })}
            </p>
          </div>
        </div>
        {/* Privacy consent */}
        <div className="flex items-start gap-3">
          <Checkbox id="privacy_consent" checked={consents.privacy_consent} onCheckedChange={handleChange('privacy_consent')} />
          <div className="space-y-1">
            <Label htmlFor="privacy_consent" className="cursor-pointer">
              {t('consent.privacy', { defaultValue: 'Datenschutzbestimmungen akzeptieren' })}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('consent.privacyDescription', { defaultValue: 'Bitte bestätige, dass du unsere Datenschutzbestimmungen gelesen hast.' })}
            </p>
          </div>
        </div>
        {/* Terms consent */}
        <div className="flex items-start gap-3">
          <Checkbox id="terms_consent" checked={consents.terms_consent} onCheckedChange={handleChange('terms_consent')} />
          <div className="space-y-1">
            <Label htmlFor="terms_consent" className="cursor-pointer">
              {t('consent.terms', { defaultValue: 'AGB akzeptieren' })}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('consent.termsDescription', { defaultValue: 'Bitte bestätige, dass du unsere Allgemeinen Geschäftsbedingungen akzeptierst.' })}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="mt-4">
          {t('consent.save', { defaultValue: 'Speichern' })}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsentSettings;