import { useState } from "react";
import { Outlet, useLocation, Link, Navigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Building2,
  PlusCircle,
  LogOut,
  Menu,
  X,
  LoaderCircle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { useAuth } from "../providers/auth-provider";

export function DashboardLayout() {
  const location = useLocation();
  const { user, profile, isLoading, signOut, isConfigured, configError } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-xl border border-amber-300 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Supabase belum dikonfigurasi</h1>
          <p className="mt-2 text-slate-600">{configError}</p>
          <p className="mt-4 text-sm text-slate-500">
            Salin <code>.env.example</code> menjadi <code>.env</code>, isi kredensial Supabase,
            lalu restart server Vite.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-700">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>Memuat sesi...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/laba-rugi", label: "Laba Rugi", icon: FileText },
    { path: "/arus-kas", label: "Arus Kas", icon: TrendingUp },
    { path: "/neraca", label: "Neraca", icon: Building2 },
    { path: "/tambah-transaksi", label: "Tambah Transaksi", icon: PlusCircle },
    { path: "/pengaturan-akun", label: "Ubah Password", icon: KeyRound },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Sesi berhasil ditutup.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal logout.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white shadow-md"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-950 text-white transform transition-transform duration-300 z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-900" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-lg truncate">{profile?.company_name ?? "Usaha Anda"}</div>
              <div className="text-xs text-blue-200">Terhubung ke Supabase</div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4 mb-6 space-y-1">
            <div className="text-sm text-blue-200">Masuk sebagai</div>
            <div className="font-semibold truncate">{profile?.display_name ?? user.email}</div>
            <div className="text-xs text-blue-100/80 truncate">{user.email}</div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white text-slate-950 font-semibold"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-transparent border-white/30 text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-72 min-h-screen">
        <div className="px-4 pb-6 pt-20 sm:px-6 sm:pt-24 lg:p-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
