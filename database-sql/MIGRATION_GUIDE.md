# Database Migration Guide: localStorage to Supabase

This guide will help you migrate your ReconPro application from localStorage to a proper database using Supabase.

## 🎯 Overview

Your new database schema completely replaces localStorage functionality with:
- **Supabase Auth** for user authentication
- **PostgreSQL** for data storage
- **Row Level Security (RLS)** for data protection
- **Proper relationships** between entities

## 📋 Prerequisites

1. **Supabase Account**: Create a new project at [supabase.com](https://supabase.com)
2. **Database Access**: You'll need access to run SQL commands in your Supabase dashboard
3. **Backup**: Export your current localStorage data (optional, for reference)

## 🚀 Step-by-Step Migration

### Step 1: Set Up Supabase Project

1. Create a new Supabase project
2. Note your project URL and anon key
3. Go to SQL Editor in your Supabase dashboard

### Step 2: Create Database Schema

1. **Run the main schema** (`database_schema.sql`):
   ```sql
   -- Copy and paste the entire database_schema.sql content
   -- This creates all tables, triggers, and functions
   ```

2. **Run the RLS policies** (`rls_policies.sql`):
   ```sql
   -- Copy and paste the entire rls_policies.sql content
   -- This sets up security policies
   ```

### Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 4: Configure Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Add to your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 5: Create Database Service Layer

Create `src/services/database.ts`:

```typescript
import { supabase } from '../lib/supabase'
import { User, Dealership, Vehicle, Contact, Todo, Location } from '../types/database'

export class DatabaseService {
  // User/Profile operations
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
  }

  static async getDealership(dealershipId: string) {
    const { data } = await supabase
      .from('dealerships')
      .select('*')
      .eq('id', dealershipId)
      .single()

    return data
  }

  // Vehicle operations
  static async getVehicles(dealershipId: string) {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })

    return data || []
  }

  static async createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateVehicle(id: string, updates: Partial<Vehicle>) {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Location operations
  static async getLocations(dealershipId: string) {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('name')

    return data || []
  }

  // Contact operations
  static async getContacts(dealershipId: string) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('name')

    return data || []
  }

  // Todo operations
  static async getTodos(dealershipId: string) {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })

    return data || []
  }

  // Analytics operations
  static async saveAnalytics(dealershipId: string, dataType: string, data: any) {
    const { error } = await supabase
      .from('analytics')
      .insert({
        dealership_id: dealershipId,
        data_type: dataType,
        data
      })

    if (error) throw error
  }
}
```

### Step 6: Update Type Definitions

Create `src/types/database.ts`:

```typescript
// Database types that match your schema
export interface Profile {
  id: string
  first_name: string
  last_name: string
  initials: string
  role: 'admin' | 'manager' | 'technician' | 'sales' | 'super-admin'
  dealership_id: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Dealership {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  website: string | null
  logo: string | null
  is_active: boolean
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  status: 'active' | 'suspended' | 'trial' | 'expired'
  last_activity: string | null
  total_users: number
  total_vehicles: number
  monthly_revenue: number
  settings: any
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  vin: string
  year: number
  make: string
  model: string
  trim: string | null
  mileage: number
  color: string
  date_acquired: string
  target_sale_date: string | null
  price: number
  location_id: string | null
  location_name: string
  status: any
  notes: string | null
  team_notes: any
  customer_comments: string | null
  inspection_data: any
  is_sold: boolean
  is_pending: boolean
  dealership_id: string
  created_at: string
  updated_at: string
}

// Add other types as needed...
```

### Step 7: Update AuthManager

Replace your current `AuthManager` with a Supabase-based version:

```typescript
// src/utils/auth.ts
import { supabase } from '../lib/supabase'
import { DatabaseService } from '../services/database'

export class AuthManager {
  static async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    const profile = await DatabaseService.getCurrentUser()
    if (!profile) throw new Error('Profile not found')

    const dealership = profile.dealership_id 
      ? await DatabaseService.getDealership(profile.dealership_id)
      : null

    return { user: profile, dealership }
  }

  static async register(email: string, password: string, userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })

    if (error) throw error
    return data
  }

  static async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const profile = await DatabaseService.getCurrentUser()
    if (!profile) return null

    const dealership = profile.dealership_id 
      ? await DatabaseService.getDealership(profile.dealership_id)
      : null

    return { user: profile, dealership }
  }
}
```

### Step 8: Update Components

Replace localStorage calls with database calls:

**Before (localStorage):**
```typescript
const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]')
localStorage.setItem('vehicles', JSON.stringify(updatedVehicles))
```

**After (Database):**
```typescript
const vehicles = await DatabaseService.getVehicles(dealershipId)
await DatabaseService.createVehicle(newVehicle)
```

### Step 9: Data Migration (Optional)

If you want to migrate existing localStorage data:

```typescript
// Migration script
export async function migrateLocalStorageData() {
  // Get localStorage data
  const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]')
  const contacts = JSON.parse(localStorage.getItem('contacts') || '[]')
  // ... other data

  // Migrate to database
  for (const vehicle of vehicles) {
    await DatabaseService.createVehicle({
      ...vehicle,
      dealership_id: currentDealershipId
    })
  }

  // Clear localStorage after successful migration
  localStorage.clear()
}
```

## 🔧 Key Changes Required

### 1. Authentication Flow
- Replace custom session management with Supabase Auth
- Use `supabase.auth.getUser()` instead of localStorage session
- Handle auth state changes with `supabase.auth.onAuthStateChange()`

### 2. Data Operations
- Replace all `localStorage.setItem/getItem` with database calls
- Use async/await for all database operations
- Handle loading states for database queries

### 3. Error Handling
- Add proper error handling for database operations
- Show user-friendly error messages
- Implement retry logic for failed operations

### 4. Real-time Updates
- Use Supabase real-time subscriptions for live updates
- Subscribe to table changes for collaborative features

## 🚨 Important Notes

1. **Security**: RLS policies ensure users can only access their dealership's data
2. **Performance**: Add proper indexes for frequently queried fields
3. **Backup**: Always backup your data before migration
4. **Testing**: Test thoroughly in development before deploying

## 📊 Benefits After Migration

- **Scalability**: Handle multiple users and large datasets
- **Security**: Row-level security and proper authentication
- **Reliability**: Data persistence and backup
- **Collaboration**: Real-time updates across users
- **Analytics**: Better reporting and data analysis capabilities

## 🆘 Troubleshooting

### Common Issues:

1. **RLS Policy Errors**: Check that users have proper permissions
2. **Foreign Key Violations**: Ensure referenced records exist
3. **Authentication Issues**: Verify Supabase configuration
4. **Performance Issues**: Add missing indexes

### Debug Commands:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check user permissions
SELECT * FROM auth.users WHERE id = 'user_id';

-- Check table data
SELECT * FROM your_table LIMIT 10;
```

Need help with any specific part of the migration? Let me know! 