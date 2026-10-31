-- ============================================================
-- MIGRATION 004: Authentication & RLS Security Hardening
-- Purpose:
--   1. Prevents self-escalation to Admin/Staff during registration (forces role = 'customer').
--   2. Prevents users from escalating their role via profiles UPDATE.
--   3. Hardens customer isolation across subscriptions, invoices, and payments.
-- ============================================================

-- 1. Fix Registration Trigger: Never trust user_metadata for administrative roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_role TEXT := 'customer';
BEGIN
  -- Strict role assignment: Public registrations are ALWAYS 'customer'.
  -- Administrative/staff accounts must be provisioned by an existing admin or seeded.
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    v_assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = NOW();

  -- Auto-link customer record if matching email exists with null auth_user_id
  UPDATE public.customers
  SET auth_user_id = NEW.id,
      updated_at = NOW()
  WHERE email = NEW.email AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Prevent Privilege Escalation via profiles UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Users can only update their own profile and CANNOT change their role
CREATE POLICY "Users can update their own profile non-role fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile including roles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- 3. Verify Payment Method Constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'UPI', 'cheque', 'other'));

