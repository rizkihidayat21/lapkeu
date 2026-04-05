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
import { buildBalanceSheetData, downloadCsv, formatRupiah } from "../../lib/finance";
import { useAuth } from "../providers/auth-provider";
import { useFinance } from "../providers/finance-provider";

export function BalanceSheet() {
  const { profile } = useAuth();
  const { transactions } = useFinance();
  const balanceSheetData = buildBalanceSheetData(transactions);
  const totalKewajibanModal = balanceSheetData.totalKewajiban + balanceSheetData.totalModal;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadCsv("neraca.csv", [
      ["Aset", "Jumlah"],
      ...balanceSheetData.aset.map((item) => [item.keterangan, item.jumlah]),
      ["Total Aset", balanceSheetData.totalAset],
      [""],
      ["Kewajiban", "Jumlah"],
      ...balanceSheetData.kewajiban.map((item) => [item.keterangan, item.jumlah]),
      ["Total Kewajiban", balanceSheetData.totalKewajiban],
      [""],
      ["Modal", "Jumlah"],
      ...balanceSheetData.modal.map((item) => [item.keterangan, item.jumlah]),
      ["Total Modal", balanceSheetData.totalModal],
      ["Total Kewajiban dan Modal", totalKewajibanModal],
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Neraca</h1>
          <p className="text-gray-500 mt-1">
            {profile?.company_name ?? "Usaha Anda"} - Per {balanceSheetData.tanggal}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Total Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 break-words">
              {formatRupiah(balanceSheetData.totalAset)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Total Kewajiban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-900 break-words">
              {formatRupiah(balanceSheetData.totalKewajiban)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-800">Total Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-purple-900 break-words">
              {formatRupiah(balanceSheetData.totalModal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="text-center text-blue-900">ASET</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Jumlah (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheetData.aset.length > 0 ? (
                  balanceSheetData.aset.map((item) => (
                    <TableRow key={item.keterangan}>
                      <TableCell className="font-medium">{item.keterangan}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.jumlah)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">Belum ada aset tercatat</TableCell>
                    <TableCell className="text-right text-gray-500">Rp0</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-blue-100 border-t-2 border-blue-300">
                  <TableCell className="font-bold text-blue-900">Total Aset</TableCell>
                  <TableCell className="text-right font-bold text-blue-900">
                    {formatRupiah(balanceSheetData.totalAset)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="text-center text-purple-900">KEWAJIBAN & MODAL</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Jumlah (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-orange-50">
                  <TableCell colSpan={2} className="font-semibold text-orange-800">
                    KEWAJIBAN
                  </TableCell>
                </TableRow>
                {balanceSheetData.kewajiban.length > 0 ? (
                  balanceSheetData.kewajiban.map((item) => (
                    <TableRow key={item.keterangan}>
                      <TableCell className="pl-6">{item.keterangan}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.jumlah)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="pl-6 text-gray-500">Tidak ada kewajiban</TableCell>
                    <TableCell className="text-right text-gray-500">Rp0</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-orange-100">
                  <TableCell className="font-semibold">Total Kewajiban</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(balanceSheetData.totalKewajiban)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="h-2"></TableCell>
                </TableRow>

                <TableRow className="bg-purple-50">
                  <TableCell colSpan={2} className="font-semibold text-purple-800">
                    MODAL
                  </TableCell>
                </TableRow>
                {balanceSheetData.modal.length > 0 ? (
                  balanceSheetData.modal.map((item) => (
                    <TableRow key={item.keterangan}>
                      <TableCell className="pl-6">{item.keterangan}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.jumlah)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="pl-6 text-gray-500">Belum ada modal</TableCell>
                    <TableCell className="text-right text-gray-500">Rp0</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-purple-100">
                  <TableCell className="font-semibold">Total Modal</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(balanceSheetData.totalModal)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-purple-200 border-t-2 border-purple-400">
                  <TableCell className="font-bold text-purple-900">
                    Total Kewajiban & Modal
                  </TableCell>
                  <TableCell className="text-right font-bold text-purple-900">
                    {formatRupiah(totalKewajibanModal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className={balanceSheetData.totalAset === totalKewajibanModal ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
        <CardHeader>
          <CardTitle className={balanceSheetData.totalAset === totalKewajibanModal ? "text-green-800" : "text-red-800"}>
            Verifikasi Neraca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-700">Total Aset:</span>
              <span className="font-bold">{formatRupiah(balanceSheetData.totalAset)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-700">Total Kewajiban & Modal:</span>
              <span className="font-bold">{formatRupiah(totalKewajibanModal)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-2 border-t-2">
              <span className="font-bold">Selisih:</span>
              <span className={`font-bold ${balanceSheetData.totalAset === totalKewajibanModal ? "text-green-700" : "text-red-700"}`}>
                {formatRupiah(Math.abs(balanceSheetData.totalAset - totalKewajibanModal))}
              </span>
            </div>
            <div className={`text-center mt-4 p-3 rounded-lg ${balanceSheetData.totalAset === totalKewajibanModal ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {balanceSheetData.totalAset === totalKewajibanModal
                ? "Neraca seimbang."
                : "Neraca belum seimbang. Periksa transaksi aset dan sumber pendanaannya."}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rasio Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Debt to Equity Ratio</div>
              <div className="text-2xl font-bold text-gray-900">
                {balanceSheetData.totalModal > 0
                  ? (balanceSheetData.totalKewajiban / balanceSheetData.totalModal).toFixed(2)
                  : "0.00"}
              </div>
              <div className="text-sm text-gray-500 mt-1">Rasio hutang terhadap modal</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Equity Ratio</div>
              <div className="text-2xl font-bold text-gray-900">
                {balanceSheetData.totalAset > 0
                  ? ((balanceSheetData.totalModal / balanceSheetData.totalAset) * 100).toFixed(1)
                  : "0.0"}
                %
              </div>
              <div className="text-sm text-gray-500 mt-1">Persentase modal dari total aset</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Current Assets</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatRupiah(balanceSheetData.totalAsetLancar)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Aset lancar dalam bentuk kas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
