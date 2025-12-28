import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Represents a customer profile record stored in the database. A profile
 * belongs to a salon and may optionally reference a registered user via
 * `user_id`. All fields besides `id` and `salon_id` are nullable to
 * accommodate incomplete data when creating manual customer files.
 */
export interface CustomerProfile {
  id: string;
  salon_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  birthdate: string | null;
  phone: string | null;
  email: string | null;
  /** Street name of the customer's address. */
  street: string | null;
  /** House number of the customer's address. */
  house_number: string | null;
  /** Postal code (PLZ) of the customer's address. */
  postal_code: string | null;
  /** City of the customer's address. */
  city: string | null;
  /** Deprecated full address string. May be null when structured fields are used. */
  address: string | null;
  image_urls: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  /**
   * Unique customer identifier for the salon. This is generated based on
   * the first letters of the salon name and owner and a running sequence.
   */
  customer_number?: string | null;
}

/**
 * Hook to fetch and manage customer profiles for a particular salon. The
 * caller must provide a valid `salonId`. The hook exposes functions to
 * create, update and delete customer records as well as to fetch past
 * appointments for a given customer. Appointments are limited to the
 * previous five years and include service details for convenience.
 */
export function useCustomers(salonId: string | undefined | null) {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      if (!salonId) {
        setCustomers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('salon_id', salonId)
        .order('last_name', { ascending: true });
      if (error) {
        setError(error.message);
      } else {
        setCustomers((data as CustomerProfile[]) || []);
        setError(null);
      }
      setLoading(false);
    }
    fetchCustomers();
  }, [salonId]);

  /**
   * Create a new customer profile. Generates a unique customer number per salon
   * based on the first letters of the salon name and salon owner's first name.
   * The sequence resets for each salon. Accepts a partial profile without
   * id/created_at/updated_at/customer_number; those fields are generated here.
   */
  async function createCustomer(profile: Omit<CustomerProfile, 'id' | 'created_at' | 'updated_at' | 'customer_number'>) {
    if (!salonId) {
      throw new Error('Salon ID is required to create a customer');
    }
    // Determine prefix: first letter of salon name + first letter of salon owner's first name
    let prefix = 'cu';
    try {
      const { data: salonData } = await supabase
        .from('salons')
        .select('name, owner_id')
        .eq('id', salonId)
        .single();
      if (salonData) {
        const salonName: string = (salonData as any).name || '';
        let ownerFirst = '';
        if ((salonData as any).owner_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('user_id', (salonData as any).owner_id)
            .maybeSingle();
          ownerFirst = ownerProfile?.first_name || '';
        }
        const salonInitial = salonName.trim()[0] || '';
        const ownerInitial = ownerFirst.trim()[0] || '';
        if (salonInitial) {
          prefix = salonInitial.toLowerCase() + (ownerInitial ? ownerInitial.toLowerCase() : '');
        }
      }
    } catch (e) {
      console.error('Error computing customer prefix:', e);
    }
    // Determine date part (YYYYMMDD) based on current date
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    // Determine next sequence number for this salon and date
    let nextSeq = 1;
    try {
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      const { count } = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salonId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
      nextSeq = ((count ?? 0) + 1);
    } catch (e) {
      console.error('Error computing customer daily sequence:', e);
    }
    const customerNumber = `${prefix}${dateStr}${String(nextSeq).padStart(5, '0')}`;

    // Insert the record with generated customer number and salon_id
    const { data, error } = await supabase
      .from('customer_profiles')
      .insert({
        ...profile,
        salon_id: salonId,
        customer_number: customerNumber,
      })
      .select()
      .single();
    if (error) {
      throw error;
    }
    setCustomers((prev) => [...prev, data as CustomerProfile]);
    return data as CustomerProfile;
  }

  /**
   * Update an existing customer profile. Only the provided fields will be
   * updated. Returns the updated record.
   */
  async function updateCustomer(id: string, updates: Partial<CustomerProfile>) {
    const { data, error } = await supabase
      .from('customer_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    setCustomers((prev) => prev.map((c) => (c.id === id ? (data as CustomerProfile) : c)));
    return data as CustomerProfile;
  }

  /**
   * Delete a customer profile by id. Removes the entry from the local state
   * upon successful deletion.
   */
  async function deleteCustomer(id: string) {
    const { error } = await supabase
      .from('customer_profiles')
      .delete()
      .eq('id', id);
    if (error) {
      throw error;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  /**
   * Fetch past appointments for a given customer profile. Appointments are
   * limited to the previous five years and sorted by start_time descending.
   * Service details are included via foreign table join.
   */
  async function getCustomerAppointments(customerId: string) {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const { data, error } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, notes, guest_name, guest_email, guest_phone, price, buffer_before, buffer_after, image_url, customer_profile_id, appointment_number, service:services(name, duration_minutes, price)')
      .eq('customer_profile_id', customerId)
      .gte('start_time', fiveYearsAgo.toISOString())
      .order('start_time', { ascending: false });
    if (error) {
      throw error;
    }
    return data || [];
  }

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerAppointments,
  };
}