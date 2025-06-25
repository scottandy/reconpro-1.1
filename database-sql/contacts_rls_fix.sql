-- Fix for Contacts RLS Policy Error
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view contacts in their dealership" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their dealership" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their dealership" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their dealership" ON public.contacts;

-- Create new policies for contacts table
CREATE POLICY "Users can view contacts in their dealership" ON public.contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

CREATE POLICY "Users can insert contacts in their dealership" ON public.contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

CREATE POLICY "Users can update contacts in their dealership" ON public.contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

CREATE POLICY "Users can delete contacts in their dealership" ON public.contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

-- Also add policies for contact_settings table
DROP POLICY IF EXISTS "Users can view contact settings in their dealership" ON public.contact_settings;
DROP POLICY IF EXISTS "Users can insert contact settings in their dealership" ON public.contact_settings;
DROP POLICY IF EXISTS "Users can update contact settings in their dealership" ON public.contact_settings;

CREATE POLICY "Users can view contact settings in their dealership" ON public.contact_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contact_settings.dealership_id
    )
  );

CREATE POLICY "Users can insert contact settings in their dealership" ON public.contact_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contact_settings.dealership_id
    )
  );

CREATE POLICY "Users can update contact settings in their dealership" ON public.contact_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contact_settings.dealership_id
    )
  ); 