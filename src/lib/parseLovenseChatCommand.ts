/**
 * Strip Lovense JSON from assistant text and return the inner command for DB + device.
 * Models often emit JS-like `{lovense_command: {command:vibrate,...}}` without quotes — the old
 * regex required `"lovense_command"` so nothing matched and the raw blob stayed in chat.
 */

export function sliceBalancedBrace(text: string, openPos: number): string | null {
  if (text[openPos] !== "{") return null;
  let depth = 0;
  for (let i = openPos; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(openPos, i + 1);
    }
  }
  return null;
}

/** Flat `key: value` pairs inside `{ ... }` without requiring JSON quotes (model output). */
export function parseLooseInnerObject(innerWithBraces: string): Record<string, unknown> | null {
  const inner = innerWithBraces.trim().replace(/^\{|\}$/g, "").trim();
  if (!inner) return null;
  const out: Record<string, unknown> = {};
  const parts: string[] = [];
  let cur = "";
  let inStr = false;
  let quote = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (!inStr && (ch === '"' || ch === "'")) {
      inStr = true;
      quote = ch;
      cur += ch;
      continue;
    }
    if (inStr) {
      cur += ch;
      if (ch === quote && inner[i - 1] !== "\\") inStr = false;
      continue;
    }
    if (ch === ",") {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  for (const part of parts) {
    const m = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/s);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      out[k] = v.slice(1, -1);
      continue;
    }
    if (/^-?\d+$/.test(v)) {
      out[k] = parseInt(v, 10);
      continue;
    }
    if (/^-?\d+\.\d+$/.test(v)) {
      out[k] = parseFloat(v);
      continue;
    }
    if (v === "true" || v === "false") {
      out[k] = v === "true";
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function parseLovenseChatCommand(text: string): {
  cleanText: string;
  command: Record<string, unknown> | null;
} {
  const raw = (typeof text === "string" ? text : String(text ?? "")).trim();
  if (!raw) return { cleanText: text, command: null };

  const lower = raw.toLowerCase();
  const anchor = "lovense_command";
  if (!lower.includes(anchor)) return { cleanText: text, command: null };

  const idx = lower.indexOf(anchor);
  const openOuter = raw.lastIndexOf("{", idx);
  if (openOuter === -1) return { cleanText: text, command: null };

  const outerBlock = sliceBalancedBrace(raw, openOuter);
  if (!outerBlock) return { cleanText: text, command: null };

  let command: Record<string, unknown> | null = null;

  try {
    const parsed = JSON.parse(outerBlock) as { lovense_command?: unknown };
    if (parsed && typeof parsed === "object" && parsed.lovense_command && typeof parsed.lovense_command === "object") {
      command = parsed.lovense_command as Record<string, unknown>;
    }
  } catch {
    /* try loose */
  }

  if (!command) {
    const innerHead = outerBlock.match(/lovense_command\s*:\s*\{/i);
    if (innerHead && innerHead.index !== undefined) {
      const innerOpen = innerHead.index + innerHead[0].length - 1;
      const innerBlock = sliceBalancedBrace(outerBlock, innerOpen);
      if (innerBlock) {
        command = parseLooseInnerObject(innerBlock);
      }
    }
  }

  let cleanText = raw.replace(outerBlock, "").trim();
  cleanText = cleanText.replace(/\s{3,}/g, "\n\n").trim();

  return { cleanText, command };
}
