import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSalonsWithinRadiusFiltered } from '@/integrations/supabase/rpc';

// Import Leaflet components and styles.  When these packages are installed,
// the CSS import ensures markers and tiles are styled correctly.
// Use the reusable UserMap component for rendering the Leaflet map. This component
// encapsulates the setup of MapContainer, TileLayer and user marker. See
// src/components/maps/UserMap.tsx for details.
import UserMap from '@/components/maps/UserMap';
import { Marker, Popup } from 'react-leaflet';
// Import UI components for the filter bar
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  const [center, setCenter] = useState<[number, number] | null>(null);

  // Distance filter in kilometers. Changing this value will trigger a re-fetch
  // of salons within the specified radius.
  const [maxDistance, setMaxDistance] = useState<number>(5);

  // Filter state variables
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Time frame filter state.  Possible values: 'any', 'nextHour', 'today', 'thisWeek', 'next2Weeks'
  const [timeFrame, setTimeFrame] = useState<string>('any');
  // Store salon IDs that have a free slot in the selected time frame

  useEffect(() => {
    // Try to get the user's current position. If geolocation is unavailable
    // or denied, we simply stop loading and leave the list empty.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCenter([lat, lon]);
          // The actual fetch of salons happens in a separate effect that listens
          // to changes of `center` and `maxDistance`. Here we simply set the
          // location and allow the other effect to handle data fetching.
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

  // Fetch salons whenever the user location or any filter changes.
  // This effect calls the server‑side RPC that applies all filters at once.
  useEffect(() => {
    if (!center) return;
    const radiusMeters = maxDistance * 1000;
    // Convert filter values to parameters for the RPC.  A value of null
    // indicates that the filter should be ignored on the server side.
    const minRatingParam = minRating > 0 ? minRating : null;
    const [minPriceParam, maxPriceParam] = priceRange;
    // Only pass categories if at least one is selected; otherwise null
    const categoriesParam = selectedCategories.length > 0 ? selectedCategories : null;
    // Compute time window based on timeFrame
    let startIso: string | null = null;
    let endIso: string | null = null;
    if (timeFrame !== 'any') {
      const now = new Date();
      let start = new Date(now);
      let end = new Date(now);
      switch (timeFrame) {
        case 'nextHour':
          start = new Date(now);
          end = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'today':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'thisWeek': {
          const temp = new Date(now);
          const day = temp.getDay();
          const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
          start = new Date(temp);
          start.setDate(diff);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        }
        case 'next2Weeks':
          start = new Date(now);
          end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now);
          end = new Date(now);
          break;
      }
      startIso = start.toISOString();
      endIso = end.toISOString();
    }
    setLoading(true);
    (async () => {
      try {
        const { data, error: rpcError } = await getSalonsWithinRadiusFiltered(center[0], center[1], radiusMeters, {
          minRating: minRatingParam,
          minPrice: minPriceParam,
          maxPrice: maxPriceParam,
          categories: categoriesParam,
          start: startIso,
          end: endIso,
        });
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
    })();
  }, [center, maxDistance, minRating, priceRange, selectedCategories, timeFrame]);

  // Whenever salons data changes, compute available categories and price bounds
  useEffect(() => {
    if (salons && salons.length > 0) {
      // Gather all categories from salons
      const catSet = new Set<string>();
      let minP: number | null = null;
      let maxP: number | null = null;
      salons.forEach((s) => {
        if (s.categories) {
          s.categories.forEach((cat: string) => catSet.add(cat));
        }
        if (s.min_price != null) {
          const val = Number(s.min_price);
          if (minP === null || val < minP) minP = val;
        }
        if (s.max_price != null) {
          const val2 = Number(s.max_price);
          if (maxP === null || val2 > maxP) maxP = val2;
        }
      });
      setAvailableCategories(Array.from(catSet));
      // If both min and max found, update price bounds and price range
      if (minP !== null && maxP !== null) {
        setPriceBounds([minP, maxP]);
        // Initialize priceRange only if it is currently [0,0]
        setPriceRange((prev) => (prev[0] === 0 && prev[1] === 0 ? [minP!, maxP!] : prev));
      }
    }
  }, [salons]);


  // After applying server‑side filters via the RPC, all salons returned already
  // satisfy the selected criteria.  We simply use the `salons` list for
  // rendering markers.
  const filteredSalons = salons;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('booking.mapViewTitle', { defaultValue: 'Salon Map' })}</h1>
      <p className="mb-4 text-muted-foreground">
        {t('booking.mapViewDescription', { defaultValue: 'This page will show salons near you on an interactive map.' })}
      </p>
      {/* Show loading/error states */}
      {loading && <p>{t('common.loading')}</p>}
      {!loading && error && <p className="text-destructive">{error}</p>}

      {/* Filter bar */}
      {!loading && !error && salons && salons.length > 0 && (
        <div className="mb-4 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-5 md:gap-4">
          {/* Rating filter */}
          <div>
            <Label className="block mb-1">{t('booking.filterRating', { defaultValue: 'Minimum rating' })}</Label>
            <Select value={minRating.toString()} onValueChange={(val) => setMinRating(Number(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('booking.filterRating', { defaultValue: 'Minimum rating' })} />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('common.all', { defaultValue: 'All' })}</SelectItem>
                <SelectItem value="1">{'★'}+</SelectItem>
                <SelectItem value="2">{'★'.repeat(2)}+</SelectItem>
                <SelectItem value="3">{'★'.repeat(3)}+</SelectItem>
                <SelectItem value="4">{'★'.repeat(4)}+</SelectItem>
                <SelectItem value="5">{'★'.repeat(5)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Price range filter */}
          <div>
            <Label className="block mb-1">{t('booking.filterPrice', { defaultValue: 'Price range (€)' })}</Label>
            <Slider
              min={priceBounds[0]}
              max={priceBounds[1] > priceBounds[0] ? priceBounds[1] : priceBounds[0] + 1}
              step={1}
              value={priceRange as any}
              onValueChange={(val: number[]) => setPriceRange(val as [number, number])}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>€{priceRange[0]?.toFixed(0)}</span>
              <span>€{priceRange[1]?.toFixed(0)}</span>
            </div>
          </div>
          {/* Categories filter */}
          <div>
            <Label className="block mb-1">{t('booking.filterCategories', { defaultValue: 'Categories' })}</Label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="flex items-center space-x-2 text-sm">
                  <Checkbox
                    checked={selectedCategories.includes(cat)}
                    onCheckedChange={(checked: boolean) => {
                      setSelectedCategories((prev) => {
                        return checked ? [...prev, cat] : prev.filter((c) => c !== cat);
                      });
                    }}
                  />
                  <span>{cat}</span>
                </label>
              ))}
              {availableCategories.length === 0 && (
                <span className="text-sm text-muted-foreground">{t('booking.noCategories', { defaultValue: 'No categories' })}</span>
              )}
            </div>
          </div>
          {/* Distance filter */}
          <div>
            <Label className="block mb-1">{t('booking.filterDistance', { defaultValue: 'Distance (km)' })}</Label>
            <Slider
              min={1}
              max={20}
              step={1}
              value={[maxDistance] as any}
              onValueChange={(val: number[]) => setMaxDistance(val[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{1}</span>
              <span>{20}</span>
              <span className="ml-auto">{maxDistance} km</span>
            </div>
          </div>

          {/* Time frame filter */}
          <div>
            <Label className="block mb-1">{t('booking.filterTime', { defaultValue: 'Next slot' })}</Label>
            <Select value={timeFrame} onValueChange={(val) => setTimeFrame(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('booking.filterTime', { defaultValue: 'Next slot' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('booking.timeAny', { defaultValue: 'Any time' })}</SelectItem>
                <SelectItem value="nextHour">{t('booking.timeNextHour', { defaultValue: 'Next hour' })}</SelectItem>
                <SelectItem value="today">{t('booking.timeToday', { defaultValue: 'Today' })}</SelectItem>
                <SelectItem value="thisWeek">{t('booking.timeThisWeek', { defaultValue: 'This week' })}</SelectItem>
                <SelectItem value="next2Weeks">{t('booking.timeNext2Weeks', { defaultValue: 'Next 2 weeks' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Reset filters button */}
        <div className="flex justify-end mt-2">
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => {
              setMinRating(0);
              setSelectedCategories([]);
              // Reset price range to full bounds if they exist
              if (priceBounds[0] !== priceBounds[1]) {
                setPriceRange([priceBounds[0], priceBounds[1]]);
              }
              // Reset distance to default 5 km
              setMaxDistance(5);
              // Reset time frame to any
              setTimeFrame('any');
            }}
          >
            {t('booking.resetFilters', { defaultValue: 'Reset filters' })}
          </button>
        </div>
      )}
      {/* Render map when we have a user location */}
      {!loading && !error && center && (
        <div className="h-[60vh] w-full rounded-lg overflow-hidden">
          <UserMap center={center} userLabel={t('booking.youAreHere', { defaultValue: 'You are here' })}>
            {/* Salon markers */}
            {filteredSalons
              .filter((s) => s.latitude != null && s.longitude != null)
              .map((salon) => (
                <Marker key={salon.id} position={[salon.latitude, salon.longitude] as any}>
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{salon.name}</p>
                      {salon.address && (
                        <p className="text-xs text-muted-foreground">
                          {salon.address}, {salon.postal_code} {salon.city}
                        </p>
                      )}
                      {/* Rating information */}
                      {salon.rating != null && (
                        <p className="text-xs">⭐ {Number(salon.rating).toFixed(1)} ({salon.reviews_count || 0})</p>
                      )}
                      {/* Categories information */}
                      {salon.categories && salon.categories.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {salon.categories.join(', ')}
                        </p>
                      )}
                      {/* Price range information */}
                      {salon.min_price != null && salon.max_price != null && (
                        <p className="text-xs">€{Number(salon.min_price).toFixed(2)} – €{Number(salon.max_price).toFixed(2)}</p>
                      )}
                      {/* Link to open the classic booking wizard */}
                      <a href={`#/salon/${salon.id}`} className="text-xs text-primary underline">
                        {t('booking.bookHere', { defaultValue: 'Book here' })}
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </UserMap>
        </div>
      )}
      {/* Fallback when no center is available or no salons found */}
      {!loading && !error && !center && <p>{t('booking.noSalonsNearby', { defaultValue: 'No salons found nearby.' })}</p>}
    </div>
  );
};

export default BookingMap;