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
      chat_messages: {
        Row: {
          companion_id: string
          content: string
          created_at: string
          id: string
          lovense_command: Json | null
          role: string
          user_id: string
        }
        Insert: {
          companion_id: string
          content: string
          created_at?: string
          id?: string
          lovense_command?: Json | null
          role: string
          user_id: string
        }
        Update: {
          companion_id?: string
          content?: string
          created_at?: string
          id?: string
          lovense_command?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      companions: {
        Row: {
          appearance: string
          bio: string
          created_at: string
          fantasy_starters: Json
          gender: string
          gradient_from: string
          gradient_to: string
          id: string
          image_prompt: string | null
          image_url: string | null
          is_active: boolean
          kinks: string[]
          name: string
          orientation: string
          personality: string
          role: string
          system_prompt: string
          tagline: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          appearance?: string
          bio?: string
          created_at?: string
          fantasy_starters?: Json
          gender?: string
          gradient_from?: string
          gradient_to?: string
          id: string
          image_prompt?: string | null
          image_url?: string | null
          is_active?: boolean
          kinks?: string[]
          name: string
          orientation?: string
          personality?: string
          role?: string
          system_prompt?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          appearance?: string
          bio?: string
          created_at?: string
          fantasy_starters?: Json
          gender?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_active?: boolean
          kinks?: string[]
          name?: string
          orientation?: string
          personality?: string
          role?: string
          system_prompt?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      custom_characters: {
        Row: {
          appearance: string
          approved: boolean
          avatar_url: string | null
          bio: string
          created_at: string
          fantasy_starters: Json
          gender: string
          gradient_from: string
          gradient_to: string
          id: string
          image_prompt: string | null
          image_url: string | null
          is_public: boolean
          kinks: string[]
          name: string
          orientation: string
          personality: string
          role: string
          system_prompt: string
          tagline: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance?: string
          approved?: boolean
          avatar_url?: string | null
          bio?: string
          created_at?: string
          fantasy_starters?: Json
          gender?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_public?: boolean
          kinks?: string[]
          name: string
          orientation?: string
          personality?: string
          role?: string
          system_prompt?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance?: string
          approved?: boolean
          avatar_url?: string | null
          bio?: string
          created_at?: string
          fantasy_starters?: Json
          gender?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_public?: boolean
          kinks?: string[]
          name?: string
          orientation?: string
          personality?: string
          role?: string
          system_prompt?: string
          tagline?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          device_uid: string | null
          display_name: string | null
          id: string
          stripe_customer_id: string | null
          tier: string
          tokens_balance: number
          tokens_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_uid?: string | null
          display_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          tier?: string
          tokens_balance?: number
          tokens_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_uid?: string | null
          display_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          tier?: string
          tokens_balance?: number
          tokens_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
