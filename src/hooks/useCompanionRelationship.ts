import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanionRelationship {
  id: string;
  user_id: string;
  companion_id: string;
  affection_level: number;
  breeding_progress: number;
  breeding_stage: number;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface CompanionGift {
  id: string;
  user_id: string;
  companion_id: string;
  gift_type: string;
  gift_data: any;
  created_at: string;
}

export const useCompanionRelationship = (companionId: string) => {
  const [relationship, setRelationship] = useState<CompanionRelationship | null>(null);
  const [gifts, setGifts] = useState<CompanionGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companionId) return;

    loadRelationship();
    loadGifts();
  }, [companionId]);

  const loadRelationship = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companion_relationships")
        .select("*")
        .eq("user_id", user.id)
        .eq("companion_id", companionId)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
        console.error("Error loading relationship:", error);
        return;
      }

      setRelationship(data || null);
    } catch (error) {
      console.error("Error loading relationship:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGifts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companion_gifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("companion_id", companionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading gifts:", error);
        return;
      }

      setGifts(data || []);
    } catch (error) {
      console.error("Error loading gifts:", error);
    }
  };

  const updateAffection = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newAffection = Math.min(100, Math.max(0, (relationship?.affection_level || 0) + amount));

      const { data, error } = await supabase
        .from("companion_relationships")
        .upsert({
          user_id: user.id,
          companion_id: companionId,
          affection_level: newAffection,
          last_interaction: new Date(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error updating affection:", error);
        return;
      }

      setRelationship(data);
      return data;
    } catch (error) {
      console.error("Error updating affection:", error);
    }
  };

  const updateBreedingProgress = async (progress: number, stage: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companion_relationships")
        .upsert({
          user_id: user.id,
          companion_id: companionId,
          breeding_progress: progress,
          breeding_stage: stage,
          last_interaction: new Date(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error updating breeding progress:", error);
        return;
      }

      setRelationship(data);
      return data;
    } catch (error) {
      console.error("Error updating breeding progress:", error);
    }
  };

  const addGift = async (giftType: string, giftData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companion_gifts")
        .insert({
          user_id: user.id,
          companion_id: companionId,
          gift_type: giftType,
          gift_data: giftData,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding gift:", error);
        return;
      }

      setGifts(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error("Error adding gift:", error);
    }
  };

  return {
    relationship,
    gifts,
    loading,
    updateAffection,
    updateBreedingProgress,
    addGift,
    refresh: () => {
      loadRelationship();
      loadGifts();
    },
  };
};