-- Complete RLS Policies for ReconPro Database
-- Run this after creating the main schema

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles in their dealership
CREATE POLICY "Admins can view all profiles in their dealership" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = profiles.dealership_id
    )
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super-admin'
    )
  );

-- ========================================
-- DEALERSHIPS POLICIES
-- ========================================

-- Users can view their own dealership
CREATE POLICY "Users can view their own dealership" ON public.dealerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = dealerships.id
    )
  );

-- Super admins can view all dealerships
CREATE POLICY "Super admins can view all dealerships" ON public.dealerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super-admin'
    )
  );

-- Super admins can update all dealerships
CREATE POLICY "Super admins can update all dealerships" ON public.dealerships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super-admin'
    )
  );

-- ========================================
-- SESSIONS POLICIES
-- ========================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON public.sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own sessions
CREATE POLICY "Users can create their own sessions" ON public.sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions" ON public.sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON public.sessions
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- VEHICLES POLICIES
-- ========================================

-- Users can view vehicles in their dealership
CREATE POLICY "Users can view vehicles in their dealership" ON public.vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

-- Users can update vehicles in their dealership
CREATE POLICY "Users can update vehicles in their dealership" ON public.vehicles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

-- Users can insert vehicles in their dealership
CREATE POLICY "Users can insert vehicles in their dealership" ON public.vehicles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

-- Users can delete vehicles in their dealership
CREATE POLICY "Users can delete vehicles in their dealership" ON public.vehicles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = vehicles.dealership_id
    )
  );

-- ========================================
-- LOCATIONS POLICIES
-- ========================================

-- Users can view locations in their dealership
CREATE POLICY "Users can view locations in their dealership" ON public.locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

-- Users can update locations in their dealership
CREATE POLICY "Users can update locations in their dealership" ON public.locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

-- Users can insert locations in their dealership
CREATE POLICY "Users can insert locations in their dealership" ON public.locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

-- Users can delete locations in their dealership
CREATE POLICY "Users can delete locations in their dealership" ON public.locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = locations.dealership_id
    )
  );

-- ========================================
-- INSPECTION CHECKLISTS POLICIES
-- ========================================

-- Users can view inspection checklists for vehicles in their dealership
CREATE POLICY "Users can view inspection checklists in their dealership" ON public.inspection_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.profiles p ON p.dealership_id = v.dealership_id
      WHERE p.id = auth.uid() 
      AND v.id = inspection_checklists.vehicle_id
    )
  );

-- Users can update inspection checklists for vehicles in their dealership
CREATE POLICY "Users can update inspection checklists in their dealership" ON public.inspection_checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.profiles p ON p.dealership_id = v.dealership_id
      WHERE p.id = auth.uid() 
      AND v.id = inspection_checklists.vehicle_id
    )
  );

-- Users can insert inspection checklists for vehicles in their dealership
CREATE POLICY "Users can insert inspection checklists in their dealership" ON public.inspection_checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.profiles p ON p.dealership_id = v.dealership_id
      WHERE p.id = auth.uid() 
      AND v.id = inspection_checklists.vehicle_id
    )
  );

-- ========================================
-- INSPECTION SETTINGS POLICIES
-- ========================================

-- Users can view inspection settings for their dealership
CREATE POLICY "Users can view inspection settings in their dealership" ON public.inspection_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = inspection_settings.dealership_id
    )
  );

-- Admins can update inspection settings for their dealership
CREATE POLICY "Admins can update inspection settings in their dealership" ON public.inspection_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = inspection_settings.dealership_id
    )
  );

-- Admins can insert inspection settings for their dealership
CREATE POLICY "Admins can insert inspection settings in their dealership" ON public.inspection_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = inspection_settings.dealership_id
    )
  );

-- ========================================
-- CONTACTS POLICIES
-- ========================================

-- Users can view contacts in their dealership
CREATE POLICY "Users can view contacts in their dealership" ON public.contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

-- Users can update contacts in their dealership
CREATE POLICY "Users can update contacts in their dealership" ON public.contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

-- Users can insert contacts in their dealership
CREATE POLICY "Users can insert contacts in their dealership" ON public.contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

-- Users can delete contacts in their dealership
CREATE POLICY "Users can delete contacts in their dealership" ON public.contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contacts.dealership_id
    )
  );

-- ========================================
-- CALL LOGS POLICIES
-- ========================================

-- Users can view call logs for contacts in their dealership
CREATE POLICY "Users can view call logs in their dealership" ON public.call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.profiles p ON p.dealership_id = c.dealership_id
      WHERE p.id = auth.uid() 
      AND c.id = call_logs.contact_id
    )
  );

-- Users can insert call logs for contacts in their dealership
CREATE POLICY "Users can insert call logs in their dealership" ON public.call_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.profiles p ON p.dealership_id = c.dealership_id
      WHERE p.id = auth.uid() 
      AND c.id = call_logs.contact_id
    )
  );

-- ========================================
-- CONTACT SETTINGS POLICIES
-- ========================================

-- Users can view contact settings for their dealership
CREATE POLICY "Users can view contact settings in their dealership" ON public.contact_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = contact_settings.dealership_id
    )
  );

-- Admins can update contact settings for their dealership
CREATE POLICY "Admins can update contact settings in their dealership" ON public.contact_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = contact_settings.dealership_id
    )
  );

-- ========================================
-- TODOS POLICIES
-- ========================================

-- Users can view todos in their dealership
CREATE POLICY "Users can view todos in their dealership" ON public.todos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

-- Users can update todos in their dealership
CREATE POLICY "Users can update todos in their dealership" ON public.todos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

-- Users can insert todos in their dealership
CREATE POLICY "Users can insert todos in their dealership" ON public.todos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

-- Users can delete todos in their dealership
CREATE POLICY "Users can delete todos in their dealership" ON public.todos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todos.dealership_id
    )
  );

-- ========================================
-- CALENDAR EVENTS POLICIES
-- ========================================

-- Users can view calendar events in their dealership
CREATE POLICY "Users can view calendar events in their dealership" ON public.calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = calendar_events.dealership_id
    )
  );

-- Users can update calendar events in their dealership
CREATE POLICY "Users can update calendar events in their dealership" ON public.calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = calendar_events.dealership_id
    )
  );

-- Users can insert calendar events in their dealership
CREATE POLICY "Users can insert calendar events in their dealership" ON public.calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = calendar_events.dealership_id
    )
  );

-- Users can delete calendar events in their dealership
CREATE POLICY "Users can delete calendar events in their dealership" ON public.calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = calendar_events.dealership_id
    )
  );

-- ========================================
-- TODO SETTINGS POLICIES
-- ========================================

-- Users can view todo settings for their dealership
CREATE POLICY "Users can view todo settings in their dealership" ON public.todo_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = todo_settings.dealership_id
    )
  );

-- Admins can update todo settings for their dealership
CREATE POLICY "Admins can update todo settings in their dealership" ON public.todo_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = todo_settings.dealership_id
    )
  );

-- ========================================
-- ANALYTICS POLICIES
-- ========================================

-- Users can view analytics for their dealership
CREATE POLICY "Users can view analytics in their dealership" ON public.analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = analytics.dealership_id
    )
  );

-- Users can insert analytics for their dealership
CREATE POLICY "Users can insert analytics in their dealership" ON public.analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = analytics.dealership_id
    )
  );

-- ========================================
-- VEHICLE UPDATES POLICIES
-- ========================================

-- Users can view vehicle updates for vehicles in their dealership
CREATE POLICY "Users can view vehicle updates in their dealership" ON public.vehicle_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.profiles p ON p.dealership_id = v.dealership_id
      WHERE p.id = auth.uid() 
      AND v.id = vehicle_updates.vehicle_id
    )
  );

-- Users can insert vehicle updates for vehicles in their dealership
CREATE POLICY "Users can insert vehicle updates in their dealership" ON public.vehicle_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      JOIN public.profiles p ON p.dealership_id = v.dealership_id
      WHERE p.id = auth.uid() 
      AND v.id = vehicle_updates.vehicle_id
    )
  );

-- ========================================
-- LOCATION SETTINGS POLICIES
-- ========================================

-- Users can view location settings for their dealership
CREATE POLICY "Users can view location settings in their dealership" ON public.location_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.dealership_id = location_settings.dealership_id
    )
  );

-- Admins can update location settings for their dealership
CREATE POLICY "Admins can update location settings in their dealership" ON public.location_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
      AND p.dealership_id = location_settings.dealership_id
    )
  );

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Dealerships policies
CREATE POLICY "Users can view their own dealership" ON public.dealerships
  FOR SELECT USING (id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own dealership" ON public.dealerships
  FOR UPDATE USING (id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Profiles policies
CREATE POLICY "Users can view profiles in their dealership" ON public.profiles
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Sessions policies
CREATE POLICY "Users can view sessions in their dealership" ON public.sessions
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert sessions in their dealership" ON public.sessions
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update sessions in their dealership" ON public.sessions
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete sessions in their dealership" ON public.sessions
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their dealership" ON public.vehicles
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert vehicles in their dealership" ON public.vehicles
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update vehicles in their dealership" ON public.vehicles
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete vehicles in their dealership" ON public.vehicles
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Locations policies
CREATE POLICY "Users can view locations in their dealership" ON public.locations
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert locations in their dealership" ON public.locations
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update locations in their dealership" ON public.locations
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete locations in their dealership" ON public.locations
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Inspection checklists policies
CREATE POLICY "Users can view inspection checklists in their dealership" ON public.inspection_checklists
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert inspection checklists in their dealership" ON public.inspection_checklists
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update inspection checklists in their dealership" ON public.inspection_checklists
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete inspection checklists in their dealership" ON public.inspection_checklists
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Inspection settings policies
CREATE POLICY "Users can view inspection settings in their dealership" ON public.inspection_settings
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert inspection settings in their dealership" ON public.inspection_settings
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update inspection settings in their dealership" ON public.inspection_settings
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete inspection settings in their dealership" ON public.inspection_settings
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Contacts policies
CREATE POLICY "Users can view contacts in their dealership" ON public.contacts
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert contacts in their dealership" ON public.contacts
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update contacts in their dealership" ON public.contacts
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete contacts in their dealership" ON public.contacts
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Call logs policies
CREATE POLICY "Users can view call logs in their dealership" ON public.call_logs
  FOR SELECT USING (contact_id IN (
    SELECT id FROM public.contacts WHERE dealership_id IN (
      SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert call logs in their dealership" ON public.call_logs
  FOR INSERT WITH CHECK (contact_id IN (
    SELECT id FROM public.contacts WHERE dealership_id IN (
      SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Contact settings policies
CREATE POLICY "Users can view contact settings in their dealership" ON public.contact_settings
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert contact settings in their dealership" ON public.contact_settings
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update contact settings in their dealership" ON public.contact_settings
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- TODOS POLICIES (This is the main issue)
CREATE POLICY "Users can view todos in their dealership" ON public.todos
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert todos in their dealership" ON public.todos
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update todos in their dealership" ON public.todos
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete todos in their dealership" ON public.todos
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Calendar events policies
CREATE POLICY "Users can view calendar events in their dealership" ON public.calendar_events
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert calendar events in their dealership" ON public.calendar_events
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update calendar events in their dealership" ON public.calendar_events
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete calendar events in their dealership" ON public.calendar_events
  FOR DELETE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Todo settings policies
CREATE POLICY "Users can view todo settings in their dealership" ON public.todo_settings
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert todo settings in their dealership" ON public.todo_settings
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update todo settings in their dealership" ON public.todo_settings
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Analytics policies
CREATE POLICY "Users can view analytics in their dealership" ON public.analytics
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert analytics in their dealership" ON public.analytics
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Vehicle updates policies
CREATE POLICY "Users can view vehicle updates in their dealership" ON public.vehicle_updates
  FOR SELECT USING (vehicle_id IN (
    SELECT id FROM public.vehicles WHERE dealership_id IN (
      SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert vehicle updates in their dealership" ON public.vehicle_updates
  FOR INSERT WITH CHECK (vehicle_id IN (
    SELECT id FROM public.vehicles WHERE dealership_id IN (
      SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Location settings policies
CREATE POLICY "Users can view location settings in their dealership" ON public.location_settings
  FOR SELECT USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert location settings in their dealership" ON public.location_settings
  FOR INSERT WITH CHECK (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update location settings in their dealership" ON public.location_settings
  FOR UPDATE USING (dealership_id IN (
    SELECT dealership_id FROM public.profiles WHERE id = auth.uid()
  )); 