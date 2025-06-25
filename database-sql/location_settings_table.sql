-- Create location_settings table with dealership_id
CREATE TABLE IF NOT EXISTS location_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealership_id UUID NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dealership_id)
);

-- Enable Row Level Security
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow dealerships to manage their own location settings
CREATE POLICY "Dealerships can manage their own location settings"
    ON location_settings
    FOR ALL
    USING (dealership_id::text = current_setting('app.dealership_id', true))
    WITH CHECK (dealership_id::text = current_setting('app.dealership_id', true));

-- Alternative policy if you're using auth.uid() instead of app.dealership_id
-- CREATE POLICY "Users can manage their dealership's location settings"
--     ON location_settings
--     FOR ALL
--     USING (auth.uid() IN (
--         SELECT user_id FROM dealership_users WHERE dealership_id = location_settings.dealership_id
--     ))
--     WITH CHECK (auth.uid() IN (
--         SELECT user_id FROM dealership_users WHERE dealership_id = location_settings.dealership_id
--     ));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_location_settings_dealership_id ON location_settings(dealership_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_settings_updated_at
    BEFORE UPDATE ON location_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_location_settings_updated_at(); 