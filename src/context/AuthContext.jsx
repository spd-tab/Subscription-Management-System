import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../services/supabase/client'

const AuthContext = createContext(null)

// Demo users for when Supabase is not configured
const DEMO_USERS = {
  admin: { id: 'demo-admin', email: 'admin@brightloop.io', full_name: 'Elena Rodriguez', role: 'admin' },
  staff: { id: 'demo-staff', email: 'staff@brightloop.io', full_name: 'Jordan Lee', role: 'staff' },
  customer: { id: 'demo-customer', email: 'alex@company.com', full_name: 'Alex Morgan', role: 'customer' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from the profiles table
  async function fetchProfile(userId) {
    if (!isSupabaseConfigured || !supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error fetching profile:', error.message)
      return null
    }
    return data
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const prof = await fetchProfile(session.user.id)
        setProfile(prof)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const prof = await fetchProfile(session.user.id)
          setProfile(prof)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Sign up with email, password, full name, and role
  async function signUp({ email, password, fullName, role = 'customer' }) {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode: simulate sign up
      const demoProfile = { id: `demo-${Date.now()}`, email, full_name: fullName, role }
      setUser({ id: demoProfile.id, email })
      setProfile(demoProfile)
      return { data: { user: { id: demoProfile.id, email } }, error: null }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })
    return { data, error }
  }

  // Sign in with email and password
  async function signIn({ email, password }) {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode: match against demo users or accept any login
      const demoUser = Object.values(DEMO_USERS).find((u) => u.email === email)
      const resolved = demoUser || { ...DEMO_USERS.admin, email, full_name: email.split('@')[0] }
      setUser({ id: resolved.id, email: resolved.email })
      setProfile(resolved)
      return { data: { user: { id: resolved.id, email: resolved.email } }, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  // Sign out
  async function signOut() {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null)
      setProfile(null)
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  // Reset password
  async function resetPassword(email) {
    if (!isSupabaseConfigured || !supabase) {
      return { data: {}, error: null }
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { data, error }
  }

  // Update user profile
  async function updateProfile(updates) {
    if (!isSupabaseConfigured || !supabase) {
      setProfile((prev) => ({ ...prev, ...updates }))
      return { error: null }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) {
      setProfile((prev) => ({ ...prev, ...updates }))
    }
    return { error }
  }

  // Role checks
  const isAdmin = profile?.role === 'admin'
  const isStaff = profile?.role === 'staff'
  const isCustomer = profile?.role === 'customer'
  const isAuthenticated = Boolean(user)
  const hasAdminAccess = isAdmin || isStaff

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isStaff,
    isCustomer,
    hasAdminAccess,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    DEMO_USERS,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
