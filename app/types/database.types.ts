export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
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
          full_name: string | null
          id: string
          phone: string | null
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          user_name?: string | null
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
          audience: string | null
          campaign: string | null
          costo: number | null
          created_at: string | null
          current_players: number | null
          description: string | null
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
          system: string | null
          title: string
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          audience?: string | null
          campaign?: string | null
          costo?: number | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
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
          system?: string | null
          title: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          audience?: string | null
          campaign?: string | null
          costo?: number | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
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
          system?: string | null
          title?: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_sessions_master_id_fkey'
            columns: ['master_id']
            isOneToOne: false
            referencedRelation: 'dagger_masters'
            referencedColumns: ['id']
          }
        ]
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
    Enums: {}
  }
} as const
