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
      customer_addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          house_number: string
          id: string
          is_default: boolean
          label: string | null
          neighborhood: string | null
          profile_id: string
          street: string
          updated_at: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          house_number: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood?: string | null
          profile_id: string
          street: string
          updated_at?: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          house_number?: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood?: string | null
          profile_id?: string
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          id: string
          last_cpf: string | null
          last_email: string | null
          last_order_type: string | null
          last_payment_method: string | null
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_cpf?: string | null
          last_email?: string | null
          last_order_type?: string | null
          last_payment_method?: string | null
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_cpf?: string | null
          last_email?: string | null
          last_order_type?: string | null
          last_payment_method?: string | null
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          daily_order_number: number | null
          delivery_info: Json | null
          id: string
          items: Json
          notes: string | null
          order_date: string | null
          order_number: number
          order_type: string
          payment_status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          daily_order_number?: number | null
          delivery_info?: Json | null
          id?: string
          items: Json
          notes?: string | null
          order_date?: string | null
          order_number?: number
          order_type?: string
          payment_status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          daily_order_number?: number | null
          delivery_info?: Json | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string | null
          order_number?: number
          order_type?: string
          payment_status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          mercadopago_payment_id: string | null
          method: string
          order_id: string
          payment_details: Json | null
          pix_key: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          method?: string
          order_id: string
          payment_details?: Json | null
          pix_key?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          method?: string
          order_id?: string
          payment_details?: Json | null
          pix_key?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_payment_by_order: {
        Args: { order_uuid: string }
        Returns: {
          amount: number
          expires_at: string
          payment_id: string
          pix_key: string
          qr_code_base64: string
          status: string
        }[]
      }
      mark_payment_approved: {
        Args: { p_mp_data: Json; p_payment_id: string }
        Returns: undefined
      }
      sync_payment_status: {
        Args: {
          p_mp_data: Json
          p_order_status: string
          p_payment_id: string
          p_payment_status: string
        }
        Returns: undefined
      }
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
