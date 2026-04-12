import lilithVesper from "@/assets/companions/lilith-vesper.jpg";
import jaxHarlan from "@/assets/companions/jax-harlan.jpg";
import marcusVale from "@/assets/companions/marcus-vale.jpg";
import novaQuinn from "@/assets/companions/nova-quinn.jpg";
import sableRook from "@/assets/companions/sable-rook.jpg";
import finnBlaze from "@/assets/companions/finn-blaze.jpg";
import ravenNox from "@/assets/companions/raven-nox.jpg";
import diegoCortez from "@/assets/companions/diego-cortez.jpg";
import biancaRose from "@/assets/companions/bianca-rose.jpg";
// romanSteel import removed - file deleted
// priyaSharma import removed - file deleted
import elaraMoon from "@/assets/companions/elara-moon.jpg";
// tylerKane import removed - file deleted
// import tylerKane from "@/assets/companions/tyler-kane.jpg";
import kiraLux from "@/assets/companions/kira-lux.jpg";
import zaraEclipse from "@/assets/companions/zara-eclipse.jpg";
import lenaFrost from "@/assets/companions/lena-frost.jpg";
import jaxsonVoss from "@/assets/companions/jaxson-voss.jpg";
import sageEvergreen from "@/assets/companions/sage-evergreen.jpg";

export const companionImages: Record<string, string> = {
  "lilith-vesper": lilithVesper,
  "jax-harlan": jaxHarlan,
  "marcus-vale": marcusVale,
  "nova-quinn": novaQuinn,
  "sable-rook": sableRook,
  "finn-blaze": finnBlaze,
  "raven-nox": ravenNox,
  "diego-cortez": diegoCortez,
  "bianca-rose": biancaRose,
  // "roman-steel": romanSteel, // Removed - file deleted
  // "priya-sharma": priyaSharma, // Removed - file deleted
  "elara-moon": elaraMoon,
  // "tyler-kane": tylerKane, // Removed - file deleted
  "kira-lux": kiraLux,
  "zara-eclipse": zaraEclipse,
  "lena-frost": lenaFrost,
  "jaxson-voss": jaxsonVoss,
  "sage-evergreen": sageEvergreen,
};

// Placeholder gradient for companions without portraits yet
export const getCompanionImage = (id: string): string | null => {
  return companionImages[id] || null;
};