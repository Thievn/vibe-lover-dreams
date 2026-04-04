

# Companion Manager Enhancements

## Summary
Three additions: rename "System Prompt" to "Companion Prompt", add AI auto-fill using Grok (xAI) to parse pasted profiles, and add an admin chat box that lets you tell Grok to modify companions via natural language.

## Changes

### 1. Rename "System Prompt" → "Companion Prompt"
Label-only change on lines 254 and 364 of `CompanionManager.tsx`.

### 2. AI Auto-Fill in Create Form
Add a "Companion Prompt" textarea at the top of the create form with an **"Auto-Fill from Prompt"** button. When clicked, it sends the pasted text to a new edge function `parse-companion-prompt` that calls Grok (using the existing `XAI_API_KEY`) with tool-calling to extract structured companion fields (name, tagline, gender, orientation, role, tags, kinks, appearance, personality, bio, companion prompt, fantasy starters, gradient colors). The response populates only blank/default fields, preserving anything already filled in. If the prompt doesn't specify a field, Grok infers it from context.

### 3. Admin Chat Box for Companion Edits
Add a collapsible chat panel at the bottom of the Companions tab. You type natural language commands like "Change Lilith's tagline to X" or "Make all vampires have red gradient". This sends your message plus the current companion list context to a new edge function `admin-companion-chat` that calls Grok. Grok returns structured JSON commands (which companion to update, which fields to change). The client applies those changes to the database and refreshes.

## Files

| File | Action |
|------|--------|
| `src/components/admin/CompanionManager.tsx` | Rename labels, add auto-fill button in create view, add admin chat panel in list view |
| `supabase/functions/parse-companion-prompt/index.ts` | New — calls Grok with tool-calling to extract companion fields from pasted text |
| `supabase/functions/admin-companion-chat/index.ts` | New — calls Grok to interpret admin commands and return structured update instructions |

## Technical Details

**parse-companion-prompt edge function:**
- Accepts `{ prompt: string }`
- Uses `XAI_API_KEY` + Grok tool-calling to return `{ name, tagline, gender, orientation, role, tags, kinks, appearance, personality, bio, system_prompt, fantasy_starters, gradient_from, gradient_to, image_prompt }`
- Client merges into `createData`, only overwriting empty/default values

**admin-companion-chat edge function:**
- Accepts `{ message: string, companions: Array<{id, name, tagline, ...}> }`
- System prompt instructs Grok to interpret the admin's request and return JSON actions like `[{ action: "update", id: "lilith", fields: { tagline: "..." } }]`
- Uses Grok tool-calling to enforce structured output
- Client receives actions, executes Supabase updates, and refreshes the list
- Chat history is kept in local state for multi-turn conversation

**Admin chat panel UI:**
- Floating/collapsible panel at the bottom of the companion list view
- Shows message history, input field, send button
- Displays Grok's interpreted actions before applying (confirm step)
- Loading state while Grok processes

### 4. Database: Expand custom_characters (future-ready)
Migration to add all companion fields to `custom_characters` so user-created characters have full feature parity:

```sql
ALTER TABLE custom_characters
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kinks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS appearance text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS system_prompt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fantasy_starters jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS gradient_from text NOT NULL DEFAULT '#7B2D8E',
  ADD COLUMN IF NOT EXISTS gradient_to text NOT NULL DEFAULT '#FF2D7B',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_prompt text;
```

No admin approval required for private use. The `approved` column already gates public visibility via existing RLS.

