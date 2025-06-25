-- Updated User Trigger Function
-- Run this in your Supabase SQL Editor to fix the user creation trigger

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_dealership_id uuid;
  user_role text;
BEGIN
  -- Get dealership_id from user metadata
  user_dealership_id := (new.raw_user_meta_data->>'dealership_id')::uuid;
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'technician');
  
  -- Insert profile with proper dealership_id
  INSERT INTO public.profiles (id, first_name, last_name, initials, role, dealership_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      UPPER(LEFT(new.raw_user_meta_data->>'first_name', 1) || LEFT(new.raw_user_meta_data->>'last_name', 1)),
      'U'
    ),
    user_role,
    user_dealership_id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 