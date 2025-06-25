-- Fix for Locations RLS Policy Error
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view locations in their dealership" ON public.locations;
DROP POLICY IF EXISTS "Users can insert locations in their dealership" ON public.locations;
DROP POLICY IF EXISTS "Users can update locations in their dealership" ON public.locations;
DROP POLICY IF EXISTS "Users can delete locations in their dealership" ON public.locations;

-- Create new policies for locations table
CREATE POLICY "Users can view locations in their dealership" ON public.locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

CREATE POLICY "Users can insert locations in their dealership" ON public.locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

CREATE POLICY "Users can update locations in their dealership" ON public.locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

CREATE POLICY "Users can delete locations in their dealership" ON public.locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

-- Also add policies for location_settings table
DROP POLICY IF EXISTS "Users can view location settings in their dealership" ON public.location_settings;
DROP POLICY IF EXISTS "Users can insert location settings in their dealership" ON public.location_settings;
DROP POLICY IF EXISTS "Users can update location settings in their dealership" ON public.location_settings;

CREATE POLICY "Users can view location settings in their dealership" ON public.location_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = location_settings.dealership_id
    )
  );

CREATE POLICY "Users can insert location settings in their dealership" ON public.location_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = location_settings.dealership_id
    )
  );

CREATE POLICY "Users can update location settings in their dealership" ON public.location_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = location_settings.dealership_id
    )
  ); 