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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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

        // Get today's appointments
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: apptData } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(name, duration_minutes, price)
          `)
          .eq('employee_id', empData.id)
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
          .order('start_time', { ascending: true });

        setAppointments(apptData || []);

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
    appointments,
    todayTimeEntry,
    leaveRequests,
    loading,
    checkIn,
    checkOut,
    submitLeaveRequest,
    refetch: fetchEmployeeData,
  };
}
