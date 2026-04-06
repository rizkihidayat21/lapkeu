import { createClient } from "@supabase/supabase-js";

export type TransactionType = "income" | "expense" | "asset";
export type AssetFundingSource = "cash" | "equity" | "debt";
export type AccountClass = "asset" | "liability" | "equity" | "revenue" | "expense";
export type JournalSource = "income" | "expense" | "asset" | "opening_balance" | "manual";
export type JournalLineType = "debit" | "credit";

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

export interface AccountRow {
  id: string;
  user_id: string;
  code: string;
  name: string;
  account_class: AccountClass;
  account_category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLineRow {
  id: string;
  journal_entry_id: string;
  account_id: string;
  line_type: JournalLineType;
  amount: number;
  memo: string | null;
  created_at: string;
  accounts?: AccountRow;
}

export interface JournalEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  description: string;
  source: JournalSource;
  created_at: string;
  updated_at: string;
  journal_entry_lines: JournalEntryLineRow[];
}

export interface JournalLineInput {
  account_id: string;
  line_type: JournalLineType;
  amount: number;
  memo?: string;
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
