

# Enhance Admin Companion Manager

## What we're adding

### 1. Quick-access appearance field near portrait regeneration
Currently the "Regenerate Portrait" button and image prompt field are separated from the appearance description. We'll reorganize the edit layout so the **appearance text area** and **image prompt field** sit side-by-side near the portrait preview and regenerate button, making it easy to reference appearance when writing image prompts.

### 2. "Create New Companion" form
Add a button at the top of the Companions tab that opens a full creation form. All fields will be available (name, tagline, gender, orientation, role, tags, kinks, appearance, personality, bio, system prompt, fantasy starters, gradient colors, image prompt). This lets the admin paste in a complete companion profile and save it to the database.

## Files to modify

- **`src/components/admin/CompanionManager.tsx`** — reorganize the edit panel layout and add the create companion workflow

## Technical approach

1. Add a `showCreate` state toggle and a "New Companion" button in the header area
2. When creating, show a blank form with all companion fields, pre-filled with sensible defaults
3. On save, insert into the `companions` table via Supabase client
4. In the edit view, restructure the layout into a two-column grid:
   - Left column: portrait preview + appearance field + image prompt + regenerate button
   - Right column: all other metadata fields (name, bio, personality, system prompt, etc.)
5. Add a cancel/back button for both create and edit flows

