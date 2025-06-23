-- This function is triggered when a new user signs up.
-- It creates a new dealership and a profile for that user,
-- linking them together. It pulls the required data from
-- the user's metadata, which is passed during the signUp process.
CREATE OR REPLACE FUNCTION public.handle_new_user_and_dealership_creation()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER -- This is important! It runs the function with superuser privileges.
    SET search_path = public
AS $$
DECLARE
    new_dealership_id uuid;
    user_role text;
BEGIN
    -- Step 1: Create the new dealership using data from the user's metadata.
    -- The `->>` operator extracts a JSON field as text.
    INSERT INTO public.dealerships (name, address, city, state, zip_code, phone, email, website)
    VALUES (
        NEW.raw_user_meta_data->>'dealership_name',
        NEW.raw_user_meta_data->>'address',
        NEW.raw_user_meta_data->>'city',
        NEW.raw_user_meta_data->>'state',
        NEW.raw_user_meta_data->>'zip_code',
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'dealership_email',
        NEW.raw_user_meta_data->>'website'
    )
    RETURNING id INTO new_dealership_id; -- Store the new dealership's ID in a variable.

    -- Step 2: Create the user's profile.
    -- All new signups are 'admin' of their new dealership.
    INSERT INTO public.profiles (id, first_name, last_name, initials, role, dealership_id)
    VALUES (
        NEW.id, -- The new user's ID from auth.users
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        UPPER(
            SUBSTRING(NEW.raw_user_meta_data->>'first_name' from 1 for 1) ||
            SUBSTRING(NEW.raw_user_meta_data->>'last_name' from 1 for 1)
        ),
        'admin',
        new_dealership_id -- The ID of the dealership created above.
    );
    
    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger that executes the function after a new user is created.
-- We'll drop the old one if it exists to make this script re-runnable.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_and_dealership_creation(); 