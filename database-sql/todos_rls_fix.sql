-- Fix for Todos RLS Policy Error
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view todos in their dealership" ON public.todos;
DROP POLICY IF EXISTS "Users can insert todos in their dealership" ON public.todos;
DROP POLICY IF EXISTS "Users can update todos in their dealership" ON public.todos;
DROP POLICY IF EXISTS "Users can delete todos in their dealership" ON public.todos;

-- Create new policies for todos table
CREATE POLICY "Users can view todos in their dealership" ON public.todos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

CREATE POLICY "Users can insert todos in their dealership" ON public.todos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

CREATE POLICY "Users can update todos in their dealership" ON public.todos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

CREATE POLICY "Users can delete todos in their dealership" ON public.todos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  ); 