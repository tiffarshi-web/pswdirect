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
          adjustment_amount: number | null
          adjustment_charged_at: string | null
          adjustment_charged_by: string | null
          adjustment_failure_reason: string | null
          adjustment_invoice_id: string | null
          adjustment_status: string | null
          admin_new_order_email_sent_at: string | null
          archived_to_accounting_at: string | null
          billing_adjustment_handled_at: string | null
          billing_adjustment_handled_by: string | null
          billing_adjustment_required: boolean
          billing_note: string | null
          booking_code: string
          booking_confirmation_sent_at: string | null
          cancellation_email_sent_at: string | null
          cancellation_note: string | null
          cancellation_reason: string | null
          cancellation_refund_decision:
            | Database["public"]["Enums"]["cancellation_refund_decision_enum"]
            | null
          cancellation_refund_decision_at: string | null
          cancellation_refund_decision_by: string | null
          cancellation_refund_decision_note: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          care_conditions: string[] | null
          care_conditions_other: string | null
          care_sheet: Json | null
          care_sheet_flag_reason: string[] | null
          care_sheet_flagged: boolean
          care_sheet_last_saved_at: string | null
          care_sheet_psw_name: string | null
          care_sheet_sent_at: string | null
          care_sheet_status: string
          care_sheet_submitted_at: string | null
          cc_email: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          checked_in_at: string | null
          claimed_at: string | null
          client_address: string
          client_date_of_birth: string | null
          client_email: string
          client_first_name: string | null
          client_last_name: string | null
          client_name: string
          client_phone: string | null
          client_postal_code: string | null
          completion_email_sent_at: string | null
          created_at: string
          dropoff_address: string | null
          due_date: string | null
          end_time: string
          final_billable_hours: number | null
          flagged_for_overtime: boolean | null
          geocode_source: string | null
          geocode_updated_at: string | null
          hourly_rate: number
          hours: number
          hst_amount: number | null
          id: string
          insurance_claim_notes: string | null
          insurance_claim_number: string | null
          insurance_contact_email: string | null
          insurance_contact_name: string | null
          insurance_contact_phone: string | null
          insurance_group_number: string | null
          insurance_member_id: string | null
          invoice_sent_at: string | null
          is_asap: boolean | null
          is_recurring: boolean | null
          is_taxable: boolean | null
          is_transport_booking: boolean | null
          manual_check_in: boolean | null
          manual_check_out: boolean | null
          manual_override_at: string | null
          manual_override_by: string | null
          manual_override_reason: string | null
          order_cancelled_email_sent_at: string | null
          order_update_email_sent_signature: string | null
          order_updated_email_sent_at: string | null
          overtime_minutes: number | null
          overtime_payment_intent_id: string | null
          parent_schedule_id: string | null
          patient_address: string
          patient_first_name: string | null
          patient_last_name: string | null
          patient_name: string
          patient_postal_code: string | null
          patient_relationship: string | null
          payer_name: string | null
          payer_type: string | null
          payment_status: string
          payment_success_email_sent_at: string | null
          payment_terms_days: number | null
          pickup_address: string | null
          pickup_postal_code: string | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          psw_assigned: string | null
          psw_assigned_email_sent_at: string | null
          psw_assigned_email_sent_for: string | null
          psw_cancel_reason: string | null
          psw_cancelled_at: string | null
          psw_first_name: string | null
          psw_license_plate: string | null
          psw_pay_rate: number | null
          psw_photo_url: string | null
          psw_reassigned_email_sent_at: string | null
          psw_vehicle_photo_url: string | null
          rebook_nudge_sent_at: string | null
          refund_amount: number | null
          refund_email_sent_at: string | null
          refund_reason: string | null
          refunded_at: string | null
          review_request_email_sent_at: string | null
          review_request_sent: boolean
          review_request_sent_at: string | null
          scheduled_date: string
          service_latitude: number | null
          service_longitude: number | null
          service_type: string[]
          signed_out_at: string | null
          special_notes: string | null
          start_time: string
          status: string
          street_name: string | null
          street_number: string | null
          stripe_adjustment_payment_intent_id: string | null
          stripe_adjustment_status: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          subtotal: number
          suggested_billable_hours: number | null
          surge_amount: number | null
          third_party_payer_mode: string | null
          total: number
          updated_at: string
          user_id: string | null
          vac_authorization_number: string | null
          vac_benefit_code: string | null
          vac_program_of_choice: string | null
          vac_provider_number: string | null
          vac_service_type: string | null
          vac_status: string | null
          veteran_k_number: string | null
          was_refunded: boolean | null
        }
        Insert: {
          adjustment_amount?: number | null
          adjustment_charged_at?: string | null
          adjustment_charged_by?: string | null
          adjustment_failure_reason?: string | null
          adjustment_invoice_id?: string | null
          adjustment_status?: string | null
          admin_new_order_email_sent_at?: string | null
          archived_to_accounting_at?: string | null
          billing_adjustment_handled_at?: string | null
          billing_adjustment_handled_by?: string | null
          billing_adjustment_required?: boolean
          billing_note?: string | null
          booking_code: string
          booking_confirmation_sent_at?: string | null
          cancellation_email_sent_at?: string | null
          cancellation_note?: string | null
          cancellation_reason?: string | null
          cancellation_refund_decision?:
            | Database["public"]["Enums"]["cancellation_refund_decision_enum"]
            | null
          cancellation_refund_decision_at?: string | null
          cancellation_refund_decision_by?: string | null
          cancellation_refund_decision_note?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          care_conditions?: string[] | null
          care_conditions_other?: string | null
          care_sheet?: Json | null
          care_sheet_flag_reason?: string[] | null
          care_sheet_flagged?: boolean
          care_sheet_last_saved_at?: string | null
          care_sheet_psw_name?: string | null
          care_sheet_sent_at?: string | null
          care_sheet_status?: string
          care_sheet_submitted_at?: string | null
          cc_email?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string | null
          claimed_at?: string | null
          client_address: string
          client_date_of_birth?: string | null
          client_email: string
          client_first_name?: string | null
          client_last_name?: string | null
          client_name: string
          client_phone?: string | null
          client_postal_code?: string | null
          completion_email_sent_at?: string | null
          created_at?: string
          dropoff_address?: string | null
          due_date?: string | null
          end_time: string
          final_billable_hours?: number | null
          flagged_for_overtime?: boolean | null
          geocode_source?: string | null
          geocode_updated_at?: string | null
          hourly_rate: number
          hours: number
          hst_amount?: number | null
          id?: string
          insurance_claim_notes?: string | null
          insurance_claim_number?: string | null
          insurance_contact_email?: string | null
          insurance_contact_name?: string | null
          insurance_contact_phone?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          invoice_sent_at?: string | null
          is_asap?: boolean | null
          is_recurring?: boolean | null
          is_taxable?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_at?: string | null
          manual_override_by?: string | null
          manual_override_reason?: string | null
          order_cancelled_email_sent_at?: string | null
          order_update_email_sent_signature?: string | null
          order_updated_email_sent_at?: string | null
          overtime_minutes?: number | null
          overtime_payment_intent_id?: string | null
          parent_schedule_id?: string | null
          patient_address: string
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_name: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payment_status?: string
          payment_success_email_sent_at?: string | null
          payment_terms_days?: number | null
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_assigned_email_sent_at?: string | null
          psw_assigned_email_sent_for?: string | null
          psw_cancel_reason?: string | null
          psw_cancelled_at?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_pay_rate?: number | null
          psw_photo_url?: string | null
          psw_reassigned_email_sent_at?: string | null
          psw_vehicle_photo_url?: string | null
          rebook_nudge_sent_at?: string | null
          refund_amount?: number | null
          refund_email_sent_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          review_request_email_sent_at?: string | null
          review_request_sent?: boolean
          review_request_sent_at?: string | null
          scheduled_date: string
          service_latitude?: number | null
          service_longitude?: number | null
          service_type: string[]
          signed_out_at?: string | null
          special_notes?: string | null
          start_time: string
          status?: string
          street_name?: string | null
          street_number?: string | null
          stripe_adjustment_payment_intent_id?: string | null
          stripe_adjustment_status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal: number
          suggested_billable_hours?: number | null
          surge_amount?: number | null
          third_party_payer_mode?: string | null
          total: number
          updated_at?: string
          user_id?: string | null
          vac_authorization_number?: string | null
          vac_benefit_code?: string | null
          vac_program_of_choice?: string | null
          vac_provider_number?: string | null
          vac_service_type?: string | null
          vac_status?: string | null
          veteran_k_number?: string | null
          was_refunded?: boolean | null
        }
        Update: {
          adjustment_amount?: number | null
          adjustment_charged_at?: string | null
          adjustment_charged_by?: string | null
          adjustment_failure_reason?: string | null
          adjustment_invoice_id?: string | null
          adjustment_status?: string | null
          admin_new_order_email_sent_at?: string | null
          archived_to_accounting_at?: string | null
          billing_adjustment_handled_at?: string | null
          billing_adjustment_handled_by?: string | null
          billing_adjustment_required?: boolean
          billing_note?: string | null
          booking_code?: string
          booking_confirmation_sent_at?: string | null
          cancellation_email_sent_at?: string | null
          cancellation_note?: string | null
          cancellation_reason?: string | null
          cancellation_refund_decision?:
            | Database["public"]["Enums"]["cancellation_refund_decision_enum"]
            | null
          cancellation_refund_decision_at?: string | null
          cancellation_refund_decision_by?: string | null
          cancellation_refund_decision_note?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          care_conditions?: string[] | null
          care_conditions_other?: string | null
          care_sheet?: Json | null
          care_sheet_flag_reason?: string[] | null
          care_sheet_flagged?: boolean
          care_sheet_last_saved_at?: string | null
          care_sheet_psw_name?: string | null
          care_sheet_sent_at?: string | null
          care_sheet_status?: string
          care_sheet_submitted_at?: string | null
          cc_email?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string | null
          claimed_at?: string | null
          client_address?: string
          client_date_of_birth?: string | null
          client_email?: string
          client_first_name?: string | null
          client_last_name?: string | null
          client_name?: string
          client_phone?: string | null
          client_postal_code?: string | null
          completion_email_sent_at?: string | null
          created_at?: string
          dropoff_address?: string | null
          due_date?: string | null
          end_time?: string
          final_billable_hours?: number | null
          flagged_for_overtime?: boolean | null
          geocode_source?: string | null
          geocode_updated_at?: string | null
          hourly_rate?: number
          hours?: number
          hst_amount?: number | null
          id?: string
          insurance_claim_notes?: string | null
          insurance_claim_number?: string | null
          insurance_contact_email?: string | null
          insurance_contact_name?: string | null
          insurance_contact_phone?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          invoice_sent_at?: string | null
          is_asap?: boolean | null
          is_recurring?: boolean | null
          is_taxable?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_at?: string | null
          manual_override_by?: string | null
          manual_override_reason?: string | null
          order_cancelled_email_sent_at?: string | null
          order_update_email_sent_signature?: string | null
          order_updated_email_sent_at?: string | null
          overtime_minutes?: number | null
          overtime_payment_intent_id?: string | null
          parent_schedule_id?: string | null
          patient_address?: string
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_name?: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payment_status?: string
          payment_success_email_sent_at?: string | null
          payment_terms_days?: number | null
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_assigned_email_sent_at?: string | null
          psw_assigned_email_sent_for?: string | null
          psw_cancel_reason?: string | null
          psw_cancelled_at?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_pay_rate?: number | null
          psw_photo_url?: string | null
          psw_reassigned_email_sent_at?: string | null
          psw_vehicle_photo_url?: string | null
          rebook_nudge_sent_at?: string | null
          refund_amount?: number | null
          refund_email_sent_at?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          review_request_email_sent_at?: string | null
          review_request_sent?: boolean
          review_request_sent_at?: string | null
          scheduled_date?: string
          service_latitude?: number | null
          service_longitude?: number | null
          service_type?: string[]
          signed_out_at?: string | null
          special_notes?: string | null
          start_time?: string
          status?: string
          street_name?: string | null
          street_number?: string | null
          stripe_adjustment_payment_intent_id?: string | null
          stripe_adjustment_status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal?: number
          suggested_billable_hours?: number | null
          surge_amount?: number | null
          third_party_payer_mode?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
          vac_authorization_number?: string | null
          vac_benefit_code?: string | null
          vac_program_of_choice?: string | null
          vac_provider_number?: string | null
          vac_service_type?: string | null
          vac_status?: string | null
          veteran_k_number?: string | null
          was_refunded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_parent_schedule_id_fkey"
            columns: ["parent_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      care_recipients: {
        Row: {
          buzzer_code: string | null
          care_notes: string | null
          city: string | null
          created_at: string
          default_address: string | null
          entry_instructions: string | null
          first_name: string | null
          full_name: string
          id: string
          is_self: boolean | null
          last_name: string | null
          mobility_notes: string | null
          postal_code: string | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          province: string | null
          relationship: string | null
          special_instructions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buzzer_code?: string | null
          care_notes?: string | null
          city?: string | null
          created_at?: string
          default_address?: string | null
          entry_instructions?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          is_self?: boolean | null
          last_name?: string | null
          mobility_notes?: string | null
          postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          province?: string | null
          relationship?: string | null
          special_instructions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buzzer_code?: string | null
          care_notes?: string | null
          city?: string | null
          created_at?: string
          default_address?: string | null
          entry_instructions?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_self?: boolean | null
          last_name?: string | null
          mobility_notes?: string | null
          postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          province?: string | null
          relationship?: string | null
          special_instructions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      care_sheet_audit_log: {
        Row: {
          booking_id: string
          created_at: string
          detected_patterns: string[]
          id: string
          psw_id: string
          raw_text_snippet: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          detected_patterns?: string[]
          id?: string
          psw_id: string
          raw_text_snippet?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          detected_patterns?: string[]
          id?: string
          psw_id?: string
          raw_text_snippet?: string | null
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
      communication_sessions: {
        Row: {
          booking_id: string
          client_email: string
          created_at: string
          expires_at: string | null
          id: string
          psw_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          client_email: string
          created_at?: string
          expires_at?: string | null
          id?: string
          psw_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          client_email?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          psw_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_logs: {
        Row: {
          admin_assigned: boolean | null
          admin_assigned_at: string | null
          admin_unserved_email_sent_at: string | null
          booking_code: string
          booking_id: string | null
          channels_sent: string[] | null
          claimed_at: string | null
          claimed_by_psw_id: string | null
          created_at: string
          id: string
          marked_unserved_at: string | null
          matched_psw_emails: string[] | null
          matched_psw_ids: string[] | null
          notes: string | null
        }
        Insert: {
          admin_assigned?: boolean | null
          admin_assigned_at?: string | null
          admin_unserved_email_sent_at?: string | null
          booking_code: string
          booking_id?: string | null
          channels_sent?: string[] | null
          claimed_at?: string | null
          claimed_by_psw_id?: string | null
          created_at?: string
          id?: string
          marked_unserved_at?: string | null
          matched_psw_emails?: string[] | null
          matched_psw_ids?: string[] | null
          notes?: string | null
        }
        Update: {
          admin_assigned?: boolean | null
          admin_assigned_at?: string | null
          admin_unserved_email_sent_at?: string | null
          booking_code?: string
          booking_id?: string | null
          channels_sent?: string[] | null
          claimed_at?: string | null
          claimed_by_psw_id?: string | null
          created_at?: string
          id?: string
          marked_unserved_at?: string | null
          matched_psw_emails?: string[] | null
          matched_psw_ids?: string[] | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "psw_safe_booking_view"
            referencedColumns: ["id"]
          },
        ]
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
      in_app_messages: {
        Row: {
          blocked_reason: string | null
          booking_id: string
          created_at: string
          id: string
          message_body: string
          sender_display_name: string | null
          sender_role: string
          sender_user_id: string | null
        }
        Insert: {
          blocked_reason?: string | null
          booking_id: string
          created_at?: string
          id?: string
          message_body: string
          sender_display_name?: string | null
          sender_role: string
          sender_user_id?: string | null
        }
        Update: {
          blocked_reason?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          message_body?: string
          sender_display_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          booking_code: string
          booking_id: string
          client_date_of_birth: string | null
          client_email: string
          client_name: string | null
          created_at: string
          currency: string
          document_status: string
          due_date: string | null
          duration_hours: number | null
          html_snapshot: string | null
          id: string
          insurance_claim_number: string | null
          insurance_group_number: string | null
          insurance_member_id: string | null
          invoice_number: string
          invoice_type: string
          manually_marked_paid_by: string | null
          paid_at: string | null
          payer_name: string | null
          payer_type: string | null
          payment_method: string | null
          payment_note: string | null
          payment_reference: string | null
          payment_terms_days: number | null
          pricing_snapshot: Json | null
          refund_amount: number
          refund_status: string | null
          rush_amount: number
          service_type: string | null
          status: string
          stripe_payment_intent_id: string | null
          subtotal: number
          surge_amount: number
          tax: number
          third_party_payer_mode: string | null
          total: number
          updated_at: string
          vac_authorization_number: string | null
          vac_benefit_code: string | null
          vac_program_of_choice: string | null
          vac_provider_number: string | null
          vac_service_type: string | null
          vac_status: string | null
          veteran_k_number: string | null
        }
        Insert: {
          booking_code: string
          booking_id: string
          client_date_of_birth?: string | null
          client_email: string
          client_name?: string | null
          created_at?: string
          currency?: string
          document_status?: string
          due_date?: string | null
          duration_hours?: number | null
          html_snapshot?: string | null
          id?: string
          insurance_claim_number?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          invoice_number: string
          invoice_type?: string
          manually_marked_paid_by?: string | null
          paid_at?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payment_method?: string | null
          payment_note?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          pricing_snapshot?: Json | null
          refund_amount?: number
          refund_status?: string | null
          rush_amount?: number
          service_type?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          surge_amount?: number
          tax?: number
          third_party_payer_mode?: string | null
          total?: number
          updated_at?: string
          vac_authorization_number?: string | null
          vac_benefit_code?: string | null
          vac_program_of_choice?: string | null
          vac_provider_number?: string | null
          vac_service_type?: string | null
          vac_status?: string | null
          veteran_k_number?: string | null
        }
        Update: {
          booking_code?: string
          booking_id?: string
          client_date_of_birth?: string | null
          client_email?: string
          client_name?: string | null
          created_at?: string
          currency?: string
          document_status?: string
          due_date?: string | null
          duration_hours?: number | null
          html_snapshot?: string | null
          id?: string
          insurance_claim_number?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          invoice_number?: string
          invoice_type?: string
          manually_marked_paid_by?: string | null
          paid_at?: string | null
          payer_name?: string | null
          payer_type?: string | null
          payment_method?: string | null
          payment_note?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          pricing_snapshot?: Json | null
          refund_amount?: number
          refund_status?: string | null
          rush_amount?: number
          service_type?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          surge_amount?: number
          tax?: number
          third_party_payer_mode?: string | null
          total?: number
          updated_at?: string
          vac_authorization_number?: string | null
          vac_benefit_code?: string | null
          vac_program_of_choice?: string | null
          vac_provider_number?: string | null
          vac_service_type?: string | null
          vac_status?: string | null
          veteran_k_number?: string | null
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
          {
            foreignKeyName: "location_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "psw_safe_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      message_flags: {
        Row: {
          booking_id: string
          created_at: string
          detected_patterns: string[]
          id: string
          message_id: string | null
          original_snippet: string | null
          sender_email: string | null
          sender_role: string | null
          sender_user_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          detected_patterns?: string[]
          id?: string
          message_id?: string | null
          original_snippet?: string | null
          sender_email?: string | null
          sender_role?: string | null
          sender_user_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          detected_patterns?: string[]
          id?: string
          message_id?: string | null
          original_snippet?: string | null
          sender_email?: string | null
          sender_role?: string | null
          sender_user_id?: string | null
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          booking_id: string
          id: string
          last_read_at: string
          user_email: string
        }
        Insert: {
          booking_id: string
          id?: string
          last_read_at?: string
          user_email: string
        }
        Update: {
          booking_id?: string
          id?: string
          last_read_at?: string
          user_email?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_email: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_email: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_email?: string
        }
        Relationships: []
      }
      overtime_charges: {
        Row: {
          actual_sign_out: string
          admin_approved_by: string | null
          approved_at: string | null
          billable_minutes: number
          booking_code: string
          booking_id: string
          charged_at: string | null
          client_email: string
          client_name: string
          created_at: string
          failure_reason: string | null
          hourly_rate: number
          id: string
          overtime_amount: number
          overtime_minutes: number
          psw_id: string
          psw_name: string
          scheduled_end: string
          scheduled_start: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          updated_at: string
        }
        Insert: {
          actual_sign_out: string
          admin_approved_by?: string | null
          approved_at?: string | null
          billable_minutes: number
          booking_code: string
          booking_id: string
          charged_at?: string | null
          client_email: string
          client_name: string
          created_at?: string
          failure_reason?: string | null
          hourly_rate: number
          id?: string
          overtime_amount: number
          overtime_minutes: number
          psw_id: string
          psw_name: string
          scheduled_end: string
          scheduled_start: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_sign_out?: string
          admin_approved_by?: string | null
          approved_at?: string | null
          billable_minutes?: number
          booking_code?: string
          booking_id?: string
          charged_at?: string | null
          client_email?: string
          client_name?: string
          created_at?: string
          failure_reason?: string | null
          hourly_rate?: number
          id?: string
          overtime_amount?: number
          overtime_minutes?: number
          psw_id?: string
          psw_name?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "psw_safe_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_entry_links: {
        Row: {
          amount_applied: number
          created_at: string
          id: string
          payout_id: string
          payroll_entry_id: string
        }
        Insert: {
          amount_applied: number
          created_at?: string
          id?: string
          payout_id: string
          payroll_entry_id: string
        }
        Update: {
          amount_applied?: number
          created_at?: string
          id?: string
          payout_id?: string
          payroll_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_entry_links_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_entry_links_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          cleared_at: string | null
          entry_count: number
          id: string
          payout_ready_at: string | null
          period_end: string
          period_start: string
          psw_id: string
          rejected_at: string | null
          requested_at: string
          status: string
          total_amount: number
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          cleared_at?: string | null
          entry_count?: number
          id?: string
          payout_ready_at?: string | null
          period_end: string
          period_start: string
          psw_id: string
          rejected_at?: string | null
          requested_at?: string
          status?: string
          total_amount?: number
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          cleared_at?: string | null
          entry_count?: number
          id?: string
          payout_ready_at?: string | null
          period_end?: string
          period_start?: string
          psw_id?: string
          rejected_at?: string | null
          requested_at?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_public_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "v_psw_coverage_map"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_paid: number
          created_at: string
          created_by_admin: string
          id: string
          note: string | null
          paid_at: string
          payment_method: Database["public"]["Enums"]["payout_method"]
          psw_id: string
          reference_number: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          created_by_admin: string
          id?: string
          note?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payout_method"]
          psw_id: string
          reference_number?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by_admin?: string
          id?: string
          note?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payout_method"]
          psw_id?: string
          reference_number?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_public_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "v_psw_coverage_map"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          billing_adjustment_handled_at: string | null
          billing_adjustment_handled_by: string | null
          billing_adjustment_required: boolean
          billing_variance_hours: number | null
          booked_hours: number | null
          cleared_at: string | null
          clocked_hours: number | null
          completed_at: string | null
          created_at: string
          earned_date: string | null
          hourly_rate: number
          hours_worked: number
          id: string
          manual_payout_id: string | null
          manually_paid_at: string | null
          payable_hours_override: number | null
          payout_request_id: string | null
          payroll_review_note: string | null
          psw_id: string
          psw_name: string
          requires_admin_review: boolean
          reviewed_at: string | null
          reviewed_by_admin: string | null
          scheduled_date: string
          shift_id: string
          status: string
          surcharge_applied: number | null
          task_name: string
          total_owed: number
          updated_at: string
          variance_hours: number | null
        }
        Insert: {
          billing_adjustment_handled_at?: string | null
          billing_adjustment_handled_by?: string | null
          billing_adjustment_required?: boolean
          billing_variance_hours?: number | null
          booked_hours?: number | null
          cleared_at?: string | null
          clocked_hours?: number | null
          completed_at?: string | null
          created_at?: string
          earned_date?: string | null
          hourly_rate: number
          hours_worked?: number
          id?: string
          manual_payout_id?: string | null
          manually_paid_at?: string | null
          payable_hours_override?: number | null
          payout_request_id?: string | null
          payroll_review_note?: string | null
          psw_id: string
          psw_name: string
          requires_admin_review?: boolean
          reviewed_at?: string | null
          reviewed_by_admin?: string | null
          scheduled_date: string
          shift_id: string
          status?: string
          surcharge_applied?: number | null
          task_name: string
          total_owed: number
          updated_at?: string
          variance_hours?: number | null
        }
        Update: {
          billing_adjustment_handled_at?: string | null
          billing_adjustment_handled_by?: string | null
          billing_adjustment_required?: boolean
          billing_variance_hours?: number | null
          booked_hours?: number | null
          cleared_at?: string | null
          clocked_hours?: number | null
          completed_at?: string | null
          created_at?: string
          earned_date?: string | null
          hourly_rate?: number
          hours_worked?: number
          id?: string
          manual_payout_id?: string | null
          manually_paid_at?: string | null
          payable_hours_override?: number | null
          payout_request_id?: string | null
          payroll_review_note?: string | null
          psw_id?: string
          psw_name?: string
          requires_admin_review?: boolean
          reviewed_at?: string | null
          reviewed_by_admin?: string | null
          scheduled_date?: string
          shift_id?: string
          status?: string
          surcharge_applied?: number | null
          task_name?: string
          total_owed?: number
          updated_at?: string
          variance_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_manual_payout_id_fkey"
            columns: ["manual_payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
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
          account_holder_name: string | null
          account_number: string
          banking_note: string | null
          created_at: string
          id: string
          institution_number: string
          last4: string | null
          psw_id: string
          transit_number: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number: string
          banking_note?: string | null
          created_at?: string
          id?: string
          institution_number: string
          last4?: string | null
          psw_id: string
          transit_number: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string
          banking_note?: string | null
          created_at?: string
          id?: string
          institution_number?: string
          last4?: string | null
          psw_id?: string
          transit_number?: string
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
            referencedRelation: "psw_public_directory"
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
      psw_documents: {
        Row: {
          admin_notes: string | null
          document_type: string
          file_name: string | null
          file_url: string
          id: string
          psw_id: string
          status: string
          uploaded_at: string
          verified_at: string | null
          verified_by_admin: string | null
          version_number: number
        }
        Insert: {
          admin_notes?: string | null
          document_type: string
          file_name?: string | null
          file_url: string
          id?: string
          psw_id: string
          status?: string
          uploaded_at?: string
          verified_at?: string | null
          verified_by_admin?: string | null
          version_number?: number
        }
        Update: {
          admin_notes?: string | null
          document_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          psw_id?: string
          status?: string
          uploaded_at?: string
          verified_at?: string | null
          verified_by_admin?: string | null
          version_number?: number
        }
        Relationships: []
      }
      psw_pending_updates: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: Json
          old_value: Json | null
          psw_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value: Json
          old_value?: Json | null
          psw_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: Json
          old_value?: Json | null
          psw_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psw_pending_updates_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psw_pending_updates_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "psw_public_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psw_pending_updates_psw_id_fkey"
            columns: ["psw_id"]
            isOneToOne: false
            referencedRelation: "v_psw_coverage_map"
            referencedColumns: ["id"]
          },
        ]
      }
      psw_profile_audit: {
        Row: {
          change_type: string
          created_at: string
          field_name: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          performed_by: string
          psw_email: string | null
          psw_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          performed_by: string
          psw_email?: string | null
          psw_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          performed_by?: string
          psw_email?: string | null
          psw_id?: string
        }
        Relationships: []
      }
      psw_profiles: {
        Row: {
          application_version: number
          applied_at: string | null
          approved_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          availability: string | null
          available_shifts: string | null
          banned_at: string | null
          bio: string | null
          cancel_count: number
          certifications: string | null
          certifications_list: string[] | null
          coverage_radius_km: number | null
          created_at: string | null
          email: string
          experience_conditions: string[] | null
          expired_due_to_police_check: boolean | null
          first_job_completed_at: string | null
          first_name: string
          flag_count: number
          flagged_at: string | null
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
          lifecycle_status: string
          phone: string | null
          police_check_date: string | null
          police_check_name: string | null
          police_check_url: string | null
          profile_photo_name: string | null
          profile_photo_url: string | null
          psw_cert_name: string | null
          psw_cert_notes: string | null
          psw_cert_reviewed_at: string | null
          psw_cert_reviewed_by: string | null
          psw_cert_status: string
          psw_cert_url: string | null
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
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          availability?: string | null
          available_shifts?: string | null
          banned_at?: string | null
          bio?: string | null
          cancel_count?: number
          certifications?: string | null
          certifications_list?: string[] | null
          coverage_radius_km?: number | null
          created_at?: string | null
          email: string
          experience_conditions?: string[] | null
          expired_due_to_police_check?: boolean | null
          first_job_completed_at?: string | null
          first_name: string
          flag_count?: number
          flagged_at?: string | null
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
          lifecycle_status?: string
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          psw_cert_name?: string | null
          psw_cert_notes?: string | null
          psw_cert_reviewed_at?: string | null
          psw_cert_reviewed_by?: string | null
          psw_cert_status?: string
          psw_cert_url?: string | null
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
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          availability?: string | null
          available_shifts?: string | null
          banned_at?: string | null
          bio?: string | null
          cancel_count?: number
          certifications?: string | null
          certifications_list?: string[] | null
          coverage_radius_km?: number | null
          created_at?: string | null
          email?: string
          experience_conditions?: string[] | null
          expired_due_to_police_check?: boolean | null
          first_job_completed_at?: string | null
          first_name?: string
          flag_count?: number
          flagged_at?: string | null
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
          lifecycle_status?: string
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          psw_cert_name?: string | null
          psw_cert_notes?: string | null
          psw_cert_reviewed_at?: string | null
          psw_cert_reviewed_by?: string | null
          psw_cert_status?: string
          psw_cert_url?: string | null
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
      recurring_schedules: {
        Row: {
          created_at: string
          end_date: string | null
          end_type: string
          frequency: string
          id: string
          max_occurrences: number | null
          occurrences_created: number
          parent_booking_id: string
          payer_snapshot: Json | null
          same_day_time: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          end_type?: string
          frequency?: string
          id?: string
          max_occurrences?: number | null
          occurrences_created?: number
          parent_booking_id: string
          payer_snapshot?: Json | null
          same_day_time?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          end_type?: string
          frequency?: string
          id?: string
          max_occurrences?: number | null
          occurrences_created?: number
          parent_booking_id?: string
          payer_snapshot?: Json | null
          same_day_time?: boolean
          status?: string
          updated_at?: string
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
      shift_time_adjustments: {
        Row: {
          adjusted_at: string
          adjusted_by: string
          adjusted_clock_in: string
          adjusted_clock_out: string
          adjustment_reason: string
          booking_id: string
          created_at: string
          id: string
          original_clock_in: string | null
          original_clock_out: string | null
        }
        Insert: {
          adjusted_at?: string
          adjusted_by: string
          adjusted_clock_in: string
          adjusted_clock_out: string
          adjustment_reason: string
          booking_id: string
          created_at?: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
        }
        Update: {
          adjusted_at?: string
          adjusted_by?: string
          adjusted_clock_in?: string
          adjusted_clock_out?: string
          adjustment_reason?: string
          booking_id?: string
          created_at?: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          payload: Json | null
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          status?: string
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
      unreconciled_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          id: string
          raw_metadata: Json
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_booking_id: string | null
          resolved_by: string | null
          status: string
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_payment_intent_id: string
          stripe_payment_method_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          raw_metadata?: Json
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_booking_id?: string | null
          resolved_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id: string
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          raw_metadata?: Json
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_booking_id?: string | null
          resolved_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unreconciled_payments_resolved_booking_id_fkey"
            columns: ["resolved_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unreconciled_payments_resolved_booking_id_fkey"
            columns: ["resolved_booking_id"]
            isOneToOne: false
            referencedRelation: "psw_safe_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      unserved_orders: {
        Row: {
          admin_notes: string | null
          assigned_psw_id: string | null
          booking_id: string | null
          city: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          decline_reason: string | null
          distance_km: number | null
          full_client_payload: Json | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          payment_intent_id: string | null
          payment_link_token: string | null
          pending_expires_at: string | null
          postal_code_raw: string | null
          postal_fsa: string | null
          psw_count_found: number
          radius_checked_km: number | null
          reason: string
          requested_start_time: string | null
          service_type: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_psw_id?: string | null
          booking_id?: string | null
          city?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          decline_reason?: string | null
          distance_km?: number | null
          full_client_payload?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_link_token?: string | null
          pending_expires_at?: string | null
          postal_code_raw?: string | null
          postal_fsa?: string | null
          psw_count_found?: number
          radius_checked_km?: number | null
          reason?: string
          requested_start_time?: string | null
          service_type?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_psw_id?: string | null
          booking_id?: string | null
          city?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          decline_reason?: string | null
          distance_km?: number | null
          full_client_payload?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_link_token?: string | null
          pending_expires_at?: string | null
          postal_code_raw?: string | null
          postal_fsa?: string | null
          psw_count_found?: number
          radius_checked_km?: number | null
          reason?: string
          requested_start_time?: string | null
          service_type?: string | null
          status?: string
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
      psw_public_directory: {
        Row: {
          certifications: string | null
          first_name: string | null
          gender: string | null
          gov_id_status: string | null
          home_city: string | null
          hscpoa_number: string | null
          id: string | null
          languages: string[] | null
          last_name: string | null
          profile_photo_url: string | null
          psw_cert_status: string | null
          vetting_status: string | null
          years_experience: string | null
        }
        Insert: {
          certifications?: string | null
          first_name?: string | null
          gender?: string | null
          gov_id_status?: string | null
          home_city?: string | null
          hscpoa_number?: string | null
          id?: string | null
          languages?: string[] | null
          last_name?: never
          profile_photo_url?: string | null
          psw_cert_status?: string | null
          vetting_status?: string | null
          years_experience?: string | null
        }
        Update: {
          certifications?: string | null
          first_name?: string | null
          gender?: string | null
          gov_id_status?: string | null
          home_city?: string | null
          hscpoa_number?: string | null
          id?: string | null
          languages?: string[] | null
          last_name?: never
          profile_photo_url?: string | null
          psw_cert_status?: string | null
          vetting_status?: string | null
          years_experience?: string | null
        }
        Relationships: []
      }
      psw_safe_booking_view: {
        Row: {
          booking_code: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          care_conditions: string[] | null
          care_conditions_other: string | null
          care_sheet: Json | null
          care_sheet_flag_reason: string[] | null
          care_sheet_flagged: boolean | null
          care_sheet_last_saved_at: string | null
          care_sheet_psw_name: string | null
          care_sheet_status: string | null
          care_sheet_submitted_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          checked_in_at: string | null
          claimed_at: string | null
          client_address: string | null
          client_first_name: string | null
          client_name: string | null
          client_postal_code: string | null
          created_at: string | null
          dropoff_address: string | null
          end_time: string | null
          final_billable_hours: number | null
          flagged_for_overtime: boolean | null
          geocode_source: string | null
          hourly_rate: number | null
          hours: number | null
          id: string | null
          is_asap: boolean | null
          is_recurring: boolean | null
          is_transport_booking: boolean | null
          manual_check_in: boolean | null
          manual_check_out: boolean | null
          manual_override_reason: string | null
          overtime_minutes: number | null
          parent_schedule_id: string | null
          patient_address: string | null
          patient_first_name: string | null
          patient_last_name: string | null
          patient_name: string | null
          patient_postal_code: string | null
          patient_relationship: string | null
          payment_status: string | null
          pickup_address: string | null
          pickup_postal_code: string | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          psw_assigned: string | null
          psw_cancel_reason: string | null
          psw_cancelled_at: string | null
          psw_first_name: string | null
          psw_license_plate: string | null
          psw_pay_rate: number | null
          psw_photo_url: string | null
          psw_vehicle_photo_url: string | null
          scheduled_date: string | null
          service_latitude: number | null
          service_longitude: number | null
          service_type: string[] | null
          signed_out_at: string | null
          special_notes: string | null
          start_time: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          suggested_billable_hours: number | null
          updated_at: string | null
        }
        Insert: {
          booking_code?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          care_conditions?: string[] | null
          care_conditions_other?: string | null
          care_sheet?: Json | null
          care_sheet_flag_reason?: string[] | null
          care_sheet_flagged?: boolean | null
          care_sheet_last_saved_at?: string | null
          care_sheet_psw_name?: string | null
          care_sheet_status?: string | null
          care_sheet_submitted_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string | null
          claimed_at?: string | null
          client_address?: string | null
          client_first_name?: string | null
          client_name?: string | null
          client_postal_code?: string | null
          created_at?: string | null
          dropoff_address?: string | null
          end_time?: string | null
          final_billable_hours?: number | null
          flagged_for_overtime?: boolean | null
          geocode_source?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string | null
          is_asap?: boolean | null
          is_recurring?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_reason?: string | null
          overtime_minutes?: number | null
          parent_schedule_id?: string | null
          patient_address?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_name?: string | null
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_cancel_reason?: string | null
          psw_cancelled_at?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_pay_rate?: number | null
          psw_photo_url?: string | null
          psw_vehicle_photo_url?: string | null
          scheduled_date?: string | null
          service_latitude?: number | null
          service_longitude?: number | null
          service_type?: string[] | null
          signed_out_at?: string | null
          special_notes?: string | null
          start_time?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          suggested_billable_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_code?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          care_conditions?: string[] | null
          care_conditions_other?: string | null
          care_sheet?: Json | null
          care_sheet_flag_reason?: string[] | null
          care_sheet_flagged?: boolean | null
          care_sheet_last_saved_at?: string | null
          care_sheet_psw_name?: string | null
          care_sheet_status?: string | null
          care_sheet_submitted_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string | null
          claimed_at?: string | null
          client_address?: string | null
          client_first_name?: string | null
          client_name?: string | null
          client_postal_code?: string | null
          created_at?: string | null
          dropoff_address?: string | null
          end_time?: string | null
          final_billable_hours?: number | null
          flagged_for_overtime?: boolean | null
          geocode_source?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string | null
          is_asap?: boolean | null
          is_recurring?: boolean | null
          is_transport_booking?: boolean | null
          manual_check_in?: boolean | null
          manual_check_out?: boolean | null
          manual_override_reason?: string | null
          overtime_minutes?: number | null
          parent_schedule_id?: string | null
          patient_address?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_name?: string | null
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_postal_code?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_cancel_reason?: string | null
          psw_cancelled_at?: string | null
          psw_first_name?: string | null
          psw_license_plate?: string | null
          psw_pay_rate?: number | null
          psw_photo_url?: string | null
          psw_vehicle_photo_url?: string | null
          scheduled_date?: string | null
          service_latitude?: number | null
          service_longitude?: number | null
          service_type?: string[] | null
          signed_out_at?: string | null
          special_notes?: string | null
          start_time?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          suggested_billable_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_parent_schedule_id_fkey"
            columns: ["parent_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      v_psw_coverage_map: {
        Row: {
          coverage_radius_km: number | null
          first_name: string | null
          home_city: string | null
          home_postal_code: string | null
          id: string | null
          last_name: string | null
        }
        Insert: {
          coverage_radius_km?: number | null
          first_name?: string | null
          home_city?: string | null
          home_postal_code?: string | null
          id?: string | null
          last_name?: string | null
        }
        Update: {
          coverage_radius_km?: number | null
          first_name?: string | null
          home_city?: string | null
          home_postal_code?: string | null
          id?: string | null
          last_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _invoke_edge_function: {
        Args: { p_body: Json; p_function_name: string }
        Returns: undefined
      }
      admin_approve_booked_hours: {
        Args: { p_entry_id: string; p_note?: string }
        Returns: undefined
      }
      admin_approve_payout: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_approve_psw_update: {
        Args: { p_note?: string; p_update_id: string }
        Returns: undefined
      }
      admin_archive_psw: {
        Args: { p_psw_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_ban_psw: {
        Args: { p_psw_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_clear_payout: { Args: { p_request_id: string }; Returns: undefined }
      admin_dismiss_unreconciled_payment: {
        Args: { p_note?: string; p_status: string; p_unreconciled_id: string }
        Returns: undefined
      }
      admin_mark_billing_handled: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      admin_mark_billing_handled_v2: {
        Args: { p_booking_id: string; p_note?: string }
        Returns: undefined
      }
      admin_mark_billing_no_charge: {
        Args: { p_booking_id: string; p_note?: string }
        Returns: undefined
      }
      admin_payout_ready: { Args: { p_request_id: string }; Returns: undefined }
      admin_record_adjustment_charge: {
        Args: {
          p_adjustment_invoice_id?: string
          p_amount: number
          p_booking_id: string
          p_failure_reason?: string
          p_payment_intent_id: string
          p_stripe_status: string
        }
        Returns: undefined
      }
      admin_record_adjustment_invoice_sent: {
        Args: {
          p_adjustment_invoice_id: string
          p_amount: number
          p_booking_id: string
        }
        Returns: undefined
      }
      admin_record_adjustment_refund: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_failure_reason?: string
          p_stripe_refund_id: string
        }
        Returns: undefined
      }
      admin_record_manual_payout: {
        Args: {
          p_amount: number
          p_entry_amounts?: number[]
          p_entry_ids: string[]
          p_method: Database["public"]["Enums"]["payout_method"]
          p_note?: string
          p_paid_at: string
          p_psw_id: string
          p_reference?: string
        }
        Returns: Json
      }
      admin_reject_payout: {
        Args: { p_notes: string; p_request_id: string }
        Returns: undefined
      }
      admin_reject_psw_update: {
        Args: { p_note?: string; p_update_id: string }
        Returns: undefined
      }
      admin_resolve_unreconciled_payment: {
        Args: {
          p_booking_id: string
          p_note?: string
          p_unreconciled_id: string
        }
        Returns: undefined
      }
      admin_restore_psw: { Args: { p_psw_id: string }; Returns: undefined }
      admin_set_billable_hours: {
        Args: {
          p_billable_hours: number
          p_booking_id: string
          p_note?: string
        }
        Returns: Json
      }
      admin_set_cancellation_refund_decision: {
        Args: {
          p_booking_id: string
          p_decision: Database["public"]["Enums"]["cancellation_refund_decision_enum"]
          p_note?: string
        }
        Returns: undefined
      }
      admin_set_payable_hours: {
        Args: { p_entry_id: string; p_note?: string; p_override_hours: number }
        Returns: undefined
      }
      admin_unban_psw: { Args: { p_psw_id: string }; Returns: undefined }
      admin_void_manual_payout: {
        Args: { p_payout_id: string; p_reason: string }
        Returns: undefined
      }
      auto_expire_vsc_psws: { Args: never; Returns: number }
      booked_hours_compat: { Args: { p_hours: number }; Returns: number }
      create_payout_request: { Args: { p_psw_id: string }; Returns: Json }
      daily_vsc_check: { Args: never; Returns: Json }
      delete_psw_cascade: { Args: { p_psw_id: string }; Returns: undefined }
      format_booking_code: { Args: { n: number }; Returns: string }
      format_psw_number: { Args: { n: number }; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      get_expiring_vsc_psws: {
        Args: never
        Returns: {
          days_until_expiry: number
          email: string
          first_name: string
          id: string
          last_name: string
          police_check_date: string
        }[]
      }
      get_nearby_psws: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number }
        Returns: {
          first_name: string
          gender: string
          home_city: string
          home_lat: number
          home_lng: number
          id: string
          languages: string[]
          last_name: string
          profile_photo_url: string
          years_experience: string
        }[]
      }
      get_psw_banking_for_cpa: {
        Args: { p_psw_id: string }
        Returns: {
          account_number: string
          institution_number: string
          transit_number: string
        }[]
      }
      get_psw_entry_payment_status: {
        Args: { p_psw_id: string }
        Returns: {
          entry_id: string
          hourly_rate: number
          hours_worked: number
          paid_amount: number
          remaining_amount: number
          requires_admin_review: boolean
          scheduled_date: string
          status: string
          task_name: string
          total_owed: number
        }[]
      }
      get_psw_payout_summary: {
        Args: { p_psw_id: string }
        Returns: {
          last_payout_at: string
          outstanding_balance: number
          payout_count: number
          total_earned: number
          total_paid: number
        }[]
      }
      get_vsc_status: { Args: { p_police_check_date: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      nextval_psw_number: { Args: never; Returns: number }
      send_vsc_expiry_warnings: { Args: never; Returns: number }
      sync_completed_bookings_to_payroll: { Args: never; Returns: number }
      upsert_payroll_entry_for_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "psw" | "client"
      cancellation_refund_decision_enum:
        | "refunded"
        | "retained_per_policy"
        | "pending_review"
      payout_method: "e_transfer" | "bank_transfer" | "cash" | "other"
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
      cancellation_refund_decision_enum: [
        "refunded",
        "retained_per_policy",
        "pending_review",
      ],
      payout_method: ["e_transfer", "bank_transfer", "cash", "other"],
    },
  },
} as const
