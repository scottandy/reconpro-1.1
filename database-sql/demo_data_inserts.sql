-- Demo Data Inserts for ReconPro Database
-- This file contains all the demo data from localStorage converted to SQL inserts
-- Run this after creating the database schema

-- ========================================
-- DEALERSHIPS
-- ========================================

-- Insert demo dealerships
INSERT INTO public.dealerships (
  id, name, address, city, state, zip_code, phone, email, website, 
  is_active, subscription_plan, status, last_activity, total_users, 
  total_vehicles, monthly_revenue, settings, created_at, updated_at
) VALUES 
-- Platform Admin Dealership
(
  gen_random_uuid(),
  'ReconPro Platform',
  '1 Platform Drive',
  'Tech City',
  'CA',
  '94000',
  '(555) 000-0000',
  'platform@reconpro.com',
  'https://reconpro.com',
  true,
  'enterprise',
  'active',
  NOW(),
  1,
  0,
  0,
  '{"allowUserRegistration": true, "requireApproval": false, "maxUsers": 999, "features": {"analytics": true, "multiLocation": true, "customReports": true, "apiAccess": true}}',
  NOW(),
  NOW()
),
-- Premier Auto Group
(
  gen_random_uuid(),
  'Premier Auto Group',
  '123 Main Street',
  'Springfield',
  'IL',
  '62701',
  '(555) 123-4567',
  'info@premierauto.com',
  'https://premierauto.com',
  true,
  'premium',
  'active',
  NOW(),
  3,
  15,
  2500,
  '{"allowUserRegistration": true, "requireApproval": false, "maxUsers": 50, "features": {"analytics": true, "multiLocation": true, "customReports": true, "apiAccess": false}}',
  NOW(),
  NOW()
),
-- City Motors
(
  gen_random_uuid(),
  'City Motors',
  '456 Oak Avenue',
  'Chicago',
  'IL',
  '60601',
  '(555) 987-6543',
  'contact@citymotors.com',
  NULL,
  true,
  'basic',
  'active',
  NOW() - INTERVAL '2 days',
  2,
  8,
  500,
  '{"allowUserRegistration": false, "requireApproval": true, "maxUsers": 10, "features": {"analytics": false, "multiLocation": false, "customReports": false, "apiAccess": false}}',
  NOW(),
  NOW()
),
-- Elite Motors
(
  gen_random_uuid(),
  'Elite Motors',
  '789 Business Blvd',
  'Los Angeles',
  'CA',
  '90210',
  '(555) 456-7890',
  'admin@elitemotors.com',
  NULL,
  true,
  'enterprise',
  'trial',
  NOW() - INTERVAL '7 days',
  8,
  45,
  5000,
  '{"allowUserRegistration": true, "requireApproval": false, "maxUsers": 100, "features": {"analytics": true, "multiLocation": true, "customReports": true, "apiAccess": true}}',
  NOW() - INTERVAL '30 days',
  NOW()
);

-- ========================================
-- LOCATIONS (Default locations for each dealership)
-- ========================================

-- Get dealership IDs first
DO $$
DECLARE
  platform_admin_id uuid;
  premier_dealership_id uuid;
  city_motors_id uuid;
  elite_motors_id uuid;
BEGIN
  -- Get dealership IDs
  SELECT id INTO platform_admin_id FROM public.dealerships WHERE name = 'ReconPro Platform' LIMIT 1;
  SELECT id INTO premier_dealership_id FROM public.dealerships WHERE name = 'Premier Auto Group' LIMIT 1;
  SELECT id INTO city_motors_id FROM public.dealerships WHERE name = 'City Motors' LIMIT 1;
  SELECT id INTO elite_motors_id FROM public.dealerships WHERE name = 'Elite Motors' LIMIT 1;

  -- Premier Auto Group Locations
  INSERT INTO public.locations (
    id, name, type, description, is_active, capacity, color, dealership_id, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    'Lot A',
    'on-site',
    'Main front lot',
    true,
    50,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Lot B',
    'on-site',
    'Side lot',
    true,
    30,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Indoor Showroom',
    'display',
    'Indoor display area',
    true,
    8,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Service Bay',
    'service',
    'Service department',
    true,
    12,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Test Drive',
    'test-drive',
    'Vehicles out for test drives',
    true,
    NULL,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Demo Fleet',
    'demo',
    'Demo vehicles',
    true,
    5,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'In-Transit',
    'custom',
    'Vehicles being transported',
    true,
    NULL,
    '#3B82F6',
    premier_dealership_id,
    NOW(),
    NOW()
  );

  -- City Motors Locations
  INSERT INTO public.locations (
    id, name, type, description, is_active, capacity, color, dealership_id, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    'Lot A',
    'on-site',
    'Main front lot',
    true,
    50,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Lot B',
    'on-site',
    'Side lot',
    true,
    30,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Indoor Showroom',
    'display',
    'Indoor display area',
    true,
    8,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Service Bay',
    'service',
    'Service department',
    true,
    12,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Test Drive',
    'test-drive',
    'Vehicles out for test drives',
    true,
    NULL,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Demo Fleet',
    'demo',
    'Demo vehicles',
    true,
    5,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'In-Transit',
    'custom',
    'Vehicles being transported',
    true,
    NULL,
    '#3B82F6',
    city_motors_id,
    NOW(),
    NOW()
  );

  -- Elite Motors Locations
  INSERT INTO public.locations (
    id, name, type, description, is_active, capacity, color, dealership_id, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    'Lot A',
    'on-site',
    'Main front lot',
    true,
    50,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Lot B',
    'on-site',
    'Side lot',
    true,
    30,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Indoor Showroom',
    'display',
    'Indoor display area',
    true,
    8,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Service Bay',
    'service',
    'Service department',
    true,
    12,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Test Drive',
    'test-drive',
    'Vehicles out for test drives',
    true,
    NULL,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Demo Fleet',
    'demo',
    'Demo vehicles',
    true,
    5,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'In-Transit',
    'custom',
    'Vehicles being transported',
    true,
    NULL,
    '#3B82F6',
    elite_motors_id,
    NOW(),
    NOW()
  );

  -- ========================================
  -- VEHICLES (Mock vehicles from mockVehicles.ts)
  -- ========================================

  -- Get location IDs for Premier Auto Group
  DECLARE
    lot_a_id uuid;
    lot_b_id uuid;
    indoor_id uuid;
  BEGIN
    -- Get location IDs
    SELECT id INTO lot_a_id FROM public.locations WHERE dealership_id = premier_dealership_id AND name = 'Lot A' LIMIT 1;
    SELECT id INTO lot_b_id FROM public.locations WHERE dealership_id = premier_dealership_id AND name = 'Lot B' LIMIT 1;
    SELECT id INTO indoor_id FROM public.locations WHERE dealership_id = premier_dealership_id AND name = 'Indoor Showroom' LIMIT 1;
    
    -- Insert mock vehicles for Premier Auto Group
    INSERT INTO public.vehicles (
      id, vin, year, make, model, trim, mileage, color, date_acquired, target_sale_date, 
      price, location_id, location_name, status, notes, team_notes, dealership_id, 
      created_at, updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      '1HGCM82633A123456',
      2023,
      'Honda',
      'Accord',
      'Sport',
      15000,
      'Pearl White',
      '2024-01-15',
      '2024-02-15',
      28500,
      lot_a_id,
      'Lot A-12',
      '{"emissions": "completed", "cosmetic": "pending", "mechanical": "completed", "cleaned": "not-started", "photos": "needs-attention"}',
      'Minor door ding on passenger side',
      '[
        {"id": "1", "text": "Vehicle received from trade-in. Initial inspection shows minor cosmetic issues.", "userInitials": "JD", "timestamp": "2024-01-15T10:30:00Z", "category": "general"},
        {"id": "2", "text": "Emissions testing completed successfully. All systems pass.", "userInitials": "MS", "timestamp": "2024-01-16T14:20:00Z", "category": "emissions"},
        {"id": "3", "text": "Door ding on passenger side needs PDR work before photos.", "userInitials": "TK", "timestamp": "2024-01-17T09:15:00Z", "category": "cosmetic"}
      ]',
      premier_dealership_id,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '1FTFW1ET5DFC12345',
      2022,
      'Ford',
      'F-150',
      'XLT',
      25000,
      'Magnetic Gray',
      '2024-01-20',
      NULL,
      45000,
      lot_b_id,
      'Lot B-03',
      '{"emissions": "completed", "cosmetic": "completed", "mechanical": "completed", "cleaned": "completed", "photos": "completed"}',
      'Excellent condition, ready for sale',
      '[
        {"id": "4", "text": "Excellent condition truck from lease return. Minimal reconditioning needed.", "userInitials": "JD", "timestamp": "2024-01-20T11:00:00Z", "category": "general"},
        {"id": "5", "text": "All mechanical systems check out perfectly. No issues found.", "userInitials": "RL", "timestamp": "2024-01-21T13:45:00Z", "category": "mechanical"},
        {"id": "6", "text": "Professional detail completed. Vehicle is showroom ready.", "userInitials": "AM", "timestamp": "2024-01-22T16:30:00Z", "category": "cleaning"}
      ]',
      premier_dealership_id,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '5YJ3E1EA4JF123456',
      2021,
      'Tesla',
      'Model 3',
      'Standard Range Plus',
      35000,
      'Midnight Silver',
      '2024-01-25',
      '2024-02-28',
      38000,
      indoor_id,
      'Indoor-05',
      '{"emissions": "not-started", "cosmetic": "needs-attention", "mechanical": "pending", "cleaned": "not-started", "photos": "not-started"}',
      'Charging port needs repair',
      '[
        {"id": "7", "text": "Tesla received with charging port issue. Needs service appointment.", "userInitials": "JD", "timestamp": "2024-01-25T08:30:00Z", "category": "general"},
        {"id": "8", "text": "Charging port door mechanism is stuck. Ordered replacement part.", "userInitials": "BW", "timestamp": "2024-01-26T10:15:00Z", "category": "mechanical"}
      ]',
      premier_dealership_id,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '1G1ZD5ST8JF123456',
      2020,
      'Chevrolet',
      'Camaro',
      'SS',
      42000,
      'Rally Green',
      '2024-01-10',
      NULL,
      35000,
      lot_a_id,
      'Lot A-07',
      '{"emissions": "completed", "cosmetic": "completed", "mechanical": "pending", "cleaned": "pending", "photos": "completed"}',
      NULL,
      '[
        {"id": "9", "text": "Performance vehicle in good condition. Minor maintenance items to address.", "userInitials": "JD", "timestamp": "2024-01-10T15:20:00Z", "category": "general"},
        {"id": "10", "text": "Brake pads at 40% - recommend replacement before sale.", "userInitials": "RL", "timestamp": "2024-01-12T11:30:00Z", "category": "mechanical"}
      ]',
      premier_dealership_id,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '2T1BURHE8JC123456',
      2019,
      'Toyota',
      'Corolla',
      'LE',
      58000,
      'Classic Silver',
      '2024-01-30',
      NULL,
      18500,
      lot_b_id,
      'Lot C-15',
      '{"emissions": "pending", "cosmetic": "needs-attention", "mechanical": "needs-attention", "cleaned": "not-started", "photos": "not-started"}',
      'Requires brake work and paint touch-up',
      '[
        {"id": "11", "text": "High mileage vehicle needs comprehensive inspection and reconditioning.", "userInitials": "JD", "timestamp": "2024-01-30T12:00:00Z", "category": "general"},
        {"id": "12", "text": "Front bumper has multiple scratches. Needs paint work.", "userInitials": "TK", "timestamp": "2024-01-31T09:45:00Z", "category": "cosmetic"}
      ]',
      premier_dealership_id,
      NOW(),
      NOW()
    );
  END;

  -- ========================================
  -- SETTINGS (Default settings for each dealership)
  -- ========================================

  -- Location Settings
  INSERT INTO public.location_settings (
    id, dealership_id, settings, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    premier_dealership_id,
    '{"defaultLocationType": "on-site", "allowCustomLocations": true, "requireLocationForVehicles": true, "autoAssignLocation": false, "locationCapacityTracking": true}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    city_motors_id,
    '{"defaultLocationType": "on-site", "allowCustomLocations": true, "requireLocationForVehicles": true, "autoAssignLocation": false, "locationCapacityTracking": true}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    '{"defaultLocationType": "on-site", "allowCustomLocations": true, "requireLocationForVehicles": true, "autoAssignLocation": false, "locationCapacityTracking": true}',
    NOW(),
    NOW()
  );

  -- Contact Settings
  INSERT INTO public.contact_settings (
    id, dealership_id, settings, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    premier_dealership_id,
    '{"defaultCategory": "other", "autoSaveContacts": true, "showFavoritesFirst": true, "enableCallLogging": true}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    city_motors_id,
    '{"defaultCategory": "other", "autoSaveContacts": true, "showFavoritesFirst": true, "enableCallLogging": true}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    '{"defaultCategory": "other", "autoSaveContacts": true, "showFavoritesFirst": true, "enableCallLogging": true}',
    NOW(),
    NOW()
  );

  -- Todo Settings
  INSERT INTO public.todo_settings (
    id, dealership_id, settings, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    premier_dealership_id,
    '{"defaultPriority": "medium", "defaultCategory": "general", "autoAssignToSelf": true, "enableNotifications": true, "showCompletedTasks": false, "defaultView": "list", "reminderMinutes": 15}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    city_motors_id,
    '{"defaultPriority": "medium", "defaultCategory": "general", "autoAssignToSelf": true, "enableNotifications": true, "showCompletedTasks": false, "defaultView": "list", "reminderMinutes": 15}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    '{"defaultPriority": "medium", "defaultCategory": "general", "autoAssignToSelf": true, "enableNotifications": true, "showCompletedTasks": false, "defaultView": "list", "reminderMinutes": 15}',
    NOW(),
    NOW()
  );

  -- Inspection Settings
  INSERT INTO public.inspection_settings (
    id, dealership_id, settings, created_at, updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    premier_dealership_id,
    '{"sections": ["emissions", "cosmetic", "mechanical", "cleaned", "photos"], "requirePhotos": true, "autoSave": true, "defaultRating": "good"}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    city_motors_id,
    '{"sections": ["emissions", "cosmetic", "mechanical", "cleaned", "photos"], "requirePhotos": true, "autoSave": true, "defaultRating": "good"}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    '{"sections": ["emissions", "cosmetic", "mechanical", "cleaned", "photos"], "requirePhotos": true, "autoSave": true, "defaultRating": "good"}',
    NOW(),
    NOW()
  );

  -- ========================================
  -- ANALYTICS (Sample analytics data)
  -- ========================================

  -- Sample analytics data for Premier Auto Group
  INSERT INTO public.analytics (
    id, dealership_id, data_type, data, recorded_at
  ) VALUES 
  (
    gen_random_uuid(),
    premier_dealership_id,
    'daily_analytics',
    '{"date": "2024-01-15", "vehicles_added": 2, "vehicles_sold": 1, "inspections_completed": 3, "revenue": 28500}',
    NOW()
  ),
  (
    gen_random_uuid(),
    premier_dealership_id,
    'weekly_analytics',
    '{"week": "2024-W03", "vehicles_added": 8, "vehicles_sold": 5, "inspections_completed": 12, "revenue": 125000}',
    NOW()
  ),
  (
    gen_random_uuid(),
    premier_dealership_id,
    'monthly_analytics',
    '{"month": "2024-01", "vehicles_added": 25, "vehicles_sold": 18, "inspections_completed": 45, "revenue": 450000}',
    NOW()
  );

  -- Sample analytics data for City Motors
  INSERT INTO public.analytics (
    id, dealership_id, data_type, data, recorded_at
  ) VALUES 
  (
    gen_random_uuid(),
    city_motors_id,
    'daily_analytics',
    '{"date": "2024-01-15", "vehicles_added": 1, "vehicles_sold": 0, "inspections_completed": 2, "revenue": 0}',
    NOW()
  ),
  (
    gen_random_uuid(),
    city_motors_id,
    'weekly_analytics',
    '{"week": "2024-W03", "vehicles_added": 3, "vehicles_sold": 2, "inspections_completed": 5, "revenue": 35000}',
    NOW()
  );

  -- Sample analytics data for Elite Motors
  INSERT INTO public.analytics (
    id, dealership_id, data_type, data, recorded_at
  ) VALUES 
  (
    gen_random_uuid(),
    elite_motors_id,
    'daily_analytics',
    '{"date": "2024-01-15", "vehicles_added": 3, "vehicles_sold": 2, "inspections_completed": 8, "revenue": 85000}',
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    'weekly_analytics',
    '{"week": "2024-W03", "vehicles_added": 12, "vehicles_sold": 8, "inspections_completed": 25, "revenue": 320000}',
    NOW()
  ),
  (
    gen_random_uuid(),
    elite_motors_id,
    'monthly_analytics',
    '{"month": "2024-01", "vehicles_added": 45, "vehicles_sold": 32, "inspections_completed": 85, "revenue": 1250000}',
    NOW()
  );

END $$;

-- ========================================
-- NOTES
-- ========================================

-- This demo data includes:
-- 1. 4 dealerships (including platform admin)
-- 2. Default locations for each dealership
-- 3. 5 sample vehicles for Premier Auto Group
-- 4. Default settings for locations, contacts, todos, and inspections
-- 5. Sample analytics data
-- 
-- Users/profiles will be created automatically when users sign up through Supabase Auth
-- The trigger handle_new_user() will create profiles automatically
--
-- To add users manually, you would need to:
-- 1. Create users in Supabase Auth first
-- 2. Then insert corresponding profiles with the same user ID
--
-- Example manual user creation:
-- INSERT INTO public.profiles (id, first_name, last_name, initials, role, dealership_id, is_active, created_at, updated_at)
-- VALUES ('user-uuid-from-auth', 'John', 'Smith', 'JS', 'admin', 'dealership-uuid', true, NOW(), NOW()); 