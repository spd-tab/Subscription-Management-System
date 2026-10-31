import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminLayout, CustomerLayout } from '../components/layouts/AppShell'
import AuthGuard from '../components/layouts/AuthGuard'
import ModulePage, { routeMeta } from '../pages/ModulePage'
import CustomerDetailsPage from '../pages/CustomerDetailsPage'
import { DashboardPage, CustomersPage } from '../pages/ReferencePages'
import SubscriptionsPage from '../features/subscriptions/pages/SubscriptionsPage'
import SubscriptionDetailsPage from '../features/subscriptions/pages/SubscriptionDetailsPage'
import InvoicesPage from '../features/billing/pages/InvoicesPage'
import InvoiceDetailsPage from '../features/billing/pages/InvoiceDetailsPage'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/AuthPages'
import PaymentsPage from '../pages/PaymentsPage'
import DiscountsPage from '../pages/DiscountsPage'
import { PortalDashboardPage, PortalSubscriptionsPage, PortalInvoicesPage, PortalPaymentsPage, PortalSettingsPage } from '../pages/PortalPages'
import { useAuth } from '../context/AuthContext'

const adminPlaceholderRoutes = Object.entries(routeMeta).filter(
  ([path]) => path.startsWith('/admin/') && !['/admin/customers/:id', '/admin/products/:id', '/admin/subscriptions', '/admin/subscriptions/:id', '/admin/invoices', '/admin/invoices/:id', '/admin/payments', '/admin/discounts'].includes(path)
)
const portalPlaceholderRoutes = Object.entries(routeMeta).filter(
  ([path]) => path.startsWith('/portal/') && !['/portal/dashboard', '/portal/subscriptions', '/portal/invoices', '/portal/payments', '/portal/settings'].includes(path)
)

function SmartRedirect({ adminTo, portalTo }) {
  const { isCustomer } = useAuth()
  return <Navigate to={isCustomer ? portalTo : adminTo} replace />
}

function SmartDetailRedirect({ adminTo, portalTo }) {
  const { id } = useParams()
  const { isCustomer } = useAuth()
  const base = isCustomer ? portalTo : adminTo
  return <Navigate to={`${base}/${encodeURIComponent(id || '')}`} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Shared top-level route shortcuts with smart role-based redirection */}
      <Route path="/subscriptions" element={<SmartRedirect adminTo="/admin/subscriptions" portalTo="/portal/subscriptions" />} />
      <Route path="/subscriptions/:id" element={<SmartDetailRedirect adminTo="/admin/subscriptions" portalTo="/portal/subscriptions" />} />
      <Route path="/invoices" element={<SmartRedirect adminTo="/admin/invoices" portalTo="/portal/invoices" />} />
      <Route path="/invoices/:id" element={<SmartDetailRedirect adminTo="/admin/invoices" portalTo="/portal/invoices" />} />

      {/* Admin routes — accessible by admin and staff */}
      <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'staff']}><AdminLayout /></AuthGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetailsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="discounts" element={<DiscountsPage />} />
        {adminPlaceholderRoutes.map(([path, meta]) => (
          <Route key={path} path={path.slice('/admin/'.length)} element={<ModulePage meta={meta} />} />
        ))}
        <Route path="customers/:id" element={<CustomerDetailsPage />} />
        <Route path="products/:id" element={<ModulePage meta={routeMeta['/admin/products/:id']} />} />
      </Route>

      {/* Customer portal routes — accessible by customers */}
      <Route path="/portal" element={<AuthGuard allowedRoles={['customer']}><CustomerLayout /></AuthGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PortalDashboardPage />} />
        <Route path="subscriptions" element={<PortalSubscriptionsPage />} />
        <Route path="invoices" element={<PortalInvoicesPage />} />
        <Route path="payments" element={<PortalPaymentsPage />} />
        <Route path="settings" element={<PortalSettingsPage />} />
        {portalPlaceholderRoutes.map(([path, meta]) => (
          <Route key={path} path={path.slice('/portal/'.length)} element={<ModulePage meta={meta} />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
