import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, it, onTestFinished, vi } from "vitest";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

const failure = vi.hoisted(() => ({ code: "" }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const filesystem = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...filesystem,
    mkdtemp: async (...args: Parameters<typeof filesystem.mkdtemp>) => {
      if (failure.code !== "")
        throw Object.assign(new Error("controlled staging refusal"), {
          code: failure.code,
        });
      return filesystem.mkdtemp(...args);
    },
  };
});
import { ArtifactResourceScope } from "../../../src/artifacts/ArtifactResourceScope.js";
import { writeTextParts } from "../../../src/application/JsonFiles.js";
import { projectAnalysisError } from "../../../src/domain/analysisErrorProjection.js";
import { redactExplicitFailure } from "../../../src/domain/explicitSensitiveFailure.js";

it.each([
  ["EFBIG", "file-size allowance"],
  ["ENOSPC", "space or quota"],
  ["EDQUOT", "space or quota"],
] as const)(
  "preserves the %s host resource refusal through redaction",
  async (code, guidance) => {
    const root = await createTestTempDirectory("rea-write-resource-");
    const resources = new ArtifactResourceScope();
    onTestFinished(() => resources.close());
    failure.code = code;
    try {
      const result = await writeTextParts(
        ["bytes"],
        join(root, "out.json"),
        false,
        resources,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const projected = projectAnalysisError(
          redactExplicitFailure(result.error, ["unrelated-secret"]),
        );
        expect(projected).toMatchObject({
          code: "resource_constraint",
          category: "resource_constraint",
          retryable: false,
          details: {
            operation: "write",
            reason: "storage-limit",
            system_code: code,
            path: join(root, "out.json"),
          },
        });
        expect(projected.remediation.action).toContain(guidance);
        const excluded = projectAnalysisError(
          redactExplicitFailure(result.error, [code]),
        );
        expect(excluded.details).not.toHaveProperty("system_code");
        expect(excluded.remediation.action).toContain("file-size allowance");
      }
      expect(await readdir(root)).toEqual([]);
    } finally {
      failure.code = "";
    }
  },
);
