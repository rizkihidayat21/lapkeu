import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DatabaseZap,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { buildDashboardData, formatRupiah } from "../../lib/finance";
import { useFinance } from "../providers/finance-provider";

function calculateChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export function DashboardOverview() {
  const { transactions, isLoading, error } = useFinance();
  const { currentLabel, monthlyData, expenseData, cashBalance, currentMonth, previousMonth } =
    buildDashboardData(transactions);

  const revenueChange = calculateChange(currentMonth.pendapatan, previousMonth.pendapatan);
  const profitChange = calculateChange(currentMonth.laba, previousMonth.laba);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Ringkasan keuangan real-time untuk {currentLabel}</p>
      </div>

      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendapatan</CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              {formatRupiah(currentMonth.pendapatan)}
            </div>
            <div className="flex flex-wrap items-center text-sm mt-1">
              {revenueChange >= 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600">+{revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-600">{revenueChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-gray-500 ml-1">dibanding bulan sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Beban</CardTitle>
            <TrendingDown className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              {formatRupiah(currentMonth.beban)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Diambil langsung dari transaksi expense</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Laba Bersih</CardTitle>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{formatRupiah(currentMonth.laba)}</div>
            <div className="flex flex-wrap items-center text-sm mt-1">
              {profitChange >= 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600">+{profitChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-600">{profitChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-gray-500 ml-1">dibanding bulan sebelumnya</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saldo Kas</CardTitle>
            <Wallet className="w-5 h-5 text-cyan-700" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{formatRupiah(cashBalance)}</div>
            <div className="text-sm text-gray-500 mt-1">Posisi kas hasil kalkulasi transaksi</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Pendapatan & Beban</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis tickFormatter={(value) => `${value / 1000000}Jt`} />
                <Tooltip formatter={(value: number) => formatRupiah(value)} />
                <Legend />
                <Line type="monotone" dataKey="pendapatan" stroke="#2563eb" strokeWidth={3} name="Pendapatan" />
                <Line type="monotone" dataKey="beban" stroke="#ea580c" strokeWidth={3} name="Beban" />
                <Line type="monotone" dataKey="laba" stroke="#059669" strokeWidth={3} name="Laba" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Komposisi Beban</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="jumlah"
                      nameKey="keterangan"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatRupiah(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {expenseData.map((item) => (
                    <div key={item.keterangan} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600 break-words">{item.keterangan}</span>
                      </div>
                      <span className="font-medium text-right break-words">{formatRupiah(item.jumlah)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center text-gray-500">
                <DatabaseZap className="w-10 h-10 mb-3 text-gray-400" />
                <p>Belum ada transaksi beban pada periode ini.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Laba per Bulan</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bulan" />
              <YAxis tickFormatter={(value) => `${value / 1000000}Jt`} />
              <Tooltip formatter={(value: number) => formatRupiah(value)} />
              <Legend />
              <Bar dataKey="laba" fill="#0f766e" name="Laba Bersih" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {isLoading && <p className="mt-3 text-sm text-gray-500">Memuat transaksi dari Supabase...</p>}
        </CardContent>
      </Card>
    </div>
  );
}
