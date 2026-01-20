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
      bookings: {
        Row: {
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
          patient_address: string
          patient_name: string
          patient_postal_code: string | null
          patient_relationship: string | null
          payment_status: string
          pickup_address: string | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          psw_assigned: string | null
          psw_first_name: string | null
          scheduled_date: string
          service_type: string[]
          special_notes: string | null
          start_time: string
          status: string
          subtotal: number
          surge_amount: number | null
          total: number
          updated_at: string
          user_id: string | null
          was_refunded: boolean | null
        }
        Insert: {
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
          patient_address: string
          patient_name: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string
          pickup_address?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_first_name?: string | null
          scheduled_date: string
          service_type: string[]
          special_notes?: string | null
          start_time: string
          status?: string
          subtotal: number
          surge_amount?: number | null
          total: number
          updated_at?: string
          user_id?: string | null
          was_refunded?: boolean | null
        }
        Update: {
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
          patient_address?: string
          patient_name?: string
          patient_postal_code?: string | null
          patient_relationship?: string | null
          payment_status?: string
          pickup_address?: string | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          psw_assigned?: string | null
          psw_first_name?: string | null
          scheduled_date?: string
          service_type?: string[]
          special_notes?: string | null
          start_time?: string
          status?: string
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
        ]
      }
      psw_profiles: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          available_shifts: string | null
          certifications: string | null
          created_at: string | null
          email: string
          expired_due_to_police_check: boolean | null
          first_name: string
          gender: string | null
          has_own_transport: string | null
          home_city: string | null
          home_postal_code: string | null
          hscpoa_number: string | null
          id: string
          languages: string[] | null
          last_name: string
          license_plate: string | null
          phone: string | null
          police_check_date: string | null
          police_check_name: string | null
          police_check_url: string | null
          profile_photo_name: string | null
          profile_photo_url: string | null
          updated_at: string | null
          vehicle_disclaimer: Json | null
          vetting_notes: string | null
          vetting_status: string | null
          vetting_updated_at: string | null
          years_experience: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          available_shifts?: string | null
          certifications?: string | null
          created_at?: string | null
          email: string
          expired_due_to_police_check?: boolean | null
          first_name: string
          gender?: string | null
          has_own_transport?: string | null
          home_city?: string | null
          home_postal_code?: string | null
          hscpoa_number?: string | null
          id?: string
          languages?: string[] | null
          last_name: string
          license_plate?: string | null
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          vehicle_disclaimer?: Json | null
          vetting_notes?: string | null
          vetting_status?: string | null
          vetting_updated_at?: string | null
          years_experience?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          available_shifts?: string | null
          certifications?: string | null
          created_at?: string | null
          email?: string
          expired_due_to_police_check?: boolean | null
          first_name?: string
          gender?: string | null
          has_own_transport?: string | null
          home_city?: string | null
          home_postal_code?: string | null
          hscpoa_number?: string | null
          id?: string
          languages?: string[] | null
          last_name?: string
          license_plate?: string | null
          phone?: string | null
          police_check_date?: string | null
          police_check_name?: string | null
          police_check_url?: string | null
          profile_photo_name?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          vehicle_disclaimer?: Json | null
          vetting_notes?: string | null
          vetting_status?: string | null
          vetting_updated_at?: string | null
          years_experience?: string | null
        }
        Relationships: []
      }
      service_tasks: {
        Row: {
          allotted_time_minutes: number
          created_at: string
          extra_charge: number
          id: string
          is_active: boolean
          task_name: string
          updated_at: string
        }
        Insert: {
          allotted_time_minutes?: number
          created_at?: string
          extra_charge?: number
          id?: string
          is_active?: boolean
          task_name: string
          updated_at?: string
        }
        Update: {
          allotted_time_minutes?: number
          created_at?: string
          extra_charge?: number
          id?: string
          is_active?: boolean
          task_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
