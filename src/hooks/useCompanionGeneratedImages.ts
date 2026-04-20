import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanionGalleryRow = {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
  saved_to_personal_gallery: boolean | null;
  is_video?: boolean | null;
};

export function useCompanionGeneratedImages(companionId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["companion-generated-images", userId, companionId],
    enabled: Boolean(companionId && userId),
    queryFn: async (): Promise<CompanionGalleryRow[]> => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("id, image_url, prompt, created_at, saved_to_personal_gallery, is_video")
        .eq("user_id", userId!)
        .eq("companion_id", companionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanionGalleryRow[];
    },
  });
}
