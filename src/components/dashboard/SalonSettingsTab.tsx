import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSalonSettings } from '@/hooks/useSalonSettings';
import { toast } from 'sonner';

/**
 * A tab for managing salon settings. Allows admins or owners to update
 * basic information about their salon (name, contact details, website,
 * structured address) as well as toggle whether the public booking
 * calendar is enabled. Opening hours and special opening hours are
 * displayed but not editable in this initial version.
 */
export default function SalonSettingsTab() {
  const { t } = useTranslation();
  const { salon, loading, error, updateSalon } = useSalonSettings();

  // Local form state mirrors salon fields. We initialise state once
  // when the salon data becomes available.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(true);

  useEffect(() => {
    if (salon) {
      setName(salon.name || '');
      setEmail(salon.email || '');
      setPhone(salon.phone || '');
      setWebsite(salon.website || '');
      setStreet(salon.street || '');
      setHouseNumber(salon.house_number || '');
      setPostalCode(salon.postal_code || '');
      setCity(salon.city || '');
      // default true when null
      setBookingEnabled(salon.booking_enabled ?? true);
    }
  }, [salon]);

  const handleSubmit = async () => {
    if (!salon) return;
    try {
      await updateSalon({
        name,
        email,
        phone,
        website: website || null,
        street: street || null,
        house_number: houseNumber || null,
        postal_code: postalCode || null,
        city: city || null,
        booking_enabled: bookingEnabled,
      });
      toast.success(t('salonSettings.updateSuccess', 'Salon settings updated successfully'));
    } catch (err: any) {
      console.error('Failed to update salon settings', err);
      toast.error(err.message || t('common.error'));
    }
  };

  if (loading) {
    return <p>{t('common.loading')}</p>;
  }
  if (error) {
    return <p className="text-red-500">{error}</p>;
  }
  if (!salon) {
    return <p>{t('salonSettings.noSalon', 'No salon found')}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">{t('salonSettings.title', 'Salon Settings')}</h2>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('salonSettings.general', 'General')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t('salonSetup.salonName', 'Salon name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="website">{t('salonSettings.website', 'Website')}</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('salonSettings.address', 'Address')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">{t('customersPage.street', 'Street')}</Label>
              <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="houseNumber">{t('customersPage.houseNumber', 'House number')}</Label>
              <Input id="houseNumber" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">{t('customersPage.postalCode', 'Postal code')}</Label>
              <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">{t('customersPage.city', 'City')}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('salonSettings.booking', 'Booking')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="bookingEnabled" className="font-medium">
              {t('salonSettings.bookingEnabled', 'Enable public booking')}
            </Label>
            <Switch
              id="bookingEnabled"
              checked={bookingEnabled}
              onCheckedChange={(checked: boolean) => setBookingEnabled(checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('salonSettings.bookingExplanation', 'If disabled, customers cannot book appointments themselves. Staff can still create appointments internally.')}
          </p>
        </CardContent>
      </Card>
      <Button onClick={handleSubmit}>{t('common.save', 'Save')}</Button>
    </div>
  );
}