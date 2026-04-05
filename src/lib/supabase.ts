import { createClient } from "@supabase/supabase-js";

export type TransactionType = "income" | "expense" | "asset";
export type AssetFundingSource = "cash" | "equity" | "debt";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransactionRow {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  asset_name: string | null;
  funding_source: AssetFundingSource | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransactionInsert {
  user_id?: string;
  transaction_type: TransactionType;
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  asset_name?: string | null;
  funding_source?: AssetFundingSource | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
