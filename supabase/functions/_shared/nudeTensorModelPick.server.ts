import type { NudeRenderGroup } from "./nudeTensorRenderGroup.server.ts";

/**
 * TAMS / Tensor requires numeric `sdModel` from the model page (see tensorClient.ts).
 *
 * Set in Supabase:
 * - TENSOR_NUDE_REALISTIC_IMAGE_MODEL / TENSOR_NUDE_STYLIZED_IMAGE_MODEL
 * - TENSOR_NUDE_REALISTIC_VIDEO_MODEL / TENSOR_NUDE_STYLIZED_VIDEO_MODEL
 * Optional: TENSOR_REALISTIC_IMAGE_MODEL, TENSOR_STYLIZED_IMAGE_MODEL, TENSOR_STYLIZED_VIDEO_MODEL
 *
 * Fallback: generic chat/flux or video defaults (documented in tensorClient.ts) — set envs in prod.
 */
export function pickNudeImageModelId(
  getEnv: (k: string) => string | undefined,
  group: NudeRenderGroup,
  assertTensorSdModelId: (id: string, env: string) => string,
  fallbackFromGeneric: string,
): string {
  const envLabel = group === "stylized" ? "TENSOR_NUDE_STYLIZED_IMAGE_MODEL" : "TENSOR_NUDE_REALISTIC_IMAGE_MODEL";
  const raw =
    group === "stylized"
      ? (getEnv("TENSOR_NUDE_STYLIZED_IMAGE_MODEL") ?? "").trim() ||
        (getEnv("TENSOR_STYLIZED_IMAGE_MODEL") ?? "").trim() ||
        fallbackFromGeneric
      : (getEnv("TENSOR_NUDE_REALISTIC_IMAGE_MODEL") ?? "").trim() ||
        (getEnv("TENSOR_REALISTIC_IMAGE_MODEL") ?? "").trim() ||
        fallbackFromGeneric;
  return assertTensorSdModelId(raw, envLabel);
}

export function pickNudeVideoModelId(
  getEnv: (k: string) => string | undefined,
  group: NudeRenderGroup,
  assertTensorSdModelId: (id: string, env: string) => string,
  fallbackFromGeneric: string,
): string {
  const envLabel = group === "stylized" ? "TENSOR_NUDE_STYLIZED_VIDEO_MODEL" : "TENSOR_NUDE_REALISTIC_VIDEO_MODEL";
  const raw =
    group === "stylized"
      ? (getEnv("TENSOR_NUDE_STYLIZED_VIDEO_MODEL") ?? "").trim() ||
        (getEnv("TENSOR_STYLIZED_VIDEO_MODEL") ?? "").trim() ||
        fallbackFromGeneric
      : (getEnv("TENSOR_NUDE_REALISTIC_VIDEO_MODEL") ?? "").trim() ||
        (getEnv("TENSOR_REALISTIC_VIDEO_MODEL") ?? "").trim() ||
        fallbackFromGeneric;
  return assertTensorSdModelId(raw, envLabel);
}
