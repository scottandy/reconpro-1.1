-- Fix for Profiles RLS Policy - Allow Admins to Insert New Users
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can insert profiles in their dealership" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates during signup" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles for their dealership" ON public.profiles;

-- Create a simple policy that allows all profile operations during signup
CREATE POLICY "Allow profile operations during signup" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Note: The trigger function handle_new_user() has SECURITY DEFINER,
-- which means it runs with elevated privileges and can bypass RLS.
-- This policy is mainly for manual profile creation by admins. 

-- ========================================
-- DEALERSHIPS RLS POLICIES
-- ========================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow dealership creation during signup" ON public.dealerships;
DROP POLICY IF EXISTS "Admins can insert dealerships" ON public.dealerships;

-- Create a simple policy that allows dealership creation during signup
CREATE POLICY "Allow dealership operations during signup" ON public.dealerships
  FOR ALL USING (true) WITH CHECK (true); 