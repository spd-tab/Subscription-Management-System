import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, LayoutDashboard, RefreshCw, ReceiptText, UsersRound, MoreHorizontal, Package, BadgePercent, ChartNoAxesCombined, Settings, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const primaryLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/subscriptions', label: 'Subs', icon: RefreshCw },
  { to: '/admin/invoices', label: 'Invoices', icon: ReceiptText },
  { to: '/admin/customers', label: 'Customers', icon: UsersRound },
]
const extraLinks = [
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/plans', label: 'Plans', icon: ReceiptText },
  { to: '/admin/quotations', label: 'Quotations', icon: ReceiptText },
  { to: '/admin/payments', label: 'Payments', icon: BadgePercent },
  { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
  { to: '/admin/taxes', label: 'Tax configuration', icon: ReceiptText },
  { to: '/admin/reports', label: 'Reports', icon: ChartNoAxesCombined },
  { to: '/admin/team', label: 'Team members', icon: UsersRound },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]
const portalLinks = [
  { to: '/portal/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/portal/subscriptions', label: 'My subscriptions', icon: RefreshCw },
  { to: '/portal/invoices', label: 'My invoices', icon: ReceiptText },
  { to: '/portal/payments', label: 'Payment history', icon: BadgePercent },
]

function LinkItem({ link, onClick }) {
  const Icon = link.icon
  return <NavLink to={link.to} onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{link.label}</span></NavLink>
}

export function AdminLayout() {
  return <Shell customer={false} />
}

export function CustomerLayout() {
  return <Shell customer />
}

function Shell({ customer }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut, isAdmin, isStaff } = useAuth()
  const links = customer ? portalLinks : primaryLinks
  const currentLabel = [...primaryLinks, ...extraLinks, ...portalLinks].find((item) => item.to === location.pathname)?.label ?? 'Brightloop'

  const userName = profile?.full_name || (customer ? 'Customer' : 'Administrator')
  const userInitials = userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const userRole = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : customer ? 'Customer' : 'Administrator'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const roleBadge = profile?.role === 'admin' ? 'role-admin' : profile?.role === 'staff' ? 'role-staff' : 'role-customer'

  return <div className="app-shell">
    {drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
    <aside className={`sidebar ${drawerOpen ? 'sidebar-open' : ''}`}>
      <NavLink to={customer ? '/portal/dashboard' : '/admin/dashboard'} className="brand"><span className="brand-mark">B</span><span>brightloop</span></NavLink>
      <div className="workspace-label">{customer ? 'CUSTOMER PORTAL' : 'WORKSPACE'}</div>
      <nav className="side-nav">{(customer ? portalLinks : primaryLinks).map((link) => <LinkItem key={link.to} link={link} onClick={() => setDrawerOpen(false)} />)}
        {!customer && <><div className="workspace-label section-label">MANAGE</div>{extraLinks.map((link) => <LinkItem key={link.to} link={link} onClick={() => setDrawerOpen(false)} />)}</>}
      </nav>
      <div className="sidebar-profile">
        <div className={`avatar ${roleBadge}`}>{userInitials}</div>
        <div>
          <strong>{userName}</strong>
          <small className="role-label">
            <Shield size={12} /> {userRole}
          </small>
        </div>
        <button className="icon-button" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><Menu size={21} /></button>
        <span className="topbar-title">{currentLabel}</span>
        <div className="topbar-spacer" />
        <button className="icon-button notification-button" aria-label="Notifications"><Bell size={20} /><i /></button>
        <button className="profile-button">
          <span className={`avatar ${roleBadge}`}>{userInitials}</span>
          <span>{userName}</span>
        </button>
      </header>
      <main className="page-content"><Outlet /></main>
      <footer className="footer-note">◈ Brightloop Core Ledger <span>•</span> Synced 2m ago</footer>
    </div>
    <nav className="mobile-nav">
      {(customer ? portalLinks : primaryLinks).map((link) => <LinkItem key={link.to} link={link} />)}
      {!customer && <button className={`nav-link ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={20} /><span>More</span></button>}
      {moreOpen && <div className="mobile-more">{extraLinks.map((link) => <LinkItem key={link.to} link={link} onClick={() => setMoreOpen(false)} />)}</div>}
    </nav>
  </div>
}
