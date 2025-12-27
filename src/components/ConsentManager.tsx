import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';

/**
 * A component that enforces user consent for cookies, privacy policy and
 * terms of service.  It overlays the application whenever a logged‑in
 * user has not yet accepted all required consents.  The user can
 * either accept everything directly from the banner or navigate to
 * their profile page to review and adjust their settings.  Until the
 * consents are accepted, the overlay prevents interaction with the
 * rest of the app.
 */
const ConsentManager = () => {
  const { profile, loading, updateProfile } = useProfile();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && profile) {
      // If any of the consents are falsy (null or false), prompt the user.
      const needsConsent = !profile.cookie_consent || !profile.privacy_consent || !profile.terms_consent;
      setOpen(needsConsent);
    }
  }, [profile, loading]);

  if (loading || !open) return null;

  const acceptAll = async () => {
    try {
      await updateProfile({
        cookie_consent: true,
        privacy_consent: true,
        terms_consent: true,
      });
      setOpen(false);
    } catch (err) {
      console.error('Error updating consents:', err);
    }
  };

  // Render an overlay with a message and actions.  Use Tailwind classes for
  // styling consistent with the rest of the app.
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur">
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-display font-bold mb-2 text-foreground">
          {t('consent.title', { defaultValue: 'Einwilligungen erforderlich' })}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('consent.description', { defaultValue: 'Bitte akzeptiere unsere Cookies, Datenschutzbestimmungen und Allgemeinen Geschäftsbedingungen, um die Anwendung zu nutzen.' })}
        </p>
        <div className="flex flex-wrap justify-end items-center gap-3">
          {/* Link to profile for granular control */}
          <Link to="/profile" className="text-sm underline text-primary">
            {t('consent.goToProfile', { defaultValue: 'Profil bearbeiten' })}
          </Link>
          <Button onClick={acceptAll} className="whitespace-nowrap">
            {t('consent.acceptAll', { defaultValue: 'Alles akzeptieren' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;