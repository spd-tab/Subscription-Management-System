import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout, CustomerLayout } from '../components/layouts/AppShell'
import AuthGuard from '../components/layouts/AuthGuard'
import ModulePage, { routeMeta } from '../pages/ModulePage'
import { DashboardPage, CustomersPage, SubscriptionsPage, InvoicesPage } from '../pages/ReferencePages'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/AuthPages'
import PaymentsPage from '../pages/PaymentsPage'
import DiscountsPage from '../pages/DiscountsPage'
import { PortalDashboardPage, PortalSubscriptionsPage, PortalInvoicesPage, PortalPaymentsPage } from '../pages/PortalPages'

const adminPlaceholderRoutes = Object.entries(routeMeta).filter(([path]) => path.startsWith('/admin/') && !['/admin/customers/:id', '/admin/products/:id', '/admin/subscriptions/:id', '/admin/invoices/:id', '/admin/payments', '/admin/discounts'].includes(path))
const portalPlaceholderRoutes = Object.entries(routeMeta).filter(([path]) => path.startsWith('/portal/') && !['/portal/dashboard', '/portal/subscriptions', '/portal/invoices', '/portal/payments'].includes(path))

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

    {/* Admin routes — accessible by admin and staff */}
    <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'staff']}><AdminLayout /></AuthGuard>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      <Route path="payments" element={<PaymentsPage />} />
      <Route path="discounts" element={<DiscountsPage />} />
      {adminPlaceholderRoutes.map(([path, meta]) => <Route key={path} path={path.slice('/admin/'.length)} element={<ModulePage meta={meta} />} />)}
      <Route path="customers/:id" element={<ModulePage meta={routeMeta['/admin/customers/:id']} />} />
      <Route path="products/:id" element={<ModulePage meta={routeMeta['/admin/products/:id']} />} />
      <Route path="subscriptions/:id" element={<ModulePage meta={routeMeta['/admin/subscriptions/:id']} />} />
      <Route path="invoices/:id" element={<ModulePage meta={routeMeta['/admin/invoices/:id']} />} />
    </Route>

    {/* Customer portal routes — accessible by customers */}
    <Route path="/portal" element={<AuthGuard allowedRoles={['customer']}><CustomerLayout /></AuthGuard>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<PortalDashboardPage />} />
      <Route path="subscriptions" element={<PortalSubscriptionsPage />} />
      <Route path="invoices" element={<PortalInvoicesPage />} />
      <Route path="payments" element={<PortalPaymentsPage />} />
      {portalPlaceholderRoutes.map(([path, meta]) => <Route key={path} path={path.slice('/portal/'.length)} element={<ModulePage meta={meta} />} />)}
    </Route>

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
}
