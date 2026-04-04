import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { companions as staticCompanions, type Companion } from "@/data/companions";

export interface DbCompanion {
  id: string;
  name: string;
  tagline: string;
  gender: string;
  orientation: string;
  role: string;
  tags: string[];
  kinks: string[];
  appearance: string;
  personality: string;
  bio: string;
  system_prompt: string;
  fantasy_starters: { title: string; description: string }[];
  gradient_from: string;
  gradient_to: string;
  image_url: string | null;
  image_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Convert DB companion to the app's Companion interface
export const dbToCompanion = (db: DbCompanion): Companion => ({
  id: db.id,
  name: db.name,
  tagline: db.tagline,
  gender: db.gender,
  orientation: db.orientation,
  role: db.role,
  tags: db.tags,
  kinks: db.kinks,
  appearance: db.appearance,
  personality: db.personality,
  bio: db.bio,
  systemPrompt: db.system_prompt,
  fantasyStarters: db.fantasy_starters,
  gradientFrom: db.gradient_from,
  gradientTo: db.gradient_to,
});

export const useCompanions = () => {
  return useQuery({
    queryKey: ["companions"],
    queryFn: async (): Promise<DbCompanion[]> => {
      const { data, error } = await supabase
        .from("companions")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching companions:", error);
        // Fallback to static data
        return staticCompanions.map(c => ({
          id: c.id,
          name: c.name,
          tagline: c.tagline,
          gender: c.gender,
          orientation: c.orientation,
          role: c.role,
          tags: c.tags,
          kinks: c.kinks,
          appearance: c.appearance,
          personality: c.personality,
          bio: c.bio,
          system_prompt: c.systemPrompt,
          fantasy_starters: c.fantasyStarters,
          gradient_from: c.gradientFrom,
          gradient_to: c.gradientTo,
          image_url: null,
          image_prompt: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      }

      return (data || []) as unknown as DbCompanion[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Admin hook - fetches ALL companions including inactive
export const useAdminCompanions = () => {
  return useQuery({
    queryKey: ["admin-companions"],
    queryFn: async (): Promise<DbCompanion[]> => {
      const { data, error } = await supabase
        .from("companions")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data || []) as unknown as DbCompanion[];
    },
  });
};
