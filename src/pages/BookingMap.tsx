import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getSalonsWithinRadiusFiltered } from '@/integrations/supabase/rpc';

// Import Leaflet components and styles.  When these packages are installed,
// the CSS import ensures markers and tiles are styled correctly.
// Use the reusable UserMap component for rendering the Leaflet map. This component
// encapsulates the setup of MapContainer, TileLayer and user marker. See
// src/components/maps/UserMap.tsx for details.
import UserMap from '@/components/maps/UserMap';
import { Marker, Popup } from 'react-leaflet';
// Import Leaflet core to build custom cluster icons
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
// Import Drawer components for responsive filter drawer on mobile
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

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
  // All salons within the selected radius, regardless of rating/price/category filters.
  const [allSalons, setAllSalons] = useState<Array<any>>([]);
  // Salons that match the currently selected filters.  This list will be a subset of allSalons.
  const [filteredSalons, setFilteredSalons] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);

  // Track whether the browser denied geolocation or it is unavailable. When true,
  // the component will show a manual address search fallback.
  const [geoDenied, setGeoDenied] = useState<boolean>(false);
  // The address entered by the user for manual location search.  When geolocation
  // fails, the user can type a city, street, postal code etc. to find salons.
  const [addressInput, setAddressInput] = useState<string>('');
  // Track whether a manual geocoding request is in progress and any error from the search.
  const [searchingAddress, setSearchingAddress] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Distance filter in kilometers. Changing this value will trigger a re-fetch
  // of salons within the specified radius.
  // Distance filter in kilometers.  Increase the default to 20km and allow
  // users to select up to 200km so that salons in distant cities can be visible.
  const [maxDistance, setMaxDistance] = useState<number>(20);

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
          // When geolocation is successful, clear any previous geoDenied flag.
          setGeoDenied(false);
          // The actual fetch of salons happens in a separate effect that listens
          // to changes of `center` and `maxDistance`. Here we simply set the
          // location and allow the other effect to handle data fetching.
        },
        (err) => {
          console.warn('Geolocation error', err);
          // Mark that geolocation is not available or denied so that the UI
          // can present a manual address search.
          setGeoDenied(true);
          setLoading(false);
        }
      );
    } else {
      // If navigator or geolocation API is not available, fall back to manual search.
      setGeoDenied(true);
      setLoading(false);
    }
  }, []);

  // Fetch all salons within the radius whenever the user location or radius changes.
  // This list is used to derive available categories, price bounds and to render grey markers for salons
  // that do not match the current filters.
  useEffect(() => {
    if (!center) return;
    const radiusMeters = maxDistance * 1000;
    // Fetch without any filters (all optional parameters are left undefined).
    (async () => {
      try {
        const { data, error: rpcError } = await getSalonsWithinRadiusFiltered(center[0], center[1], radiusMeters, {});
        if (rpcError) {
          console.error(rpcError);
          setError(rpcError.message || 'Failed to fetch salons');
        }
        setAllSalons(data || []);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, [center, maxDistance]);

  // Fetch filtered salons whenever the user location or any filter changes.
  // This effect calls the server‑side RPC with the selected filters applied.
  useEffect(() => {
    if (!center) return;
    const radiusMeters = maxDistance * 1000;
    // Convert filter values to parameters for the RPC.  A value of null
    // indicates that the filter should be ignored on the server side.
    const minRatingParam = minRating > 0 ? minRating : null;
    const [minPriceParam, maxPriceParam] = priceRange;
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
        setFilteredSalons(data || []);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [center, maxDistance, minRating, priceRange, selectedCategories, timeFrame]);

  // Whenever the list of all salons changes, compute available categories and price bounds.
  useEffect(() => {
    if (allSalons && allSalons.length > 0) {
      // Gather all categories from all salons
      const catSet = new Set<string>();
      let minP: number | null = null;
      let maxP: number | null = null;
      allSalons.forEach((s) => {
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
      if (minP !== null && maxP !== null) {
        setPriceBounds([minP, maxP]);
        setPriceRange((prev) => (prev[0] === 0 && prev[1] === 0 ? [minP!, maxP!] : prev));
      }
    }
  }, [allSalons]);


  // Build a set of salon IDs that match the current filters.  Memoize the
  // computation so that marker rendering can efficiently determine active salons.
  const filteredSalonIds = useMemo(() => {
    return new Set(filteredSalons.map((s) => s.id));
  }, [filteredSalons]);

  // Build query params for passing selected filters to the SalonBooking page.  Currently we
  // include only the selected categories (service categories) as a comma‑separated string.
  // This enables the wizard to prefilter the list of services when the user navigates from
  // the map.  If no categories are selected, the query string is empty.
  const categoryQuery = selectedCategories.length > 0
    ? `?categories=${encodeURIComponent(selectedCategories.join(','))}`
    : '';

  /**
   * Group salons into clusters based on approximate geographic proximity. This
   * simple clustering algorithm divides the world into a grid of squares
   * determined by `clusterSize`.  All salons within the same square are
   * grouped into a single cluster.  The cluster center is the average of
   * member coordinates.  The `active` flag indicates whether any salon in
   * the cluster matches the current filters.
   */
  const clusterSize = 0.02; // roughly ~2km at equator; adjust for density as needed
  const clusters = useMemo(() => {
    const map = new Map<string, { members: any[]; latSum: number; lonSum: number; active: boolean }>();
    allSalons.forEach((salon) => {
      if (salon.latitude == null || salon.longitude == null) return;
      const lat = salon.latitude;
      const lon = salon.longitude;
      const latIndex = Math.floor(lat / clusterSize);
      const lonIndex = Math.floor(lon / clusterSize);
      const key = `${latIndex}:${lonIndex}`;
      let cluster = map.get(key);
      const isActive = filteredSalonIds.has(salon.id);
      if (!cluster) {
        cluster = { members: [], latSum: 0, lonSum: 0, active: false };
        map.set(key, cluster);
      }
      cluster.members.push(salon);
      cluster.latSum += lat;
      cluster.lonSum += lon;
      if (isActive) cluster.active = true;
    });
    const result: Array<{ count: number; lat: number; lon: number; members: any[]; active: boolean }> = [];
    map.forEach((cluster) => {
      const count = cluster.members.length;
      const lat = cluster.latSum / count;
      const lon = cluster.lonSum / count;
      result.push({ count, lat, lon, members: cluster.members, active: cluster.active });
    });
    return result;
  }, [allSalons, filteredSalonIds]);

  /**
   * Handle manual address search when geolocation is not available.
   * Uses the OpenStreetMap Nominatim API to convert a free text address
   * into latitude and longitude.  On success, updates the map center and
   * triggers salon fetching.  Displays an error message if no result
   * is found or if a network error occurs.
   */
  const handleAddressSearch = async () => {
    if (!addressInput || addressInput.trim().length === 0) {
      return;
    }
    setSearchingAddress(true);
    setAddressError(null);
    try {
      const query = encodeURIComponent(addressInput.trim());
      // Use Nominatim to geocode the address. A unique User-Agent header
      // is recommended by the Nominatim usage policy; adjust as needed.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
        {
          headers: {
            'Accept': 'application/json',
            // Identify the application for compliance.  You can customize
            // this string or use a dummy email/domain.
            'User-Agent': 'salon-booking-app/1.0 (example@example.com)',
          },
        }
      );
      if (!res.ok) {
        throw new Error('Geocoding request failed');
      }
      const data = await res.json();
      if (!data || data.length === 0) {
        setAddressError(t('booking.addressNotFound', { defaultValue: 'Address not found' }));
        return;
      }
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);
      if (isNaN(lat) || isNaN(lon)) {
        setAddressError(t('booking.addressNotFound', { defaultValue: 'Address not found' }));
        return;
      }
      setCenter([lat, lon]);
      // Reset geolocation denied state so that the map shows normally.
      setGeoDenied(false);
      // Trigger loading state; the fetch effects will update filtered salons.
      setLoading(true);
    } catch (err: any) {
      console.error(err);
      setAddressError(t('booking.addressNotFound', { defaultValue: 'Address not found' }));
    } finally {
      setSearchingAddress(false);
    }
  };

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
      {/* Display the filter interface whenever we have a location (center) and the component is not loading or in error.  Even if no salons are currently found within the search radius, the user can adjust filters and distance to discover salons further away. */}
      {!loading && !error && center && (
        <>
          {/* Mobile filters: Drawer button and content */}
          <div className="mb-4 md:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full">
                  {t('booking.filter', { defaultValue: 'Filters' })}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="p-4">
                <DrawerHeader>
                  <DrawerTitle>{t('booking.filter', { defaultValue: 'Filters' })}</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-4">
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
                      max={200}
                      step={1}
                      value={[maxDistance] as any}
                      onValueChange={(val: number[]) => setMaxDistance(val[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{1}</span>
                      <span>{200}</span>
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
                  {/* Reset filters and show count */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      className="text-sm text-primary underline"
                      onClick={() => {
                        setMinRating(0);
                        setSelectedCategories([]);
                        if (priceBounds[0] !== priceBounds[1]) {
                          setPriceRange([priceBounds[0], priceBounds[1]]);
                        }
                        setMaxDistance(5);
                        setTimeFrame('any');
                      }}
                    >
                      {t('booking.resetFilters', { defaultValue: 'Reset filters' })}
                    </button>
                    <span className="text-sm">
                      {t('booking.salonsFound', {
                        count: filteredSalons.length,
                        defaultValue: `${filteredSalons.length} salons found`,
                      })}
                    </span>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
          {/* Desktop filters */}
          <div className="hidden md:grid mb-4 space-y-4 md:space-y-0 md:grid-cols-2 lg:grid-cols-5 md:gap-4">
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
                max={200}
                step={1}
                value={[maxDistance] as any}
                onValueChange={(val: number[]) => setMaxDistance(val[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{1}</span>
                <span>{200}</span>
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
          {/* Desktop reset and count */}
          <div className="hidden md:flex justify-end mb-2">
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => {
                setMinRating(0);
                setSelectedCategories([]);
                if (priceBounds[0] !== priceBounds[1]) {
                  setPriceRange([priceBounds[0], priceBounds[1]]);
                }
                setMaxDistance(5);
                setTimeFrame('any');
              }}
            >
              {t('booking.resetFilters', { defaultValue: 'Reset filters' })}
            </button>
          </div>
          <div className="hidden md:block mb-4">
            <span className="text-sm">
              {t('booking.salonsFound', {
                count: filteredSalons.length,
                defaultValue: `${filteredSalons.length} salons found`,
              })}
            </span>
          </div>
        </>
      )}
      {/* Render map when we have a user location */}
      {!loading && !error && center && (
        <div className="w-full rounded-lg overflow-hidden h-[70vh] md:h-[60vh]">
          <UserMap center={center} userLabel={t('booking.youAreHere', { defaultValue: 'You are here' })}>
            {/* Render clusters and individual salon markers. For each cluster, if it contains only
                one salon we render a regular marker. Otherwise we create a marker with a
                custom divIcon showing the number of salons in the cluster and a popup
                listing the salons. */}
            {clusters.map((cluster, idx) => {
              if (cluster.count === 1) {
                const salon = cluster.members[0];
                const isActive = filteredSalonIds.has(salon.id);
                return (
                  <Marker
                    key={`salon-${salon.id}`}
                    position={[salon.latitude, salon.longitude] as any}
                    opacity={isActive ? 1 : 0.3}
                  >
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
                          <p className="text-xs">
                            ⭐ {Number(salon.rating).toFixed(1)} ({salon.reviews_count || 0})
                          </p>
                        )}
                        {/* Categories information */}
                        {salon.categories && salon.categories.length > 0 && (
                          <p className="text-xs text-muted-foreground">{salon.categories.join(', ')}</p>
                        )}
                        {/* Price range information */}
                        {salon.min_price != null && salon.max_price != null && (
                          <p className="text-xs">
                            €{Number(salon.min_price).toFixed(2)} – €{Number(salon.max_price).toFixed(2)}
                          </p>
                        )}
                        {/* Button to open the salon booking page. Pass selected categories as query params to prefilter services. */}
                        <Link to={`/salon/${salon.id}${categoryQuery}`}>
                          <Button size="sm">
                            {t('booking.bookHere', { defaultValue: 'Book here' })}
                          </Button>
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              // For clusters with more than one salon, create a custom divIcon.
              const sizePx = 32;
              const bgColor = cluster.active ? '#2563eb' /* primary color (blue-600) */ : '#a1a1aa' /* gray-400 */;
              const html = `<div style="background-color:${bgColor};width:${sizePx}px;height:${sizePx}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:14px;color:white;">${cluster.count}</div>`;
              const clusterIcon = L.divIcon({ html, className: '' });
              return (
                <Marker
                  key={`cluster-${idx}`}
                  position={[cluster.lat, cluster.lon] as any}
                  opacity={cluster.active ? 1 : 0.5}
                  icon={clusterIcon}
                >
                  <Popup>
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">
                        {t('booking.clusterMultiple', {
                          count: cluster.count,
                          defaultValue: `${cluster.count} salons in this area`,
                        })}
                      </p>
                      <ul className="space-y-1">
                        {cluster.members.slice(0, 5).map((salon: any) => (
                          <li key={salon.id}>
                            <Link to={`/salon/${salon.id}${categoryQuery}`} className="text-primary underline text-sm">
                              {salon.name}
                            </Link>
                          </li>
                        ))}
                        {cluster.members.length > 5 && (
                          <li className="text-sm text-muted-foreground">…</li>
                        )}
                      </ul>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </UserMap>
        </div>
      )}

      {/* Message when no salons are found within the current search radius.  Show this
          only when a location is available and the request has completed. */}
      {!loading && !error && center && allSalons.length === 0 && (
        <p className="mt-4 text-muted-foreground">
          {t('booking.noSalonsNearby', { defaultValue: 'No salons found nearby.' })}
        </p>
      )}
      {/* Fallback when no center is available.  If geolocation is denied, prompt
          the user to manually search for an address.  Otherwise, show a simple
          message indicating there are no salons nearby (e.g. if no salons were
          found within the default radius). */}
      {!loading && !error && !center && geoDenied && (
        <div className="space-y-2">
          <p>
            {t('booking.geoError', { defaultValue: 'Unable to access your location.' })}{' '}
            {t('booking.geoPrompt', { defaultValue: 'Please enter your address to find salons near you.' })}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={addressInput}
              onChange={(e) => setAddressInput((e.target as HTMLInputElement).value)}
              placeholder={t('booking.enterAddress', { defaultValue: 'Street, city, etc.' }) as string}
            />
            <Button
              onClick={handleAddressSearch}
              disabled={searchingAddress || !addressInput.trim()}
            >
              {searchingAddress
                ? t('common.loading', { defaultValue: 'Loading...' })
                : t('booking.searchAddress', { defaultValue: 'Search' })}
            </Button>
          </div>
          {addressError && <p className="text-sm text-destructive">{addressError}</p>}
        </div>
      )}
      {!loading && !error && !center && !geoDenied && (
        <p>{t('booking.noSalonsNearby', { defaultValue: 'No salons found nearby.' })}</p>
      )}
    </div>
  );
};

export default BookingMap;