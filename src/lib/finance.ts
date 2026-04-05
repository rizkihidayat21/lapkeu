import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type {
  AssetFundingSource,
  FinancialTransactionInsert,
  FinancialTransactionRow,
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

interface PeriodRange {
  start: Date;
  end: Date;
}

interface LineItem {
  keterangan: string;
  jumlah: number;
}

interface BalanceSection {
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

export function validateIncomePayload(input: {
  description: string;
  amount: number;
  transactionDate: string;
}): ValidationResult<FinancialTransactionInsert> {
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

  return {
    ok: true,
    value: {
      transaction_type: "income",
      category: "service_revenue",
      description: normalizeText(input.description),
      amount: input.amount,
      transaction_date: input.transactionDate,
    },
  };
}

export function validateExpensePayload(input: {
  category: string;
  description: string;
  amount: number;
  transactionDate: string;
}): ValidationResult<FinancialTransactionInsert> {
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

  return {
    ok: true,
    value: {
      transaction_type: "expense",
      category: input.category,
      description: normalizeText(input.description),
      amount: input.amount,
      transaction_date: input.transactionDate,
    },
  };
}

export function validateAssetPayload(input: {
  category: string;
  name: string;
  amount: number;
  transactionDate: string;
  fundingSource: AssetFundingSource | "";
}): ValidationResult<FinancialTransactionInsert> {
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

  return {
    ok: true,
    value: {
      transaction_type: "asset",
      category: input.category,
      description: `Akuisisi aset: ${normalizeText(input.name)}`,
      amount: input.amount,
      transaction_date: input.transactionDate,
      asset_name: normalizeText(input.name),
      funding_source: input.fundingSource,
    },
  };
}

export function getReportingPeriod(
  transactions: FinancialTransactionRow[],
): PeriodRange {
  const latestDate = transactions[0]?.transaction_date
    ? new Date(`${transactions[0].transaction_date}T00:00:00`)
    : new Date();

  return {
    start: startOfMonth(latestDate),
    end: endOfMonth(latestDate),
  };
}

function isWithinRange(dateValue: string, range: PeriodRange) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date >= range.start && date <= range.end;
}

function groupByLabel(
  items: FinancialTransactionRow[],
  getLabel: (item: FinancialTransactionRow) => string,
) {
  const map = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item);
    map.set(label, (map.get(label) ?? 0) + Number(item.amount));
  }
  return Array.from(map.entries())
    .map(([keterangan, jumlah]) => ({ keterangan, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

function sumTransactionsByType(
  items: FinancialTransactionRow[],
  transactionType: "income" | "expense",
) {
  return items
    .filter((item) => item.transaction_type === transactionType)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function calculateCashBeforeDate(
  transactions: FinancialTransactionRow[],
  before: Date,
) {
  let cash = 0;

  for (const item of transactions) {
    const transactionDate = new Date(`${item.transaction_date}T00:00:00`);
    if (transactionDate >= before) {
      continue;
    }

    const amount = Number(item.amount);

    if (item.transaction_type === "income") {
      cash += amount;
    } else if (item.transaction_type === "expense") {
      cash -= amount;
    } else if (item.transaction_type === "asset") {
      if (item.category === "cash" && item.funding_source !== "cash") {
        cash += amount;
      } else if (item.category !== "cash" && item.funding_source === "cash") {
        cash -= amount;
      }
    }
  }

  return cash;
}

export function buildDashboardData(transactions: FinancialTransactionRow[]) {
  const anchor = getReportingPeriod(transactions).start;
  const monthlyData = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const month = subMonths(anchor, offset);
    const period = {
      start: startOfMonth(month),
      end: endOfMonth(month),
    };
    const data = transactions.filter((item) => isWithinRange(item.transaction_date, period));
    const pendapatan = sumTransactionsByType(data, "income");
    const beban = sumTransactionsByType(data, "expense");
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
  const currentRange = getReportingPeriod(transactions);
  const currentTransactions = transactions.filter((item) =>
    isWithinRange(item.transaction_date, currentRange),
  );

  const expenseData = groupByLabel(
    currentTransactions.filter((item) => item.transaction_type === "expense"),
    (item) => getExpenseCategoryLabel(item.category),
  ).map((item, index) => ({
    ...item,
    color: ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4b5563"][index % 7],
  }));

  const balance = buildBalanceSheetData(transactions);

  return {
    currentLabel: longMonthFormatter.format(currentRange.start),
    monthlyData,
    expenseData,
    cashBalance: balance.totalAsetLancar,
    currentMonth,
    previousMonth,
  };
}

export function buildIncomeStatementData(transactions: FinancialTransactionRow[]) {
  const period = getReportingPeriod(transactions);
  const scoped = transactions.filter((item) => isWithinRange(item.transaction_date, period));
  const pendapatan = groupByLabel(
    scoped.filter((item) => item.transaction_type === "income"),
    (item) => item.description,
  );
  const beban = groupByLabel(
    scoped.filter((item) => item.transaction_type === "expense"),
    (item) => getExpenseCategoryLabel(item.category),
  );

  return {
    bulan: longMonthFormatter.format(period.start),
    pendapatan,
    beban,
  };
}

export function buildCashFlowData(transactions: FinancialTransactionRow[]) {
  const period = getReportingPeriod(transactions);
  const scoped = transactions.filter((item) => isWithinRange(item.transaction_date, period));
  const kasMasuk: LineItem[] = [];
  const kasKeluar: LineItem[] = [];

  for (const item of scoped) {
    if (item.transaction_type === "income") {
      kasMasuk.push({ keterangan: item.description, jumlah: Number(item.amount) });
    }

    if (item.transaction_type === "expense") {
      kasKeluar.push({
        keterangan: `${getExpenseCategoryLabel(item.category)}: ${item.description}`,
        jumlah: Number(item.amount),
      });
    }

    if (item.transaction_type === "asset") {
      if (item.category === "cash" && item.funding_source !== "cash") {
        kasMasuk.push({
          keterangan: `${getAssetCategoryLabel(item.category)} dari ${getFundingSourceLabel(item.funding_source!)}`,
          jumlah: Number(item.amount),
        });
      }

      if (item.category !== "cash" && item.funding_source === "cash") {
        kasKeluar.push({
          keterangan: `Pembelian ${item.asset_name ?? getAssetCategoryLabel(item.category)}`,
          jumlah: Number(item.amount),
        });
      }
    }
  }

  const totalKasMasuk = kasMasuk.reduce((sum, item) => sum + item.jumlah, 0);
  const totalKasKeluar = kasKeluar.reduce((sum, item) => sum + item.jumlah, 0);

  return {
    bulan: longMonthFormatter.format(period.start),
    kasMasuk,
    kasKeluar,
    saldoAwal: calculateCashBeforeDate(transactions, period.start),
    totalKasMasuk,
    totalKasKeluar,
  };
}

export function buildBalanceSheetData(transactions: FinancialTransactionRow[]) {
  const asOf = getReportingPeriod(transactions).end;
  const scoped = transactions.filter((item) => {
    const date = new Date(`${item.transaction_date}T00:00:00`);
    return date <= asOf;
  });

  let cash = 0;
  let retainedEarnings = 0;
  const nonCashAssets = new Map<string, number>();
  const liabilities = new Map<string, number>();
  const equity = new Map<string, number>();

  for (const item of scoped) {
    const amount = Number(item.amount);

    if (item.transaction_type === "income") {
      cash += amount;
      retainedEarnings += amount;
      continue;
    }

    if (item.transaction_type === "expense") {
      cash -= amount;
      retainedEarnings -= amount;
      continue;
    }

    if (item.transaction_type === "asset") {
      const assetLabel = item.asset_name ?? getAssetCategoryLabel(item.category);

      if (item.category === "cash") {
        cash += amount;
      } else {
        nonCashAssets.set(assetLabel, (nonCashAssets.get(assetLabel) ?? 0) + amount);
      }

      if (item.funding_source === "cash" && item.category !== "cash") {
        cash -= amount;
      }

      if (item.funding_source === "equity") {
        equity.set("Modal Pemilik", (equity.get("Modal Pemilik") ?? 0) + amount);
      }

      if (item.funding_source === "debt") {
        liabilities.set(
          "Utang Pendanaan Aset",
          (liabilities.get("Utang Pendanaan Aset") ?? 0) + amount,
        );
      }
    }
  }

  if (retainedEarnings !== 0) {
    equity.set("Laba Ditahan", (equity.get("Laba Ditahan") ?? 0) + retainedEarnings);
  }

  if (cash < 0) {
    liabilities.set("Utang Operasional", (liabilities.get("Utang Operasional") ?? 0) + Math.abs(cash));
    cash = 0;
  }

  const aset: BalanceSection[] = [
    { keterangan: "Kas", jumlah: cash },
    ...Array.from(nonCashAssets.entries()).map(([keterangan, jumlah]) => ({ keterangan, jumlah })),
  ].filter((item) => item.jumlah > 0);

  const kewajiban = Array.from(liabilities.entries())
    .map(([keterangan, jumlah]) => ({ keterangan, jumlah }))
    .filter((item) => item.jumlah > 0);

  const modal = Array.from(equity.entries())
    .map(([keterangan, jumlah]) => ({ keterangan, jumlah }))
    .filter((item) => item.jumlah > 0);

  return {
    tanggal: dateFormatter.format(asOf),
    aset,
    kewajiban,
    modal,
    totalAset: aset.reduce((sum, item) => sum + item.jumlah, 0),
    totalKewajiban: kewajiban.reduce((sum, item) => sum + item.jumlah, 0),
    totalModal: modal.reduce((sum, item) => sum + item.jumlah, 0),
    totalAsetLancar: cash,
  };
}

export function getMonthRangeLabel(dateValue: string) {
  return format(new Date(`${dateValue}T00:00:00`), "yyyy-MM-dd");
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
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
