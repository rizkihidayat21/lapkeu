import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, Download, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  formatRupiah,
  getLongMonthLabelFromMonthInput,
  getMonthInputValue,
} from "../../lib/finance";
import { useAuth } from "../providers/auth-provider";
import { useFinance } from "../providers/finance-provider";

export function IncomeStatement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { journalEntries, deleteJournalEntry } = useFinance();
  const defaultMonth = getMonthInputValue(
    journalEntries[0]?.entry_date ?? new Date().toISOString().slice(0, 10),
  );
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteJournalEntry(id);
      toast.success("Jurnal transaksi dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus transaksi.");
    } finally {
      setDeletingId(null);
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
          <Table className="min-w-[760px] print-no-min-width">
            <TableHeader>
              <TableRow>
                <TableHead>Keterangan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Jumlah (Rp)</TableHead>
                <TableHead className="text-right print-hidden">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-green-50">
                <TableCell colSpan={4} className="font-semibold text-green-800">
                  PENDAPATAN
                </TableCell>
              </TableRow>
              {incomeRows.length > 0 ? (
                incomeRows.map((item) => (
                  <TableRow key={`${item.id}-income`}>
                    <TableCell className="pl-8">{item.description}</TableCell>
                    <TableCell>{formatDisplayDate(item.date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(item.amount)}</TableCell>
                    <TableCell className="text-right print-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        aria-label="Hapus jurnal"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500" colSpan={4}>
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
                <TableCell colSpan={4} className="font-semibold text-orange-800">
                  BEBAN OPERASIONAL
                </TableCell>
              </TableRow>
              {expenseRows.length > 0 ? (
                expenseRows.map((item) => (
                  <TableRow key={`${item.id}-expense`}>
                    <TableCell className="pl-8">{item.description}</TableCell>
                    <TableCell>{formatDisplayDate(item.date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(item.amount)}</TableCell>
                    <TableCell className="text-right print-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        aria-label="Hapus jurnal"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500" colSpan={4}>
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
    </div>
  );
}
