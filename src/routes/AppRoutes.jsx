import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout, CustomerLayout } from '../components/layouts/AppShell'
import AuthGuard from '../components/layouts/AuthGuard'
import ModulePage, { routeMeta } from '../pages/ModulePage'
import { DashboardPage, CustomersPage, SubscriptionsPage, InvoicesPage } from '../pages/ReferencePages'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/AuthPages'

const adminPlaceholderRoutes = Object.entries(routeMeta).filter(([path]) => path.startsWith('/admin/') && !['/admin/customers/:id', '/admin/products/:id', '/admin/subscriptions/:id', '/admin/invoices/:id'].includes(path))
const portalRoutes = Object.entries(routeMeta).filter(([path]) => path.startsWith('/portal/'))

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      {adminPlaceholderRoutes.map(([path, meta]) => <Route key={path} path={path.slice('/admin/'.length)} element={<ModulePage meta={meta} />} />)}
      <Route path="customers/:id" element={<ModulePage meta={routeMeta['/admin/customers/:id']} />} />
      <Route path="products/:id" element={<ModulePage meta={routeMeta['/admin/products/:id']} />} />
      <Route path="subscriptions/:id" element={<ModulePage meta={routeMeta['/admin/subscriptions/:id']} />} />
      <Route path="invoices/:id" element={<ModulePage meta={routeMeta['/admin/invoices/:id']} />} />
    </Route>
    <Route path="/portal" element={<AuthGuard><CustomerLayout /></AuthGuard>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      {portalRoutes.map(([path, meta]) => <Route key={path} path={path.slice('/portal/'.length)} element={<ModulePage meta={meta} />} />)}
    </Route>
    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
  </Routes>
}
