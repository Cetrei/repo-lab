import {
  ApiError,
  ContractError,
  type EndpointName,
  type RequestOf,
  type ResponseOf,
} from "@repo-lab/contract";
import { useEffect, useState } from "react";
import { useClient } from "../engine/EngineProvider";

export interface Failure {
  /** `contract` and `engine` are failures of the program, any other code comes from the domain. */
  code: string;
  message: string;
}

export interface CallResult<T> {
  data: T | undefined;
  error: Failure | undefined;
  /** True while a request is on its way. `data` keeps the last answer meanwhile, so the page does not flash. */
  pending: boolean;
}

function toFailure(error: unknown): Failure {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  if (error instanceof ContractError) return { code: "contract", message: error.message };
  return { code: "engine", message: error instanceof Error ? error.message : String(error) };
}

type Send = (name: string, request?: unknown) => Promise<unknown>;

/**
 * Asks the engine and follows the request: it asks again whenever the request changes and ignores any
 * answer that is no longer the latest. `request` is `undefined` for endpoints that take nothing and
 * `null` to hold the call back until the inputs are valid.
 */
export function useCall<N extends EndpointName>(
  name: N,
  request: RequestOf<N> | null,
): CallResult<ResponseOf<N>> {
  const client = useClient();
  // `key` stands for `request`, so a new object with the same content does not ask again.
  const key = request === null ? null : (JSON.stringify(request) ?? "none");
  const [state, setState] = useState<CallResult<ResponseOf<N>>>({
    data: undefined,
    error: undefined,
    pending: request !== null,
  });

  useEffect(() => {
    if (key === null) {
      setState({ data: undefined, error: undefined, pending: false });
      return;
    }
    let latest = true;
    setState((previous) => ({ ...previous, pending: true }));
    const send = client.call.bind(client) as unknown as Send;
    send(name, request).then(
      (data) => {
        if (latest) setState({ data: data as ResponseOf<N>, error: undefined, pending: false });
      },
      (error: unknown) => {
        if (latest) setState({ data: undefined, error: toFailure(error), pending: false });
      },
    );
    return () => {
      latest = false;
    };
  }, [client, name, key]);

  return state;
}
