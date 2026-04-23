import { z } from "zod";

export const liveCallOptionSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  subtitle: z.string().min(1).max(300),
  moodTag: z.string().min(1).max(100),
  instructionAugment: z.string().min(1).max(8000),
});

export type LiveCallOption = z.infer<typeof liveCallOptionSchema>;

export const liveCallOptionsResponseSchema = z.object({
  options: z.array(liveCallOptionSchema).min(1),
});

export function parseLiveCallOptionsPayload(raw: unknown): LiveCallOption[] | null {
  const parsed = liveCallOptionsResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.options;
}
