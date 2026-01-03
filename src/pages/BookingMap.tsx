import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSalonsWithinRadius } from '@/integrations/supabase/rpc';

/*
 * BookingMap
 *
 * This page displays a map of salons near the user's current location. It
 * serves as an alternative entry point to the booking process and will
 * eventually show markers with details and a link to each salon's booking
 * wizard. Currently it fetches nearby salons using the `salons_within_radius`
 * RPC and lists their names. A map component (e.g. from react‑leaflet) can
 * later replace the placeholder content.
 */
const BookingMap = () => {
  const { t } = useTranslation();
  const [salons, setSalons] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get the user's current position. If geolocation is unavailable
    // or denied, we simply stop loading and leave the list empty.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const { data, error: rpcError } = await getSalonsWithinRadius(lat, lon, 5000);
            if (rpcError) {
              console.error(rpcError);
              setError(rpcError.message || 'Failed to fetch salons');
            }
            setSalons(data || []);
          } catch (e: any) {
            console.error(e);
            setError(e.message);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.warn('Geolocation error', err);
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('booking.mapViewTitle', { defaultValue: 'Salon Map' })}</h1>
      <p className="mb-4 text-muted-foreground">
        {t('booking.mapViewDescription', { defaultValue: 'This page will show salons near you on an interactive map.' })}
      </p>
      {loading && <p>{t('common.loading')}</p>}
      {!loading && error && <p className="text-destructive">{error}</p>}
      {!loading && !error && salons.length === 0 && (
        <p>{t('booking.noSalonsNearby', { defaultValue: 'No salons found nearby.' })}</p>
      )}
      {!loading && !error && salons.length > 0 && (
        <ul className="list-disc pl-5 space-y-2">
          {salons.map((salon) => (
            <li key={salon.id}>{salon.name}</li>
          ))}
        </ul>
      )}
      {/* Placeholder for future map component. When react‑leaflet is added to
          the project, a <MapContainer> can be rendered here, using the
          fetched salons array to plot markers. */}
    </div>
  );
};

export default BookingMap;