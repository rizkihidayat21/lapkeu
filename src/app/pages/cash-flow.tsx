import { Download, Printer, TrendingDown, TrendingUp } from "lucide-react";
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
import { buildCashFlowData, downloadCsv, formatRupiah } from "../../lib/finance";
import { useAuth } from "../providers/auth-provider";
import { useFinance } from "../providers/finance-provider";

export function CashFlow() {
  const { profile } = useAuth();
  const { journalEntries } = useFinance();
  const cashFlowData = buildCashFlowData(journalEntries);
  const saldoKasAkhir =
    cashFlowData.saldoAwal + cashFlowData.totalKasMasuk - cashFlowData.totalKasKeluar;
  const kasNetBulanIni = cashFlowData.totalKasMasuk - cashFlowData.totalKasKeluar;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadCsv("laporan-arus-kas.csv", [
      ["Keterangan", "Jumlah"],
      ["Saldo Kas Awal", cashFlowData.saldoAwal],
      [""],
      ["Kas Masuk", ""],
      ...cashFlowData.kasMasuk.map((item) => [item.keterangan, item.jumlah]),
      ["Total Kas Masuk", cashFlowData.totalKasMasuk],
      [""],
      ["Kas Keluar", ""],
      ...cashFlowData.kasKeluar.map((item) => [item.keterangan, item.jumlah]),
      ["Total Kas Keluar", cashFlowData.totalKasKeluar],
      [""],
      ["Kas Bersih Bulan Ini", kasNetBulanIni],
      ["Saldo Kas Akhir", saldoKasAkhir],
    ]);
  };

  return (
    <div className="space-y-6 print-report-page">
      <div className="print-only print-report-header">
        <div className="print-report-title">Laporan Arus Kas</div>
        <div className="print-report-subtitle">{profile?.company_name ?? ""}</div>
        <div className="print-report-meta">
          <div>
            <span className="font-semibold">Periode:</span> {cashFlowData.bulan}
          </div>
          <div>
            <span className="font-semibold">Tanggal Cetak:</span> {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
          </div>
        </div>
      </div>

      <div className="print-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Arus Kas</h1>
          <p className="text-gray-500 mt-1">
            {profile?.company_name ?? ""} - {cashFlowData.bulan}
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-summary-grid">
        <Card className="border-green-200 bg-green-50 print-summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-green-800">Kas Masuk</CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-900 break-words">
              {formatRupiah(cashFlowData.totalKasMasuk)}
            </div>
            <div className="text-sm text-green-700 mt-1">Penerimaan bulan ini</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 print-summary-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-red-800">Kas Keluar</CardTitle>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-900 break-words">
              {formatRupiah(cashFlowData.totalKasKeluar)}
            </div>
            <div className="text-sm text-red-700 mt-1">Pengeluaran bulan ini</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 print-summary-card">
          <CardHeader>
            <CardTitle className="text-blue-800">Saldo Kas Akhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 break-words">{formatRupiah(saldoKasAkhir)}</div>
            <div className="text-sm text-blue-700 mt-1">Termasuk efek pembelian aset berbasis kas</div>
          </CardContent>
        </Card>
      </div>

      <Card className="print-report-shell">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 print-hidden">
          <CardTitle className="text-center">LAPORAN ARUS KAS</CardTitle>
          <div className="text-center text-sm text-gray-600 space-y-1">
            <div className="font-semibold">{profile?.company_name ?? ""}</div>
            <div>Bulan: {cashFlowData.bulan}</div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto print-table-wrap">
          <Table className="min-w-[620px] print-no-min-width">
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/3">Keterangan</TableHead>
                <TableHead className="text-right">Jumlah (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-gray-100">
                <TableCell className="font-semibold">Saldo Kas Awal Bulan</TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(cashFlowData.saldoAwal)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={2} className="h-4"></TableCell>
              </TableRow>

              <TableRow className="bg-green-50">
                <TableCell colSpan={2} className="font-semibold text-green-800">
                  KAS MASUK
                </TableCell>
              </TableRow>
              {cashFlowData.kasMasuk.length > 0 ? (
                cashFlowData.kasMasuk.map((item) => (
                  <TableRow key={`${item.keterangan}-${item.jumlah}`}>
                    <TableCell className="pl-8">{item.keterangan}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">
                      {formatRupiah(item.jumlah)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500">Belum ada kas masuk</TableCell>
                  <TableCell className="text-right text-gray-500">Rp0</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-green-100">
                <TableCell className="font-semibold">Total Kas Masuk</TableCell>
                <TableCell className="text-right font-bold text-green-800">
                  {formatRupiah(cashFlowData.totalKasMasuk)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={2} className="h-4"></TableCell>
              </TableRow>

              <TableRow className="bg-red-50">
                <TableCell colSpan={2} className="font-semibold text-red-800">
                  KAS KELUAR
                </TableCell>
              </TableRow>
              {cashFlowData.kasKeluar.length > 0 ? (
                cashFlowData.kasKeluar.map((item) => (
                  <TableRow key={`${item.keterangan}-${item.jumlah}`}>
                    <TableCell className="pl-8">{item.keterangan}</TableCell>
                    <TableCell className="text-right font-medium text-red-700">
                      {formatRupiah(item.jumlah)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500">Belum ada kas keluar</TableCell>
                  <TableCell className="text-right text-gray-500">Rp0</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-red-100">
                <TableCell className="font-semibold">Total Kas Keluar</TableCell>
                <TableCell className="text-right font-bold text-red-800">
                  {formatRupiah(cashFlowData.totalKasKeluar)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={2} className="h-4"></TableCell>
              </TableRow>

              <TableRow className="bg-blue-50">
                <TableCell className="font-semibold">Kas Bersih Bulan Ini</TableCell>
                <TableCell className="text-right font-bold text-blue-800">
                  {formatRupiah(kasNetBulanIni)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-blue-100 border-t-2 border-blue-300">
                <TableCell className="font-bold text-lg text-blue-900">
                  SALDO KAS AKHIR BULAN
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-blue-900">
                  {formatRupiah(saldoKasAkhir)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="print-hidden">
        <CardHeader>
          <CardTitle>Analisis Arus Kas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Rasio Kas Masuk/Keluar</div>
              <div className="text-2xl font-bold text-gray-900">
                {cashFlowData.totalKasKeluar > 0
                  ? (cashFlowData.totalKasMasuk / cashFlowData.totalKasKeluar).toFixed(2)
                  : "0.00"}
                x
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {cashFlowData.totalKasMasuk >= cashFlowData.totalKasKeluar
                  ? "Arus kas positif"
                  : "Arus kas negatif, evaluasi pembiayaan"}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Persentase Kas Tersisa</div>
              <div className="text-2xl font-bold text-gray-900">
                {cashFlowData.totalKasMasuk > 0
                  ? ((saldoKasAkhir / cashFlowData.totalKasMasuk) * 100).toFixed(1)
                  : "0.0"}
                %
              </div>
              <div className="text-sm text-gray-500 mt-1">Dari total kas masuk bulan ini</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="print-only print-note">
        Arus kas disajikan berdasarkan transaksi kas yang tercatat pada periode laporan.
      </div>
    </div>
  );
}
