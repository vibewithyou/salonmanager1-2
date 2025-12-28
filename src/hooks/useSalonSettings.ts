import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for fetching and updating salon settings. This hook assumes that
 * the current authenticated user is an admin or owner of a salon. It
 * loads the salon record for the user and provides functions to update
 * various fields such as name, contact information, address, opening
 * hours, special opening hours and the booking enabled flag.
 */
export function useSalonSettings(salonId?: string) {
  const { user } = useAuth();
  const [salon, setSalon] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If a specific salon ID is provided, load that salon. Otherwise,
    // load the salon owned by the current user. Reset state when
    // neither user nor salonId is present.
    if (salonId) {
      fetchSalonById(salonId);
    } else if (user) {
      fetchSalonByOwner();
    } else {
      setSalon(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, salonId]);

  /**
   * Fetch the salon by its ID. This is used when an admin has
   * explicitly selected a salon to manage. Errors are stored in
   * state. If the salon does not exist or the user does not own it,
   * null is returned.
   */
  async function fetchSalonById(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        setError(error.message);
        setSalon(null);
      } else {
        setSalon(data ?? null);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message);
      setSalon(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch the salon owned by the current user. If multiple salons
   * exist, the first one created is returned. Errors are stored in
   * state.
   */
  async function fetchSalonByOwner() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        setError(error.message);
        setSalon(null);
      } else {
        setSalon(data ?? null);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message);
      setSalon(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Update salon fields. Accepts a partial object of fields to update.
   * Returns the updated salon record on success.
   */
  async function updateSalon(updates: any) {
    if (!salon) throw new Error('Salon not loaded');
    const { data, error } = await supabase
      .from('salons')
      .update(updates)
      .eq('id', salon.id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    setSalon(data);
    return data;
  }

  /**
   * Unified fetch function. Calls the appropriate fetch depending on
   * whether a salonId was provided. Exposed to consumers for
   * manual refresh.
   */
  async function fetchSalon() {
    if (salonId) {
      await fetchSalonById(salonId);
    } else {
      await fetchSalonByOwner();
    }
  }

  return {
    salon,
    loading,
    error,
    fetchSalon,
    updateSalon,
  };
}