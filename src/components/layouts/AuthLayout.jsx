import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children }) {
  return <main className="auth-page"><section className="auth-card"><Link to="/login" className="brand auth-brand"><span className="brand-mark">B</span><span>brightloop</span></Link><h1>{title}</h1><p>{subtitle}</p>{children}</section></main>
}
