import { QueryClient } from '@tanstack/react-query';

// Create a single shared instance of QueryClient.  React Query caches
// queries globally per client, so exporting this instance allows other
// modules (e.g. AuthContext) to clear the cache when a user logs out
// or switches salons.  Do not instantiate additional QueryClient
// instances outside of this file unless you intend to maintain
// independent caches.
export const queryClient = new QueryClient();