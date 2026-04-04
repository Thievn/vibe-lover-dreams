

# Admin Companion Management Panel

## Summary
Add a "Companions" tab to the existing Admin dashboard that lets you view, search, edit, and manage all 20+ built-in companions. Includes metadata editing, image prompt management, and portrait regeneration via Lovable AI image generation.

## Architecture

Currently companions are hardcoded in `src/data/companions.ts`. To make them editable from the admin panel, we need to:

1. **Create a `companions` database table** to store companion data (mirroring the existing `Companion` interface)
2. **Seed it** with the current 20 companions from the static file
3. **Create a storage bucket** for companion portrait images
4. **Create an edge function** for image generation using Lovable AI (image model)
5. **Build the admin UI** — a new "Companions" tab in the Admin page
6. **Update the app** to read companions from the database instead of the static file

## Database Changes

### New `companions` table
- `id` (text, primary key) — e.g. "lilith-vesper"
- `name`, `tagline`, `gender`, `orientation`, `role` (text fields)
- `tags`, `kinks` (text arrays)
- `appearance`, `personality`, `bio`, `system_prompt` (text)
- `fantasy_starters` (jsonb)
- `gradient_from`, `gradient_to` (text — hex colors)
- `image_url` (text, nullable — URL to stored portrait)
- `image_prompt` (text, nullable — prompt used to generate portrait)
- `is_active` (boolean, default true — visibility toggle)
- `created_at`, `updated_at` (timestamps)

### RLS Policies
- Authenticated users: SELECT where `is_active = true`
- Admins: full CRUD via `has_role(auth.uid(), 'admin')`

### Storage
- Create `companion-portraits` bucket for uploaded/generated images
- Public read, admin-only write

## Edge Function: `generate-companion-image`
- Accepts an image prompt string
- Calls Lovable AI image generation endpoint (`google/gemini-3.1-flash-image-preview`)
- Saves the result to the `companion-portraits` storage bucket
- Returns the public URL
- Admin-only (validates admin role)

## Admin UI (new tab in `src/pages/Admin.tsx`)

### Companions Tab Features
- **Search bar** — filter by name, tags
- **Grid/list view** of all companions showing: portrait thumbnail, name, gender, role, active status
- **Click to expand/edit** each companion with fields for:
  - Name, tagline, gender, orientation, role
  - Tags (editable chips)
  - Bio, appearance, personality (text areas)
  - System prompt (large text area)
  - Gradient colors (color pickers)
  - Image prompt (text input)
  - Active/inactive toggle
- **Regenerate Portrait** button — sends image prompt to the edge function
- **Save** button per companion
- **Add New Companion** button for creating new ones
- Loading states, error handling, success toasts

## Migration Path
- Seed the database table from the existing static `companions` array (one-time migration)
- Update `CompanionGallery`, `CompanionProfile`, `Chat` to fetch from database instead of static file
- Keep the static file as a fallback during transition

## Files Changed/Created
- `supabase/migrations/` — new migration for `companions` table + storage bucket
- `supabase/functions/generate-companion-image/index.ts` — new edge function
- `src/pages/Admin.tsx` — add Companions tab with full management UI
- `src/data/companions.ts` — keep as seed data reference
- `src/hooks/useCompanions.ts` — new hook to fetch companions from database
- `src/components/CompanionGallery.tsx` — update to use database
- `src/pages/CompanionProfile.tsx` — update to use database
- `src/pages/Chat.tsx` — update to use database

