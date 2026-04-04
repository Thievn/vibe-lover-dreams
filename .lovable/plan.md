

# Generate 5 Missing Portraits Using Grok (xAI Aurora)

## What
Generate the 5 missing companion portraits using xAI's image generation API (`grok-2-image`) with the prompts you provided, then update the codebase.

## Steps

1. **Create a script** (`/tmp/gen_grok_images.py`) that calls the xAI image generation endpoint (`https://api.x.ai/v1/images/generations`) using the existing `XAI_API_KEY` secret
2. **Generate 5 images** with the exact prompts provided for: Kira Lux, Zara Eclipse, Lena Frost, Jaxson Voss, Sage Evergreen
3. **Save images** to `src/assets/companions/`:
   - `kira-lux.jpg`
   - `zara-eclipse.jpg`
   - `lena-frost.jpg`
   - `jaxson-voss.jpg`
   - `sage-evergreen.jpg`
4. **Update `src/data/companionImages.ts`** — add the 5 new imports and mappings (20/20 complete)

## Technical Details
- xAI image API: `POST https://api.x.ai/v1/images/generations` with model `grok-2-image`
- Uses `XAI_API_KEY` already stored as a secret — will read it from env
- Response returns base64 image data, decoded and saved as JPG
- Style should match existing portraits (dark, moody, cyber-goth lighting)

