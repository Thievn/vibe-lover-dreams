import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROK_API_KEY = Deno.env.get('GROK_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      prompt, 
      characterData = {}, 
      userId, 
      isPortrait = false,
      name = "",
      subtitle = ""
    } = await req.json()

    if (!prompt || !userId) {
      throw new Error("Missing prompt or userId")
    }

    // === ULTIMATE FLEXIBLE PROMPT BUILDER ===
    let baseDescription = characterData.baseDescription || "a highly attractive character"

    // Randomization support
    if (characterData.randomize === true) {
      baseDescription = "a completely unique and original character with random appearance, body type, and style"
    }

    const finalPrompt = `
Create a highly seductive, provocative, and artistic portrait of ${baseDescription}.

Character Details:
- Body type: ${characterData.bodyType || "any body type (slim, curvy, muscular, plus-size, petite, tall, short, etc.)"}
- Ethnicity / skin tone: ${characterData.ethnicity || "any"}
- Age range: ${characterData.ageRange || "young adult"}
- Hair: ${characterData.hair || "any style and color"}
- Eyes: ${characterData.eyes || "expressive and beautiful"}
- Clothing / outfit: ${characterData.clothing || "elegant, sexy, provocative clothing with lace, leather, straps, sheer fabrics, corsets, harnesses, or any style the character would wear"}
- Pose: ${characterData.pose || "seductive and provocative pose"}
- Expression / mood: ${characterData.expression || "seductive, confident, mysterious, or alluring"}
- Overall vibe: ${characterData.vibe || "extremely sexy and artistic"}

Key Rules:
- Strictly SFW — no nudity, no visible genitals, no explicit sex acts
- Extremely sexy and provocative but tasteful and artistic
- Perfect anatomy is NOT required — body can be realistic, curvy, thick, skinny, muscular, soft, etc.
- Highly detailed, cinematic lighting, premium quality, vertical portrait composition suitable for TCG-style card

Original user request: ${prompt}
    `.trim()

    // Call Grok API
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2-image",
        prompt: finalPrompt,
        n: 1,
        size: "1024x1536",
      }),
    })

    const data = await response.json()

    if (!data.data || !data.data[0]?.url) {
      throw new Error("Failed to generate image from Grok")
    }

    const imageUrl = data.data[0].url

    // Choose correct bucket
    const bucket = isPortrait ? 'companion-portraits' : 'companion-images'
    const fileName = isPortrait 
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      : `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    // Download and upload
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) throw uploadError

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl

    // Save metadata
    const table = isPortrait ? 'companion_portraits' : 'generated_images'

    const insertData: any = {
      user_id: userId,
      image_url: publicUrl,
      prompt: prompt,
      style: characterData.style || 'custom',
      created_at: new Date().toISOString()
    }

    if (isPortrait) {
      insertData.name = name || "Custom Companion"
      insertData.subtitle = subtitle || "Generated Portrait"
      insertData.is_public = true
    }

    await supabase.from(table).insert(insertData)

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl, bucket, isPortrait }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

