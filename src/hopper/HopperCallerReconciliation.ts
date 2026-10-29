import { performance } from "node:perf_hooks";
import { z } from "zod";
import type { ExecutionOptions } from "../application/AnalysisProvider.js";
import {
  AnalysisCancelledError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import type { JsonValue } from "../domain/jsonValue.js";
import { functionDossierSchema } from "../domain/native/functionDossier.js";
import {
  referenceEdgeSchema,
  unresolvedCallSchema,
} from "../domain/native/nativeReference.js";
import { procedureIdentitySchema } from "../domain/native/procedureInfo.js";
import { nativeCallClassificationSchema } from "../domain/native/nativeCallReference.js";
import { err, ok, type Result } from "../domain/result.js";
import type { HopperClient } from "./HopperClient.js";
import { analysisClientFailureForOperation } from "../providers/AnalysisClientFailure.js";

const compactEdgeSchema = z.strictObject({
  source_address: z.string(),
  target_address: z.string(),
  source_procedure: z.union([
    z.literal("caller"),
    procedureIdentitySchema,
    z.null(),
  ]),
  target_procedure: z.string(),
  call: nativeCallClassificationSchema,
});
const pageSchema = z.strictObject({
  start: z.int().nonnegative(),
  next: z.int().nonnegative(),
  total: z.int().nonnegative(),
  oversized: z.boolean(),
  items: z.array(
    z.strictObject({
      caller: procedureIdentitySchema,
      callees: z.array(z.string()),
      references: z.array(compactEdgeSchema),
    }),
  ),
});
const targetSchema = z.strictObject({
  target: procedureIdentitySchema,
  instructions: z.array(z.string()),
  instructions_complete: z.boolean(),
});
const callersBaseSchema = targetSchema.extend({
  callers: z.array(z.string()),
  callers_complete: z.boolean(),
});
const referencesSchema = z.strictObject({
  procedure: procedureIdentitySchema,
  direction: z.enum(["incoming", "outgoing"]),
  reference_kinds_available: z.boolean(),
  unresolved_calls: z.array(unresolvedCallSchema),
  references: z.array(referenceEdgeSchema),
});
type Operation =
  "procedure_callers" | "procedure_references" | "analyze_function";
type Identity = z.infer<typeof procedureIdentitySchema>;
type Edge = z.infer<typeof referenceEdgeSchema>;
type CompactEdge = z.infer<typeof compactEdgeSchema>;
type Destination = {
  callers: Map<string, Identity>;
  references: Array<{ caller: Identity; edge: CompactEdge }>;
};
type Index = { destinations: Map<string, Destination>; reason: string };
const MAX_RETAINED_SCAN_BYTES = 4 * 1024 * 1024;

/** A child bridge request is a phase of the enclosing user operation. */
export function reconciliationChildOptions(
  options: ExecutionOptions | undefined,
): ExecutionOptions | undefined {
  if (options?.progress === undefined) return options;
  const progress = options.progress;
  return {
    ...options,
    progress: {
      report: (update) =>
        progress.report({
          ...update,
          completed: 0,
          total: null,
          terminal: false,
        }),
    },
  };
}

async function reportScanProgress(
  options: ExecutionOptions | undefined,
  start: number,
  total: number | undefined,
  final = false,
): Promise<void> {
  try {
    await options?.progress?.report({
      phase: "hopper_caller_reconciliation",
      completed: 0,
      total: null,
      message: `Examined ${start} of ${total ?? "unknown"} procedures`,
      ...(final ? { terminal: true } : {}),
    });
  } catch {
    // Progress is observational and cannot change the analysis result.
  }
}

async function buildIndex(
  client: HopperClient,
  operation: Operation,
  document: JsonValue | undefined,
  options: ExecutionOptions | undefined,
  budgetMs: number,
): Promise<Result<Index, AnalysisError>> {
  const destinations = new Map<string, Destination>();
  const destination = (address: string): Destination => {
    let value = destinations.get(address);
    if (value === undefined) {
      value = { callers: new Map(), references: [] };
      destinations.set(address, value);
    }
    return value;
  };
  let start = 0,
    total: number | undefined,
    bytes = 0;
  const began = performance.now();
  let stopped = "";
  do {
    if (options?.signal?.aborted)
      return err(
        new AnalysisCancelledError(operation, { cause: options.signal.reason }),
      );
    if (start > 0 && performance.now() - began >= budgetMs) {
      stopped = `the ${budgetMs} ms reconciliation work budget was reached; set REA_HOPPER_CALLER_SCAN_BUDGET_MS and restart REA to change it`;
      break;
    }
    if (start > 0) await reportScanProgress(options, start, total);
    const args: Record<string, JsonValue> = { start };
    if (document !== undefined) args.document = document;
    const pageOptions =
      options?.progress === undefined
        ? options
        : {
            ...options,
            progress: {
              report: (update: { readonly terminal?: boolean }) =>
                update.terminal === true
                  ? Promise.resolve()
                  : reportScanProgress(options, start, total),
            },
          };
    const page = await client.callTool(
      "rea_caller_scan_page",
      args,
      pageOptions,
    );
    if (!page.ok)
      return err(
        analysisClientFailureForOperation(page.error, "hopper", operation),
      );
    if (options?.signal?.aborted)
      return err(
        new AnalysisCancelledError(operation, { cause: options.signal.reason }),
      );
    const decoded = pageSchema.safeParse(page.value);
    if (!decoded.success)
      return err(
        new AnalysisOutputError(operation, "Invalid Hopper caller scan page", {
          cause: decoded.error,
        }),
      );
    const value = decoded.data;
    if (
      value.start !== start ||
      value.next < start ||
      value.next > value.total ||
      value.next - start > 64 ||
      (value.next === start &&
        value.next !== value.total &&
        !value.oversized) ||
      value.items.length !== value.next - start ||
      (value.oversized && value.next !== start)
    )
      return err(
        new AnalysisOutputError(
          operation,
          "Invalid Hopper caller scan progress",
        ),
      );
    if (total !== undefined && value.total !== total) {
      stopped = "the procedure inventory changed during reconciliation";
      break;
    }
    total = value.total;
    if (value.oversized) {
      stopped = "a single procedure exceeded the 512 KiB page allowance";
      break;
    }
    const pageBytes = Buffer.byteLength(JSON.stringify(page.value));
    if (pageBytes > MAX_RETAINED_SCAN_BYTES - bytes) {
      stopped = `the ${MAX_RETAINED_SCAN_BYTES} byte reconciliation retention budget was reached`;
      break;
    }
    bytes += pageBytes;
    for (const item of value.items) {
      for (const callee of item.callees)
        destination(callee).callers.set(item.caller.address, item.caller);
      for (const edge of item.references) {
        destination(edge.target_procedure).references.push({
          caller: item.caller,
          edge,
        });
      }
    }
    start = value.next;
    await reportScanProgress(options, start, total);
  } while (start < (total ?? 0));
  await reportScanProgress(options, start, total, true);
  if (options?.signal?.aborted)
    return err(
      new AnalysisCancelledError(operation, { cause: options.signal.reason }),
    );
  return ok({
    destinations,
    reason: `Hopper caller reconciliation examined ${start} of ${total ?? 0} procedures and retained ${bytes} encoded bytes${stopped ? `; ${stopped}` : ""}. Forward and reverse API coverage and consistency during the live scan remain unknown.`,
  });
}

export const reconcileHopperCallers = async (
  client: HopperClient,
  operation: Operation,
  parameters: Readonly<Record<string, JsonValue>>,
  original: JsonValue,
  options: ExecutionOptions | undefined,
  budgetMs: number,
): Promise<
  Result<
    { result: JsonValue; rawResult: JsonValue; reason: string },
    AnalysisError
  >
> => {
  const base =
    operation === "procedure_callers"
      ? callersBaseSchema.safeParse(original)
      : undefined;
  if (base !== undefined && !base.success)
    return err(
      new AnalysisOutputError(operation, "Invalid Hopper caller observation", {
        cause: base.error,
      }),
    );
  const parsed =
    operation === "procedure_callers"
      ? z
          .array(z.string())
          .safeParse(base?.success ? base.data.callers : undefined)
      : operation === "analyze_function"
        ? functionDossierSchema.safeParse(original)
        : referencesSchema.safeParse(original);
  if (!parsed.success)
    return err(
      new AnalysisOutputError(operation, "Invalid Hopper caller observation", {
        cause: parsed.error,
      }),
    );
  const args: Record<string, JsonValue> = {};
  if (parameters.document !== undefined) args.document = parameters.document;
  if (parameters.procedure !== undefined) args.procedure = parameters.procedure;
  const targetResponse = base?.success
    ? ok({
        target: base.data.target,
        instructions: base.data.instructions,
        instructions_complete: base.data.instructions_complete,
      })
    : await client.callTool(
        "rea_caller_scan_target",
        args,
        reconciliationChildOptions(options),
      );
  if (!targetResponse.ok)
    return err(
      analysisClientFailureForOperation(
        targetResponse.error,
        "hopper",
        operation,
      ),
    );
  if (options?.signal?.aborted)
    return err(
      new AnalysisCancelledError(operation, { cause: options.signal.reason }),
    );
  const selected = targetSchema.safeParse(targetResponse.value);
  if (!selected.success)
    return err(
      new AnalysisOutputError(operation, "Invalid Hopper caller scan target", {
        cause: selected.error,
      }),
    );
  const { target, instructions, instructions_complete } = selected.data;
  if (
    operation !== "procedure_callers" &&
    "procedure" in parsed.data &&
    parsed.data.procedure.address !== target.address
  )
    return ok({
      result: original,
      rawResult: original,
      reason:
        "The selected procedure changed during reconciliation. Relationship coverage is unknown.",
    });
  const documentKey =
    parameters.document === undefined
      ? "default"
      : `document:${String(parameters.document)}`;
  let indexByDocument = options?.workScope?.get<Map<string, Index>>(client);
  let index = indexByDocument?.get(documentKey);
  if (index === undefined) {
    const scanned = await buildIndex(
      client,
      operation,
      parameters.document,
      options,
      budgetMs,
    );
    if (!scanned.ok) return scanned;
    index = scanned.value;
    if (options?.workScope !== undefined) {
      if (indexByDocument === undefined) {
        indexByDocument = new Map();
        options.workScope.set(client, indexByDocument);
      }
      indexByDocument.set(documentKey, index);
    }
  }
  const addresses = new Set(instructions);
  addresses.add(target.address);
  const selectedDestination = index.destinations.get(target.address);
  const callers = new Map(selectedDestination?.callers ?? []);
  const references = new Map<string, Edge>();
  for (const { caller, edge } of selectedDestination?.references ?? []) {
    if (!addresses.has(edge.target_address)) continue;
    const source =
      edge.source_procedure === "caller" ? caller : edge.source_procedure;
    if (source !== null) callers.set(source.address, source);
    references.set(`${edge.source_address}:${edge.target_address}`, {
      source_address: edge.source_address,
      target_address: edge.target_address,
      source_procedure: source,
      target_procedure: target,
      kind: {
        available: false,
        reason:
          "Hopper exposes partial CallReference classification, but not detailed reference flags",
      },
      call: edge.call,
    });
  }
  const mergeReferences = (
    existing: z.infer<typeof referenceEdgeSchema>[],
    excludeSource?: string,
  ) => {
    const merged = new Map(
      existing.map((edge) => [
        `${edge.source_address}:${edge.target_address}`,
        edge,
      ]),
    );
    for (const [key, edge] of references) {
      if (
        excludeSource !== undefined &&
        edge.source_procedure?.address === excludeSource
      )
        continue;
      const old = merged.get(key);
      merged.set(
        key,
        old === undefined
          ? edge
          : old.call === undefined && edge.call !== undefined
            ? { ...old, call: edge.call }
            : old,
      );
    }
    return [...merged.values()];
  };
  let result: JsonValue;
  if (operation === "procedure_callers")
    result = [...new Set([...(parsed.data as string[]), ...callers.keys()])];
  else if (operation === "analyze_function") {
    const dossier = functionDossierSchema.parse(parsed.data);
    const identities = new Map(
      dossier.callers.map((item) => [item.address, item]),
    );
    for (const [address, caller] of callers)
      if (!identities.has(address)) identities.set(address, caller);
    result = {
      ...dossier,
      callers: [...identities.values()],
      incoming_references: mergeReferences(
        dossier.incoming_references,
        dossier.procedure.address,
      ),
    };
  } else {
    const facts = referencesSchema.parse(parsed.data);
    result = { ...facts, references: mergeReferences(facts.references) };
  }
  return ok({
    result,
    rawResult: {
      native_result: original,
      forward_observations: {
        target,
        callee_inventory_callers: [
          ...(selectedDestination?.callers.values() ?? []),
        ],
        call_references: [...references.values()],
        provenance:
          "hopper-public-python-api:getAllCalleeProcedures and CallReference",
      },
    },
    reason: `${index.reason}${instructions_complete ? "" : " Target instruction enumeration reached the 512 KiB allowance; incoming call-site coverage is incomplete."}${base?.success && !base.data.callers_complete ? " Native caller enumeration reached the 512 KiB allowance." : ""}`,
  });
};
