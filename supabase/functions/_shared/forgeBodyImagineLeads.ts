/**
 * Explicit first-line physique descriptors for Forge image prompts ("A character, …").
 * Sync copy: `supabase/functions/_shared/forgeBodyImagineLeads.ts`
 */

export const FORGE_BODY_IMAGINE_LEADS: Record<string, string> = {
  // Humanoid & realistic
  "Average Build":
    "adult humanoid with balanced everyday proportions — neither runway-tall nor exaggerated; believable torso, limbs, and shoulders matching an unremarkable baseline adult silhouette",
  "Tall & Statuesque":
    "noticeably tall adult humanoid with elongated limbs and elegant vertical proportion — long legs, long neck, statuesque upright bearing, not average-height",
  "Petite & Delicate":
    "small-framed adult humanoid with petite bone structure and compact vertical scale — narrow shoulders, shorter torso-to-leg ratio than a runway model, distinctly not tall",
  "Curvy & Voluptuous":
    "adult humanoid with pronounced curves — full hips and thighs, soft waist-to-hip emphasis, rounded bust line; hourglass emphasis without swapping species",
  "Muscular & Athletic":
    "adult humanoid with visible athletic muscle definition — broad shoulders, trained arms/legs, low body-fat athletic surface read; strong without fantasy-species extras",
  "Slim & Toned":
    "lean adult humanoid with narrow frame and toned definition — lithe, tight musculature, modest curves; not heavyset, not exaggerated muscle-mass fantasy",
  "Plus-Size & Soft":
    "adult humanoid with fuller-figured soft tissue — noticeable weight carried believably on frame; rounder torso, fuller limbs; not a thin model with padding props only",
  Androgynous:
    "adult humanoid with deliberately ambiguous secondary characteristics — mixed soft/linear cues, neutral hip/shoulder balance; still a clear humanoid adult, not a different species",

  // Stature & scale
  "Little Person / Midget":
    "very short-statured realistic adult little person with proportionate body, short limbs, normal adult proportions scaled down — not a child, not average-height",
  "Short Stature":
    "short adult human stature with shorter-than-average legs and torso read — clearly shorter than typical adult crowd height; proportions consistent, not token wording",
  "Tiny & Doll-like":
    "very small adult-scale miniature humanoid read — doll-like delicate proportions small in absolute size relative to props; uncanny-small but adult-faced, not a child",
  "Pixie-Sized":
    "fae-tiny adult humanoid silhouette — compact body, slight build, clearly elfin/fae scale; tiny in-frame with oversized environment cues",
  Giantess:
    "towering female-presenting giant humanoid — massively enlarged limbs and torso dominating the scene; scale vs buildings/furniture must read as colossal, not camera-only",
  "Micro / Tiny Body":
    "micro-scale adult body — handheld or insect-scale framing; figure minuscule vs grain-of-sand or fingertip scale cues; still reads as intentional micro character",
  "Giant Body":
    "massive male-or-neutral giant humanoid frame — oversized musculature and limb thickness, huge hands; environment scale proves enormity",
  "Kaiju-Scale Humanoid":
    "kaiju-massive humanoid silhouette — city-scale body, immense limbs, skyline interaction; unmistakable monster-movie scale, not a normal human",
  "Giant / Gargantuan":
    "gargantuan humanoid or near-humanoid figure filling the scene — colossal mass, oversized joints, weight-bearing posture; environment crushed or dwarfed by scale cues",

  // Mobility & prosthetics
  "Amputee / Wheelchair User":
    "adult figure using a wheelchair or mobility aid with limb configuration exactly as implied — coherent anatomy, dignified posture; wheels/frame part of the primary read",
  "One-Legged":
    "adult with one biological leg and one limb absent or shortened at hip or knee — balance and stance honestly reflect single-leg anatomy; not hidden by wardrobe tricks only",
  "One-Armed":
    "adult with one arm absent or shortened at shoulder — silhouette clearly asymmetric; remaining arm and torso compensation believable",
  "Double Amputee":
    "adult with bilateral limb absence as labeled — adaptive posture, socket/prosthesis or seated power; anatomy consistent, not erased into able-bodied default",
  "Cybernetic Limb Replacement":
    "adult with obvious cybernetic limb(s) — mechanical joints, plating, hydraulic lines, LED seams; prosthetic is a major visual component, not a thin bracelet",
  "Prosthetic Beauty":
    "adult with elegant visible prosthesis — refined prosthetic limb design integrated into fashion; limb form is beautiful and central to silhouette",

  // Anthro
  "Furry / Anthro":
    "full anthropomorphic furry creature with complete animal body — digitigrade or plantigrade legs as fits species, tail, muzzle/snout, animal ears, fur covering skin; not a human with clip-on ears",
  "Wolf-Anthro":
    "anthropomorphic wolf body — heavy canine muzzle, thick neck fur, lupine ears, bushy tail, padded paws or claws; digitigrade stance; full werewolf-adjacent anatomy",
  "Feline-Anthro":
    "anthropomorphic feline body — short muzzle, whiskers, slit pupils, feline ears, long tail, retractable-claw hands; slinky musculature; unmistakably cat-derived",
  "Monster Girl / Boy":
    "anthro monster-person hybrid — horns, claws, unusual skin, tail or extra eyes as fits the label; clearly inhuman fantasy-manga monster silhouette, not cosplay makeup only",
  "Werewolf Hybrid":
    "transitional lycanthrope body — heavy wolf fur, elongated muzzle, clawed digits, hunched power stance; mid-hybrid read between human and wolf",

  // Fantasy species
  "Elf-Eared & Slender":
    "tall slender fantasy elf body — elongated pointed ears, elegant lithe limbs, refined facial planes; clearly elven, not a human with tiny ear tips only",
  "Orc-Built & Powerful":
    "heavy orc fantasy physique — pronounced jaw tusks or lower tusks, green or gray thick skin, massive shoulders, war-scarred bulk; powerhouse silhouette",
  "Orc / Goblinoid":
    "goblinoid or short orc build — shorter stocky frame, wide nose, prominent ears, dense muscle; clearly goblin/orc lineage, not a cute human",
  Troll:
    "hulking troll anatomy — oversized hands, rubbery or rocky skin texture, heavy jaw, stooped but massive limbs; fairy-tale troll mass",
  "Ogre-Sized":
    "ogre-scale bruiser body — tall, extremely thick limbs, heavy gut or barrel chest, blunt features; giant humanoid brute silhouette",
  "Demon-Tailed":
    "humanoid-demon body — visible tail with point/fin/arrow tip, possible small horns, faint infernal skin tint; tail is a primary silhouette element",
  "Angel-Winged":
    "humanoid with large feathered wings attached at scapulae — full wing span visible; celestial musculature; wings cannot be tiny nubs only",
  "Succubus Curves":
    "fantasy succubus silhouette — pronounced curves, possible small horns and bat wings or tail tip; infernal glamour body, clearly demonic-kin, not plain human lingerie",
  "Incubus Physique":
    "fantasy incubus silhouette — athletic infernal build, possible horns/wings/tail; seductive demonic male-presenting anatomy, not generic gym human",
  "Satyr / Faun":
    "satyr body — human torso with goat or sheep legs below the waist, short fur on legs, hooves, possible small horns; myth-accurate hybrid junction",
  "Minotaur-Inspired":
    "heavy bull-headed or horn-forward humanoid — wide bull horns, thick neck, massive shoulders; bovine facial structure or strong minotaur cues",
  "Dragon-Scaled":
    "humanoid with pronounced dragon scales — plate pattern on skin, possibly small horns or frills, draconic eyes; reptile texture across visible body zones",

  // Hybrid & multi-form
  "Tentacle Hybrid":
    "humanoid torso with multiple muscular tentacles replacing or augmenting limbs — sucker texture, fluid motion masses; tentacles are large visual elements",
  "Mermaid Lower Body":
    "human torso with large fish tail from hip down — scaled mermaid tail, horizontal flukes; wet sheen; junction at waist clean and myth-accurate",
  "Centaur Lower Body":
    "human torso joined at waist to full horse body — four equine legs, barrel and tail; centaur proportions classical; both halves visible",
  "Avian / Harpy":
    "humanoid torso with large bird wings on arms or back — feathered legs or talons, beak or sharp face features; harpy/avian hybrid read",
  "Serpent / Naga":
    "human torso with long serpentine lower body — scales continue below hips, coiled tail segments; naga anatomy dominant",
  Insectoid:
    "insect-inspired humanoid — compound eyes or insect faceting, extra arm segments or chitin plates, antennae; clear bug-creature silhouette",
  Arachnid:
    "spider-human hybrid — multiple segmented legs or pedipalp-like limbs, visible chitin exoskeleton zones, extra eyes; arachnid body plan unmistakable",
  "Reverse Centaur":
    "horse head-and-neck on human lower body or inverted junction as the label implies — bizarre hybrid junction explicit; not a normal centaur orientation",

  // Meta / stylized — creative rendering physics
  "Cartoon Caricature":
    "highly exaggerated cartoon caricature body — huge head, tiny or compressed body, rubber-hose or editorial proportions; extreme distortion on purpose",
  "Celebrity Caricature":
    "stylized celebrity caricature — recognizable star archetype as exaggerated parody/pastiche face and hair shapes without photorealistic identity cloning or copying one real face exactly",
  Chibi:
    "super-deformed chibi body — roughly two-to-three-heads tall, oversized round head, stubby limbs, cute SD anatomy locked across the whole figure",
  "Pixel Art Character":
    "pixel-art character come to life — visible pixel grid on skin and clothing, jagged sprite edges, limited-palette posterization; silhouette reads as retro game sprite",

  // Elemental, construct & surreal
  "Living Doll":
    "porcelain or plastic doll body — visible ball joints, seam lines, glossy finish, painted features; uncanny doll anatomy, not human skin everywhere",
  "Inflatable / Squishy":
    "inflatable or soft-toy body — glossy vinyl seams, squash-stretch deformation, valve or stitch lines; air-brushed toy read",
  "Goo / Slime Body":
    "semi-solid goo or slime humanoid — translucent gel skin, drips, wobble physics, inner bubbles; body holds shape loosely like viscous fluid",
  "Gelatinous Slime / Blob":
    "gelatinous translucent slime blob creature with shifting amorphous body, no bones, visible pseudopods, internal light refraction — pure slime entity, not a human coated in goo",
  "Crystal / Gemstone Skin":
    "humanoid with faceted crystal or gemstone skin — sharp plane breaks, internal caustics, jewel-like reflections; mineral body surface dominant",
  "Ghostly Translucent":
    "spectral body — see-through ectoplasm, faint edges, volumetric glow; internal organs or bones faintly visible as ghost trope",
  "Latex / Shiny Skin":
    "latex or rubber-suit body surface — high specular sheen, tight second-skin wrinkles at joints; fetish-fashion material as skin read",
  "Melting Wax Figure":
    "wax or candle body — melting drips, softened facial features, glossy drips hanging from chin and limbs; wax physics obvious",
  "Shadow Creature":
    "shadow-mass body — edge-soft silhouette, matte black with depth void, no conventional skin texture; occasional motes or tendrils of darkness",
  "Plant-Based / Vine-Covered":
    "plant-humanoid — bark skin zones, leaf hair, vines wrapping limbs, chlorophyll tint; botanical anatomy visible",
  "Floating Levitating Body":
    "figure whose feet do not touch ground — hover haze, subtle lift lines, hair/clothing floating upward; anti-gravity character read",
  "Mechanical Cyborg":
    "metal-plated cyborg body — exposed pistons, panel seams, hydraulic lines, glowing core; large visible machine percentage",
  "Holographic / Glitch Body":
    "hologram or glitch body — scanlines, chromatic split, transparency pops, voxel-drop artifacts; digital unstable form",
  "Stone / Marble Statue":
    "living stone or marble statue — chisel marks, veins, heavy mass, joint cracks; statue kinematics",
  "Fire Elemental Glow":
    "body of flame and ember held in humanoid outline — internal fire, ember trails, no conventional skin except fire crust",
  "Ice Elemental Frost":
    "ice-body humanoid — frost feathers, icicle spikes, translucent blue ice limbs; cold vapor halo",
  "Neon Wireframe":
    "neon wireframe hologram body — emissive edge lines, empty interior dark, tron-like mesh skin",
  "Skeleton-kin (Stylized)":
    "stylized skeleton visible through thin veil or partial flesh — bones articulate on surface, skull features clear; cartoon or horror-cute acceptable",
  "Wraith / Specter":
    "wraith form — tattered cloaking smoke, long claw hands, hollow eyes, flowing lower mist instead of legs",
  "Golem / Warforged":
    "stone or metal golem construct — rune seams, heavy blocky joints, carved face planes; fantasy warforged mass",
  "Clockwork Automaton":
    "brass clockwork automaton — gears, escapements, winding keys, vented steam; articulated doll-joints",
  "Ash / Ember Skin":
    "skin like cooling ash and orange ember cracks — soot texture, glowing fissures; ember motes leaving trail",
  "Lightning-Touched":
    "body wrapped in arcing electricity — ion glow, forked arcs at extremities, hair standing from charge",
  "Water-Formed":
    "body made of contained water — clear ripple skin, caustics, droplet spray at edges; fluid silhouette held in humanoid glass-clear read",
  "Living Object (Sentient)":
    "sentient object as the full body — face and small limbs emerge from a lamp, chair, toaster, vehicle, or other everyday item; object's volume IS the torso; not a human holding a prop",

  // Hyper shape
  "Hyper-Feminine":
    "hyper-feminine exaggerated silhouette — extreme hip/waist taper, dramatic bust line, soft facial glam; exaggeration is intentional and consistent",
  "Hyper-Masculine":
    "hyper-masculine exaggerated silhouette — extremely broad shoulders, thick neck, heavy jaw, exaggerated V-taper",
  "Hyper-Breasted":
    "figure with greatly exaggerated bust relative to torso — gravity and wardrobe respond to extreme size; consistent anatomy, not accidental",
  "Hyper-Ass":
    "figure with greatly exaggerated hips/glutes — pronounced rear projection; silhouette dominated by lower-body curve",
  "Hyper-Thicc":
    "extremely thick limbs and torso emphasis — maximal soft-tissue volume on frame; thicc read is the main silhouette story",
  "Hourglass Extreme":
    "impossibly pinched waist with very wide hips and full upper torso — cartoon-hourglass extreme, consistent exaggerated proportion",
};

export function fallbackImagineLeadForCategory(categoryId: string, normalizedLabel: string): string {
  const c = categoryId.trim().toLowerCase();
  const fallbacks: Record<string, string> = {
    humanoid: `adult humanoid figure whose build unmistakably matches "${normalizedLabel}" for height, mass distribution, and shoulder-hip balance — not a different stock body`,
    stature: `figure where scale and proportion for "${normalizedLabel}" dominate the frame — use furniture, doorways, or horizons to prove size; not a normal-height human with vague wording`,
    mobility: `figure whose adaptive anatomy for "${normalizedLabel}" is clear and central — prosthetics, wheels, or limb difference fully visible and respected`,
    anthro: `full anthropomorphic non-human body matching "${normalizedLabel}" — species skull, ears, tail, fur/feathers/scales; digitigrade or plantigrade as fits; not a human in light makeup`,
    fantasy: `fantasy-species body matching "${normalizedLabel}" — horns, wings, tail, and skin texture per archetype; myth-accurate silhouette`,
    hybrid: `multi-region hybrid body for "${normalizedLabel}" — junction between zones is explicit and anatomically coherent; never collapses to human-only`,
    creative: `stylized meta body for "${normalizedLabel}" — rendering rules (chibi, pixel, caricature, etc.) locked across the entire figure; do not revert to generic photoreal human`,
    otherworldly: `non-standard material or constructed body for "${normalizedLabel}" — slime, crystal, doll, elemental, object-core, etc.; material read is the hero, not human skin`,
    hyper: `exaggerated proportion body for "${normalizedLabel}" — named exaggeration pushed clearly and consistently`,
  };
  return (
    fallbacks[c] ??
    `with physique, silhouette, and material that unmistakably read as "${normalizedLabel}" — dominant and explicit, never a generic default adult human runway figure`
  );
}
