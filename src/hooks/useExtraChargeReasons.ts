import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Hook for managing extra charge reasons for a salon. These reasons are
 * optional add‑ons that can be applied when completing an appointment to
 * adjust the final price. Each reason belongs to a specific salon and has
 * a default amount. The hook fetches the reasons for a given salon and
 * exposes CRUD operations to create, update and delete them.
 *
 * @param salonId The ID of the salon whose reasons should be loaded.
 */
export function useExtraChargeReasons(salonId: string | undefined) {
  // Local state for reasons list
  const [reasons, setReasons] = useState<
    Tables<'extra_charge_reasons'>['Row'][]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reasons when salonId changes
  useEffect(() => {
    if (salonId) {
      fetchReasons();
    } else {
      setReasons([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  async function fetchReasons() {
    if (!salonId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('extra_charge_reasons')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: true });
      if (error) {
        throw error;
      }
      setReasons(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setReasons([]);
    } finally {
      setLoading(false);
    }
  }

  async function createReason(name: string, defaultAmount: number) {
    if (!salonId) throw new Error('Salon ID is required');
    const { data, error } = await supabase
      .from('extra_charge_reasons')
      .insert({
        salon_id: salonId,
        name,
        default_amount: defaultAmount,
      })
      .select()
      .single();
    if (error) throw error;
    setReasons((prev) => [...prev, data as Tables<'extra_charge_reasons'>['Row']]);
    return data;
  }

  async function updateReason(
    id: string,
    updates: Partial<{ name: string; default_amount: number }>,
  ) {
    const { data, error } = await supabase
      .from('extra_charge_reasons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setReasons((prev) =>
      prev.map((r) => (r.id === id ? (data as Tables<'extra_charge_reasons'>['Row']) : r)),
    );
    return data;
  }

  async function deleteReason(id: string) {
    const { error } = await supabase
      .from('extra_charge_reasons')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setReasons((prev) => prev.filter((r) => r.id !== id));
  }

  return {
    reasons,
    loading,
    error,
    fetchReasons,
    createReason,
    updateReason,
    deleteReason,
  };
}
