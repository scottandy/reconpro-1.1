-- Complete Database Schema for ReconPro
-- Replaces all localStorage functionality with Supabase + PostgreSQL

-- ========================================
-- CORE TABLES
-- ========================================

-- Dealerships table
CREATE TABLE public.dealerships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  website text,
  logo text,
  is_active boolean DEFAULT true,
  subscription_plan text DEFAULT 'basic' CHECK (subscription_plan = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text])),
  status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'trial'::text, 'expired'::text])),
  last_activity timestamp with time zone,
  total_users integer DEFAULT 0,
  total_vehicles integer DEFAULT 0,
  monthly_revenue numeric DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dealerships_pkey PRIMARY KEY (id)
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  initials text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'technician'::text, 'sales'::text, 'super-admin'::text])),
  dealership_id uuid REFERENCES public.dealerships(id),
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sessions table (replaces localStorage session management)
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dealership_id uuid REFERENCES public.dealerships(id),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- ========================================
-- VEHICLE MANAGEMENT
-- ========================================

-- Vehicles table
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vin text NOT NULL UNIQUE,
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  trim text,
  mileage integer NOT NULL DEFAULT 0,
  color text NOT NULL,
  date_acquired date NOT NULL,
  target_sale_date date,
  price numeric NOT NULL DEFAULT 0,
  location_id uuid, -- Will reference locations table
  location_name text NOT NULL, -- Fallback for location name
  status jsonb DEFAULT '{}'::jsonb,
  notes text,
  team_notes jsonb DEFAULT '[]'::jsonb,
  customer_comments text,
  inspection_data jsonb DEFAULT '{}'::jsonb,
  is_sold boolean DEFAULT false,
  is_pending boolean DEFAULT false,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);

-- Locations table
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['on-site'::text, 'off-site'::text, 'display'::text, 'service'::text, 'test-drive'::text, 'demo'::text, 'custom'::text])),
  description text,
  is_active boolean DEFAULT true,
  capacity integer,
  color text DEFAULT '#3B82F6',
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint for vehicles.location_id
ALTER TABLE public.vehicles 
ADD CONSTRAINT vehicles_location_id_fkey 
FOREIGN KEY (location_id) REFERENCES public.locations(id);

-- ========================================
-- INSPECTION & CHECKLIST SYSTEM
-- ========================================

-- Inspection checklists
CREATE TABLE public.inspection_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspector_id uuid NOT NULL REFERENCES public.profiles(id),
  checklist_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'in-progress' CHECK (status = ANY (ARRAY['in-progress'::text, 'completed'::text, 'approved'::text, 'rejected'::text])),
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inspection_checklists_pkey PRIMARY KEY (id)
);

-- Inspection settings per dealership
CREATE TABLE public.inspection_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inspection_settings_pkey PRIMARY KEY (id),
  CONSTRAINT inspection_settings_dealership_unique UNIQUE (dealership_id)
);

-- ========================================
-- CONTACT MANAGEMENT
-- ========================================

-- Contacts table
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  title text,
  phone text NOT NULL,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  category text NOT NULL,
  specialties text[] DEFAULT '{}',
  notes text,
  is_favorite boolean DEFAULT false,
  is_active boolean DEFAULT true,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_contacted timestamp with time zone,
  CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

-- Call logs
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  call_type text NOT NULL CHECK (call_type = ANY (ARRAY['incoming'::text, 'outgoing'::text, 'missed'::text])),
  duration integer, -- in seconds
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT call_logs_pkey PRIMARY KEY (id)
);

-- Contact settings per dealership
CREATE TABLE public.contact_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_settings_pkey PRIMARY KEY (id),
  CONSTRAINT contact_settings_dealership_unique UNIQUE (dealership_id)
);

-- ========================================
-- TASK & TODO MANAGEMENT
-- ========================================

-- Todos table
CREATE TABLE public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'in-progress'::text, 'completed'::text, 'cancelled'::text])),
  category text NOT NULL,
  assigned_to_id uuid REFERENCES public.profiles(id),
  assigned_by_id uuid NOT NULL REFERENCES public.profiles(id),
  due_date date,
  due_time time without time zone,
  vehicle_id uuid REFERENCES public.vehicles(id),
  vehicle_name text,
  tags text[] DEFAULT '{}',
  notes text,
  completed_at timestamp with time zone,
  completed_by_id uuid REFERENCES public.profiles(id),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT todos_pkey PRIMARY KEY (id)
);

-- Calendar events
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['meeting'::text, 'appointment'::text, 'reminder'::text, 'task'::text, 'other'::text])),
  is_all_day boolean DEFAULT false,
  location text,
  attendees text[],
  created_by_id uuid NOT NULL REFERENCES public.profiles(id),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id)
);

-- Todo settings per dealership
CREATE TABLE public.todo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT todo_settings_pkey PRIMARY KEY (id),
  CONSTRAINT todo_settings_dealership_unique UNIQUE (dealership_id)
);

-- ========================================
-- ANALYTICS & REPORTING
-- ========================================

-- Analytics data
CREATE TABLE public.analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  data_type text NOT NULL,
  data jsonb NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_pkey PRIMARY KEY (id)
);

-- Vehicle updates tracking
CREATE TABLE public.vehicle_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  update_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_updates_pkey PRIMARY KEY (id)
);

-- ========================================
-- LOCATION SETTINGS
-- ========================================

-- Location settings per dealership
CREATE TABLE public.location_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT location_settings_pkey PRIMARY KEY (id),
  CONSTRAINT location_settings_dealership_unique UNIQUE (dealership_id)
);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles in their dealership" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = profiles.dealership_id
    )
  );

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super-admin'
    )
  );

-- Dealerships policies
CREATE POLICY "Users can view their own dealership" ON public.dealerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = dealerships.id
    )
  );

CREATE POLICY "Super admins can view all dealerships" ON public.dealerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super-admin'
    )
  );

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their dealership" ON public.vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

CREATE POLICY "Users can update vehicles in their dealership" ON public.vehicles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

CREATE POLICY "Users can insert vehicles in their dealership" ON public.vehicles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

-- Similar policies for other tables...
-- (I'll create a separate file for all the policies to keep this manageable)

-- ========================================
-- TRIGGERS & FUNCTIONS
-- ========================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, initials, role, dealership_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      UPPER(LEFT(new.raw_user_meta_data->>'first_name', 1) || LEFT(new.raw_user_meta_data->>'last_name', 1)),
      'U'
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'technician'),
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update dealership user count
CREATE OR REPLACE FUNCTION public.update_dealership_user_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dealerships 
    SET total_users = total_users + 1
    WHERE id = NEW.dealership_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dealerships 
    SET total_users = total_users - 1
    WHERE id = OLD.dealership_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update dealership user count
CREATE TRIGGER update_dealership_user_count_trigger
  AFTER INSERT OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_dealership_user_count();

-- Function to update dealership vehicle count
CREATE OR REPLACE FUNCTION public.update_dealership_vehicle_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dealerships 
    SET total_vehicles = total_vehicles + 1
    WHERE id = NEW.dealership_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dealerships 
    SET total_vehicles = total_vehicles - 1
    WHERE id = OLD.dealership_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update dealership vehicle count
CREATE TRIGGER update_dealership_vehicle_count_trigger
  AFTER INSERT OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE PROCEDURE public.update_dealership_vehicle_count();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Dealerships indexes
CREATE INDEX idx_dealerships_email ON public.dealerships(email);
CREATE INDEX idx_dealerships_status ON public.dealerships(status);
CREATE INDEX idx_dealerships_subscription_plan ON public.dealerships(subscription_plan);

-- Profiles indexes
CREATE INDEX idx_profiles_dealership_id ON public.profiles(dealership_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(id);

-- Vehicles indexes
CREATE INDEX idx_vehicles_dealership_id ON public.vehicles(dealership_id);
CREATE INDEX idx_vehicles_vin ON public.vehicles(vin);
CREATE INDEX idx_vehicles_status ON public.vehicles USING GIN (status);
CREATE INDEX idx_vehicles_is_sold ON public.vehicles(is_sold);
CREATE INDEX idx_vehicles_is_pending ON public.vehicles(is_pending);

-- Locations indexes
CREATE INDEX idx_locations_dealership_id ON public.locations(dealership_id);
CREATE INDEX idx_locations_type ON public.locations(type);

-- Contacts indexes
CREATE INDEX idx_contacts_dealership_id ON public.contacts(dealership_id);
CREATE INDEX idx_contacts_category ON public.contacts(category);
CREATE INDEX idx_contacts_is_favorite ON public.contacts(is_favorite);

-- Todos indexes
CREATE INDEX idx_todos_dealership_id ON public.todos(dealership_id);
CREATE INDEX idx_todos_assigned_to_id ON public.todos(assigned_to_id);
CREATE INDEX idx_todos_status ON public.todos(status);
CREATE INDEX idx_todos_due_date ON public.todos(due_date);

-- Analytics indexes
CREATE INDEX idx_analytics_dealership_id ON public.analytics(dealership_id);
CREATE INDEX idx_analytics_data_type ON public.analytics(data_type);
CREATE INDEX idx_analytics_recorded_at ON public.analytics(recorded_at);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.dealerships IS 'Stores dealership information and settings';
COMMENT ON TABLE public.profiles IS 'Extends auth.users with application-specific user data';
COMMENT ON TABLE public.sessions IS 'Manages user sessions (replaces localStorage session management)';
COMMENT ON TABLE public.vehicles IS 'Stores vehicle inventory and inspection data';
COMMENT ON TABLE public.locations IS 'Stores vehicle locations within dealerships';
COMMENT ON TABLE public.inspection_checklists IS 'Stores vehicle inspection data';
COMMENT ON TABLE public.contacts IS 'Stores contact information for customers and vendors';
COMMENT ON TABLE public.todos IS 'Stores task and todo items';
COMMENT ON TABLE public.analytics IS 'Stores analytics and reporting data'; 