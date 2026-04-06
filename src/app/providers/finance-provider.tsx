import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  supabase,
  type AccountRow,
  type FinancialTransactionRow,
  type JournalEntryRow,
  type JournalLineInput,
  type JournalSource,
} from "../../lib/supabase";
import { useAuth } from "./auth-provider";
import { buildLegacyJournalPayload } from "../../lib/finance";

interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  source: JournalSource;
  lines: JournalLineInput[];
}

interface FinanceContextValue {
  accounts: AccountRow[];
  journalEntries: JournalEntryRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createJournalEntry: (payload: CreateJournalEntryInput) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function sortEntries(items: JournalEntryRow[]) {
  return [...items].sort((a, b) => {
    if (a.entry_date === b.entry_date) {
      return b.created_at.localeCompare(a.created_at);
    }
    return b.entry_date.localeCompare(a.entry_date);
  });
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!supabase || !user) {
      setAccounts([]);
      setJournalEntries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: ensureError } = await supabase.rpc("ensure_default_accounts");
    if (ensureError) {
      setError(ensureError.message);
      setIsLoading(false);
      return;
    }

    const [
      { data: accountsData, error: accountsError },
      { data: entriesData, error: entriesError },
      { data: legacyTransactions, error: legacyError },
    ] =
      await Promise.all([
        supabase.from("accounts").select("*").order("code", { ascending: true }),
        supabase
          .from("journal_entries")
          .select("*, journal_entry_lines(*, accounts(*))")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("financial_transactions")
          .select("*")
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    if (accountsError || entriesError || legacyError) {
      setError(
        accountsError?.message ??
          entriesError?.message ??
          legacyError?.message ??
          "Gagal memuat data keuangan.",
      );
      setIsLoading(false);
      return;
    }

    const nextAccounts = (accountsData ?? []) as AccountRow[];
    let nextEntries = sortEntries((entriesData ?? []) as JournalEntryRow[]);

    if (nextEntries.length === 0 && (legacyTransactions?.length ?? 0) > 0) {
      for (const legacyTransaction of (legacyTransactions ?? []) as FinancialTransactionRow[]) {
        const result = buildLegacyJournalPayload(nextAccounts, legacyTransaction);
        if (!result.ok) {
          continue;
        }

        const { error: rpcError } = await supabase.rpc("create_balanced_journal_entry", {
          p_entry_date: result.value.entryDate,
          p_description: result.value.description,
          p_source: result.value.source,
          p_lines: result.value.lines,
        });

        if (rpcError) {
          setError(rpcError.message);
          setIsLoading(false);
          return;
        }
      }

      const { data: backfilledEntries, error: backfillFetchError } = await supabase
        .from("journal_entries")
        .select("*, journal_entry_lines(*, accounts(*))")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (backfillFetchError) {
        setError(backfillFetchError.message);
        setIsLoading(false);
        return;
      }

      nextEntries = sortEntries((backfilledEntries ?? []) as JournalEntryRow[]);
    }

    setAccounts(nextAccounts);
    setJournalEntries(nextEntries);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!isConfigured || !user) {
      setAccounts([]);
      setJournalEntries([]);
      setIsLoading(false);
      return;
    }

    refresh();
  }, [isConfigured, user?.id]);

  async function createJournalEntry(payload: CreateJournalEntryInput) {
    if (!supabase || !user) {
      throw new Error("Supabase belum dikonfigurasi.");
    }

    const { data, error: rpcError } = await supabase.rpc("create_balanced_journal_entry", {
      p_entry_date: payload.entryDate,
      p_description: payload.description,
      p_source: payload.source,
      p_lines: payload.lines,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    const { data: insertedEntry, error: fetchError } = await supabase
      .from("journal_entries")
      .select("*, journal_entry_lines(*, accounts(*))")
      .eq("id", data)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    setJournalEntries((current) => sortEntries([insertedEntry as JournalEntryRow, ...current]));
  }

  async function deleteJournalEntry(id: string) {
    if (!supabase || !user) {
      throw new Error("Supabase belum dikonfigurasi.");
    }

    const { error: deleteError } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setJournalEntries((current) => current.filter((item) => item.id !== id));
  }

  const value = useMemo<FinanceContextValue>(
    () => ({
      accounts,
      journalEntries,
      isLoading,
      error,
      refresh,
      createJournalEntry,
      deleteJournalEntry,
    }),
    [accounts, journalEntries, isLoading, error],
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
