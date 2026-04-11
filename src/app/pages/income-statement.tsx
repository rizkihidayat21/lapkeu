import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, Download, Pencil, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  buildIncomeStatementData,
  downloadCsv,
  formatDisplayDate,
  formatNumberInput,
  formatRupiah,
  getLongMonthLabelFromMonthInput,
  getMonthInputValue,
  parseCurrencyInput,
} from "../../lib/finance";
import { useAuth } from "../providers/auth-provider";
import { useFinance } from "../providers/finance-provider";
import type { JournalEntryRow } from "../../lib/supabase";

export function IncomeStatement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { journalEntries, updateJournalEntry } = useFinance();
  const defaultMonth = getMonthInputValue(
    journalEntries[0]?.entry_date ?? new Date().toISOString().slice(0, 10),
  );
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { pendapatan: incomeRows, beban: expenseRows } = useMemo(
    () => buildIncomeStatementData(journalEntries, selectedMonth),
    [journalEntries, selectedMonth],
  );

  const totalPendapatan = incomeRows.reduce((sum, item) => sum + item.amount, 0);
  const totalBeban = expenseRows.reduce((sum, item) => sum + item.amount, 0);
  const labaBersih = totalPendapatan - totalBeban;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadCsv("laporan-laba-rugi.csv", [
      ["Keterangan", "Tanggal", "Jumlah"],
      ["Pendapatan", "", ""],
      ...incomeRows.map((item) => [item.description, item.date, item.amount]),
      ["Total Pendapatan", "", totalPendapatan],
      [""],
      ["Beban Operasional", "", ""],
      ...expenseRows.map((item) => [item.description, item.date, item.amount]),
      ["Total Beban", "", totalBeban],
      [""],
      ["Laba Bersih", "", labaBersih],
    ]);
  };

  const editingEntry = useMemo<JournalEntryRow | null>(
    () => journalEntries.find((item) => item.id === editingEntryId) ?? null,
    [editingEntryId, journalEntries],
  );

  const openEditDialog = (id: string) => {
    const entry = journalEntries.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    const primaryLine = entry.journal_entry_lines.find(
      (line) => line.accounts?.account_class === "revenue" || line.accounts?.account_class === "expense",
    );

    setEditingEntryId(entry.id);
    setEditDate(entry.entry_date);
    setEditDescription(entry.description);
    setEditAmount(String(primaryLine ? Number(primaryLine.amount) : 0));
  };

  const handleCloseDialog = () => {
    if (isSaving) {
      return;
    }

    setEditingEntryId(null);
    setEditDate("");
    setEditDescription("");
    setEditAmount("");
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) {
      return;
    }

    const normalizedDescription = editDescription.trim().replace(/\s+/g, " ");
    const amount = parseCurrencyInput(editAmount);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      toast.error("Tanggal wajib diisi.");
      return;
    }

    if (normalizedDescription.length < 3) {
      toast.error("Keterangan minimal 3 karakter.");
      return;
    }

    if (amount <= 0) {
      toast.error("Jumlah harus lebih besar dari 0.");
      return;
    }

    setIsSaving(true);
    try {
      await updateJournalEntry({
        id: editingEntry.id,
        entryDate: editDate,
        description: normalizedDescription,
        source: editingEntry.source,
        lines: editingEntry.journal_entry_lines.map((line) => ({
          account_id: line.account_id,
          line_type: line.line_type,
          amount,
          memo: line.memo ?? undefined,
        })),
      });
      toast.success("Jurnal transaksi diperbarui.");
      handleCloseDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui transaksi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 print-report-page">
      <div className="print-only print-report-header">
        <div className="print-report-title">Laporan Laba Rugi</div>
        <div className="print-report-subtitle">{profile?.company_name ?? ""}</div>
        <div className="print-report-meta">
          <div>
            <span className="font-semibold">Periode:</span> {getLongMonthLabelFromMonthInput(selectedMonth)}
          </div>
          <div>
            <span className="font-semibold">Tanggal Cetak:</span> {formatDisplayDate(new Date().toISOString().slice(0, 10))}
          </div>
        </div>
      </div>

      <div className="print-hidden flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Laba Rugi</h1>
          <p className="text-gray-500 mt-1">
            {profile?.company_name ?? ""} - {getLongMonthLabelFromMonthInput(selectedMonth)}
          </p>
        </div>
        <div className="flex w-full xl:w-auto gap-2 flex-col sm:flex-row">
          <Button variant="outline" size="icon" className="hidden sm:inline-flex" aria-label="Pilih periode">
            <CalendarDays className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="print-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="w-full sm:max-w-xs rounded-xl bg-slate-100 p-3">
          <label htmlFor="income-month" className="flex items-center gap-3 text-sm text-slate-600">
            <CalendarDays className="w-4 h-4" />
            <span className="font-medium text-slate-900">Periode laporan</span>
          </label>
          <input
            id="income-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-2 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <Button onClick={() => navigate("/tambah-transaksi")} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Transaksi
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-summary-grid">
        <Card className="border-green-200 bg-green-50 print-summary-card">
          <CardHeader>
            <CardTitle className="text-green-800">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-900">{formatRupiah(totalPendapatan)}</div>
            <div className="text-sm text-green-700 mt-2">{incomeRows.length} jurnal pendapatan</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 print-summary-card">
          <CardHeader>
            <CardTitle className="text-orange-800">Total Beban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-900">{formatRupiah(totalBeban)}</div>
            <div className="text-sm text-orange-700 mt-2">{expenseRows.length} jurnal beban</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 print-summary-card">
          <CardHeader>
            <CardTitle className="text-blue-800">Laba Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-900">{formatRupiah(labaBersih)}</div>
            <div className="text-sm text-blue-700 mt-2">
              Margin: {totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(1) : "0.0"}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="print-report-shell">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-100 print-hidden">
          <CardTitle className="text-center">LAPORAN LABA RUGI</CardTitle>
          <div className="text-center text-sm text-gray-600 space-y-1">
            <div className="font-semibold">{profile?.company_name ?? ""}</div>
            <div>Bulan: {getLongMonthLabelFromMonthInput(selectedMonth)}</div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto print-table-wrap">
          <Table className="min-w-[640px] table-fixed print-no-min-width">
            <colgroup>
              <col className="w-[58%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-normal">Keterangan</TableHead>
                <TableHead className="whitespace-normal">Tanggal</TableHead>
                <TableHead className="text-right whitespace-normal">Jumlah (Rp)</TableHead>
                <TableHead className="text-right print-hidden">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-green-50">
                <TableCell colSpan={4} className="font-semibold text-green-800 whitespace-normal">
                  PENDAPATAN
                </TableCell>
              </TableRow>
              {incomeRows.length > 0 ? (
                incomeRows.map((item) => (
                  <TableRow key={`${item.id}-income`}>
                    <TableCell className="pl-4 sm:pl-8 whitespace-normal break-words">{item.description}</TableCell>
                    <TableCell className="whitespace-normal">{formatDisplayDate(item.date)}</TableCell>
                    <TableCell className="text-right font-medium whitespace-normal break-words">{formatRupiah(item.amount)}</TableCell>
                    <TableCell className="text-right print-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item.id)}
                        aria-label="Edit jurnal"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-4 sm:pl-8 text-gray-500 whitespace-normal" colSpan={4}>
                    Belum ada pendapatan pada periode ini
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-green-100">
                <TableCell className="font-semibold">Total Pendapatan</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{formatRupiah(totalPendapatan)}</TableCell>
                <TableCell className="print-hidden" />
              </TableRow>

              <TableRow>
                <TableCell colSpan={4} className="h-4" />
              </TableRow>

              <TableRow className="bg-orange-50">
                <TableCell colSpan={4} className="font-semibold text-orange-800 whitespace-normal">
                  BEBAN OPERASIONAL
                </TableCell>
              </TableRow>
              {expenseRows.length > 0 ? (
                expenseRows.map((item) => (
                  <TableRow key={`${item.id}-expense`}>
                    <TableCell className="pl-4 sm:pl-8 whitespace-normal break-words">{item.description}</TableCell>
                    <TableCell className="whitespace-normal">{formatDisplayDate(item.date)}</TableCell>
                    <TableCell className="text-right font-medium whitespace-normal break-words">{formatRupiah(item.amount)}</TableCell>
                    <TableCell className="text-right print-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item.id)}
                        aria-label="Edit jurnal"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-4 sm:pl-8 text-gray-500 whitespace-normal" colSpan={4}>
                    Belum ada beban pada periode ini
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-orange-100">
                <TableCell className="font-semibold">Total Beban</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{formatRupiah(totalBeban)}</TableCell>
                <TableCell className="print-hidden" />
              </TableRow>

              <TableRow>
                <TableCell colSpan={4} className="h-4" />
              </TableRow>

              <TableRow className="bg-blue-100 border-t-2 border-blue-300">
                <TableCell className="font-bold text-lg text-blue-900">LABA BERSIH</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold text-lg text-blue-900">
                  {formatRupiah(labaBersih)}
                </TableCell>
                <TableCell className="print-hidden" />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="print-only print-note">
        Dokumen ini dihasilkan dari jurnal transaksi yang telah diposting dan disajikan untuk kebutuhan pelaporan internal.
      </div>

      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
            <DialogDescription>
              Ubah tanggal, keterangan, dan jumlah jurnal tanpa mengubah klasifikasi akun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-income-date">Tanggal</Label>
              <Input
                id="edit-income-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-income-description">Keterangan</Label>
              <Input
                id="edit-income-description"
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Masukkan keterangan transaksi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-income-amount">Jumlah (Rp)</Label>
              <Input
                id="edit-income-amount"
                type="text"
                value={formatNumberInput(editAmount)}
                onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
