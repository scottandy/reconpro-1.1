-- Fix Settings Tables - Mixed approach
-- Theme settings: per user (user_id)
-- Inspection settings: per dealership (dealership_id)
-- Run this script in your Supabase SQL Editor

-- Drop old tables if they exist
DROP TABLE IF EXISTS theme_settings CASCADE;
DROP TABLE IF EXISTS inspection_settings CASCADE;
DROP TABLE IF EXISTS location_settings CASCADE;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS update_theme_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_inspection_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_location_settings_updated_at() CASCADE;

-- Create theme_settings table with user_id (per user)
CREATE TABLE IF NOT EXISTS theme_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create inspection_settings table with dealership_id (per dealership)
CREATE TABLE IF NOT EXISTS inspection_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealership_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dealership_id)
);

-- Create location_settings table with dealership_id (per dealership)
CREATE TABLE IF NOT EXISTS location_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealership_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dealership_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for theme_settings (user-based)
CREATE POLICY "Users can manage their own theme settings"
    ON theme_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policies for inspection_settings (dealership-based)
CREATE POLICY "Dealerships can manage their own inspection settings"
    ON inspection_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Create policies for location_settings (dealership-based)
CREATE POLICY "Dealerships can manage their own location settings"
    ON location_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Alternative policies if the above don't work (simpler approach)
-- Uncomment these and comment out the above policies if you get permission errors

-- CREATE POLICY "Allow authenticated users to manage theme settings"
--     ON theme_settings
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to manage inspection settings"
--     ON inspection_settings
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to manage location settings"
--     ON location_settings
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_theme_settings_user_id ON theme_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_settings_dealership_id ON inspection_settings(dealership_id);
CREATE INDEX IF NOT EXISTS idx_location_settings_dealership_id ON location_settings(dealership_id);

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_theme_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_inspection_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_theme_settings_updated_at
    BEFORE UPDATE ON theme_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_theme_settings_updated_at();

CREATE TRIGGER trigger_update_inspection_settings_updated_at
    BEFORE UPDATE ON inspection_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_inspection_settings_updated_at();

CREATE TRIGGER trigger_update_location_settings_updated_at
    BEFORE UPDATE ON location_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_location_settings_updated_at();

-- Verify tables were created correctly
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('theme_settings', 'inspection_settings', 'location_settings')
ORDER BY table_name, ordinal_position; 