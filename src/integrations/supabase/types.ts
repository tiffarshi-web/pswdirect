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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_token: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          status?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          archived_to_accounting_at: string | null
          booking_code: string
          care_sheet: Json | null
          care_sheet_psw_name: string | null
          care_sheet_submitted_at: string | null
          client_address: string
          client_email: string
          client_name: string
          client_phone: string | null
          client_postal_code: string | null
          created_at: string
          dropoff_address: string | null
          end_time: string
          hourly_rate: number
          hours: number
          id: string
          is_asap: boolean | null
          is_transport_booking: boolean | null
          manual_check_in: boolean | null
          manual_check_out: boolean | null
          manual_override_at: string | null
          manual_override_by: string | null
          manual_override_reason: string | null
          overtime_minutes: number | null
          overtime_payment_intent_id: string | null
          patient_address: string
          patient_name: string
          patient_postal_code: string | null
          patient_relationship: string | null
          payment_status: string
          pickup_address: string | null
          pickup_postal_code: string | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          psw_assigned: string | null
          psw_first_name: string | null
          psw_license_plate: string | null
          psw_photo_url: string | null
          psw_vehicle_photo_url: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          scheduled_date: string
          service_type: string[]
          special_notes: string | null
          start_time: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          surge_amount: number | null
          total: number
          updated_at: string
          user_id: string | null
          was_refunded: boolean | null
        }
        Insert: {
          archived_to_accounting_at?: string | null
          booking_code: string
          care_sheet?: Json | null
          care_sheet_psw_name?: string | null
          care_sheet_submitted_at?: string | null
          client_address: string
          client_email: string
          client_name: string
          client_phone?: string | null
          client_postal_code?: string | null
          created_at?: string
          dropoff_address?: string | null
          end_time: string
          hourly_rate: number
          hours: number
          id?: string
          is_asap?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_at?: string | null
          manual_override_by?: string | null
          manual_override_reason?: string | null
          overtime_minutes?: number | null
          overtime_payment_intent_id?: string | null
          patient_address: string
          patient_name: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_photo_url?: string | null
          psw_vehicle_photo_url?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          scheduled_date: string
          service_type: string[]
          special_notes?: string | null
          start_time: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          surge_amount?: number | null
          total: number
          updated_at?: string
          user_id?: string | null
          was_refunded?: boolean | null
        }
        Update: {
          archived_to_accounting_at?: string | null
          booking_code?: string
          care_sheet?: Json | null
          care_sheet_psw_name?: string | null
          care_sheet_submitted_at?: string | null
          client_address?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          client_postal_code?: string | null
          created_at?: string
          dropoff_address?: string | null
          end_time?: string
          hourly_rate?: number
          hours?: number
          id?: string
          is_asap?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_at?: string | null
          manual_override_by?: string | null
          manual_override_reason?: string | null
          overtime_minutes?: number | null
          overtime_payment_intent_id?: string | null
          patient_address?: string
          patient_name?: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_photo_url?: string | null
          psw_vehicle_photo_url?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          scheduled_date?: string
          service_type?: string[]
          special_notes?: string | null
          start_time?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          surge_amount?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
          was_refunded?: boolean | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          created_at: string
          default_address: string | null
          default_postal_code: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_address?: string | null
          default_postal_code?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_address?: string | null
          default_postal_code?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_history: {
        Row: {
          created_at: string
          error: string | null
          html: string
          id: string
          resend_response: Json | null
          status: string
          subject: string
          template_key: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          html?: string
          id?: string
          resend_response?: Json | null
          status?: string
          subject?: string
          template_key: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          html?: string
          id?: string
          resend_response?: Json | null
          status?: string
          subject?: string
          template_key?: string
          to_email?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_recalled: boolean | null
          metadata: Json | null
          recall_reason: string | null
          recalled_at: string | null
          recipient_email: string
          status: string | null
          subject: string
          template_id: string | null
          template_name: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_recalled?: boolean | null
          metadata?: Json | null
          recall_reason?: string | null
          recalled_at?: string | null
          recipient_email: string
          status?: string | null
          subject: string
          template_id?: string | null
          template_name?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_recalled?: boolean | null
          metadata?: Json | null
          recall_reason?: string | null
          recalled_at?: string | null
          recipient_email?: string
          status?: string | null
          subject?: string
          template_id?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      location_logs: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          psw_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          psw_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          psw_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          channel: string
          created_at: string
          description: string | null
          enabled: boolean
          html: string
          id: string
          is_custom: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          html?: string
          id?: string
          is_custom?: boolean
          name: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          html?: string
          id?: string
          is_custom?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          processed_at: string | null
          status: string
          template_key: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          template_key: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
          template_key?: string
          to_email?: string
        }
        Relationships: []
      }
      payroll_entries: {
        Row: {
          cleared_at: string | null
          created_at: string
          hourly_rate: number
          hours_worked: number
          id: string
          psw_id: string
          psw_name: string
          scheduled_date: string
          shift_id: string
          status: string
          surcharge_applied: number | null
          task_name: string
          total_owed: number
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          hourly_rate: number
          hours_worked?: number
          id?: string
          psw_id: string
          psw_name: string
          scheduled_date: string
          shift_id: string
          status?: string
          surcharge_applied?: number | null
          task_name: string
          total_owed: number
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          hourly_rate?: number
          hours_worked?: number
          id?: string
          psw_id?: string
          psw_name?: string
          scheduled_date?: string
          shift_id?: string
          status?: string
          surcharge_applied?: number | null
          task_name?: string
          total_owed?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_configs: {
        Row: {
          base_hourly_rate: number
          created_at: string
          doctor_visit_fee: number
          hospital_discharge_fee: number
          id: string
          minimum_booking_fee: number
          overtime_block_minutes: number
          psw_urban_bonus: number
          toronto_surge_rate: number
          updated_at: string
        }
        Insert: {
          base_hourly_rate?: number
          created_at?: string
          doctor_visit_fee?: number
          hospital_discharge_fee?: number
          id?: string
          minimum_booking_fee?: number
          overtime_block_minutes?: number
          psw_urban_bonus?: number
          toronto_surge_rate?: number
          updated_at?: string
        }
        Update: {
          base_hourly_rate?: number
          created_at?: string
          doctor_visit_fee?: number
          hospital_discharge_fee?: number
          id?: string
          minimum_booking_fee?: number
          overtime_block_minutes?: number
          psw_urban_bonus?: number
          toronto_surge_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          client_hourly_rate: number
          created_at: string
          id: string
          is_active: boolean
          psw_hourly_rate: number
          surcharge_flat: number | null
          task_name: string
          updated_at: string
        }
        Insert: {
          client_hourly_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          psw_hourly_rate?: number
          surcharge_flat?: number | null
          task_name: string
          updated_at?: string
        }
        Update: {
          client_hourly_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          psw_hourly_rate?: number
          surcharge_flat?: number | null
          task_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      psw_banking: {
        Row: {
          account_number: string | null
          created_at: string
          id: string
          institution_number: string | null
          psw_id: string
          transit_number: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          id?: string
          institution_number?: string | null
          psw_id: string
          transit_number?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          id?: string
          institution_number?: string | null
          psw_id?: string
          transit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psw_banking_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: true
            referencedRelation: "psw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psw_banking_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: true
            referencedRelation: "v_psw_coverage_map"
            referencedColumns: ["id"]
          },
        ]
      }
      psw_profiles: {
        Row: {
          application_version: number
          applied_at: string | null
          approved_at: string | null
          available_shifts: string | null
          certifications: string | null
          coverage_radius_km: number | null
          created_at: string | null
          email: string
          expired_due_to_police_check: boolean | null
          first_name: string
          gender: string | null
          gov_id_notes: string | null
          gov_id_reviewed_at: string | null
          gov_id_reviewed_by: string | null
          gov_id_status: string
          gov_id_type: string
          gov_id_url: string | null
          has_own_transport: string | null
          home_city: string | null
          home_lat: number | null
          home_lng: number | null
          home_postal_code: string | null
          hscpoa_number: string | null
          id: string
          is_test: boolean | null
          languages: string[] | null
          last_name: string
          last_status_change_at: string | null
          license_plate: string | null
          phone: string | null
          police_check_date: string | null
          police_check_name: string | null
          police_check_url: string | null
          profile_photo_name: string | null
          profile_photo_url: string | null
          psw_number: number | null
          rejected_at: string | null
          rejection_notes: string | null
          rejection_reasons: string[] | null
          resubmitted_at: string | null
          updated_at: string | null
          vehicle_disclaimer: Json | null
          vehicle_photo_name: string | null
          vehicle_photo_url: string | null
          vetting_notes: string | null
          vetting_status: string | null
          vetting_updated_at: string | null
          years_experience: string | null
        }
        Insert: {
          application_version?: number
          applied_at?: string | null
          approved_at?: string | null
          available_shifts?: string | null
          certifications?: string | null
          coverage_radius_km?: number | null
          created_at?: string | null
          email: string
          expired_due_to_police_check?: boolean | null
          first_name: string
          gender?: string | null
          gov_id_notes?: string | null
          gov_id_reviewed_at?: string | null
          gov_id_reviewed_by?: string | null
          gov_id_status?: string
          gov_id_type?: string
          gov_id_url?: string | null
          has_own_transport?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_postal_code?: string | null
          hscpoa_number?: string | null
          id?: string
          is_test?: boolean | null
          languages?: string[] | null
          last_name: string
          last_status_change_at?: string | null
          license_plate?: string | null
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          psw_number?: number | null
          rejected_at?: string | null
          rejection_notes?: string | null
          rejection_reasons?: string[] | null
          resubmitted_at?: string | null
          updated_at?: string | null
          vehicle_disclaimer?: Json | null
          vehicle_photo_name?: string | null
          vehicle_photo_url?: string | null
          vetting_notes?: string | null
          vetting_status?: string | null
          vetting_updated_at?: string | null
          years_experience?: string | null
        }
        Update: {
          application_version?: number
          applied_at?: string | null
          approved_at?: string | null
          available_shifts?: string | null
          certifications?: string | null
          coverage_radius_km?: number | null
          created_at?: string | null
          email?: string
          expired_due_to_police_check?: boolean | null
          first_name?: string
          gender?: string | null
          gov_id_notes?: string | null
          gov_id_reviewed_at?: string | null
          gov_id_reviewed_by?: string | null
          gov_id_status?: string
          gov_id_type?: string
          gov_id_url?: string | null
          has_own_transport?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_postal_code?: string | null
          hscpoa_number?: string | null
          id?: string
          is_test?: boolean | null
          languages?: string[] | null
          last_name?: string
          last_status_change_at?: string | null
          license_plate?: string | null
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          psw_number?: number | null
          rejected_at?: string | null
          rejection_notes?: string | null
          rejection_reasons?: string[] | null
          resubmitted_at?: string | null
          updated_at?: string | null
          vehicle_disclaimer?: Json | null
          vehicle_photo_name?: string | null
          vehicle_photo_url?: string | null
          vetting_notes?: string | null
          vetting_status?: string | null
          vetting_updated_at?: string | null
          years_experience?: string | null
        }
        Relationships: []
      }
      psw_status_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          performed_by: string
          psw_email: string
          psw_id: string
          psw_name: string
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          performed_by?: string
          psw_email: string
          psw_id: string
          psw_name: string
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          performed_by?: string
          psw_email?: string
          psw_id?: string
          psw_name?: string
          reason?: string | null
        }
        Relationships: []
      }
      refund_logs: {
        Row: {
          amount: number
          booking_code: string | null
          booking_id: string
          client_email: string
          client_name: string
          created_at: string | null
          id: string
          is_dry_run: boolean | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          status: string
          stripe_refund_id: string | null
        }
        Insert: {
          amount: number
          booking_code?: string | null
          booking_id: string
          client_email: string
          client_name: string
          created_at?: string | null
          id?: string
          is_dry_run?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Update: {
          amount?: number
          booking_code?: string | null
          booking_id?: string
          client_email?: string
          client_name?: string
          created_at?: string | null
          id?: string
          is_dry_run?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Relationships: []
      }
      service_tasks: {
        Row: {
          apply_hst: boolean
          base_cost: number
          created_at: string
          id: string
          included_minutes: number
          is_active: boolean
          is_hospital_doctor: boolean
          legacy_extra_charge: number
          requires_discharge_upload: boolean
          service_category: string
          task_name: string
          updated_at: string
        }
        Insert: {
          apply_hst?: boolean
          base_cost?: number
          created_at?: string
          id?: string
          included_minutes?: number
          is_active?: boolean
          is_hospital_doctor?: boolean
          legacy_extra_charge?: number
          requires_discharge_upload?: boolean
          service_category?: string
          task_name: string
          updated_at?: string
        }
        Update: {
          apply_hst?: boolean
          base_cost?: number
          created_at?: string
          id?: string
          included_minutes?: number
          is_active?: boolean
          is_hospital_doctor?: boolean
          legacy_extra_charge?: number
          requires_discharge_upload?: boolean
          service_category?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactional_email_log: {
        Row: {
          entity_id: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_type: string
          sent_at: string
          status: string
          template_key: string
        }
        Insert: {
          entity_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_type: string
          sent_at?: string
          status?: string
          template_key: string
        }
        Update: {
          entity_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_type?: string
          sent_at?: string
          status?: string
          template_key?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles: {
        Row: {
          created_at: string | null
          default_address: string | null
          default_postal_code: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_address?: string | null
          default_postal_code?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_address?: string | null
          default_postal_code?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_psw_coverage_map: {
        Row: {
          coverage_radius_km: number | null
          first_name: string | null
          home_city: string | null
          home_lat: number | null
          home_lng: number | null
          home_postal_code: string | null
          id: string | null
          last_name: string | null
        }
        Insert: {
          coverage_radius_km?: number | null
          first_name?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_postal_code?: string | null
          id?: string | null
          last_name?: string | null
        }
        Update: {
          coverage_radius_km?: number | null
          first_name?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_postal_code?: string | null
          id?: string | null
          last_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_psw_cascade: { Args: { p_psw_id: string }; Returns: undefined }
      format_booking_code: { Args: { n: number }; Returns: string }
      format_psw_number: { Args: { n: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      nextval_psw_number: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "psw" | "client"
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
      app_role: ["admin", "moderator", "user", "psw", "client"],
    },
  },
} as const
