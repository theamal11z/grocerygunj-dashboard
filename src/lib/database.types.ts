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
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          phone_number: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          category_id: string | null
          image_urls: string[] | null
          in_stock: boolean
          unit: string
          discount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          category_id?: string | null
          image_urls?: string[] | null
          in_stock?: boolean
          unit: string
          discount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          category_id?: string | null
          image_urls?: string[] | null
          in_stock?: boolean
          unit?: string
          discount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          image_url?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          total_amount: number
          delivery_fee: number
          is_cash_on_delivery: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          total_amount: number
          delivery_fee?: number
          is_cash_on_delivery?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          total_amount?: number
          delivery_fee?: number
          is_cash_on_delivery?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          unit_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
          created_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string | null
          type: string
          address: string
          area: string
          city: string
          is_default: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          address: string
          area: string
          city: string
          is_default?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          address?: string
          area?: string
          city?: string
          is_default?: boolean | null
          created_at?: string
        }
      }
      wishlists: {
        Row: {
          id: string
          user_id: string | null
          product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          created_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          title: string
          code: string
          discount: string
          description: string | null
          valid_until: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          code: string
          discount: string
          description?: string | null
          valid_until: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          code?: string
          discount?: string
          description?: string | null
          valid_until?: string
          image_url?: string | null
          created_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string | null
          type: string
          last_four: string | null
          expiry_date: string | null
          is_default: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          last_four?: string | null
          expiry_date?: string | null
          is_default?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          last_four?: string | null
          expiry_date?: string | null
          is_default?: boolean | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          title: string
          message: string
          type: string
          read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          message: string
          type: string
          read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          message?: string
          type?: string
          read?: boolean | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          settings_data: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          settings_data?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          settings_data?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
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