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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      perfumes: {
        Row: {
          category: Database["public"]["Enums"]["perfume_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          purchase_price: number
          selling_price: number
          stock_quantity: number
          updated_at: string
          volume_ml: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["perfume_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          purchase_price?: number
          selling_price?: number
          stock_quantity?: number
          updated_at?: string
          volume_ml?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["perfume_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          purchase_price?: number
          selling_price?: number
          stock_quantity?: number
          updated_at?: string
          volume_ml?: number | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          quantity_required: number
          updated_at: string
          volume_ml: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          quantity_required: number
          updated_at?: string
          volume_ml: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          quantity_required?: number
          updated_at?: string
          volume_ml?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          perfume_id: string
          perfume_name: string
          profit: number
          promo_group_id: string | null
          promo_id: string | null
          promo_name: string | null
          quantity: number
          seller_id: string
          seller_name: string | null
          total: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          perfume_id: string
          perfume_name: string
          profit?: number
          promo_group_id?: string | null
          promo_id?: string | null
          promo_name?: string | null
          quantity: number
          seller_id: string
          seller_name?: string | null
          total: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          perfume_id?: string
          perfume_name?: string
          profit?: number
          promo_group_id?: string | null
          promo_id?: string | null
          promo_name?: string | null
          quantity?: number
          seller_id?: string
          seller_name?: string | null
          total?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          status: "pending" | "confirmed" | "cancelled"
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          status?: "pending" | "confirmed" | "cancelled"
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          status?: "pending" | "confirmed" | "cancelled"
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      guest_order_items: {
        Row: {
          id: string
          order_id: string
          perfume_id: string | null
          perfume_name: string
          promo_id: string | null
          promo_name: string | null
          quantity: number
          unit_price: number
          total: number
          volume_ml: number | null
        }
        Insert: {
          id?: string
          order_id: string
          perfume_id?: string | null
          perfume_name: string
          promo_id?: string | null
          promo_name?: string | null
          quantity: number
          unit_price: number
          total: number
          volume_ml?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          perfume_id?: string | null
          perfume_name?: string
          promo_id?: string | null
          promo_name?: string | null
          quantity?: number
          unit_price?: number
          total?: number
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "guest_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_order_items_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_order_items_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promotions"
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendeur"
      guest_order_status: "pending" | "confirmed" | "cancelled"
      payment_method: "wave" | "orange_money" | "especes" | "carte" | "virement"
      perfume_category: "homme" | "femme" | "mixte"
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
      app_role: ["admin", "vendeur"],
      guest_order_status: ["pending", "confirmed", "cancelled"],
      payment_method: ["wave", "orange_money", "especes", "carte", "virement"],
      perfume_category: ["homme", "femme", "mixte"],
    },
  },
} as const
