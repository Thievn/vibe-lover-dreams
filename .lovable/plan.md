

# Feature Breakdown — Collection & Fusion System

The large feature request needs to be split into smaller, independently implementable pieces. Here's the breakdown with a suggested order:

---

## Phase 1: Companion Collection Cards

**What:** A "My Collection" page showing all companions the user has chatted with as collectible cards with rarity tiers and visual flair.

- New page `/collection` with route in App.tsx
- Query `chat_messages` to find distinct companions the user has interacted with
- Display each as a styled card with rarity borders (Common → Mythic) based on chat count or companion attributes
- Show affinity meter (based on message count), tags, and personality summary
- Add nav link to Navbar

**No new tables needed** — derive collection from existing `chat_messages` + `companions` data.

---

## Phase 2: Device Pattern Library

**What:** A `user_device_patterns` table and UI to save, name, and trigger custom device command presets.

- New table `user_device_patterns` (user_id, name, description, command_json, unlocked_at)
- UI section on the Collection page or Settings to view saved patterns
- "Trigger" button on each pattern card that calls `send-device-command`
- Patterns can be created manually or auto-generated later

---

## Phase 3: Companion Fusion System

**What:** A "Fusion Chamber" page where users pick 2 companions, spend ChatTokens, and an AI generates a new hybrid companion.

- New page `/fusion` with drag-and-drop or select-two UI
- Costs configurable ChatTokens (e.g. 50) or daily energy (new `fusion_energy` column on profiles, resets via cron or on-demand check)
- Calls an edge function that sends both companions' profiles to Grok (XAI_API_KEY) and asks it to generate a blended companion (name, appearance, personality, kinks, bio, system prompt, fantasy starters)
- Also generates 1-3 named device command patterns as part of the result
- Saves the new companion to `custom_characters` (owned by user) and patterns to `user_device_patterns`
- Success toast with unlock summary

---

## Phase 4: Fusion Ritual Chat

**What:** Instead of instant fusion, run a short multi-character group chat scene narrated by Grok before generating the result.

- New edge function `fusion-ritual-chat` that manages a multi-character conversation with a special system prompt combining both parent companions
- Frontend shows a special chat UI for the ritual (read-only or interactive)
- During the ritual, AI can emit device commands that auto-execute
- When ritual concludes, trigger the fusion generation from Phase 3
- New patterns unlocked during the ritual are used contextually

---

## Phase 5: Lineage Log

**What:** A visual history page showing all fusions and their results.

- New table `fusion_log` (user_id, parent_1_id, parent_2_id, offspring_id, patterns_unlocked, lore_text, created_at)
- New page `/lineage` with a tree/timeline view
- Each entry shows parents, offspring card, and the AI-generated lore narrative
- Clicking an offspring navigates to their profile/chat

---

## Suggested implementation order

1. **Phase 1** — Collection Cards (standalone, no new tables)
2. **Phase 2** — Pattern Library (new table + simple UI)
3. **Phase 3** — Fusion System (core feature, edge function + DB)
4. **Phase 4** — Ritual Chat (enhanced fusion experience)
5. **Phase 5** — Lineage Log (history tracking)

Each phase is a self-contained request you can send individually. Want me to start with Phase 1?

