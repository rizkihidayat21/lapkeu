import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/login";
import { DashboardLayout } from "./components/dashboard-layout";
import { DashboardOverview } from "./pages/dashboard-overview";
import { IncomeStatement } from "./pages/income-statement";
import { CashFlow } from "./pages/cash-flow";
import { BalanceSheet } from "./pages/balance-sheet";
import { AddTransaction } from "./pages/add-transaction";
import { AccountSettings } from "./pages/account-settings";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: DashboardOverview },
      { path: "laba-rugi", Component: IncomeStatement },
      { path: "arus-kas", Component: CashFlow },
      { path: "neraca", Component: BalanceSheet },
      { path: "tambah-transaksi", Component: AddTransaction },
      { path: "pengaturan-akun", Component: AccountSettings },
    ],
  },
]);
