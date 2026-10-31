import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/layouts/AuthLayout'
import { Button } from '../components/common/UI'

function AuthForm({ mode }) {
  const [message, setMessage] = useState('')
  const data = {
    login: ['Welcome back', 'Sign in to continue to your workspace'],
    register: ['Create your account', 'Start managing subscriptions with Brightloop'],
    forgot: ['Reset your password', 'We will send you a link to reset your password'],
  }[mode]
  const onSubmit = (event) => {
    event.preventDefault()
    setMessage('Demo form submitted. Connect Supabase Auth to enable account access.')
  }
  return <AuthLayout title={data[0]} subtitle={data[1]}><form className="modal-form auth-form" onSubmit={onSubmit}>
    {mode === 'register' && <label>Full name<input required placeholder="Your name" /></label>}
    <label>Email address<input required type="email" placeholder="you@company.com" /></label>
    {mode !== 'forgot' && <label>Password<input required type="password" minLength="8" placeholder="At least 8 characters" /></label>}
    {mode === 'login' && <Link className="auth-link forgot-link" to="/forgot-password">Forgot password?</Link>}
    <Button type="submit">{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}</Button>
    {message && <small className="form-message">{message}</small>}
    <div className="auth-switch">{mode === 'login' ? <>New to Brightloop? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}</div>
  </form></AuthLayout>
}

export function LoginPage() { return <AuthForm mode="login" /> }
export function RegisterPage() { return <AuthForm mode="register" /> }
export function ForgotPasswordPage() { return <AuthForm mode="forgot" /> }
