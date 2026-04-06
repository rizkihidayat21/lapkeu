import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type {
  AccountClass,
  AccountRow,
  AssetFundingSource,
  FinancialTransactionRow,
  JournalEntryRow,
  JournalLineInput,
} from "./supabase";

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "salary", label: "Gaji Karyawan" },
  { value: "rent", label: "Sewa Kantor" },
  { value: "utilities", label: "Listrik & Internet" },
  { value: "transport", label: "Transportasi" },
  { value: "supplies", label: "ATK & Perlengkapan" },
  { value: "marketing", label: "Pemasaran" },
  { value: "other_expense", label: "Lainnya" },
] as const;

export const ASSET_CATEGORY_OPTIONS = [
  { value: "cash", label: "Kas" },
  { value: "equipment", label: "Peralatan Kantor" },
  { value: "vehicle", label: "Kendaraan" },
  { value: "receivable", label: "Piutang" },
  { value: "inventory", label: "Persediaan" },
  { value: "other_asset", label: "Aset Lainnya" },
] as const;

export const FUNDING_SOURCE_OPTIONS = [
  { value: "cash", label: "Kas Internal" },
  { value: "equity", label: "Modal Pemilik" },
  { value: "debt", label: "Utang / Pembiayaan" },
] as const;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

interface JournalPayload {
  entryDate: string;
  description: string;
  source: "income" | "expense" | "asset" | "opening_balance";
  lines: JournalLineInput[];
}

interface PeriodRange {
  start: Date;
  end: Date;
}

interface TrialBalanceItem {
  account: AccountRow;
  balance: number;
}

interface ReportRow {
  id: string;
  description: string;
  date: string;
  amount: number;
}

interface CashFlowRow {
  id: string;
  keterangan: string;
  jumlah: number;
  klasifikasi: "operasi" | "investasi" | "pendanaan";
}

interface BalanceSection {
  id: string;
  keterangan: string;
  jumlah: number;
}

const expenseCategoryMap = new Map(
  EXPENSE_CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
);

const assetCategoryMap = new Map(
  ASSET_CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
);

const fundingSourceMap = new Map(
  FUNDING_SOURCE_OPTIONS.map((item) => [item.value, item.label]),
);

const expenseAccountCodeMap = new Map<string, string>([
  ["salary", "5010"],
  ["rent", "5020"],
  ["utilities", "5030"],
  ["transport", "5040"],
  ["supplies", "5050"],
  ["marketing", "5060"],
  ["other_expense", "5099"],
]);

const assetAccountCodeMap = new Map<string, string>([
  ["cash", "1010"],
  ["equipment", "1510"],
  ["vehicle", "1520"],
  ["receivable", "1110"],
  ["inventory", "1530"],
  ["other_asset", "1510"],
]);

const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short" });
const longMonthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatNumberInput(value: string) {
  const numeric = value.replace(/\D/g, "");
  return numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : "";
}

export function parseCurrencyInput(value: string) {
  const numeric = value.replace(/\D/g, "");
  return numeric ? Number(numeric) : 0;
}

export function getExpenseCategoryLabel(value: string) {
  return expenseCategoryMap.get(value) ?? "Beban Lainnya";
}

export function getAssetCategoryLabel(value: string) {
  return assetCategoryMap.get(value) ?? "Aset Lainnya";
}

export function getFundingSourceLabel(value: AssetFundingSource) {
  return fundingSourceMap.get(value) ?? "Tidak Diketahui";
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateDescription(value: string, label: string) {
  const normalized = normalizeText(value);
  if (normalized.length < 3) {
    return `${label} minimal 3 karakter.`;
  }
  if (normalized.length > 160) {
    return `${label} maksimal 160 karakter.`;
  }
  return null;
}

function validateDateString(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${label} wajib diisi.`;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return `${label} tidak valid.`;
  }
  return null;
}

function validateAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    return `${label} harus lebih besar dari 0.`;
  }
  if (value > 999_999_999_999) {
    return `${label} terlalu besar.`;
  }
  return null;
}

function findAccountByCode(accounts: AccountRow[], code: string) {
  const account = accounts.find((item) => item.code === code && item.is_active);
  if (!account) {
    throw new Error(`Akun ${code} belum tersedia. Jalankan ulang schema Supabase.`);
  }
  return account;
}

function buildLine(accountId: string, lineType: "debit" | "credit", amount: number, memo?: string) {
  return { account_id: accountId, line_type: lineType, amount, memo };
}

export function buildIncomeJournalPayload(
  accounts: AccountRow[],
  input: { description: string; amount: number; transactionDate: string },
): ValidationResult<JournalPayload> {
  const descriptionError = validateDescription(input.description, "Keterangan");
  if (descriptionError) {
    return { ok: false, error: descriptionError };
  }

  const dateError = validateDateString(input.transactionDate, "Tanggal");
  if (dateError) {
    return { ok: false, error: dateError };
  }

  const amountError = validateAmount(input.amount, "Jumlah");
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const cash = findAccountByCode(accounts, "1010");
  const revenue = findAccountByCode(accounts, "4010");

  return {
    ok: true,
    value: {
      entryDate: input.transactionDate,
      description: normalizeText(input.description),
      source: "income",
      lines: [
        buildLine(cash.id, "debit", input.amount, "Kas masuk"),
        buildLine(revenue.id, "credit", input.amount, "Pendapatan jasa"),
      ],
    },
  };
}

export function buildExpenseJournalPayload(
  accounts: AccountRow[],
  input: { category: string; description: string; amount: number; transactionDate: string },
): ValidationResult<JournalPayload> {
  if (!expenseCategoryMap.has(input.category)) {
    return { ok: false, error: "Kategori beban tidak valid." };
  }

  const descriptionError = validateDescription(input.description, "Keterangan");
  if (descriptionError) {
    return { ok: false, error: descriptionError };
  }

  const dateError = validateDateString(input.transactionDate, "Tanggal");
  if (dateError) {
    return { ok: false, error: dateError };
  }

  const amountError = validateAmount(input.amount, "Jumlah");
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const cash = findAccountByCode(accounts, "1010");
  const expense = findAccountByCode(accounts, expenseAccountCodeMap.get(input.category) ?? "5099");

  return {
    ok: true,
    value: {
      entryDate: input.transactionDate,
      description: normalizeText(input.description),
      source: "expense",
      lines: [
        buildLine(expense.id, "debit", input.amount, getExpenseCategoryLabel(input.category)),
        buildLine(cash.id, "credit", input.amount, "Kas keluar"),
      ],
    },
  };
}

export function buildAssetJournalPayload(
  accounts: AccountRow[],
  input: {
    category: string;
    name: string;
    amount: number;
    transactionDate: string;
    fundingSource: AssetFundingSource | "";
  },
): ValidationResult<JournalPayload> {
  if (!assetCategoryMap.has(input.category)) {
    return { ok: false, error: "Kategori aset tidak valid." };
  }

  if (!input.fundingSource) {
    return { ok: false, error: "Sumber pendanaan aset wajib dipilih." };
  }

  if (input.category === "cash" && input.fundingSource === "cash") {
    return {
      ok: false,
      error: "Kas tidak bisa didanai dari kas internal. Gunakan modal atau utang.",
    };
  }

  const assetNameError = validateDescription(input.name, "Nama aset");
  if (assetNameError) {
    return { ok: false, error: assetNameError };
  }

  const dateError = validateDateString(input.transactionDate, "Tanggal perolehan");
  if (dateError) {
    return { ok: false, error: dateError };
  }

  const amountError = validateAmount(input.amount, "Nilai aset");
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const assetAccount = findAccountByCode(accounts, assetAccountCodeMap.get(input.category) ?? "1510");
  const creditAccount =
    input.fundingSource === "cash"
      ? findAccountByCode(accounts, "1010")
      : input.fundingSource === "equity"
        ? findAccountByCode(accounts, "3010")
        : findAccountByCode(accounts, "2110");

  return {
    ok: true,
    value: {
      entryDate: input.transactionDate,
      description: `Akuisisi aset: ${normalizeText(input.name)}`,
      source: "asset",
      lines: [
        buildLine(assetAccount.id, "debit", input.amount, getAssetCategoryLabel(input.category)),
        buildLine(creditAccount.id, "credit", input.amount, getFundingSourceLabel(input.fundingSource)),
      ],
    },
  };
}

export function buildOpeningBalanceJournalPayload(
  accounts: AccountRow[],
  input: { description: string; amount: number; transactionDate: string },
): ValidationResult<JournalPayload> {
  const descriptionError = validateDescription(input.description, "Keterangan");
  if (descriptionError) {
    return { ok: false, error: descriptionError };
  }

  const dateError = validateDateString(input.transactionDate, "Tanggal");
  if (dateError) {
    return { ok: false, error: dateError };
  }

  const amountError = validateAmount(input.amount, "Jumlah modal awal");
  if (amountError) {
    return { ok: false, error: amountError };
  }

  const cash = findAccountByCode(accounts, "1010");
  const equity = findAccountByCode(accounts, "3010");

  return {
    ok: true,
    value: {
      entryDate: input.transactionDate,
      description: normalizeText(input.description),
      source: "opening_balance",
      lines: [
        buildLine(cash.id, "debit", input.amount, "Saldo kas awal"),
        buildLine(equity.id, "credit", input.amount, "Modal pemilik"),
      ],
    },
  };
}

export function buildLegacyJournalPayload(
  accounts: AccountRow[],
  transaction: FinancialTransactionRow,
): ValidationResult<JournalPayload> {
  if (transaction.transaction_type === "income") {
    return buildIncomeJournalPayload(accounts, {
      description: transaction.description,
      amount: Number(transaction.amount),
      transactionDate: transaction.transaction_date,
    });
  }

  if (transaction.transaction_type === "expense") {
    return buildExpenseJournalPayload(accounts, {
      category: transaction.category,
      description: transaction.description,
      amount: Number(transaction.amount),
      transactionDate: transaction.transaction_date,
    });
  }

  return buildAssetJournalPayload(accounts, {
    category: transaction.category,
    name: transaction.asset_name ?? transaction.description,
    amount: Number(transaction.amount),
    transactionDate: transaction.transaction_date,
    fundingSource: transaction.funding_source ?? "",
  });
}

function getReportingPeriod(entries: JournalEntryRow[]): PeriodRange {
  const latestDate = entries[0]?.entry_date
    ? new Date(`${entries[0].entry_date}T00:00:00`)
    : new Date();

  return {
    start: startOfMonth(latestDate),
    end: endOfMonth(latestDate),
  };
}

function getEntryDate(entry: JournalEntryRow) {
  return new Date(`${entry.entry_date}T00:00:00`);
}

function isWithinRange(dateValue: string, range: PeriodRange) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date >= range.start && date <= range.end;
}

function normalBalanceSign(accountClass: AccountClass) {
  return accountClass === "asset" || accountClass === "expense" ? 1 : -1;
}

function signedLineAmount(accountClass: AccountClass, lineType: "debit" | "credit", amount: number) {
  const sign = normalBalanceSign(accountClass);
  return lineType === "debit" ? sign * amount : -sign * amount;
}

function buildTrialBalance(accounts: AccountRow[], entries: JournalEntryRow[], asOfDate?: string) {
  const balances = new Map<string, number>();
  const cutoff = asOfDate ? new Date(`${asOfDate}T00:00:00`) : null;

  for (const entry of entries) {
    if (cutoff && getEntryDate(entry) > cutoff) {
      continue;
    }

    for (const line of entry.journal_entry_lines) {
      const account = line.accounts ?? accounts.find((item) => item.id === line.account_id);
      if (!account) {
        continue;
      }

      const current = balances.get(account.id) ?? 0;
      balances.set(
        account.id,
        current + signedLineAmount(account.account_class, line.line_type, Number(line.amount)),
      );
    }
  }

  return accounts
    .map((account) => ({
      account,
      balance: Number((balances.get(account.id) ?? 0).toFixed(2)),
    }))
    .filter((item) => item.balance !== 0);
}

function buildPeriodStatementRows(
  entries: JournalEntryRow[],
  accountClass: "revenue" | "expense",
  range: PeriodRange,
) {
  const rows: ReportRow[] = [];

  for (const entry of entries) {
    if (!isWithinRange(entry.entry_date, range)) {
      continue;
    }

    for (const line of entry.journal_entry_lines) {
      const account = line.accounts;
      if (!account || account.account_class !== accountClass) {
        continue;
      }

      const amount = Math.abs(
        signedLineAmount(account.account_class, line.line_type, Number(line.amount)),
      );

      rows.push({
        id: entry.id,
        description:
          accountClass === "revenue"
            ? entry.description
            : `${account.name}${entry.description ? `: ${entry.description}` : ""}`,
        date: entry.entry_date,
        amount,
      });
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDashboardData(accounts: AccountRow[], entries: JournalEntryRow[]) {
  const anchor = getReportingPeriod(entries).start;
  const trialBalance = buildTrialBalance(accounts, entries);
  const cashAccount = accounts.find((item) => item.account_category === "cash");
  const cashBalance = cashAccount
    ? trialBalance.find((item) => item.account.id === cashAccount.id)?.balance ?? 0
    : 0;

  const monthlyData = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const month = subMonths(anchor, offset);
    const period = {
      start: startOfMonth(month),
      end: endOfMonth(month),
    };
    const pendapatan = buildPeriodStatementRows(entries, "revenue", period).reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const beban = buildPeriodStatementRows(entries, "expense", period).reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    monthlyData.push({
      bulan: monthFormatter.format(month),
      pendapatan,
      beban,
      laba: pendapatan - beban,
    });
  }

  const currentMonth = monthlyData[monthlyData.length - 1] ?? {
    bulan: monthFormatter.format(anchor),
    pendapatan: 0,
    beban: 0,
    laba: 0,
  };
  const previousMonth = monthlyData[monthlyData.length - 2] ?? currentMonth;

  const currentRange = getReportingPeriod(entries);
  const expenseRows = buildPeriodStatementRows(entries, "expense", currentRange);
  const expenseMap = new Map<string, number>();
  for (const row of expenseRows) {
    const label = row.description.split(":")[0];
    expenseMap.set(label, (expenseMap.get(label) ?? 0) + row.amount);
  }

  const expenseData = Array.from(expenseMap.entries())
    .map(([keterangan, jumlah], index) => ({
      keterangan,
      jumlah,
      color: ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4b5563"][index % 7],
    }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return {
    currentLabel: longMonthFormatter.format(currentRange.start),
    monthlyData,
    expenseData,
    cashBalance,
    currentMonth,
    previousMonth,
  };
}

export function buildIncomeStatementData(
  entries: JournalEntryRow[],
  monthValue?: string,
) {
  const fallbackMonth = getMonthInputValue(entries[0]?.entry_date ?? new Date().toISOString().slice(0, 10));
  const selectedMonth = monthValue ?? fallbackMonth;
  const [year, month] = selectedMonth.split("-").map(Number);
  const period = {
    start: startOfMonth(new Date(year, month - 1, 1)),
    end: endOfMonth(new Date(year, month - 1, 1)),
  };

  return {
    bulan: longMonthFormatter.format(period.start),
    pendapatan: buildPeriodStatementRows(entries, "revenue", period),
    beban: buildPeriodStatementRows(entries, "expense", period),
  };
}

function classifyCashFlow(entry: JournalEntryRow) {
  const counterpart = entry.journal_entry_lines.find(
    (line) => line.accounts?.account_category !== "cash",
  )?.accounts;

  if (!counterpart) {
    return "operasi" as const;
  }

  if (counterpart.account_class === "equity" || counterpart.account_class === "liability") {
    return "pendanaan" as const;
  }

  if (counterpart.account_class === "asset" && counterpart.account_category !== "cash") {
    return "investasi" as const;
  }

  return "operasi" as const;
}

function calculateCashBeforeDate(entries: JournalEntryRow[], before: Date) {
  let cash = 0;
  for (const entry of entries) {
    if (getEntryDate(entry) >= before) {
      continue;
    }

    for (const line of entry.journal_entry_lines) {
      const account = line.accounts;
      if (!account || account.account_category !== "cash") {
        continue;
      }

      cash += signedLineAmount(account.account_class, line.line_type, Number(line.amount));
    }
  }
  return cash;
}

export function buildCashFlowData(entries: JournalEntryRow[], monthValue?: string) {
  const fallbackMonth = getMonthInputValue(entries[0]?.entry_date ?? new Date().toISOString().slice(0, 10));
  const selectedMonth = monthValue ?? fallbackMonth;
  const [year, month] = selectedMonth.split("-").map(Number);
  const period = {
    start: startOfMonth(new Date(year, month - 1, 1)),
    end: endOfMonth(new Date(year, month - 1, 1)),
  };

  const kasMasuk: CashFlowRow[] = [];
  const kasKeluar: CashFlowRow[] = [];

  for (const entry of entries) {
    if (!isWithinRange(entry.entry_date, period)) {
      continue;
    }

    const cashEffect = entry.journal_entry_lines.reduce((sum, line) => {
      const account = line.accounts;
      if (!account || account.account_category !== "cash") {
        return sum;
      }
      return sum + signedLineAmount(account.account_class, line.line_type, Number(line.amount));
    }, 0);

    if (cashEffect === 0) {
      continue;
    }

    const row = {
      id: entry.id,
      keterangan: entry.description,
      jumlah: Math.abs(cashEffect),
      klasifikasi: classifyCashFlow(entry),
    };

    if (cashEffect > 0) {
      kasMasuk.push(row);
    } else {
      kasKeluar.push(row);
    }
  }

  return {
    bulan: longMonthFormatter.format(period.start),
    kasMasuk,
    kasKeluar,
    saldoAwal: calculateCashBeforeDate(entries, period.start),
    totalKasMasuk: kasMasuk.reduce((sum, item) => sum + item.jumlah, 0),
    totalKasKeluar: kasKeluar.reduce((sum, item) => sum + item.jumlah, 0),
  };
}

export function buildBalanceSheetData(accounts: AccountRow[], entries: JournalEntryRow[], monthValue?: string) {
  const fallbackMonth = getMonthInputValue(entries[0]?.entry_date ?? new Date().toISOString().slice(0, 10));
  const selectedMonth = monthValue ?? fallbackMonth;
  const [year, month] = selectedMonth.split("-").map(Number);
  const asOf = endOfMonth(new Date(year, month - 1, 1));
  const trialBalance = buildTrialBalance(accounts, entries, format(asOf, "yyyy-MM-dd"));

  const incomeToDate = entries
    .filter((entry) => getEntryDate(entry) <= asOf)
    .flatMap((entry) => entry.journal_entry_lines)
    .reduce((sum, line) => {
      const account = line.accounts;
      if (!account) {
        return sum;
      }
      if (account.account_class === "revenue") {
        return sum + Math.abs(signedLineAmount(account.account_class, line.line_type, Number(line.amount)));
      }
      if (account.account_class === "expense") {
        return sum - Math.abs(signedLineAmount(account.account_class, line.line_type, Number(line.amount)));
      }
      return sum;
    }, 0);

  const aset: BalanceSection[] = trialBalance
    .filter((item) => item.account.account_class === "asset" && item.balance > 0)
    .map((item) => ({ id: item.account.id, keterangan: item.account.name, jumlah: item.balance }));

  const kewajiban: BalanceSection[] = trialBalance
    .filter((item) => item.account.account_class === "liability" && item.balance > 0)
    .map((item) => ({ id: item.account.id, keterangan: item.account.name, jumlah: item.balance }));

  const modalBase: BalanceSection[] = trialBalance
    .filter(
      (item) =>
        item.account.account_class === "equity" &&
        item.account.account_category !== "retained_earnings" &&
        item.balance > 0,
    )
    .map((item) => ({ id: item.account.id, keterangan: item.account.name, jumlah: item.balance }));

  if (incomeToDate !== 0) {
    modalBase.push({
      id: "retained-earnings-computed",
      keterangan: "Laba Ditahan",
      jumlah: incomeToDate,
    });
  }

  return {
    tanggal: dateFormatter.format(asOf),
    aset,
    kewajiban,
    modal: modalBase,
    totalAset: aset.reduce((sum, item) => sum + item.jumlah, 0),
    totalKewajiban: kewajiban.reduce((sum, item) => sum + item.jumlah, 0),
    totalModal: modalBase.reduce((sum, item) => sum + item.jumlah, 0),
    totalAsetLancar: aset
      .filter((item) => item.keterangan === "Kas" || item.keterangan === "Piutang Usaha" || item.keterangan === "Persediaan")
      .reduce((sum, item) => sum + item.jumlah, 0),
  };
}

export function getMonthInputValue(dateValue: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? `${dateValue}T00:00:00`
    : dateValue;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return format(new Date(), "yyyy-MM");
  }
  return format(date, "yyyy-MM");
}

export function getLongMonthLabelFromMonthInput(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return longMonthFormatter.format(new Date(year, month - 1, 1));
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
