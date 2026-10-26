import { request, type ClientRequest, type IncomingMessage } from "node:http";

import { z } from "zod";

import { CDP_DISCOVERY_RESPONSE_TIMEOUT_MS } from "../domain/browserDeadline.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import type { BrowserObservationOperation } from "../domain/browserObservationErrors.js";

/**
 * Chrome restricts browser-context management over a plain
 * `--remote-debugging-port` endpoint, and Playwright's CDP handshake cannot
 * initialize against an endpoint that exposes no page targets. Opening one
 * page target through the same DevTools HTTP discovery plane lets the
 * handshake succeed without touching the caller-owned browser otherwise.
 */
const CDP_PAGE_TARGET_OPEN_TIMEOUT_MS = CDP_DISCOVERY_RESPONSE_TIMEOUT_MS;

const openedPageTargetSchema = z.object({
  id: z.string().min(1),
});

/** Bounded response limits shared by the page-target open and close commands. */
const CDP_PAGE_TARGET_COMMAND_LIMITS = {
  bytes: 64 * 1024,
  timeoutMs: CDP_PAGE_TARGET_OPEN_TIMEOUT_MS,
} as const;

const requestCdpEndpointText = async (
  url: URL,
  operation: BrowserObservationOperation,
  signal?: AbortSignal,
): Promise<string> =>
  await new Promise<string>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(
        new BrowserObservationError(operation, "cancelled", {
          cause: signal.reason,
        }),
      );
      return;
    }
    let response: IncomingMessage | undefined;
    let request_: ClientRequest | undefined;
    let timer: NodeJS.Timeout | undefined;
    let settled = false;
    const finish = (error: unknown, value?: string): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error !== undefined) {
        response?.destroy();
        request_?.destroy();
        reject(error);
        return;
      }
      resolve(value ?? "");
    };
    const onAbort = (): void => {
      if (signal?.aborted === true)
        finish(
          new BrowserObservationError(operation, "cancelled", {
            cause: signal.reason,
          }),
        );
    };
    request_ = request(
      url,
      { method: "PUT", headers: { Accept: "application/json" } },
      (received) => {
        response = received;
        if (settled) {
          received.destroy();
          return;
        }
        if (
          received.statusCode === undefined ||
          received.statusCode < 200 ||
          received.statusCode >= 300
        ) {
          finish(
            new BrowserObservationError(
              operation,
              "invalid_endpoint_response",
              {
                detail: `The CDP endpoint responded ${String(received.statusCode ?? "without a status")} to ${url.pathname}.`,
              },
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        received.on("data", (chunk: Buffer) => {
          if (settled) return;
          bytes += chunk.byteLength;
          if (bytes > CDP_PAGE_TARGET_COMMAND_LIMITS.bytes) {
            finish(
              new BrowserObservationError(operation, "payload_limit", {
                detail: `The CDP endpoint ${url.pathname} response exceeds its ${String(CDP_PAGE_TARGET_COMMAND_LIMITS.bytes)}-byte limit.`,
              }),
            );
            return;
          }
          chunks.push(chunk);
        });
        received.on("end", () =>
          finish(undefined, Buffer.concat(chunks, bytes).toString("utf8")),
        );
        received.on("aborted", () =>
          finish(
            new BrowserObservationError(operation, "invalid_endpoint_response"),
          ),
        );
        received.on("error", (cause: unknown) => finish(cause));
      },
    );
    request_.on("error", (cause: unknown) => finish(cause));
    signal?.addEventListener("abort", onAbort, { once: true });
    onAbort();
    if (settled) return;
    timer = setTimeout(
      () =>
        finish(
          new BrowserObservationError(operation, "timeout", {
            detail: `The CDP endpoint ${url.pathname} command exceeded its ${String(CDP_PAGE_TARGET_COMMAND_LIMITS.timeoutMs)} ms deadline.`,
          }),
        ),
      CDP_PAGE_TARGET_COMMAND_LIMITS.timeoutMs,
    );
    request_.end();
  });

/**
 * Open one about:blank page target through the endpoint's DevTools HTTP API
 * and report its target id, or undefined when the endpoint response does not
 * declare one.
 */
export const openCdpEndpointPageTarget = async (
  endpoint: string,
  operation: BrowserObservationOperation,
  signal?: AbortSignal,
): Promise<string | undefined> => {
  const body = await requestCdpEndpointText(
    new URL("/json/new?about:blank", endpoint),
    operation,
    signal,
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    // Older endpoints may ack the open without a JSON document.
    return undefined;
  }
  const opened = openedPageTargetSchema.safeParse(parsed);
  return opened.success ? opened.data.id : undefined;
};

/** Close one page target previously opened through the DevTools HTTP API. */
export const closeCdpEndpointPageTarget = async (
  endpoint: string,
  targetId: string,
  operation: BrowserObservationOperation,
  signal?: AbortSignal,
): Promise<void> => {
  const identifier = encodeURIComponent(targetId);
  await requestCdpEndpointText(
    new URL(`/json/close/${identifier}`, endpoint),
    operation,
    signal,
  );
};
