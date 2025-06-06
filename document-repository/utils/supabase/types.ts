export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          size: number
          type: string
          upload_metadata: Json
          extraction_metadata: Json
          processing_status: string
          extracted_text: string | null
          extracted_chunks: Json[] | null
          embedding_vectors: Json[] | null
        }
        Insert: {
          id: string
          created_at?: string
          user_id: string
          name: string
          size: number
          type: string
          upload_metadata?: Json
          extraction_metadata?: Json
          processing_status?: string
          extracted_text?: string | null
          extracted_chunks?: Json[] | null
          embedding_vectors?: Json[] | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          name?: string
          size?: number
          type?: string
          upload_metadata?: Json
          extraction_metadata?: Json
          processing_status?: string
          extracted_text?: string | null
          extracted_chunks?: Json[] | null
          embedding_vectors?: Json[] | null
        }
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
  }
} 