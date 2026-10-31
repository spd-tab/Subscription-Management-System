import AppRoutes from './routes/AppRoutes.jsx'
import { initAdapters } from './features/adapters/supabaseAdapters.js'

// Initialize Supabase adapters for Subscriptions and Billing engine
initAdapters()

export default function App() {
  return <AppRoutes />
}
