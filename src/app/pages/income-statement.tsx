import { Download, Printer } from "lucide-react";
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
  formatRupiah,
} from "../../lib/finance";
import { useAuth } from "../providers/auth-provider";
import { useFinance } from "../providers/finance-provider";

export function IncomeStatement() {
  const { profile } = useAuth();
  const { transactions } = useFinance();
  const incomeData = buildIncomeStatementData(transactions);
  const totalPendapatan = incomeData.pendapatan.reduce((sum, item) => sum + item.jumlah, 0);
  const totalBeban = incomeData.beban.reduce((sum, item) => sum + item.jumlah, 0);
  const labaBersih = totalPendapatan - totalBeban;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadCsv("laporan-laba-rugi.csv", [
      ["Keterangan", "Jumlah"],
      ["Pendapatan", ""],
      ...incomeData.pendapatan.map((item) => [item.keterangan, item.jumlah]),
      ["Total Pendapatan", totalPendapatan],
      [""],
      ["Beban Operasional", ""],
      ...incomeData.beban.map((item) => [item.keterangan, item.jumlah]),
      ["Total Beban", totalBeban],
      [""],
      ["Laba Bersih", labaBersih],
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Laba Rugi</h1>
          <p className="text-gray-500 mt-1">
            {profile?.company_name ?? "Usaha Anda"} - {incomeData.bulan}
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

      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle className="text-center">LAPORAN LABA RUGI</CardTitle>
          <div className="text-center text-sm text-gray-600 space-y-1">
            <div className="font-semibold">{profile?.company_name ?? "Usaha Anda"}</div>
            <div>Bulan: {incomeData.bulan}</div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/3">Keterangan</TableHead>
                <TableHead className="text-right">Jumlah (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-green-50">
                <TableCell colSpan={2} className="font-semibold text-green-800">
                  PENDAPATAN
                </TableCell>
              </TableRow>
              {incomeData.pendapatan.length > 0 ? (
                incomeData.pendapatan.map((item) => (
                  <TableRow key={item.keterangan}>
                    <TableCell className="pl-8">{item.keterangan}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(item.jumlah)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500">Belum ada pendapatan</TableCell>
                  <TableCell className="text-right text-gray-500">Rp0</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-green-100">
                <TableCell className="font-semibold">Total Pendapatan</TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(totalPendapatan)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={2} className="h-4"></TableCell>
              </TableRow>

              <TableRow className="bg-orange-50">
                <TableCell colSpan={2} className="font-semibold text-orange-800">
                  BEBAN OPERASIONAL
                </TableCell>
              </TableRow>
              {incomeData.beban.length > 0 ? (
                incomeData.beban.map((item) => (
                  <TableRow key={item.keterangan}>
                    <TableCell className="pl-8">{item.keterangan}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(item.jumlah)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="pl-8 text-gray-500">Belum ada beban</TableCell>
                  <TableCell className="text-right text-gray-500">Rp0</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-orange-100">
                <TableCell className="font-semibold">Total Beban</TableCell>
                <TableCell className="text-right font-bold">
                  {formatRupiah(totalBeban)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell colSpan={2} className="h-4"></TableCell>
              </TableRow>

              <TableRow className="bg-blue-100 border-t-2 border-blue-300">
                <TableCell className="font-bold text-lg text-blue-900">LABA BERSIH</TableCell>
                <TableCell className="text-right font-bold text-lg text-blue-900">
                  {formatRupiah(labaBersih)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatRupiah(totalPendapatan)}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Total Beban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{formatRupiah(totalBeban)}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Laba Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{formatRupiah(labaBersih)}</div>
            <div className="text-sm text-blue-700 mt-2">
              Margin: {totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(1) : "0.0"}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
