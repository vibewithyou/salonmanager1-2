import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fetch and update the current user's profile.  This hook leverages
 * React Query to cache the profile data and exposes an `updateProfile`
 * function to modify fields on the `profiles` table.  If no user
 * is signed in, `profile` will be `null` and `updateProfile` will
 * throw when called.  Consents added to the `profiles` table (e.g.
 * `cookie_consent`, `privacy_consent`, `terms_consent`) can be read
 * and updated via this hook.
 */
export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query the profile when a user is available.  We select all
  // columns so that additional fields like consents are included.
  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Define an updater that sends partial updates to the profiles table.  It
  // invalidates the cached profile on success so consumers see the
  // updated data.
  const mutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user) throw new Error('Cannot update profile without a signed‑in user');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries(['profile', user.id]);
      }
    },
  });

  const updateProfile = async (updates: Record<string, any>) => {
    return mutation.mutateAsync(updates);
  };

  return { profile, loading, updateProfile };
}