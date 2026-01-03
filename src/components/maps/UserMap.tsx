import { PropsWithChildren, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import default marker images to fix missing icon issues in React‑Leaflet when using Vite or other bundlers.
// Leaflet expects these images to be available at runtime; by importing them explicitly and merging into the
// default icon options we ensure markers render correctly. See the official React‑Leaflet documentation
// for details on this workaround【345378731627210†L48-L65】.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import iconUrl from 'leaflet/dist/images/marker-icon.png';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Configure the default Leaflet icon on module load. This ensures all Marker components use the correct
// images. Without this, markers may not display because Vite doesn't automatically copy the image assets.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

export interface UserMapProps {
  /** The map center as [latitude, longitude]. If null, the component renders nothing. */
  center: [number, number] | null;
  /** Whether scroll wheel zoom is enabled. */
  scroll?: boolean;
  /** Zoom level for the map. */
  zoom?: number;
  /** Optional label for the user's location marker. */
  userLabel?: string;
}

/**
 * UserMap displays a Leaflet map centered on the provided coordinates. It renders an OpenStreetMap
 * tile layer and a marker at the user's location with an optional popup label. Additional
 * children can be passed to render extra markers or layers inside the MapContainer. This component
 * encapsulates the boilerplate required to set up Leaflet with React and ensures that marker icons
 * are correctly configured.
 */
const UserMap = ({
  center,
  children,
  scroll = true,
  zoom = 13,
  userLabel,
}: PropsWithChildren<UserMapProps>) => {
  // Early return if the center is not yet available.
  if (!center) return null;
  return (
    <MapContainer
      center={center as any}
      zoom={zoom}
      scrollWheelZoom={scroll}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* User location marker */}
      <Marker position={center as any}>
        {userLabel ? <Popup>{userLabel}</Popup> : null}
      </Marker>
      {children}
    </MapContainer>
  );
};

export default UserMap;