-- Create location_color_settings table
CREATE TABLE IF NOT EXISTS location_color_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dealership_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_color_settings_dealership_id ON location_color_settings(dealership_id);

-- Enable RLS
ALTER TABLE location_color_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_color_settings
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view location color settings for their dealership" ON location_color_settings;
DROP POLICY IF EXISTS "Admins can manage location color settings for their dealership" ON location_color_settings;

-- Policy for viewing location color settings (all users in dealership)
CREATE POLICY "Users can view location color settings for their dealership" ON location_color_settings
  FOR SELECT USING (
    dealership_id IN (
      SELECT dealership_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy for managing location color settings (admins only)
CREATE POLICY "Admins can manage location color settings for their dealership" ON location_color_settings
  FOR ALL USING (
    dealership_id IN (
      SELECT dealership_id FROM profiles WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND dealership_id = location_color_settings.dealership_id
      AND role IN ('admin', 'manager')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_location_color_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_color_settings_updated_at
  BEFORE UPDATE ON location_color_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_location_color_settings_updated_at(); 