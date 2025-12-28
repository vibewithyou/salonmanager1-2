import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Employee = Tables<'employees'>;
type Service = Tables<'services'>;
type Salon = Tables<'salons'>;
type LeaveRequest = Tables<'leave_requests'>;
type Appointment = Tables<'appointments'>;

interface EmployeeWithProfile extends Employee {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useAdminData() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  // Upcoming appointments for the next few slots and appointments within the next seven days.
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  // Archived appointments from the past four years
  const [archivedAppointments, setArchivedAppointments] = useState<Appointment[]>([]);
  // Whether we are currently showing the week view instead of the next 5 upcoming appointments
  const [showWeek, setShowWeek] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAndFetchData();
    }
  }, [user]);

  const checkAdminAndFetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const hasAdminRole = !!roleData;
      setIsAdmin(hasAdminRole);

      if (hasAdminRole) {
        // Get salon owned by this admin. Do not fall back to an arbitrary active salon
        const { data: salonData, error: salonError } = await supabase
          .from('salons')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (salonError) {
          console.error('Error fetching salon for admin:', salonError);
        }

        if (salonData) {
          setSalon(salonData as Salon);

          // Fetch employees
          const { data: empData } = await supabase
            .from('employees')
            .select('*')
            .eq('salon_id', salonData.id)
            .order('created_at', { ascending: false });

          // Fetch profiles for employees
          if (empData && empData.length > 0) {
            const userIds = empData.filter(e => e.user_id).map(e => e.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name, email')
              .in('user_id', userIds);

            const employeesWithProfiles = empData.map(emp => ({
              ...emp,
              profile: profiles?.find(p => p.user_id === emp.user_id),
            }));
            setEmployees(employeesWithProfiles);
          } else {
            setEmployees([]);
          }

          // Fetch services
          const { data: servData } = await supabase
            .from('services')
            .select('*')
            .eq('salon_id', salonData.id)
            .order('name', { ascending: true });

          setServices(servData || []);

          // Fetch leave requests
          const { data: leaveData } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

          setLeaveRequests(leaveData || []);

          // Compute date ranges for upcoming, weekly and archived views
          const now = new Date();
          // Upcoming appointments: next 5 future appointments (including today)
          const { data: upcomingData } = await supabase
            .from('appointments')
            .select('*, service:services(name, duration_minutes, price)')
            .eq('salon_id', salonData.id)
            .gte('start_time', now.toISOString())
            .order('start_time', { ascending: true })
            .limit(5);
          setUpcomingAppointments(upcomingData || []);

          // Week appointments: appointments from start of today until end of 7 days later
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfDay);
          endOfWeek.setDate(startOfDay.getDate() + 7);
          endOfWeek.setHours(23, 59, 59, 999);
          const { data: weekData } = await supabase
            .from('appointments')
            .select('*, service:services(name, duration_minutes, price)')
            .eq('salon_id', salonData.id)
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfWeek.toISOString())
            .order('start_time', { ascending: true });
          setWeekAppointments(weekData || []);

          // Archived appointments: all past appointments up to four years ago
          const fourYearsAgo = new Date();
          fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
          const { data: archivedData } = await supabase
            .from('appointments')
            .select('*, service:services(name, duration_minutes, price)')
            .eq('salon_id', salonData.id)
            .lt('start_time', startOfDay.toISOString())
            .gte('start_time', fourYearsAgo.toISOString())
            .order('start_time', { descending: true });
          setArchivedAppointments(archivedData || []);
        } else {
          // No salon found for this admin. Reset state
          setSalon(null);
          setEmployees([]);
          setServices([]);
          setLeaveRequests([]);
          setUpcomingAppointments([]);
          setWeekAppointments([]);
          setArchivedAppointments([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Note: the old `showAllAppointments` toggle has been removed in favour of a
  // `showWeek` toggle that switches between the next 5 upcoming appointments
  // and all appointments for the next seven days. See the returned
  // `toggleShowWeek` function below for the new behaviour.

// Employee CRUD
  const createEmployee = async (
    data: TablesInsert<'employees'>, 
    inviteData?: { email: string; first_name: string; last_name: string }
  ) => {
    // Use provided display_name or fallback to 'Stylist'
    const employeeData = {
      ...data,
      display_name: data.display_name || 'Stylist',
    };
    
    const result = await supabase.from('employees').insert(employeeData).select().single();
    
    if (!result.error && inviteData?.email) {
      // Create an invitation record for the employee
      await supabase.from('employee_invitations').insert({
        salon_id: data.salon_id,
        employee_id: result.data.id,
        email: inviteData.email,
        first_name: inviteData.first_name,
        last_name: inviteData.last_name,
      });

      try {
        // Retrieve the current session to obtain a JWT for the Authorization header.
        // Supabase automatically attaches the JWT when a session is available, but
        // explicitly fetching the session ensures that the token is present and
        // up-to-date. If no session is found, the headers object will be empty,
        // which will cause the function to fail when verify_jwt = true.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        // Trigger the employee-invite edge function to generate an invite link
        // and dispatch the email. If this fails it is logged but does not
        // prevent the employee record from being created.
        await supabase.functions.invoke('employee-invite', {
          body: {
            employeeId: result.data.id,
            salonId: data.salon_id,
            email: inviteData.email,
            first_name: inviteData.first_name,
            last_name: inviteData.last_name,
          },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
      } catch (e) {
        console.error('Failed to send invitation email:', e);
      }

      // Add profile info to the employee for display with pending status
      const employeeWithPending = {
        ...result.data,
        profile: {
          first_name: inviteData.first_name,
          last_name: inviteData.last_name,
          email: inviteData.email,
        },
      };
      setEmployees([employeeWithPending, ...employees]);
    } else if (!result.error) {
      setEmployees([result.data, ...employees]);
    }
    return result;
  };

  const updateEmployee = async (id: string, data: TablesUpdate<'employees'>) => {
    const result = await supabase.from('employees').update(data).eq('id', id).select().single();
    if (!result.error) {
      setEmployees(employees.map(e => e.id === id ? { ...e, ...result.data } : e));
    }
    return result;
  };

  const deleteEmployee = async (id: string) => {
    const result = await supabase.from('employees').delete().eq('id', id);
    if (!result.error) {
      setEmployees(employees.filter(e => e.id !== id));
    }
    return result;
  };

  // Service CRUD
  const createService = async (data: TablesInsert<'services'>) => {
    const result = await supabase.from('services').insert(data).select().single();
    if (!result.error) {
      setServices([...services, result.data]);
    }
    return result;
  };

  const updateService = async (id: string, data: TablesUpdate<'services'>) => {
    const result = await supabase.from('services').update(data).eq('id', id).select().single();
    if (!result.error) {
      setServices(services.map(s => s.id === id ? result.data : s));
    }
    return result;
  };

  const deleteService = async (id: string) => {
    const result = await supabase.from('services').delete().eq('id', id);
    if (!result.error) {
      setServices(services.filter(s => s.id !== id));
    }
    return result;
  };

  // Leave request management
  const updateLeaveRequest = async (id: string, status: 'approved' | 'rejected') => {
    const result = await supabase
      .from('leave_requests')
      .update({ status, approved_by: user?.id })
      .eq('id', id)
      .select()
      .single();

    if (!result.error) {
      setLeaveRequests(leaveRequests.map(l => l.id === id ? result.data : l));
    }
    return result;
  };

  /**
   * Update an appointment. Admins can change any fields including the
   * assigned employee. After updating in Supabase, this helper updates
   * local appointment lists (upcoming, week and archived) to reflect
   * the changes. Returns the updated appointment.
   */
  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    if (data) {
      setUpcomingAppointments((prev) => prev.map((a) => (a.id === id ? (data as Appointment) : a)));
      setWeekAppointments((prev) => prev.map((a) => (a.id === id ? (data as Appointment) : a)));
      setArchivedAppointments((prev) => prev.map((a) => (a.id === id ? (data as Appointment) : a)));
    }
    return data as Appointment;
  };

  /**
   * Mark an appointment as completed. This will update the appointment's
   * status to 'completed', adjust its price, create a transaction with
   * line items reflecting the base service and any selected extra
   * charges, and invoke the invoice generation edge function. The
   * generated invoice will be stored in the `invoices` table and
   * associated with the transaction. The updated appointment is
   * returned. Throws on error.
   *
   * @param id ID of the appointment to complete
   * @param finalPrice Final price (excluding tax) after extras and manual adjustments
   * @param extras List of extra charge selections with id and amount
   */
  const completeAppointment = async (
    id: string,
    finalPrice: number,
    extras: { id: string; amount: number }[],
    internalNote: string = ''
  ) => {
    // Fetch appointment record to get salon, employee and customer info
    const { data: appointmentData, error: aptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    if (aptError || !appointmentData) {
      throw aptError || new Error('Appointment not found');
    }
    const appointment = appointmentData as Appointment;
    // Compute tax and totals. Use default 19% VAT.
    const taxRate = 19;
    const subtotal = finalPrice;
    const taxAmount = +(subtotal * taxRate / 100).toFixed(2);
    const totalAmount = +(subtotal + taxAmount).toFixed(2);
    // Create transaction. The notes field stores the internal note (if provided)
    // along with any original appointment notes. This note is not included on the invoice.
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        salon_id: appointment.salon_id,
        appointment_id: appointment.id,
        customer_id: appointment.customer_id,
        employee_id: appointment.employee_id,
        subtotal,
        tax_amount: taxAmount,
        tax_rate: taxRate,
        discount_amount: 0,
        tip_amount: 0,
        total_amount: totalAmount,
        payment_method: 'cash',
        payment_status: 'completed',
        guest_name: appointment.guest_name,
        guest_email: appointment.guest_email,
        guest_phone: appointment.guest_phone,
        notes: [appointment.notes || null, internalNote || null].filter(Boolean).join('\n\n') || null,
      })
      .select()
      .single();
    if (transactionError || !transactionData) {
      throw transactionError || new Error('Failed to create transaction');
    }
    const transaction = transactionData;
    // Prepare transaction items list
    const items: any[] = [];
    // Fetch service for name and price
    let serviceData: any = null;
    if (appointment.service_id) {
      const { data: svc, error: svcError } = await supabase
        .from('services')
        .select('*')
        .eq('id', appointment.service_id)
        .single();
      if (svcError) {
        console.error('Failed to fetch service for transaction item', svcError);
      } else {
        serviceData = svc;
      }
    }
    if (serviceData) {
      items.push({
        transaction_id: transaction.id,
        item_type: 'service',
        service_id: appointment.service_id,
        inventory_id: null,
        name: serviceData.name,
        description: serviceData.description,
        quantity: 1,
        unit_price: serviceData.price,
        total_price: serviceData.price,
      });
    }
    // Fetch extra charge reason details if extras provided
    let reasons: any[] | null = null;
    if (extras && extras.length > 0) {
      const ids = extras.map((e) => e.id);
      const { data: reasonData, error: reasonError } = await supabase
        .from('extra_charge_reasons')
        .select('*')
        .in('id', ids);
      if (reasonError) {
        console.error('Failed to fetch extra charge reasons', reasonError);
      } else {
        reasons = reasonData || [];
      }
      extras.forEach((ex) => {
        const reason = reasons?.find((r) => r.id === ex.id);
        items.push({
          transaction_id: transaction.id,
          item_type: 'product',
          service_id: null,
          inventory_id: null,
          name: reason?.name || 'Extra',
          description: null,
          quantity: 1,
          unit_price: ex.amount,
          total_price: ex.amount,
        });
      });
    }
    // If there is a manual adjustment beyond the original price and extras,
    // add it as a separate item. We compute this based on the difference
    // between finalPrice and the sum of base service price and selected extras.
    let basePrice = appointment.price || serviceData?.price || 0;
    const extrasTotal = extras.reduce((sum, e) => sum + e.amount, 0);
    const manual = +(finalPrice - basePrice - extrasTotal).toFixed(2);
    if (Math.abs(manual) > 0.009) {
      items.push({
        transaction_id: transaction.id,
        item_type: 'product',
        service_id: null,
        inventory_id: null,
        name: 'Manual Adjustment',
        description: null,
        quantity: 1,
        unit_price: manual,
        total_price: manual,
      });
    }
    // Insert transaction items
    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);
      if (itemsError) {
        console.error('Failed to insert transaction items', itemsError);
      }
    }
    // Update appointment status and price
    const { data: updatedAppointmentData, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        price: finalPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)
      .select()
      .single();
    if (updateError) {
      throw updateError;
    }
    let updatedAppointment: Appointment = updatedAppointmentData as Appointment;
    // Preserve or attach the service information for the updated appointment.
    if (serviceData) {
      (updatedAppointment as any).service = {
        name: serviceData.name,
        duration_minutes: serviceData.duration_minutes,
        price: serviceData.price,
      };
    } else if ((appointment as any).service) {
      (updatedAppointment as any).service = (appointment as any).service;
    }
    // Invoke invoice creation function
    try {
      await supabase.functions.invoke('create-invoice', {
        body: {
          transactionId: transaction.id,
          invoiceType: 'invoice',
          salonId: appointment.salon_id,
        },
      });
    } catch (fnErr: any) {
      console.error('Failed to invoke create-invoice function', fnErr);
    }
    // Update local state lists
    setUpcomingAppointments((prev) => prev.map((a) => (a.id === appointment.id ? updatedAppointment : a)));
    setWeekAppointments((prev) => prev.map((a) => (a.id === appointment.id ? updatedAppointment : a)));
    setArchivedAppointments((prev) => prev.map((a) => (a.id === appointment.id ? updatedAppointment : a)));
    return updatedAppointment;
  };

  return {
    isAdmin,
    salon,
    employees,
    services,
    leaveRequests,
    // Expose the currently selected appointment list: either upcoming (next 5) or this week
    appointments: showWeek ? weekAppointments : upcomingAppointments,
    // Provide the individual appointment lists for advanced usage
    upcomingAppointments,
    weekAppointments,
    archivedAppointments,
    showWeek,
    toggleShowWeek: () => setShowWeek((prev) => !prev),
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createService,
    updateService,
    deleteService,
    updateLeaveRequest,
    updateAppointment,
    completeAppointment,
    refetch: checkAdminAndFetchData,
  };
}
