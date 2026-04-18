# SFW policy — file index

Workspace files that mention **SFW** (safe-for-work rules for image generation, forge copy, or marketing). Use this as a navigation map when updating policy.

**Canonical image brief (start here):** [supabase/functions/_shared/portraitImageDesignBrief.ts](supabase/functions/_shared/portraitImageDesignBrief.ts)

## Supabase Edge Functions & shared modules

- [supabase/functions/_shared/anatomyImageRules.ts](supabase/functions/_shared/anatomyImageRules.ts) — safety strings; “Stay SFW” guardrails
- [supabase/functions/_shared/forgeAssistantSystemPrompt.ts](supabase/functions/_shared/forgeAssistantSystemPrompt.ts) — admin forge assistant; `image_prompt` SFW for Grok Imagine
- [supabase/functions/_shared/forgePortraitAugmentation.ts](supabase/functions/_shared/forgePortraitAugmentation.ts) — composition line; SFW romance-cover quality
- [supabase/functions/_shared/portraitImageDesignBrief.ts](supabase/functions/_shared/portraitImageDesignBrief.ts) — **primary** SFW portrait rules for the image model
- [supabase/functions/_shared/renderCompanionPortrait.ts](supabase/functions/_shared/renderCompanionPortrait.ts) — portrait system text; strictly SFW
- [supabase/functions/_shared/safeImagePromptRewriter.ts](supabase/functions/_shared/safeImagePromptRewriter.ts) — rewrites prompts to Grok-Imagine–friendly SFW art direction

- [supabase/functions/admin-regenerate-companion-section/index.ts](supabase/functions/admin-regenerate-companion-section/index.ts) — admin regen; dense SFW vertical portrait brief
- [supabase/functions/generate-image/index.ts](supabase/functions/generate-image/index.ts) — user-facing image generation; SFW rules + scene direction
- [supabase/functions/nexus-merge/index.ts](supabase/functions/nexus-merge/index.ts) — merge output; SFW vertical portrait brief
- [supabase/functions/parse-companion-prompt/index.ts](supabase/functions/parse-companion-prompt/index.ts) — parse / parody prompts; SFW portrait fields

## App (`src/`)

- [src/components/CompanionCreator.tsx](src/components/CompanionCreator.tsx) — forge UI; SFW `image_prompt`, packshot copy, policy note
- [src/components/admin/AdminForgeAssistant.tsx](src/components/admin/AdminForgeAssistant.tsx) — assistant blurb; tighten SFW image prompts
- [src/components/admin/CompanionManager.tsx](src/components/admin/CompanionManager.tsx) — admin tools; SFW portrait paragraph + shared brief note
- [src/components/admin/XMarketingHub.tsx](src/components/admin/XMarketingHub.tsx) — X presets and promo copy; SFW marketing stills
- [src/lib/forgePortraitPrompt.ts](src/lib/forgePortraitPrompt.ts) — art-direction strings; SFW portrait card language
- [src/lib/xMarketingSiteRegistry.ts](src/lib/xMarketingSiteRegistry.ts) — marketing prompt presets; SFW for X
- [src/pages/Chat.tsx](src/pages/Chat.tsx) — comment; generate-image + NSFW portrait brief server-side

## Scripts

- [scripts/backfill-missing-portraits.mjs](scripts/backfill-missing-portraits.mjs) — CLI backfill; SFW cinematic portrait templates

---

*Generated for navigation; grep for `\bSFW\b` (or `[^N]SFW`) if you need to refresh the list.*
