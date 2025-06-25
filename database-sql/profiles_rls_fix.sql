-- Fix for Profiles RLS Policy - Allow Admins to Insert New Users
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can insert profiles in their dealership" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON public.profiles;

-- Create policy for admins to insert new user profiles in their dealership
CREATE POLICY "Admins can insert profiles in their dealership" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = profiles.dealership_id
    )
  );

-- Also ensure the trigger function can insert profiles (for new signups)
-- This is already handled by the SECURITY DEFINER in the trigger function,
-- but let's make sure the policy allows it
CREATE POLICY "Trigger can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Note: The trigger function handle_new_user() has SECURITY DEFINER,
-- which means it runs with elevated privileges and can bypass RLS.
-- This policy is mainly for manual profile creation by admins. 