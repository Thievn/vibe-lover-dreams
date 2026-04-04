
# Complete App: IoT, Custom Characters, Admin Dashboard

## Step 1: Database migrations
- Create `custom_characters` table (user_id, name, personality, avatar_url, is_public, created_at, updated_at) with RLS
- Create `user_roles` table with `app_role` enum (admin, moderator, user) and `has_role()` security definer function
- Add RLS policies for both tables

## Step 2: IoT Device Edge Function
- Create `send-device-command` edge function that reads device_uid from profiles and POSTs commands to the external IoT REST API
- Uses LOVENSE_DEVELOPER_TOKEN secret (already needs to be added)

## Step 3: Settings Page — Device UID
- Add a "Device Connection" section to Settings page where users can enter/save their device UID
- Save to `profiles.device_uid` column (already exists)

## Step 4: Custom Character Creator
- Create `/create-character` page with form: name, personality description, avatar upload
- Store in `custom_characters` table
- Show user's custom characters alongside pre-built ones in the gallery

## Step 5: Admin Dashboard
- Create `/admin` route protected by `has_role(auth.uid(), 'admin')`
- Sections: user metrics (total users, active), character moderation (approve/reject public custom characters), user management
- Admin-only nav link in Navbar

## Step 6: Wire IoT commands into chat
- Update chat edge function to detect structured device commands in AI responses
- Call `send-device-command` when commands are detected
