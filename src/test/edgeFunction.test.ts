import { describe, it, expect } from "vitest";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";

describe("getEdgeFunctionInvokeMessage", () => {
  it("reads JSON from FunctionsHttpError-style Response context (non-2xx invoke)", async () => {
    const res = new Response(JSON.stringify({ success: false, error: "xAI image API error: rate limit" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: res,
    };
    const msg = await getEdgeFunctionInvokeMessage(err, null);
    expect(msg).toBe("xAI image API error: rate limit");
  });

  it("uses parsed data when present", async () => {
    const msg = await getEdgeFunctionInvokeMessage(null, { error: "from data" });
    expect(msg).toBe("from data");
  });

  it("joins error and details from JSON body", async () => {
    const res = new Response(JSON.stringify({ error: "xAI failed", details: "bad model" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
    const msg = await getEdgeFunctionInvokeMessage({ message: "non-2xx", context: res }, null);
    expect(msg).toBe("xAI failed: bad model");
  });
});
