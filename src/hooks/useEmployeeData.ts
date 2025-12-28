import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  user_id: string;
  salon_id: string;
  position: string | null;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  weekly_hours: number | null;
  hire_date: string | null;
  is_active: boolean;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  };
}

interface TimeEntry {
  id: string;
  check_in: string;
  check_out: string | null;
  break_minutes: number;
  notes: string | null;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export function useEmployeeData() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Upcoming and weekly appointments for the employee
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  // Past appointments up to four years ago
  const [archivedAppointments, setArchivedAppointments] = useState<Appointment[]>([]);
  // Toggle between upcoming (next 5) and week view
  const [showWeek, setShowWeek] = useState(false);
  const [todayTimeEntry, setTodayTimeEntry] = useState<TimeEntry | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, phone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // Get employee record
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (empData) {
        setEmployee(empData);

        // Fetch upcoming appointments (next 5 future appointments)
        const now = new Date();
        const { data: upcomingData } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(name, duration_minutes, price)
          `)
          .eq('employee_id', empData.id)
          .gte('start_time', now.toISOString())
          .order('start_time', { ascending: true })
          .limit(5);
        setUpcomingAppointments(upcomingData || []);

        // Fetch appointments for the next 7 days
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfDay);
        endOfWeek.setDate(startOfDay.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);
        const { data: weekData } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(name, duration_minutes, price)
          `)
          .eq('employee_id', empData.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfWeek.toISOString())
          .order('start_time', { ascending: true });
        setWeekAppointments(weekData || []);

        // Fetch archived appointments (past appointments up to four years ago)
        const fourYearsAgo = new Date();
        fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
        const { data: archivedData } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(name, duration_minutes, price)
          `)
          .eq('employee_id', empData.id)
          .lt('start_time', startOfDay.toISOString())
          .gte('start_time', fourYearsAgo.toISOString())
          .order('start_time', { descending: true });
        setArchivedAppointments(archivedData || []);

        // Get today's time entry
        const todayDate = new Date().toISOString().split('T')[0];
        const { data: timeData } = await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', empData.id)
          .gte('check_in', `${todayDate}T00:00:00`)
          .lte('check_in', `${todayDate}T23:59:59`)
          .order('check_in', { ascending: false })
          .limit(1)
          .maybeSingle();

        setTodayTimeEntry(timeData);

        // Get leave requests
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', empData.id)
          .order('created_at', { ascending: false });

        setLeaveRequests(leaveData || []);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    if (!employee) return;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee.id,
        check_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setTodayTimeEntry(data);
    }
    return { data, error };
  };

  const checkOut = async () => {
    if (!todayTimeEntry) return;

    const { data, error } = await supabase
      .from('time_entries')
      .update({ check_out: new Date().toISOString() })
      .eq('id', todayTimeEntry.id)
      .select()
      .single();

    if (!error && data) {
      setTodayTimeEntry(data);
    }
    return { data, error };
  };

  /**
   * Update an appointment. Employees are only allowed to modify start_time
   * and end_time for their own appointments. Any attempt to update other
   * fields such as employee_id will be ignored on the client side. After
   * updating, the local appointment lists are updated accordingly.
   */
  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    // Only allow employees to update start_time and end_time
    const allowedUpdates: Partial<Appointment> = {};
    if (updates.start_time) allowedUpdates.start_time = updates.start_time;
    if (updates.end_time) allowedUpdates.end_time = updates.end_time;
    const { data, error } = await supabase
      .from('appointments')
      .update(allowedUpdates)
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
   * Mark an appointment as completed. Similar to the admin version but
   * employees cannot reassign the appointment. It creates a transaction,
   * inserts line items for the base service and selected extras, updates
   * the appointment status and price, and invokes invoice creation.
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
    // Fetch appointment
    const { data: appointmentData, error: aptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    if (aptError || !appointmentData) {
      throw aptError || new Error('Appointment not found');
    }
    const appointment = appointmentData as Appointment as any;
    // Compute tax (19%)
    const taxRate = 19;
    const subtotal = finalPrice;
    const taxAmount = +(subtotal * taxRate / 100).toFixed(2);
    const totalAmount = +(subtotal + taxAmount).toFixed(2);
    // Create transaction. Store internal note along with any appointment notes.
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
    // Prepare items list
    const items: any[] = [];
    // Fetch service info
    let serviceData: any = null;
    if (appointment.service_id) {
      const { data: svc, error: svcError } = await supabase
        .from('services')
        .select('*')
        .eq('id', appointment.service_id)
        .single();
      if (!svcError) serviceData = svc;
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
    // Fetch reasons details
    let reasons: any[] | null = null;
    if (extras && extras.length > 0) {
      const ids = extras.map((e) => e.id);
      const { data: reasonData, error: reasonError } = await supabase
        .from('extra_charge_reasons')
        .select('*')
        .in('id', ids);
      if (!reasonError) {
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
    // Manual adjustment item
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
    // Insert items
    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);
      if (itemsError) {
        console.error('Failed to insert transaction items', itemsError);
      }
    }
    // Update appointment
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
    if (updateError) throw updateError;
    let updatedAppointment: Appointment = updatedAppointmentData as Appointment;
    // Preserve or attach service information to the updated appointment
    if (serviceData) {
      (updatedAppointment as any).service = {
        name: serviceData.name,
        duration_minutes: serviceData.duration_minutes,
        price: serviceData.price,
      };
    } else if ((appointment as any).service) {
      (updatedAppointment as any).service = (appointment as any).service;
    }
    // Invoke invoice creation
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
    // Update local lists
    setUpcomingAppointments((prev) => prev.map((a) => (a.id === appointment.id ? (updatedAppointment as any) : a)));
    setWeekAppointments((prev) => prev.map((a) => (a.id === appointment.id ? (updatedAppointment as any) : a)));
    setArchivedAppointments((prev) => prev.map((a) => (a.id === appointment.id ? (updatedAppointment as any) : a)));
    return updatedAppointment;
  };

  const submitLeaveRequest = async (leaveData: {
    leave_type: 'vacation' | 'sick' | 'personal' | 'training';
    start_date: string;
    end_date: string;
    reason?: string;
  }) => {
    if (!employee) return { data: null, error: new Error('No employee') };

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employee.id,
        leave_type: leaveData.leave_type,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        reason: leaveData.reason || null,
      })
      .select()
      .single();

    if (!error && data) {
      setLeaveRequests([data, ...leaveRequests]);
    }
    return { data, error };
  };

  return {
    employee,
    profile,
    // Provide the currently selected appointments list based on the view
    appointments: showWeek ? weekAppointments : upcomingAppointments,
    // Expose individual lists for custom usage
    upcomingAppointments,
    weekAppointments,
    archivedAppointments,
    showWeek,
    toggleShowWeek: () => setShowWeek((prev) => !prev),
    todayTimeEntry,
    leaveRequests,
    loading,
    checkIn,
    checkOut,
    submitLeaveRequest,
    refetch: fetchEmployeeData,
    updateAppointment,
    completeAppointment,
  };
}
