-- Simple script to create theme_settings table with user_id
-- Run this in Supabase SQL Editor

-- Drop the table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS theme_settings CASCADE;

-- Create theme_settings table with user_id
CREATE TABLE theme_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all authenticated users
-- (We can make this more restrictive later)
CREATE POLICY "Allow authenticated users to manage theme settings"
    ON theme_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create index
CREATE INDEX idx_theme_settings_user_id ON theme_settings(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_theme_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_theme_settings_updated_at
    BEFORE UPDATE ON theme_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_theme_settings_updated_at();

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'theme_settings'
ORDER BY ordinal_position; 