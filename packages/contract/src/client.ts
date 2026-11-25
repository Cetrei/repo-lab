import { z } from "zod";
import { endpoints, type EndpointName, type RequestOf, type ResponseOf } from "./endpoints";

export const errorBody = z.strictObject({ code: z.string(), message: z.string() });
export type ErrorBody = z.infer<typeof errorBody>;

/** What every transport answers with: `{ok: true, data}` or `{ok: false, error}`. */
export function envelope<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.strictObject({ ok: z.literal(true), data }),
    z.strictObject({ ok: z.literal(false), error: errorBody }),
  ]);
}

/** A seam between the interface and Python. The browser sends through Pyodide, development can use HTTP. */
export interface Transport {
  send(name: string, payload: unknown): Promise<unknown>;
}

/** The domain refused the request, for example a level out of range. `code` is stable. */
export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** The answer did not match the contract, so the two sides disagree about a shape. */
export class ContractError extends Error {
  constructor(endpoint: string, detail: string) {
    super(`${endpoint}: ${detail}`);
    this.name = "ContractError";
  }
}

type CallArgs<N extends EndpointName> = RequestOf<N> extends undefined ? [] : [request: RequestOf<N>];

export interface Client {
  call<N extends EndpointName>(name: N, ...args: CallArgs<N>): Promise<ResponseOf<N>>;
}

export function createClient(transport: Transport): Client {
  return {
    async call<N extends EndpointName>(name: N, ...args: CallArgs<N>): Promise<ResponseOf<N>> {
      const spec = endpoints[name];
      const request = spec.request.safeParse(args[0]);
      if (!request.success) {
        throw new ContractError(name, `bad request, ${z.prettifyError(request.error)}`);
      }
      const raw = await transport.send(name, request.data ?? null);
      const answer = envelope(spec.response).safeParse(raw);
      if (!answer.success) {
        throw new ContractError(name, `unexpected answer, ${z.prettifyError(answer.error)}`);
      }
      if (!answer.data.ok) {
        throw new ApiError(answer.data.error.code, answer.data.error.message);
      }
      return answer.data.data as ResponseOf<N>;
    },
  };
}
