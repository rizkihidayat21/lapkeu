import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  ASSET_CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  FUNDING_SOURCE_OPTIONS,
  formatNumberInput,
  parseCurrencyInput,
  validateAssetPayload,
  validateExpensePayload,
  validateIncomePayload,
  getAssetCategoryLabel,
  getFundingSourceLabel,
} from "../../lib/finance";
import { useFinance } from "../providers/finance-provider";

export function AddTransaction() {
  const navigate = useNavigate();
  const { createTransaction } = useFinance();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendapatanKeterangan, setPendapatanKeterangan] = useState("");
  const [pendapatanJumlah, setPendapatanJumlah] = useState("");
  const [pendapatanTanggal, setPendapatanTanggal] = useState("");

  const [bebanKategori, setBebanKategori] = useState("");
  const [bebanKeterangan, setBebanKeterangan] = useState("");
  const [bebanJumlah, setBebanJumlah] = useState("");
  const [bebanTanggal, setBebanTanggal] = useState("");

  const [asetKategori, setAsetKategori] = useState("");
  const [asetNama, setAsetNama] = useState("");
  const [asetNilai, setAsetNilai] = useState("");
  const [asetTanggal, setAsetTanggal] = useState("");
  const [asetSumberPendanaan, setAsetSumberPendanaan] = useState("");

  const handleCurrencyInput = (value: string, setter: (val: string) => void) => {
    setter(value.replace(/\D/g, ""));
  };

  const handleSubmitPendapatan = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateIncomePayload({
      description: pendapatanKeterangan,
      amount: parseCurrencyInput(pendapatanJumlah),
      transactionDate: pendapatanTanggal,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction(result.value);
      toast.success("Pendapatan berhasil disimpan ke Supabase.");
      setPendapatanKeterangan("");
      setPendapatanJumlah("");
      setPendapatanTanggal("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pendapatan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBeban = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateExpensePayload({
      category: bebanKategori,
      description: bebanKeterangan,
      amount: parseCurrencyInput(bebanJumlah),
      transactionDate: bebanTanggal,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction(result.value);
      toast.success("Beban berhasil disimpan ke Supabase.");
      setBebanKategori("");
      setBebanKeterangan("");
      setBebanJumlah("");
      setBebanTanggal("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan beban.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAset = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateAssetPayload({
      category: asetKategori,
      name: asetNama,
      amount: parseCurrencyInput(asetNilai),
      transactionDate: asetTanggal,
      fundingSource: asetSumberPendanaan as "cash" | "equity" | "debt" | "",
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction(result.value);
      toast.success("Aset berhasil disimpan ke Supabase.");
      setAsetKategori("");
      setAsetNama("");
      setAsetNilai("");
      setAsetTanggal("");
      setAsetSumberPendanaan("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan aset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start sm:items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tambah Transaksi</h1>
          <p className="text-gray-500 mt-1">
            Seluruh input divalidasi di frontend dan di database Supabase
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendapatan">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
              <TabsTrigger value="beban">Beban</TabsTrigger>
              <TabsTrigger value="aset">Aset</TabsTrigger>
            </TabsList>

            <TabsContent value="pendapatan" className="space-y-4">
              <form onSubmit={handleSubmitPendapatan} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pendapatan-tanggal">Tanggal</Label>
                  <Input
                    id="pendapatan-tanggal"
                    type="date"
                    value={pendapatanTanggal}
                    onChange={(e) => setPendapatanTanggal(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pendapatan-keterangan">Keterangan</Label>
                  <Input
                    id="pendapatan-keterangan"
                    type="text"
                    placeholder="Contoh: Penerimaan dari Klien A"
                    value={pendapatanKeterangan}
                    onChange={(e) => setPendapatanKeterangan(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pendapatan-jumlah">Jumlah (Rp)</Label>
                  <Input
                    id="pendapatan-jumlah"
                    type="text"
                    placeholder="0"
                    value={formatNumberInput(pendapatanJumlah)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setPendapatanJumlah)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Menyimpan..." : "Tambah Pendapatan"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="beban" className="space-y-4">
              <form onSubmit={handleSubmitBeban} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="beban-tanggal">Tanggal</Label>
                  <Input
                    id="beban-tanggal"
                    type="date"
                    value={bebanTanggal}
                    onChange={(e) => setBebanTanggal(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beban-kategori">Kategori Beban</Label>
                  <Select value={bebanKategori} onValueChange={setBebanKategori}>
                    <SelectTrigger id="beban-kategori">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORY_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beban-keterangan">Keterangan</Label>
                  <Input
                    id="beban-keterangan"
                    type="text"
                    placeholder="Contoh: Pembayaran gaji bulan Januari"
                    value={bebanKeterangan}
                    onChange={(e) => setBebanKeterangan(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beban-jumlah">Jumlah (Rp)</Label>
                  <Input
                    id="beban-jumlah"
                    type="text"
                    placeholder="0"
                    value={formatNumberInput(bebanJumlah)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setBebanJumlah)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Menyimpan..." : "Tambah Beban"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="aset" className="space-y-4">
              <form onSubmit={handleSubmitAset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aset-tanggal">Tanggal Perolehan</Label>
                  <Input
                    id="aset-tanggal"
                    type="date"
                    value={asetTanggal}
                    onChange={(e) => setAsetTanggal(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aset-kategori">Kategori Aset</Label>
                  <Select value={asetKategori} onValueChange={setAsetKategori}>
                    <SelectTrigger id="aset-kategori">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORY_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aset-sumber">Sumber Pendanaan</Label>
                  <Select value={asetSumberPendanaan} onValueChange={setAsetSumberPendanaan}>
                    <SelectTrigger id="aset-sumber">
                      <SelectValue placeholder="Pilih sumber pendanaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDING_SOURCE_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {asetKategori && asetSumberPendanaan && (
                    <p className="text-xs text-gray-500">
                      {getAssetCategoryLabel(asetKategori)} akan dicatat sebagai aset dengan pendanaan{" "}
                      {getFundingSourceLabel(asetSumberPendanaan as "cash" | "equity" | "debt")}.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aset-nama">Nama Aset</Label>
                  <Input
                    id="aset-nama"
                    type="text"
                    placeholder="Contoh: Laptop Dell Latitude"
                    value={asetNama}
                    onChange={(e) => setAsetNama(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aset-nilai">Nilai Aset (Rp)</Label>
                  <Input
                    id="aset-nilai"
                    type="text"
                    placeholder="0"
                    value={formatNumberInput(asetNilai)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setAsetNilai)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Menyimpan..." : "Tambah Aset"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-cyan-50 border-cyan-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-cyan-900 mb-1">Keamanan & Validasi</h3>
              <ul className="text-sm text-cyan-800 space-y-1 list-disc list-inside">
                <li>Row Level Security memastikan user hanya bisa membaca datanya sendiri</li>
                <li>Nominal, tanggal, dan bentuk transaksi divalidasi di frontend dan database</li>
                <li>Transaksi aset memerlukan sumber pendanaan agar neraca tetap seimbang</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <Save className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex-1 text-sm text-slate-700 space-y-1">
              <p>Data tersimpan di tabel <code>financial_transactions</code> pada Supabase.</p>
              <p>Tambahkan transaksi kas dari modal atau utang lewat tab aset kategori <code>Kas</code> bila perlu.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
