import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Coins, Plus } from "lucide-react";
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
  buildAssetJournalPayload,
  buildExpenseJournalPayload,
  buildIncomeJournalPayload,
  buildOpeningBalanceJournalPayload,
  EXPENSE_CATEGORY_OPTIONS,
  FUNDING_SOURCE_OPTIONS,
  formatNumberInput,
  getAssetCategoryLabel,
  getFundingSourceLabel,
  parseCurrencyInput,
} from "../../lib/finance";
import { useFinance } from "../providers/finance-provider";

export function AddTransaction() {
  const navigate = useNavigate();
  const { accounts, createJournalEntry } = useFinance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const [pendapatanKeterangan, setPendapatanKeterangan] = useState("");
  const [pendapatanJumlah, setPendapatanJumlah] = useState("");
  const [pendapatanTanggal, setPendapatanTanggal] = useState(today);

  const [bebanKategori, setBebanKategori] = useState("");
  const [bebanKeterangan, setBebanKeterangan] = useState("");
  const [bebanJumlah, setBebanJumlah] = useState("");
  const [bebanTanggal, setBebanTanggal] = useState(today);

  const [asetKategori, setAsetKategori] = useState("");
  const [asetNama, setAsetNama] = useState("");
  const [asetNilai, setAsetNilai] = useState("");
  const [asetTanggal, setAsetTanggal] = useState(today);
  const [asetSumberPendanaan, setAsetSumberPendanaan] = useState("");

  const [modalAwalKeterangan, setModalAwalKeterangan] = useState("Setoran modal awal");
  const [modalAwalJumlah, setModalAwalJumlah] = useState("");
  const [modalAwalTanggal, setModalAwalTanggal] = useState(today);

  const handleCurrencyInput = (value: string, setter: (val: string) => void) => {
    setter(value.replace(/\D/g, ""));
  };

  const handleSubmitPendapatan = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildIncomeJournalPayload(accounts, {
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
      await createJournalEntry(result.value);
      toast.success("Pendapatan berhasil disimpan ke Supabase.");
      setPendapatanKeterangan("");
      setPendapatanJumlah("");
      setPendapatanTanggal(today);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pendapatan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBeban = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildExpenseJournalPayload(accounts, {
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
      await createJournalEntry(result.value);
      toast.success("Beban berhasil disimpan ke Supabase.");
      setBebanKategori("");
      setBebanKeterangan("");
      setBebanJumlah("");
      setBebanTanggal(today);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan beban.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAset = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildAssetJournalPayload(accounts, {
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
      await createJournalEntry(result.value);
      toast.success("Aset berhasil disimpan ke Supabase.");
      setAsetKategori("");
      setAsetNama("");
      setAsetNilai("");
      setAsetTanggal(today);
      setAsetSumberPendanaan("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan aset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitModalAwal = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildOpeningBalanceJournalPayload(accounts, {
      description: modalAwalKeterangan,
      amount: parseCurrencyInput(modalAwalJumlah),
      transactionDate: modalAwalTanggal,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await createJournalEntry(result.value);
      toast.success("Modal awal berhasil disimpan.");
      setModalAwalKeterangan("Setoran modal awal");
      setModalAwalJumlah("");
      setModalAwalTanggal(today);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan modal awal.");
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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
              <TabsTrigger value="beban">Beban</TabsTrigger>
              <TabsTrigger value="aset">Aset</TabsTrigger>
              <TabsTrigger value="modal-awal">Modal Awal</TabsTrigger>
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

            <TabsContent value="modal-awal" className="space-y-4">
              <form onSubmit={handleSubmitModalAwal} className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Tab ini untuk input cepat saldo/modal awal agar laporan neraca, arus kas, dan dashboard
                  langsung punya basis kas seperti UI demo sebelumnya.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-awal-tanggal">Tanggal</Label>
                  <Input
                    id="modal-awal-tanggal"
                    type="date"
                    value={modalAwalTanggal}
                    onChange={(e) => setModalAwalTanggal(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-awal-keterangan">Keterangan</Label>
                  <Input
                    id="modal-awal-keterangan"
                    type="text"
                    placeholder="Contoh: Setoran modal awal"
                    value={modalAwalKeterangan}
                    onChange={(e) => setModalAwalKeterangan(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-awal-jumlah">Jumlah Modal / Kas (Rp)</Label>
                  <Input
                    id="modal-awal-jumlah"
                    type="text"
                    placeholder="0"
                    value={formatNumberInput(modalAwalJumlah)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setModalAwalJumlah)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Coins className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Menyimpan..." : "Simpan Modal Awal"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-blue-900">
            <h3 className="font-semibold">Cara mengisi agar laporan ter-update</h3>
            <p><strong>Laba Rugi</strong> bertambah dari input <strong>Pendapatan</strong> dan <strong>Beban</strong>.</p>
            <p><strong>Arus Kas</strong> berubah dari Pendapatan, Beban, dan transaksi Aset yang memakai kas.</p>
            <p><strong>Neraca</strong> berubah dari Aset, Modal Awal, serta akumulasi laba/rugi.</p>
            <p>Kalau ingin tampilan awal seperti UI demo, isi dulu tab <strong>Modal Awal</strong>, lalu tambah pendapatan dan beban.</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
