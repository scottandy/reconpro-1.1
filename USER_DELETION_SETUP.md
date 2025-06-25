# User Deletion Functionality Setup

This document explains the new user deletion functionality that allows administrators to permanently delete users from both the Supabase auth.users table and the profiles table.

## Overview

Previously, the "Deactivate" button only set `is_active = false` in the profiles table, leaving the user account in the auth system. The new "Delete" functionality completely removes the user from both tables.

## Changes Made

### 1. Server-Side Function (`database-sql/delete_user_function.sql`)

A new PostgreSQL function `delete_user(user_id uuid)` was created that:
- Checks permissions (only super-admin or admin of the same dealership can delete users)
- Deletes the user from `auth.users` table
- Automatically cascades to delete from `profiles` table due to foreign key constraint
- Returns boolean indicating success/failure

### 2. Client-Side Updates

#### AuthManager (`src/utils/auth.ts`)
- Added `deleteUser(userId: string)` method that calls the server-side function
- Uses Supabase RPC to execute the `delete_user` function

#### UserManagement Component (`src/components/UserManagement.tsx`)
- Updated `handleDeactivateUser` to use `AuthManager.deleteUser()`
- Changed button text from "Deactivate" to "Delete"
- Updated confirmation message to reflect permanent deletion

#### SuperAdminDashboard Component (`src/components/SuperAdminDashboard.tsx`)
- Added `handleDeleteUser` function
- Added delete button to users view
- Fixed async/await issues in `loadData` function

## Setup Instructions

### 1. Run the Database Function

Execute the SQL in `database-sql/delete_user_function.sql` in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of delete_user_function.sql
-- This creates the delete_user function and necessary policies
```

### 2. Verify Permissions

The function includes permission checks:
- **Super-admin**: Can delete any user
- **Admin**: Can only delete users in their own dealership
- **Other roles**: Cannot delete users

### 3. Test the Functionality

1. Log in as an admin or super-admin
2. Go to the Users tab
3. Click "Delete" on a user
4. Confirm the deletion
5. Verify the user is removed from both auth and profiles tables

## Security Considerations

1. **Permission-based**: Only authorized users can delete accounts
2. **Dealership isolation**: Admins can only delete users in their dealership
3. **Audit trail**: Consider adding logging for user deletions
4. **Data backup**: Ensure you have backups before testing

## Rollback

If you need to revert to the old "deactivate only" behavior:

1. Update the button text back to "Deactivate"
2. Change `handleDeactivateUser` to use `AuthManager.deactivateUser()` instead of `deleteUser()`
3. Update confirmation messages

## Database Schema Notes

The `profiles` table has a foreign key reference to `auth.users(id)` with `ON DELETE CASCADE`, which means:
- Deleting from `auth.users` automatically deletes the corresponding profile
- This ensures data consistency between the two tables

## Error Handling

The function includes error handling for:
- Insufficient permissions
- User not found
- Database errors

Errors are logged to the console and can be displayed to users as needed. 