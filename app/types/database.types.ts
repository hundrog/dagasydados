export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admins_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'dagger_masters'
            referencedColumns: ['id']
          }
        ]
      }
      dagger_masters: {
        Row: {
          avatar_url: string | null
          created_at: string
          descripcion: string | null
          full_name: string | null
          id: string
          phone: string | null
          plataforma_pago: string | null
          plataforma_pago_cuenta: string | null
          profile: Json | null
          role?: Database['public']['Enums']['profile_role'] | null
          status: Database['public']['Enums']['master_status']
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          descripcion?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plataforma_pago?: string | null
          plataforma_pago_cuenta?: string | null
          profile?: Json | null
          role?: Database['public']['Enums']['profile_role'] | null
          status?: Database['public']['Enums']['master_status']
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          descripcion?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plataforma_pago?: string | null
          plataforma_pago_cuenta?: string | null
          profile?: Json | null
          role?: Database['public']['Enums']['profile_role'] | null
          status?: Database['public']['Enums']['master_status']
          user_name?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          fecha_fin: string
          fecha_inicio: string
          featured: boolean
          highlight_sessions: boolean
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          image_url: string | null
          name: string
          short_code: string | null
          show_text: boolean
          slug: string | null
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fecha_fin: string
          fecha_inicio: string
          featured?: boolean
          highlight_sessions?: boolean
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          image_url?: string | null
          name: string
          short_code?: string | null
          show_text?: boolean
          slug?: string | null
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          featured?: boolean
          highlight_sessions?: boolean
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          image_url?: string | null
          name?: string
          short_code?: string | null
          show_text?: boolean
          slug?: string | null
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: []
      }
      game_exceptions: {
        Row: {
          creado_en: string | null
          fecha: string
          id: string
          nueva_descripcion: string | null
          nueva_hora_fin: string | null
          nueva_hora_inicio: string | null
          nueva_location: string | null
          razon: string | null
          session_id: string
          tipo: string | null
        }
        Insert: {
          creado_en?: string | null
          fecha: string
          id?: string
          nueva_descripcion?: string | null
          nueva_hora_fin?: string | null
          nueva_hora_inicio?: string | null
          nueva_location?: string | null
          razon?: string | null
          session_id: string
          tipo?: string | null
        }
        Update: {
          creado_en?: string | null
          fecha?: string
          id?: string
          nueva_descripcion?: string | null
          nueva_hora_fin?: string | null
          nueva_hora_inicio?: string | null
          nueva_location?: string | null
          razon?: string | null
          session_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_exceptions_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'game_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      game_sessions: {
        Row: {
          anonymous_players: number
          audience: string | null
          campaign: string | null
          costo: number | null
          created_at: string | null
          description: string | null
          event_id: string | null
          fecha_inicio: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          image_url: string | null
          location: string | null
          master_id: string
          max_players: number | null
          mode: string | null
          rrule: string | null
          session_type: string | null
          status: Database['public']['Enums']['session_status']
          system: string | null
          title: string
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          anonymous_players?: number
          audience?: string | null
          campaign?: string | null
          costo?: number | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          fecha_inicio: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          master_id: string
          max_players?: number | null
          mode?: string | null
          rrule?: string | null
          session_type?: string | null
          status?: Database['public']['Enums']['session_status']
          system?: string | null
          title: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          anonymous_players?: number
          audience?: string | null
          campaign?: string | null
          costo?: number | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          fecha_inicio?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          master_id?: string
          max_players?: number | null
          mode?: string | null
          rrule?: string | null
          session_type?: string | null
          status?: Database['public']['Enums']['session_status']
          system?: string | null
          title?: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_sessions_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_sessions_master_id_fkey'
            columns: ['master_id']
            isOneToOne: false
            referencedRelation: 'dagger_masters'
            referencedColumns: ['id']
          }
        ]
      }
      session_players: {
        Row: {
          created_at: string | null
          game_session_id: string
          id: string
          nombre: string
          telefono: string | null
          telefono_hash: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          game_session_id: string
          id?: string
          nombre: string
          telefono?: string | null
          telefono_hash: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          game_session_id?: string
          id?: string
          nombre?: string
          telefono?: string | null
          telefono_hash?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'session_players_game_session_id_fkey'
            columns: ['game_session_id']
            isOneToOne: false
            referencedRelation: 'game_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          content: string
          excerpt: string | null
          thumbnail: string | null
          author_id: string
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content: string
          excerpt?: string | null
          thumbnail?: string | null
          author_id: string
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: string
          excerpt?: string | null
          thumbnail?: string | null
          author_id?: string
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      blog_posts_tags: {
        Row: {
          post_id: string
          tag_id: number
        }
        Insert: {
          post_id: string
          tag_id: number
        }
        Update: {
          post_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'blog_posts_tags_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'blog_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blog_posts_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'blog_tags'
            referencedColumns: ['id']
          }
        ]
      }
      blog_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blog_likes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'blog_posts'
            referencedColumns: ['id']
          }
        ]
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          depth: number
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          depth?: number
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          depth?: number
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blog_comments_parent_fkey'
            columns: ['post_id', 'parent_id']
            isOneToOne: false
            referencedRelation: 'blog_comments'
            referencedColumns: ['post_id', 'id']
          },
          {
            foreignKeyName: 'blog_comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'blog_posts'
            referencedColumns: ['id']
          }
        ]
      }
      blog_comment_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          comment_id: string
          id: number
          old_content: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          comment_id: string
          id?: never
          old_content: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          comment_id?: string
          id?: never
          old_content?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blog_comment_history_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'blog_comments'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      blog_comment_authors: {
        Args: { p_user_ids: string[] }
        Returns: {
          id: string
          user_name: string | null
          full_name: string | null
          avatar_url: string | null
        }[]
      }
      blog_post_authors: {
        Args: { p_author_ids: string[] }
        Returns: {
          id: string
          user_name: string | null
          full_name: string | null
        }[]
      }
      create_session_player: {
        Args: {
          p_game_session_id: string
          p_nombre: string
          p_telefono: string
        }
        Returns: Json
      }
      create_session_player_manual: {
        Args: {
          p_game_session_id: string
          p_nombre: string
          p_telefono: string
        }
        Returns: Json
      }
      finalize_session_players_hash: { Args: never, Returns: undefined }
      hash_telefono: { Args: { p_telefono: string }, Returns: string }
      request_master_authorization: { Args: never, Returns: undefined }
      session_player_count: { Args: { p_session_id: string }, Returns: number }
      telefono_hmac_secret: { Args: never, Returns: string }
    }
    Enums: {
      master_status: 'created' | 'pending' | 'authorized' | 'rejected'
      profile_role: 'player' | 'master'
      session_status: 'draft' | 'published'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
      ? R
      : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables']
    & DefaultSchema['Views'])
    ? (DefaultSchema['Tables']
      & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
        ? R
        : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema['CompositeTypes']
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      master_status: ['created', 'pending', 'authorized', 'rejected'],
      session_status: ['draft', 'published']
    }
  }
} as const
