export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExerciseType =
  | "info"
  | "listen"
  | "tweak"
  | "match_sound"
  | "quiz_mc"
  | "quiz_param"
  | "free_play"
  | "adsr_display"
  | "filter_display"
  | "waveform_display";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          xp: number;
          level: number;
          streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          xp?: number;
          level?: number;
          streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          xp?: number;
          level?: number;
          streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          difficulty: "beginner" | "intermediate" | "advanced";
          sort_order: number;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          difficulty: "beginner" | "intermediate" | "advanced";
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          difficulty?: "beginner" | "intermediate" | "advanced";
          sort_order?: number;
          icon?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      synth_models: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          engine_type: string;
          engine_config: Json;
          default_params: Json;
          all_params: string[];
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          engine_type: string;
          engine_config: Json;
          default_params: Json;
          all_params: string[];
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          engine_type?: string;
          engine_config?: Json;
          default_params?: Json;
          all_params?: string[];
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "synth_models_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      // LEGACY: pre-static-content lesson schema. Not used by new course flow.
      // Kept until DB migration drops these tables. Do NOT import in new code.
      lessons: {
        Row: {
          id: string;
          synth_model_id: string;
          title: string;
          slug: string;
          description: string | null;
          sort_order: number;
          xp_reward: number;
          unlocks_params: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          synth_model_id: string;
          title: string;
          slug: string;
          description?: string | null;
          sort_order?: number;
          xp_reward?: number;
          unlocks_params?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          synth_model_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          sort_order?: number;
          xp_reward?: number;
          unlocks_params?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_synth_model_id_fkey";
            columns: ["synth_model_id"];
            isOneToOne: false;
            referencedRelation: "synth_models";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          lesson_id: string;
          exercise_type: ExerciseType;
          sort_order: number;
          title: string | null;
          instructions: string;
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          exercise_type: ExerciseType;
          sort_order?: number;
          title?: string | null;
          instructions: string;
          content?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          exercise_type?: ExerciseType;
          sort_order?: number;
          title?: string | null;
          instructions?: string;
          content?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_synths: {
        Row: {
          id: string;
          user_id: string;
          synth_model_id: string;
          unlocked_params: string[];
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          synth_model_id: string;
          unlocked_params?: string[];
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          synth_model_id?: string;
          unlocked_params?: string[];
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_synths_synth_model_id_fkey";
            columns: ["synth_model_id"];
            isOneToOne: false;
            referencedRelation: "synth_models";
            referencedColumns: ["id"];
          },
        ];
      };
      user_lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          status: "locked" | "available" | "in_progress" | "completed";
          score: number | null;
          xp_earned: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          status?: string;
          score?: number | null;
          xp_earned?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          status?: string;
          score?: number | null;
          xp_earned?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_exercise_progress: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          completed: boolean;
          answer: Json | null;
          score: number | null;
          attempts: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          completed?: boolean;
          answer?: Json | null;
          score?: number | null;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          completed?: boolean;
          answer?: Json | null;
          score?: number | null;
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_exercise_progress_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_lesson: {
        Args: { p_lesson_id: string; p_score?: number };
        Returns: Json;
      };
    };
    Enums: {
      difficulty_level: "beginner" | "intermediate" | "advanced";
      exercise_type: ExerciseType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type SynthModel = Database["public"]["Tables"]["synth_models"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type UserSynth = Database["public"]["Tables"]["user_synths"]["Row"];
export type UserLessonProgress = Database["public"]["Tables"]["user_lesson_progress"]["Row"];
export type UserExerciseProgress = Database["public"]["Tables"]["user_exercise_progress"]["Row"];
