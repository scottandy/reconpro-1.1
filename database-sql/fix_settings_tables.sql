-- Fix Settings Tables - Drop old tables and create new ones with dealership_id
-- Run this script in your Supabase SQL Editor

-- Drop old tables if they exist (with user_id)
DROP TABLE IF EXISTS theme_settings CASCADE;
DROP TABLE IF EXISTS inspection_settings CASCADE;
DROP TABLE IF EXISTS location_settings CASCADE;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS update_theme_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_inspection_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_location_settings_updated_at() CASCADE;

-- Create theme_settings table with dealership_id
CREATE TABLE IF NOT EXISTS theme_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealership_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dealership_id)
);

-- Create inspection_settings table with dealership_id
CREATE TABLE IF NOT EXISTS inspection_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealership_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dealership_id)
);

-- Create location_settings table with dealership_id
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

-- Create policies for theme_settings
CREATE POLICY "Dealerships can manage their own theme settings"
    ON theme_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Create policies for inspection_settings
CREATE POLICY "Dealerships can manage their own inspection settings"
    ON inspection_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Create policies for location_settings
CREATE POLICY "Dealerships can manage their own location settings"
    ON location_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_theme_settings_dealership_id ON theme_settings(dealership_id);
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