

# Lovense Integration Upgrade

## Summary
Replace the manual device UID entry with a proper QR-code-based connection flow via the Lovense Standard API, add a callback endpoint to auto-store the device UID, wire up auto-execution of toy commands from chat, and add a global emergency stop button.

## What changes

### 1. Add three new secrets
- `LOVENSE_DEVELOPER_TOKEN`
- `LOVENSE_AES_KEY`
- `LOVENSE_AES_IV`

You'll be prompted to paste each value securely. No secrets are exposed to the frontend.

### 2. New Edge Function: `lovense-callback`
Receives POST callbacks from Lovense after QR scan. Extracts the device UID from the callback payload, looks up the user via a temporary pairing token stored in the database, and saves `device_uid` to their `profiles` row. Returns 200 OK.

Requires a new `lovense_pairings` table to temporarily map a session token to a user_id so the callback knows which user scanned the code.

### 3. New Edge Function: `lovense-qrcode`
Authenticated endpoint that:
1. Generates a unique pairing token and stores it in `lovense_pairings` with the user's ID
2. Calls the Lovense API (`https://api.lovense.com/api/lan/getQrCode`) with the developer token and a callback URL pointing to the `lovense-callback` function
3. Returns the QR code image URL to the frontend

### 4. Update `send-device-command` Edge Function
- Accept `intensity` as 0-100 scale (currently clamped to 0-20 — will scale: `Math.round(intensity / 5)`)
- Accept `pattern` field for pattern commands
- Add a `stop` command type that sends `Function` with `Stop` action
- Read user's intensity limit from profile or accept it from the client (already partially there)

### 5. Update Settings page — Replace manual UID with QR connection
- Remove the manual "Enter device UID" text field
- Add a "Connect Toy" button that calls the `lovense-qrcode` function
- Display the returned QR code in a modal/card for scanning
- Poll the user's profile every 3 seconds to detect when `device_uid` is set (callback received)
- Show connection status: "Scanning...", "Connected!", or "Disconnected"
- Keep a "Disconnect" button that clears `device_uid`

### 6. Update Chat page — Auto-execute toy commands
Currently the chat page parses `lovense_command` from AI responses and displays it, but doesn't execute it. Add:
- After parsing a command from the AI response, automatically call `send-device-command` if the user has a `device_uid` set
- Scale intensity by the user's configured intensity limit (from localStorage)
- Show status toast: "Command sent to toy" or error message
- Load `device_uid` from profile on mount to know if a toy is connected

### 7. Global Emergency Stop Button
- Add a floating stop button component (red octagon icon) that appears on every page when the user has a connected toy (`device_uid` exists)
- Clicking it calls `send-device-command` with `{ command: "Stop", intensity: 0, duration: 0 }`
- Shows toast: "All toys stopped"
- Rendered in `App.tsx` layout, checks profile for `device_uid`

### 8. Database migration
```sql
CREATE TABLE public.lovense_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pairing_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.lovense_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pairings"
  ON public.lovense_pairings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pairings"
  ON public.lovense_pairings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

## Files to create/modify

| File | Action |
|------|--------|
| Migration SQL | New `lovense_pairings` table |
| `supabase/functions/lovense-qrcode/index.ts` | New — generates QR code via Lovense API |
| `supabase/functions/lovense-callback/index.ts` | New — receives callback, stores device UID |
| `supabase/functions/send-device-command/index.ts` | Update — add stop command, fix intensity scaling |
| `src/pages/Settings.tsx` | Replace manual UID with QR flow |
| `src/pages/Chat.tsx` | Auto-execute toy commands from AI responses |
| `src/components/EmergencyStop.tsx` | New — floating stop button |
| `src/App.tsx` | Add EmergencyStop component to layout |

## What stays the same
All existing UI theme, colors, branding, companions, pricing, token system, and other features remain untouched. Toy connection is available to all account tiers (free and paid).

