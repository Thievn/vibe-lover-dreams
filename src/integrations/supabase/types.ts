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
          generated_image_id: string | null
          id: string
          image_prompt: string | null
          image_url: string | null
          lovense_command: Json | null
          role: string
          tts_audio_url: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          companion_id: string
          content: string
          created_at?: string
          generated_image_id?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          lovense_command?: Json | null
          role: string
          tts_audio_url?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          companion_id?: string
          content?: string
          created_at?: string
          generated_image_id?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          lovense_command?: Json | null
          role?: string
          tts_audio_url?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_generated_image_id_fkey"
            columns: ["generated_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      backstory_regen_queue: {
        Row: {
          backstory_chars: number
          id: string
          name: string | null
          notes: string | null
          processed_at: string | null
          queued_at: string
          record_id: string
          source_table: string
        }
        Insert: {
          backstory_chars: number
          id?: string
          name?: string | null
          notes?: string | null
          processed_at?: string | null
          queued_at?: string
          record_id: string
          source_table: string
        }
        Update: {
          backstory_chars?: number
          id?: string
          name?: string | null
          notes?: string | null
          processed_at?: string | null
          queued_at?: string
          record_id?: string
          source_table?: string
        }
        Relationships: []
      }
      companions: {
        Row: {
          animated_image_url: string | null
          profile_loop_video_enabled: boolean
          appearance: string
          backstory: string
          bio: string
          created_at: string
          display_traits: Json
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
          nude_tensor_render_group: string | null
          orientation: string
          personality: string
          rarity: string
          rarity_border_overlay_url: string | null
          role: string
          static_image_url: string | null
          system_prompt: string
          tagline: string
          tags: string[]
          tcg_stats: Json | null
          updated_at: string
        }
        Insert: {
          animated_image_url?: string | null
          profile_loop_video_enabled?: boolean
          appearance?: string
          backstory?: string
          bio?: string
          created_at?: string
          display_traits?: Json
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
          nude_tensor_render_group?: string | null
          orientation?: string
          personality?: string
          rarity?: string
          rarity_border_overlay_url?: string | null
          role?: string
          static_image_url?: string | null
          system_prompt?: string
          tagline?: string
          tags?: string[]
          tcg_stats?: Json | null
          updated_at?: string
        }
        Update: {
          animated_image_url?: string | null
          profile_loop_video_enabled?: boolean
          appearance?: string
          backstory?: string
          bio?: string
          created_at?: string
          display_traits?: Json
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
          nude_tensor_render_group?: string | null
          orientation?: string
          personality?: string
          rarity?: string
          rarity_border_overlay_url?: string | null
          role?: string
          static_image_url?: string | null
          system_prompt?: string
          tagline?: string
          tags?: string[]
          tcg_stats?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_characters: {
        Row: {
          animated_image_url: string | null
          profile_loop_video_enabled: boolean
          appearance: string
          approved: boolean
          avatar_url: string | null
          backstory: string
          bio: string
          created_at: string
          display_traits: Json
          exclude_from_personal_vault: boolean
          fantasy_starters: Json
          gallery_credit_name: string | null
          gender: string
          identity_anatomy_detail: string | null
          gradient_from: string
          gradient_to: string
          id: string
          image_prompt: string | null
          image_url: string | null
          is_nexus_hybrid: boolean
          is_public: boolean
          kinks: string[]
          lineage_parent_ids: string[] | null
          merge_stats: Json | null
          name: string
          nexus_cooldown_until: string | null
          nude_tensor_render_group: string | null
          orientation: string
          personality: string
          personality_forge: Json
          personality_archetypes: string[] | null
          rarity: string
          rarity_border_overlay_url: string | null
          role: string
          static_image_url: string | null
          system_prompt: string
          tagline: string
          tags: string[]
          tcg_stats: Json | null
          tts_voice_preset: string | null
          updated_at: string
          user_id: string
          vibe_theme_selections: string[] | null
        }
        Insert: {
          animated_image_url?: string | null
          profile_loop_video_enabled?: boolean
          appearance?: string
          approved?: boolean
          avatar_url?: string | null
          backstory?: string
          bio?: string
          created_at?: string
          display_traits?: Json
          exclude_from_personal_vault?: boolean
          fantasy_starters?: Json
          gallery_credit_name?: string | null
          gender?: string
          identity_anatomy_detail?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_nexus_hybrid?: boolean
          is_public?: boolean
          kinks?: string[]
          lineage_parent_ids?: string[] | null
          merge_stats?: Json | null
          name: string
          nexus_cooldown_until?: string | null
          nude_tensor_render_group?: string | null
          orientation?: string
          personality?: string
          personality_forge?: Json
          personality_archetypes?: string[] | null
          rarity?: string
          rarity_border_overlay_url?: string | null
          role?: string
          static_image_url?: string | null
          system_prompt?: string
          tagline?: string
          tags?: string[]
          tcg_stats?: Json | null
          tts_voice_preset?: string | null
          updated_at?: string
          user_id: string
          vibe_theme_selections?: string[] | null
        }
        Update: {
          animated_image_url?: string | null
          profile_loop_video_enabled?: boolean
          appearance?: string
          approved?: boolean
          avatar_url?: string | null
          backstory?: string
          bio?: string
          created_at?: string
          display_traits?: Json
          exclude_from_personal_vault?: boolean
          fantasy_starters?: Json
          gallery_credit_name?: string | null
          gender?: string
          identity_anatomy_detail?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_nexus_hybrid?: boolean
          is_public?: boolean
          kinks?: string[]
          lineage_parent_ids?: string[] | null
          merge_stats?: Json | null
          name?: string
          nexus_cooldown_until?: string | null
          nude_tensor_render_group?: string | null
          orientation?: string
          personality?: string
          personality_forge?: Json
          personality_archetypes?: string[] | null
          rarity?: string
          rarity_border_overlay_url?: string | null
          role?: string
          static_image_url?: string | null
          system_prompt?: string
          tagline?: string
          tags?: string[]
          tcg_stats?: Json | null
          tts_voice_preset?: string | null
          updated_at?: string
          user_id?: string
          vibe_theme_selections?: string[] | null
        }
        Relationships: []
      }
      companion_discovery_votes: {
        Row: {
          companion_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          vote: number
        }
        Insert: {
          companion_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          vote: number
        }
        Update: {
          companion_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          vote?: number
        }
        Relationships: []
      }
      companion_gifts: {
        Row: {
          companion_id: string
          created_at: string
          gift_data: Json
          gift_type: string
          id: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          gift_data: Json
          gift_type: string
          id?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          gift_data?: Json
          gift_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      companion_portraits: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_public: boolean
          name: string | null
          prompt: string
          style: string | null
          subtitle: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_public?: boolean
          name?: string | null
          prompt: string
          style?: string | null
          subtitle?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_public?: boolean
          name?: string | null
          prompt?: string
          style?: string | null
          subtitle?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companion_relationships: {
        Row: {
          affection_level: number
          breeding_progress: number
          breeding_stage: number
          chat_affection_level: number
          chat_affection_progress: number
          companion_id: string
          created_at: string
          id: string
          last_interaction: string
          tts_voice_preset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affection_level?: number
          breeding_progress?: number
          breeding_stage?: number
          chat_affection_level?: number
          chat_affection_progress?: number
          companion_id: string
          created_at?: string
          id?: string
          last_interaction?: string
          tts_voice_preset?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affection_level?: number
          breeding_progress?: number
          breeding_stage?: number
          chat_affection_level?: number
          chat_affection_progress?: number
          companion_id?: string
          created_at?: string
          id?: string
          last_interaction?: string
          tts_voice_preset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companion_vibration_patterns: {
        Row: {
          companion_id: string
          created_at: string
          display_name: string
          id: string
          is_abyssal_signature: boolean
          pool_pattern_id: string
          sort_order: number
        }
        Insert: {
          companion_id: string
          created_at?: string
          display_name: string
          id?: string
          is_abyssal_signature?: boolean
          pool_pattern_id: string
          sort_order: number
        }
        Update: {
          companion_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_abyssal_signature?: boolean
          pool_pattern_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      marketing_social_settings: {
        Row: {
          auto_process_forge_queue: boolean
          id: number
          updated_at: string
          use_looping_video_for_x: boolean
          zernio_twitter_account_id: string | null
        }
        Insert: {
          auto_process_forge_queue?: boolean
          id?: number
          updated_at?: string
          use_looping_video_for_x?: boolean
          zernio_twitter_account_id?: string | null
        }
        Update: {
          auto_process_forge_queue?: boolean
          id?: number
          updated_at?: string
          use_looping_video_for_x?: boolean
          zernio_twitter_account_id?: string | null
        }
        Relationships: []
      }
      social_post_jobs: {
        Row: {
          companion_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          kind: string
          media_urls: Json | null
          scheduled_for: string | null
          status: string
          zernio_post_id: string | null
          zernio_response: Json | null
        }
        Insert: {
          companion_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind: string
          media_urls?: Json | null
          scheduled_for?: string | null
          status?: string
          zernio_post_id?: string | null
          zernio_response?: Json | null
        }
        Update: {
          companion_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind?: string
          media_urls?: Json | null
          scheduled_for?: string | null
          status?: string
          zernio_post_id?: string | null
          zernio_response?: Json | null
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          companion_id: string | null
          created_at: string
          id: string
          image_url: string
          is_video: boolean
          original_prompt: string | null
          prompt: string
          saved_to_companion_gallery: boolean | null
          saved_to_personal_gallery: boolean | null
          style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          companion_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_video?: boolean
          original_prompt?: string | null
          prompt: string
          saved_to_companion_gallery?: boolean | null
          saved_to_personal_gallery?: boolean | null
          style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          companion_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_video?: boolean
          original_prompt?: string | null
          prompt?: string
          saved_to_companion_gallery?: boolean | null
          saved_to_personal_gallery?: boolean | null
          style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_companion_portrait_overrides: {
        Row: {
          companion_id: string
          portrait_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          companion_id: string
          portrait_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          portrait_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lovense_pairings: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          pairing_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          pairing_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          pairing_token?: string
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
          tts_voice_global_override: string | null
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
          tts_voice_global_override?: string | null
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
          tts_voice_global_override?: string | null
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
      user_discover_pins: {
        Row: {
          companion_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_transactions: {
        Row: {
          id: string
          user_id: string
          credits_change: number
          balance_after: number
          transaction_type: string
          description: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credits_change: number
          balance_after: number
          transaction_type: string
          description?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credits_change?: number
          balance_after?: number
          transaction_type?: string
          description?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_lovense_toys: {
        Row: {
          battery: number | null
          capabilities: string[]
          created_at: string
          device_uid: string
          display_name: string
          enabled: boolean
          id: string
          image_url: string | null
          nickname: string | null
          toy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battery?: number | null
          capabilities?: string[]
          created_at?: string
          device_uid: string
          display_name: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          nickname?: string | null
          toy_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battery?: number | null
          capabilities?: string[]
          created_at?: string
          device_uid?: string
          display_name?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          nickname?: string | null
          toy_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vibration_pattern_pool: {
        Row: {
          created_at: string
          id: string
          internal_label: string
          payload: Json
          pool_index: number
          vibe_family: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          internal_label: string
          payload: Json
          pool_index: number
          vibe_family?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          internal_label?: string
          payload?: Json
          pool_index?: number
          vibe_family?: string | null
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
      resolve_login_email: {
        Args: {
          p_login: string
        }
        Returns: string | null
      }
      is_display_name_available: {
        Args: {
          p_name: string
          p_exclude_user_id?: string | null
        }
        Returns: boolean
      }
      admin_reassign_vibration_patterns: {
        Args: {
          p_companion_id: string
        }
        Returns: undefined
      }
      admin_backfill_missing_vibration_patterns: {
        Args: Record<string, never>
        Returns: number
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
