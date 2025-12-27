export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          customer_id: string | null
          employee_id: string | null
          end_time: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          image_url: string | null
          notes: string | null
          price: number | null
          /**
           * Human-readable appointment identifier unique per salon. Generated from
           * the first letters of salon and owner plus a sequential number. May be
           * null for legacy records.
           */
          appointment_number: string | null
          salon_id: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
          /**
           * Reference to the customer_profiles table. When set, this appointment
           * belongs to a manually created or linked customer profile. May be null
           * if the appointment is tied directly to an auth user via customer_id.
           */
          customer_profile_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          employee_id?: string | null
          end_time: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          price?: number | null
          /**
           * Human-readable appointment identifier unique per salon. Optional when
           * creating; if omitted, the server or client may generate it.
           */
          appointment_number?: string | null
          salon_id: string
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          /**
           * Reference to the customer_profiles table. Optional when creating
           * appointments; leave null when the customer is selected from auth.users.
           */
          customer_profile_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          employee_id?: string | null
          end_time?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          price?: number | null
          /**
           * Appointment identifier. Optional when updating; leave null to keep
           * current value.
           */
          appointment_number?: string | null
          salon_id?: string
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          /**
           * Reference to the customer_profiles table. Optional when updating;
           * may be set to associate the appointment with a customer file.
           */
          customer_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          created_at: string
          email: string
          employee_id: string
          expires_at: string
          first_name: string | null
          id: string
          last_name: string | null
          salon_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          email: string
          employee_id: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          salon_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          employee_id?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          salon_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          employee_id: string
          id: string
          service_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          service_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          position: string | null
          salon_id: string
          skills: string[] | null
          updated_at: string
          user_id: string | null
          weekly_hours: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          position?: string | null
          salon_id: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          weekly_hours?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          position?: string | null
          salon_id?: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          min_quantity: number | null
          name: string
          price: number | null
          quantity: number | null
          salon_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          min_quantity?: number | null
          name: string
          price?: number | null
          quantity?: number | null
          salon_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          min_quantity?: number | null
          name?: string
          price?: number | null
          quantity?: number | null
          salon_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number
          id: string
          invoice_number: string
          invoice_type: string
          line_items: Json
          paid_at: string | null
          pdf_url: string | null
          salon_id: string
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tip_amount: number
          total_amount: number
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          invoice_number: string
          invoice_type?: string
          line_items?: Json
          paid_at?: string | null
          pdf_url?: string | null
          salon_id: string
          sent_at?: string | null
          status?: string
          subtotal: number
          tax_amount: number
          tip_amount?: number
          total_amount: number
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string
          invoice_type?: string
          line_items?: Json
          paid_at?: string | null
          pdf_url?: string | null
          salon_id?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tip_amount?: number
          total_amount?: number
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferred_language: string | null
          /**
           * Indicates whether the user has accepted the cookie policy.  When
           * `true` the user has accepted; when `false` they have declined
           * or not yet responded.  New users default to `false`.
           */
          cookie_consent: boolean | null
          /**
           * Indicates whether the user has accepted the privacy policy.  When
           * `true` the user has accepted; when `false` they have declined
           * or not yet responded.  New users default to `false`.
           */
          privacy_consent: boolean | null
          /**
           * Indicates whether the user has accepted the terms of service.
           * When `true` the user has accepted; when `false` they have
           * declined or not yet responded.  New users default to `false`.
           */
          terms_consent: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          /**
           * Indicates whether the user has accepted the cookie policy.  When
           * omitted the default value (`false`) will be used.
           */
          cookie_consent?: boolean | null
          /**
           * Indicates whether the user has accepted the privacy policy.  When
           * omitted the default value (`false`) will be used.
           */
          privacy_consent?: boolean | null
          /**
           * Indicates whether the user has accepted the terms of service.  When
           * omitted the default value (`false`) will be used.
           */
          terms_consent?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          /**
           * Indicates whether the user has accepted the cookie policy.  Set this
           * to `true` or `false` to update the user's consent.  If omitted the
           * value will not be changed.
           */
          cookie_consent?: boolean | null
          /**
           * Indicates whether the user has accepted the privacy policy.  Set this
           * to `true` or `false` to update the user's consent.  If omitted the
           * value will not be changed.
           */
          privacy_consent?: boolean | null
          /**
           * Indicates whether the user has accepted the terms of service.  Set
           * this to `true` or `false` to update the user's consent.  If omitted
           * the value will not be changed.
           */
          terms_consent?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          paypal_refund_id: string | null
          processed_by: string | null
          reason: string | null
          status: string
          stripe_refund_id: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          paypal_refund_id?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          paypal_refund_id?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_closures: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          salon_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          salon_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          salon_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_closures_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          buffer_after: number | null
          buffer_before: number | null
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number | null
          check_in: string
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          break_minutes?: number | null
          check_in: string
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          break_minutes?: number | null
          check_in?: string
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          inventory_id: string | null
          item_type: string
          name: string
          quantity: number
          service_id: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_id?: string | null
          item_type: string
          name: string
          quantity?: number
          service_id?: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_id?: string | null
          item_type?: string
          name?: string
          quantity?: number
          service_id?: string | null
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          appointment_id: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          employee_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_status: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          salon_id: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          tip_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          employee_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          payment_status?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          salon_id: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tip_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          employee_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          salon_id?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tip_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_recurring: boolean | null
          specific_date: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_recurring?: boolean | null
          specific_date?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          specific_date?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
        ]
      }

      /**
       * Customer profiles store extended information about salon clients.
       * A profile can optionally be linked to an auth user via user_id,
       * allowing salons to manage customers without requiring them to have
       * an account. Profiles belong to a specific salon via salon_id.
       */
      customer_profiles: {
        Row: {
          id: string
          salon_id: string
          user_id: string | null
          first_name: string
          last_name: string
          birthdate: string | null
          phone: string | null
          email: string | null
          address: string | null
          /** Street name of the customer's address. */
          street: string | null
          /** House number of the customer's address. */
          house_number: string | null
          /** Postal code (PLZ) of the customer's address. */
          postal_code: string | null
          /** City of the customer's address. */
          city: string | null
          image_urls: string[] | null
          notes: string | null
          /**
           * Human-readable customer identifier unique per salon. Generated from
           * the first letters of salon name and owner plus a sequential number.
           */
          customer_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          birthdate?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          /** Street name of the customer's address. */
          street?: string | null
          /** House number of the customer's address. */
          house_number?: string | null
          /** Postal code (PLZ) of the customer's address. */
          postal_code?: string | null
          /** City of the customer's address. */
          city?: string | null
          image_urls?: string[] | null
          notes?: string | null
          /**
           * Unique customer identifier. Optional when creating; generated by client or server.
           */
          customer_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          birthdate?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          /** Street name of the customer's address. */
          street?: string | null
          /** House number of the customer's address. */
          house_number?: string | null
          /** Postal code (PLZ) of the customer's address. */
          postal_code?: string | null
          /** City of the customer's address. */
          city?: string | null
          image_urls?: string[] | null
          notes?: string | null
          /**
           * Customer identifier. Optional when updating; leave undefined to retain existing value.
           */
          customer_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appointment_slots: {
        Row: {
          employee_id: string | null
          end_time: string | null
          id: string | null
          salon_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          employee_id?: string | null
          end_time?: string | null
          id?: string | null
          salon_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          employee_id?: string | null
          end_time?: string | null
          id?: string | null
          salon_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "public_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      public_employees: {
        Row: {
          bio: string | null
          id: string | null
          is_active: boolean | null
          position: string | null
          salon_id: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          id?: string | null
          is_active?: boolean | null
          position?: string | null
          salon_id?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          id?: string | null
          is_active?: boolean | null
          position?: string | null
          salon_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_salon_with_owner: {
        Args: {
          p_address?: string
          p_city?: string
          p_description?: string
          p_email?: string
          p_name: string
          p_opening_hours?: Json
          p_phone?: string
          p_postal_code?: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: { p_salon_id: string }; Returns: string }
      get_appointment_slots: {
        Args: {
          p_employee_id?: string
          p_end_date: string
          p_salon_id: string
          p_start_date: string
        }
        Returns: {
          employee_id: string
          end_time: string
          id: string
          salon_id: string
          start_time: string
          status: string
        }[]
      }
      get_employees_for_booking: {
        Args: { p_salon_id: string }
        Returns: {
          avatar_url: string
          bio: string
          employee_position: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          salon_id: string
        }[]
      }
      get_public_employees: {
        Args: { p_salon_id: string }
        Returns: {
          bio: string
          employee_position: string
          id: string
          is_active: boolean
          salon_id: string
        }[]
      }
      get_public_salon: {
        Args: { p_salon_id: string }
        Returns: {
          address: string
          city: string
          description: string
          id: string
          is_active: boolean
          logo_url: string
          opening_hours: Json
          postal_code: string
          salon_name: string
        }[]
      }
      get_public_salons: {
        Args: never
        Returns: {
          address: string
          city: string
          description: string
          id: string
          is_active: boolean
          logo_url: string
          opening_hours: Json
          postal_code: string
          salon_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "stylist" | "customer"
      appointment_status:
        | "pending"
        | "confirmed"
        | "arrived"
        | "completed"
        | "cancelled"
        | "no_show"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "vacation" | "sick" | "personal" | "training"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "stylist", "customer"],
      appointment_status: [
        "pending",
        "confirmed",
        "arrived",
        "completed",
        "cancelled",
        "no_show",
      ],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["vacation", "sick", "personal", "training"],
    },
  },
} as const
