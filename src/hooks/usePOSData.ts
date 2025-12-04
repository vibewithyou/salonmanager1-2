import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  salon_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  employee_id: string | null;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  discount_type: string | null;
  discount_value: number | null;
  tip_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  paypal_order_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_type: string;
  service_id: string | null;
  inventory_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  transaction_id: string;
  salon_id: string;
  invoice_number: string;
  invoice_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  line_items: any[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

export interface CartItem {
  id: string;
  type: 'service' | 'product';
  service_id?: string;
  inventory_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface POSState {
  cart: CartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentId: string | null;
}

export function usePOSData(salonId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [posState, setPosState] = useState<POSState>({
    cart: [],
    subtotal: 0,
    taxRate: 19,
    taxAmount: 0,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    tipAmount: 0,
    totalAmount: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    appointmentId: null,
  });

  const calculateTotals = useCallback((cart: CartItem[], taxRate: number, discountType: 'percentage' | 'fixed' | null, discountValue: number, tipAmount: number) => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    
    let discountAmount = 0;
    if (discountType === 'percentage' && discountValue > 0) {
      discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      discountAmount = Math.min(discountValue, subtotal);
    }
    
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalAmount = taxableAmount + taxAmount + tipAmount;
    
    return { subtotal, discountAmount, taxAmount, totalAmount };
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'total_price'>) => {
    setPosState(prev => {
      const newItem: CartItem = {
        ...item,
        id: crypto.randomUUID(),
        total_price: item.unit_price * item.quantity,
      };
      
      const newCart = [...prev.cart, newItem];
      const totals = calculateTotals(newCart, prev.taxRate, prev.discountType, prev.discountValue, prev.tipAmount);
      
      return { ...prev, cart: newCart, ...totals };
    });
  }, [calculateTotals]);

  const removeFromCart = useCallback((itemId: string) => {
    setPosState(prev => {
      const newCart = prev.cart.filter(item => item.id !== itemId);
      const totals = calculateTotals(newCart, prev.taxRate, prev.discountType, prev.discountValue, prev.tipAmount);
      return { ...prev, cart: newCart, ...totals };
    });
  }, [calculateTotals]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setPosState(prev => {
      const newCart = prev.cart.map(item => 
        item.id === itemId 
          ? { ...item, quantity, total_price: item.unit_price * quantity }
          : item
      );
      const totals = calculateTotals(newCart, prev.taxRate, prev.discountType, prev.discountValue, prev.tipAmount);
      return { ...prev, cart: newCart, ...totals };
    });
  }, [calculateTotals]);

  const setDiscount = useCallback((type: 'percentage' | 'fixed' | null, value: number) => {
    setPosState(prev => {
      const totals = calculateTotals(prev.cart, prev.taxRate, type, value, prev.tipAmount);
      return { ...prev, discountType: type, discountValue: value, ...totals };
    });
  }, [calculateTotals]);

  const setTip = useCallback((amount: number) => {
    setPosState(prev => {
      const totals = calculateTotals(prev.cart, prev.taxRate, prev.discountType, prev.discountValue, amount);
      return { ...prev, tipAmount: amount, ...totals };
    });
  }, [calculateTotals]);

  const setCustomerInfo = useCallback((name: string, email: string, phone: string) => {
    setPosState(prev => ({ ...prev, customerName: name, customerEmail: email, customerPhone: phone }));
  }, []);

  const setAppointmentId = useCallback((appointmentId: string | null) => {
    setPosState(prev => ({ ...prev, appointmentId }));
  }, []);

  const clearCart = useCallback(() => {
    setPosState({
      cart: [],
      subtotal: 0,
      taxRate: 19,
      taxAmount: 0,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      appointmentId: null,
    });
  }, []);

  const processPayment = useCallback(async (paymentMethod: 'cash' | 'stripe' | 'paypal') => {
    if (!salonId || posState.cart.length === 0) return null;
    
    setProcessing(true);
    
    try {
      // Get employee ID
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          salon_id: salonId,
          appointment_id: posState.appointmentId,
          employee_id: employeeData?.id || null,
          subtotal: posState.subtotal,
          tax_amount: posState.taxAmount,
          tax_rate: posState.taxRate,
          discount_amount: posState.discountAmount,
          discount_type: posState.discountType,
          discount_value: posState.discountValue,
          tip_amount: posState.tipAmount,
          total_amount: posState.totalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'completed' : 'pending',
          guest_name: posState.customerName || null,
          guest_email: posState.customerEmail || null,
          guest_phone: posState.customerPhone || null,
          completed_at: paymentMethod === 'cash' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction items
      const items = posState.cart.map(item => ({
        transaction_id: transaction.id,
        item_type: item.type,
        service_id: item.service_id || null,
        inventory_id: item.inventory_id || null,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // For Stripe/PayPal, call edge function
      if (paymentMethod === 'stripe' || paymentMethod === 'paypal') {
        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('process-payment', {
          body: {
            transactionId: transaction.id,
            paymentMethod,
            amount: posState.totalAmount,
            currency: 'eur',
            customerEmail: posState.customerEmail || null,
          },
        });

        if (paymentError) throw paymentError;
        
        return { transaction, paymentData: paymentResult };
      }

      // For cash, create invoice/receipt immediately
      await createInvoice(transaction.id, 'receipt');
      
      clearCart();
      await fetchTransactions();
      
      return { transaction, paymentData: null };
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Zahlung fehlgeschlagen',
        variant: 'destructive',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  }, [salonId, posState, user, toast, clearCart]);

  const createInvoice = useCallback(async (transactionId: string, type: 'invoice' | 'receipt') => {
    if (!salonId) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice', {
        body: {
          transactionId,
          invoiceType: type,
          salonId,
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Rechnung konnte nicht erstellt werden',
        variant: 'destructive',
      });
      return null;
    }
  }, [salonId, toast]);

  const processRefund = useCallback(async (transactionId: string, amount: number, reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { transactionId, amount, reason },
      });

      if (error) throw error;
      
      await fetchTransactions();
      return data;
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Rückerstattung fehlgeschlagen',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const fetchTransactions = useCallback(async () => {
    if (!salonId) return;
    
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allTx, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setTransactions(allTx || []);
      setTodayTransactions(
        (allTx || []).filter(tx => new Date(tx.created_at) >= today)
      );
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (salonId) {
      fetchTransactions();
    }
  }, [salonId, fetchTransactions]);

  return {
    transactions,
    todayTransactions,
    loading,
    processing,
    posState,
    addToCart,
    removeFromCart,
    updateQuantity,
    setDiscount,
    setTip,
    setCustomerInfo,
    setAppointmentId,
    clearCart,
    processPayment,
    createInvoice,
    processRefund,
    refetch: fetchTransactions,
  };
}
