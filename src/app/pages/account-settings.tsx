import { useState } from "react";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../providers/auth-provider";

export function AccountSettings() {
  const { user, profile, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      toast.success("Password berhasil diubah.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pengaturan Akun</h1>
        <p className="text-gray-500 mt-1">Kelola akun admin tunggal untuk aplikasi ini</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 border-b pb-3">
            <span className="text-gray-500">Nama</span>
            <span className="font-medium text-right">{profile?.display_name ?? "-"}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 border-b pb-3">
            <span className="text-gray-500">Nama usaha</span>
            <span className="font-medium text-right">{profile?.company_name ?? "-"}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <span className="text-gray-500">Email login</span>
            <span className="font-medium text-right break-all">{user?.email ?? "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubah Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
