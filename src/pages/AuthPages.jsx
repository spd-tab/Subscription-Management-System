import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/layouts/AuthLayout'
import { Button } from '../components/common/UI'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../services/supabase/client'

function AuthForm({ mode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('customer')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') // 'info' | 'success' | 'error'
  const [submitting, setSubmitting] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from || null

  const data = {
    login: ['Welcome back', 'Sign in to continue to your workspace'],
    register: ['Create your account', 'Start managing subscriptions with Brightloop'],
    forgot: ['Reset your password', 'We will send you a link to reset your password'],
  }[mode]

  const onSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn({ email, password })
        if (error) {
          setMessage(error.message || 'Invalid credentials. Please try again.')
          setMessageType('error')
        } else {
          // Redirect to where they were trying to go, or default based on role
          const redirectTo = from || '/admin/dashboard'
          navigate(redirectTo, { replace: true })
        }
      } else if (mode === 'register') {
        const { error } = await signUp({ email, password, fullName, role })
        if (error) {
          setMessage(error.message || 'Registration failed. Please try again.')
          setMessageType('error')
        } else {
          if (isSupabaseConfigured) {
            setMessage('Account created! Please check your email to confirm your account.')
            setMessageType('success')
          } else {
            // Demo mode: auto-login
            const redirectTo = role === 'customer' ? '/portal/dashboard' : '/admin/dashboard'
            navigate(redirectTo, { replace: true })
          }
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) {
          setMessage(error.message || 'Failed to send reset email.')
          setMessageType('error')
        } else {
          setMessage('Password reset link sent to your email.')
          setMessageType('success')
        }
      }
    } catch (err) {
      setMessage('An unexpected error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title={data[0]} subtitle={data[1]}>
      <form className="modal-form auth-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label>
            Full name
            <input
              required
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}

        <label>
          Email address
          <input
            required
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {mode !== 'forgot' && (
          <label>
            Password
            <input
              required
              type="password"
              minLength="8"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {mode === 'register' && (
          <label>
            Account type
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
        )}

        {mode === 'login' && (
          <Link className="auth-link forgot-link" to="/forgot-password">
            Forgot password?
          </Link>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
                ? 'Create account'
                : 'Send reset link'}
        </Button>

        {message && (
          <small className={`form-message form-message-${messageType}`}>
            {message}
          </small>
        )}

        {!isSupabaseConfigured && mode === 'login' && (
          <div className="demo-credentials">
            <small className="demo-label">Demo mode — try these credentials:</small>
            <div className="demo-accounts">
              <button type="button" className="demo-account" onClick={() => { setEmail('admin@brightloop.io'); setPassword('password') }}>
                <span className="demo-role admin">Admin</span>
                <span>admin@brightloop.io</span>
              </button>
              <button type="button" className="demo-account" onClick={() => { setEmail('staff@brightloop.io'); setPassword('password') }}>
                <span className="demo-role staff">Staff</span>
                <span>staff@brightloop.io</span>
              </button>
              <button type="button" className="demo-account" onClick={() => { setEmail('alex@company.com'); setPassword('password') }}>
                <span className="demo-role customer">Customer</span>
                <span>alex@company.com</span>
              </button>
            </div>
          </div>
        )}

        <div className="auth-switch">
          {mode === 'login' ? (
            <>New to Brightloop? <Link to="/register">Create an account</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          )}
        </div>
      </form>
    </AuthLayout>
  )
}

export function LoginPage() { return <AuthForm mode="login" /> }
export function RegisterPage() { return <AuthForm mode="register" /> }
export function ForgotPasswordPage() { return <AuthForm mode="forgot" /> }
