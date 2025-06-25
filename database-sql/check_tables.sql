-- Check current table structure and data
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('theme_settings', 'inspection_settings', 'location_settings')
ORDER BY table_name;

-- Check column structure for each table
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('theme_settings', 'inspection_settings', 'location_settings')
ORDER BY table_name, ordinal_position;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('theme_settings', 'inspection_settings', 'location_settings');

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('theme_settings', 'inspection_settings', 'location_settings');

-- Try to insert a test row to see what error we get
-- (This will help identify the exact issue)
INSERT INTO theme_settings (user_id, settings) 
VALUES ('3d2cadf7-0dda-42f3-a561-a741318e8dc3', '{"test": true}')
ON CONFLICT (user_id) DO NOTHING; 