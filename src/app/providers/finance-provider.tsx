import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase, type FinancialTransactionInsert, type FinancialTransactionRow } from "../../lib/supabase";
import { useAuth } from "./auth-provider";

interface FinanceContextValue {
  transactions: FinancialTransactionRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTransaction: (payload: FinancialTransactionInsert) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function sortTransactions(items: FinancialTransactionRow[]) {
  return [...items].sort((a, b) => {
    if (a.transaction_date === b.transaction_date) {
      return b.created_at.localeCompare(a.created_at);
    }
    return b.transaction_date.localeCompare(a.transaction_date);
  });
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!supabase || !user) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setTransactions(sortTransactions((data ?? []) as FinancialTransactionRow[]));
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isConfigured || !user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    refresh();
  }, [isConfigured, user?.id]);

  async function createTransaction(payload: FinancialTransactionInsert) {
    if (!supabase || !user) {
      throw new Error("Supabase belum dikonfigurasi.");
    }

    const { data, error: insertError } = await supabase
      .from("financial_transactions")
      .insert({ ...payload, user_id: user.id })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    setTransactions((current) => sortTransactions([data as FinancialTransactionRow, ...current]));
  }

  const value = useMemo<FinanceContextValue>(
    () => ({
      transactions,
      isLoading,
      error,
      refresh,
      createTransaction,
    }),
    [transactions, isLoading, error],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance harus digunakan di dalam FinanceProvider.");
  }
  return context;
}
