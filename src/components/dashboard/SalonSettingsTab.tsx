import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSalonSettings } from '@/hooks/useSalonSettings';
import { useExtraChargeReasons } from '@/hooks/useExtraChargeReasons';
import { toast } from 'sonner';

/**
 * A tab for managing salon settings. Allows admins or owners to update
 * basic information about their salon (name, contact details, website,
 * structured address) as well as toggle whether the public booking
 * calendar is enabled. Opening hours and special opening hours are
 * displayed but not editable in this initial version.
 */
interface SalonSettingsTabProps {
  /**
   * Optional salon ID to load settings for. When provided, the
   * hook will load this salon instead of defaulting to the owner's
   * first salon. This allows admins with multiple salons to view
   * and edit the correct record.
   */
  salonId?: string;
}

export default function SalonSettingsTab({ salonId }: SalonSettingsTabProps = {}) {
  const { t } = useTranslation();
  const { salon, loading, error, updateSalon } = useSalonSettings(salonId);

  // Load extra charge reasons for this salon. We pass undefined when salon is not yet loaded to avoid fetching.
  const {
    reasons,
    loading: reasonsLoading,
    error: reasonsError,
    createReason,
    updateReason,
    deleteReason,
  } = useExtraChargeReasons(salon?.id);

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
      // Load structured address fields if present
      const streetVal = salon.street || '';
      const houseVal = salon.house_number || '';
      const postalVal = salon.postal_code || '';
      const cityVal = salon.city || '';
      // If street and house number are missing but address string exists, try to parse it (e.g. "Main St 5, 12345 City")
      if (!streetVal && !houseVal && typeof salon.address === 'string' && salon.address.trim().length > 0) {
        const addressStr = salon.address.trim();
        const [firstPart, secondPart] = addressStr.split(',');
        if (firstPart) {
          const tokens = firstPart.trim().split(' ');
          const lastToken = tokens.pop() || '';
          setHouseNumber(lastToken);
          setStreet(tokens.join(' '));
        } else {
          setStreet('');
          setHouseNumber('');
        }
        if (secondPart) {
          const parts = secondPart.trim().split(' ');
          const postal = parts.shift() || '';
          setPostalCode(postal);
          setCity(parts.join(' '));
        } else {
          setPostalCode('');
          setCity('');
        }
      } else {
        setStreet(streetVal);
        setHouseNumber(houseVal);
        setPostalCode(postalVal);
        setCity(cityVal);
      }
      // default true when null
      setBookingEnabled(salon.booking_enabled ?? true);
    }
  }, [salon]);

  // Local state for managing extra charge reasons editing
  const [newReasonName, setNewReasonName] = useState('');
  const [newReasonAmount, setNewReasonAmount] = useState('');
  const [editReasonValues, setEditReasonValues] = useState<{ [id: string]: { name: string; amount: string } }>({});

  // Initialise editReasonValues whenever reasons change
  useEffect(() => {
    const initial: { [id: string]: { name: string; amount: string } } = {};
    reasons?.forEach((r) => {
      initial[r.id] = { name: r.name || '', amount: r.default_amount?.toString() ?? '' };
    });
    setEditReasonValues(initial);
  }, [reasons]);

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

  // Handlers for extra charge reasons
  const handleAddReason = async () => {
    if (!newReasonName.trim()) return;
    const amount = parseFloat(newReasonAmount);
    const defaultAmount = isNaN(amount) ? 0 : amount;
    try {
      await createReason(newReasonName.trim(), defaultAmount);
      setNewReasonName('');
      setNewReasonAmount('');
    } catch (err: any) {
      console.error('Failed to create extra charge reason', err);
      toast.error(err.message || t('common.error'));
    }
  };

  const handleSaveReason = async (id: string) => {
    const vals = editReasonValues[id];
    if (!vals) return;
    const amount = parseFloat(vals.amount);
    const defaultAmount = isNaN(amount) ? 0 : amount;
    try {
      await updateReason(id, { name: vals.name.trim(), default_amount: defaultAmount });
      toast.success(t('salonSettings.reasonUpdated', 'Reason updated'));
    } catch (err: any) {
      console.error('Failed to update reason', err);
      toast.error(err.message || t('common.error'));
    }
  };

  const handleDeleteReason = async (id: string) => {
    try {
      await deleteReason(id);
      toast.success(t('salonSettings.reasonDeleted', 'Reason deleted'));
    } catch (err: any) {
      console.error('Failed to delete reason', err);
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

      {/* Extra charge reasons management */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t('salonSettings.extraChargeReasonsTitle', 'Extra charge reasons')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('salonSettings.extraChargeReasonsDesc', 'Define optional reasons for additional charges that can be applied when completing an appointment.')}
          </p>
          {/* Add new reason */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Label htmlFor="newReasonName">{t('salonSettings.reasonName', 'Reason')}</Label>
              <Input
                id="newReasonName"
                value={newReasonName}
                onChange={(e) => setNewReasonName(e.target.value)}
                placeholder={t('salonSettings.reasonNamePlaceholder', 'e.g. Extra color')}
              />
            </div>
            <div className="col-span-3">
              <Label htmlFor="newReasonAmount">{t('salonSettings.defaultAmount', 'Amount (€)')}</Label>
              <Input
                id="newReasonAmount"
                type="number"
                step="0.01"
                value={newReasonAmount}
                onChange={(e) => setNewReasonAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2">
              <Button onClick={handleAddReason}>{t('salonSettings.addReason', 'Add')}</Button>
            </div>
          </div>
          {/* Existing reasons */}
          {reasonsLoading ? (
            <p>{t('common.loading', 'Loading...')}</p>
          ) : reasonsError ? (
            <p className="text-red-500">{reasonsError}</p>
          ) : reasons && reasons.length > 0 ? (
            <div className="space-y-3">
              {reasons.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input
                      value={editReasonValues[r.id]?.name ?? ''}
                      onChange={(e) => setEditReasonValues((prev) => ({ ...prev, [r.id]: { ...prev[r.id], name: e.target.value } }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={editReasonValues[r.id]?.amount ?? ''}
                      onChange={(e) => setEditReasonValues((prev) => ({ ...prev, [r.id]: { ...prev[r.id], amount: e.target.value } }))}
                    />
                  </div>
                    <div className="col-span-2 flex gap-2">
                      <Button size="sm" onClick={() => handleSaveReason(r.id)}>{t('common.save', 'Save')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteReason(r.id)}>
                        {t('common.delete', 'Delete')}
                      </Button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('salonSettings.noReasons', 'No extra charge reasons yet')}</p>
          )}
        </CardContent>
      </Card>
      <Button onClick={handleSubmit}>{t('common.save', 'Save')}</Button>
    </div>
  );
}