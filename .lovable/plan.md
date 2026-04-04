

# ViceVibe AI — Phase 1 Plan

## 1. Design System & Theme
- Dark cyber-goth aesthetic: deep black (#0A0A0F) backgrounds, velvet purple (#7B2D8E), neon pink (#FF2D7B), crimson (#DC143C), electric teal (#00FFD4)
- Glow effects, subtle particle animations, smooth transitions
- Gothic display font for headings (e.g., Cinzel Decorative), modern sans-serif body (Inter)
- Custom Tailwind theme with all brand colors and glow utilities

## 2. Landing Page + 18+ Age Gate
- Modal age gate on first visit (stored in localStorage): checkbox + consent text
- Hero section with animated tagline: *"Where Fantasies Take Control"*
- Glowing CTA buttons, particle background, seductive gradient overlays
- Disclaimers: adults only, fantasy content, safe-word support
- Monetization placeholders (Premium tier teaser)

## 3. Companion Gallery (20 Characters)
- Browseable grid/carousel of all 20 companions on homepage
- Each card: name, tagline, avatar placeholder (gradient silhouette styled to their vibe until you provide AI art), kink tags
- Filter/search by gender, orientation, vibe, kink type
- Click → full profile page

## 4. Companion Profile Pages
- Rich profile: bio, detailed appearance, personality traits, kink list
- Multiple fantasy/story starters (3-5 per character)
- "Start Chat" CTA button
- All 20 companions fully written with detailed system prompts

## 5. Lovable Cloud Setup
- Enable Lovable Cloud for auth + database
- Tables: `profiles`, `chat_messages` (conversation history per companion), `companion_favorites`, `user_settings`
- Email auth (social login can be added later)
- RLS policies so users only see their own data

## 6. Chat Interface
- Private 1-on-1 chat room per companion
- Messages stored in DB for long-term memory (companions remember past sessions)
- Grok API integration via Edge Function (xAI API key stored as secret)
- Each companion uses their unique system prompt for in-character responses
- Lovense command JSON detection in responses (parsed but not executed yet — Phase 2)
- Visual feedback when toy commands are detected ("🔮 Toy command detected — connect your toy to activate")

## 7. Voice Features (Basic)
- Text-to-speech for companion responses using ElevenLabs via Lovable Cloud
- Speech-to-text input option using browser Web Speech API

## 8. Settings Page
- Safe word configuration
- Intensity limits (slider 0-100)
- Privacy toggles
- Chat history management (clear/export)

## What's Deferred to Phase 2
- Lovense toy control (actual API calls)
- Custom companion creator
- Social login (Google, etc.)
- Premium/monetization system
- Advanced voice with per-character voice selection

