import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * AuthGuard — protects routes based on authentication and role.
 *
 * Props:
 *   - allowedRoles: optional array of roles that can access the route (e.g. ['admin','staff'])
 *     If omitted, any authenticated user can access.
 *   - children: the protected content to render
 */
export default function AuthGuard({ children, allowedRoles }) {
  const { isAuthenticated, profile, loading } = useAuth()
  const location = useLocation()

  // Show nothing while checking auth state
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <span>Verifying access…</span>
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // If specific roles are required, deny access when a profile is unavailable.
  if (allowedRoles && allowedRoles.length > 0) {
    if (!profile) {
      return <Navigate to="/login" replace />
    }

    if (!allowedRoles.includes(profile.role)) {
      // Customers trying to access admin → redirect to portal
      if (profile.role === 'customer') {
        return <Navigate to="/portal/dashboard" replace />
      }
      // Admin/staff trying to access customer portal → redirect to admin
      return <Navigate to="/admin/dashboard" replace />
    }
  }

  return children
}
