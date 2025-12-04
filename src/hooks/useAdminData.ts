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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
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
        // Get salon (admin owns or first active)
        const { data: salonData } = await supabase
          .from('salons')
          .select('*')
          .or(`owner_id.eq.${user.id},is_active.eq.true`)
          .limit(1)
          .single();

        if (salonData) {
          setSalon(salonData);

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

          // Fetch today's appointments
          const today = new Date();
          const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
          const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

          const { data: apptData } = await supabase
            .from('appointments')
            .select('*, service:services(name, duration_minutes, price)')
            .eq('salon_id', salonData.id)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

          setAppointments(apptData || []);

          // Fetch all appointments for the salon
          const { data: allApptData } = await supabase
            .from('appointments')
            .select('*, service:services(name, duration_minutes, price)')
            .eq('salon_id', salonData.id)
            .order('start_time', { ascending: true });

          setAllAppointments(allApptData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowAllAppointments = () => {
    setShowAllAppointments(!showAllAppointments);
  };

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
      // Create invitation for the employee
      await supabase.from('employee_invitations').insert({
        salon_id: data.salon_id,
        employee_id: result.data.id,
        email: inviteData.email,
        first_name: inviteData.first_name,
        last_name: inviteData.last_name,
      });
      
      // Add profile info to the employee for display
      const employeeWithPending = {
        ...result.data,
        profile: {
          first_name: inviteData.first_name,
          last_name: inviteData.last_name,
          email: inviteData.email,
        }
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

  return {
    isAdmin,
    salon,
    employees,
    services,
    leaveRequests,
    appointments: showAllAppointments ? allAppointments : appointments,
    allAppointments,
    showAllAppointments,
    toggleShowAllAppointments,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createService,
    updateService,
    deleteService,
    updateLeaveRequest,
    refetch: checkAdminAndFetchData,
  };
}
