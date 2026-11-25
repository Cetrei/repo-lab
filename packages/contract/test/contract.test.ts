import { describe, expect, it } from "vitest";
import cases from "../fixtures/cases.json";
import {
  ApiError,
  ContractError,
  createClient,
  endpoints,
  envelope,
  errorBody,
  isEndpointName,
  type Transport,
} from "../src";

interface Case {
  name: string;
  endpoint: string;
  request: unknown;
  response: unknown;
}

const golden = cases as Case[];

describe("golden fixtures written by Python", () => {
  for (const item of golden) {
    it(item.name, () => {
      if (!isEndpointName(item.endpoint)) {
        const failure = envelope(endpoints["meta.sources"].response).safeParse(item.response);
        expect(failure.success).toBe(true);
        expect(failure.data).toMatchObject({ ok: false, error: { code: "unknown_endpoint" } });
        return;
      }
      const spec = endpoints[item.endpoint];
      const answer = envelope(spec.response).safeParse(item.response);
      if (!answer.success) throw new Error(JSON.stringify(answer.error.issues, null, 2));
      if (answer.data.ok) {
        const request = spec.request.safeParse(item.request ?? undefined);
        if (!request.success) throw new Error(JSON.stringify(request.error.issues, null, 2));
      } else {
        expect(errorBody.safeParse(answer.data.error).success).toBe(true);
      }
    });
  }

  it("covers every endpoint of the contract with at least one successful case", () => {
    const covered = new Set(
      golden.filter((c) => (c.response as { ok: boolean }).ok).map((c) => c.endpoint),
    );
    expect(Object.keys(endpoints).filter((name) => !covered.has(name))).toEqual([]);
  });

  it("only uses endpoints the contract knows, apart from the unknown endpoint case", () => {
    const unknown = golden.filter((c) => !isEndpointName(c.endpoint)).map((c) => c.endpoint);
    expect(unknown).toEqual(["nothing.here"]);
  });
});

function replay(): Transport {
  return {
    async send(name, payload) {
      const hit = golden.find(
        (c) => c.endpoint === name && JSON.stringify(c.request ?? null) === JSON.stringify(payload),
      );
      if (!hit) throw new Error(`no fixture for ${name} ${JSON.stringify(payload)}`);
      return hit.response;
    },
  };
}

describe("client", () => {
  const client = createClient(replay());

  it("returns typed data", async () => {
    const outlook = await client.call("spawning.outlook", { level: 7 });
    expect(outlook.counts.tier3).toBe(2);
  });

  it("sends no payload for endpoints without request", async () => {
    const window = await client.call("spawning.despawn");
    expect(window).toEqual({ low: 200, high: 280 });
  });

  it("turns a domain error into an ApiError with its code", async () => {
    await expect(client.call("cosmetics.level", { level: 0 })).rejects.toMatchObject({
      name: "ApiError",
      code: "invalid_input",
    });
    await expect(client.call("cosmetics.level", { level: 0 })).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a request that breaks the contract before sending it", async () => {
    await expect(
      // @ts-expect-error level must be an integer
      client.call("cosmetics.level", { level: "one" }),
    ).rejects.toBeInstanceOf(ContractError);
  });

  it("reports an answer that does not match the contract", async () => {
    const broken = createClient({ send: async () => ({ ok: true, data: { low: "x" } }) });
    await expect(broken.call("spawning.despawn")).rejects.toBeInstanceOf(ContractError);
  });
});
