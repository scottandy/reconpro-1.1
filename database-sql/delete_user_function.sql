-- Function to delete users from both auth.users and profiles tables
-- This function requires admin privileges and should be called from a secure context

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.delete_user(uuid);

-- Create the function to delete a user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
  current_user_dealership_id uuid;
  target_user_dealership_id uuid;
  success boolean := false;
BEGIN
  -- Get current user's role and dealership
  SELECT role, dealership_id INTO current_user_role, current_user_dealership_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get target user's dealership
  SELECT dealership_id INTO target_user_dealership_id
  FROM public.profiles
  WHERE id = user_id;
  
  -- Check permissions: only super-admin or admin of the same dealership can delete users
  IF current_user_role = 'super-admin' OR 
     (current_user_role = 'admin' AND current_user_dealership_id = target_user_dealership_id) THEN
    
    -- Delete from auth.users (this will cascade to profiles due to ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = user_id;
    
    -- Check if deletion was successful
    IF FOUND THEN
      success := true;
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to delete user';
  END IF;
  
  RETURN success;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;

-- Create a policy to allow admins to call this function
-- Note: The function itself handles permission checking, but we need RLS to allow the call
CREATE POLICY "Admins can delete users" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = profiles.dealership_id
    )
  ); 