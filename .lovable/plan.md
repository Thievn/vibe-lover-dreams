

# Rename ViceVibe AI → LustForge AI

A straightforward find-and-replace across 8 files. No design, color, or functionality changes.

## Changes

### 1. Display text replacements
| File | Change |
|------|--------|
| `index.html` | Title, meta author, og:title, twitter:title → "LustForge AI" |
| `src/components/Navbar.tsx` | "ViceVibe" → "LustForge" |
| `src/components/HeroSection.tsx` | "ViceVibe" → "LustForge" |
| `src/components/AgeGate.tsx` | "ViceVibe AI" → "LustForge AI" (description + button) |
| `src/pages/Auth.tsx` | "Back to ViceVibe" → "Back to LustForge", "Join ViceVibe" → "Join LustForge" |
| `src/pages/Index.tsx` | Footer text: "ViceVibe AI" → "LustForge AI" |

### 2. localStorage keys (keep working for existing users)
Rename keys in these files for consistency:
- `vicevibe-age-verified` → `lustforge-age-verified` (Index.tsx, AgeGate.tsx, Settings.tsx)
- `vicevibe-safeword` → `lustforge-safeword` (Chat.tsx, Settings.tsx)
- `vicevibe-intensity` → `lustforge-intensity` (Settings.tsx)

### 3. CSS class references
- `gradient-vice-text` class stays as-is (internal CSS utility, no user-facing impact)

### 4. Memory update
- Update `mem://index.md` to reflect "LustForge AI" branding

