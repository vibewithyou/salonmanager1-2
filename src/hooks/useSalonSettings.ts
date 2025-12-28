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
export function useSalonSettings() {
  const { user } = useAuth();
  const [salon, setSalon] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSalon();
    } else {
      setSalon(null);
      setLoading(false);
    }
  }, [user]);

  /**
   * Fetch the salon owned by the current user. If multiple salons
   * exist, the first active salon is returned. Errors are stored in
   * state.
   */
  async function fetchSalon() {
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

  return {
    salon,
    loading,
    error,
    fetchSalon,
    updateSalon,
  };
}