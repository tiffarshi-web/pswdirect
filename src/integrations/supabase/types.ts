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
