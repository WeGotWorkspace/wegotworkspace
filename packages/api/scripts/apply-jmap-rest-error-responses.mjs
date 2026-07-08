#!/usr/bin/env node
/**
 * Wire shared Error response refs onto JMAP REST paths in openapi.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(scriptDir, "../openapi/openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

const errorRef = (name) => ({
  description: {
    BadRequest: "Invalid request",
    Forbidden: "Forbidden",
    NotFound: "Resource not found",
    PayloadTooLarge: "Payload too large",
    PreconditionFailed: "Precondition failed",
  }[name],
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

spec.components.responses = {
  ...(spec.components.responses ?? {}),
  BadRequest: errorRef("BadRequest"),
  Forbidden: errorRef("Forbidden"),
  NotFound: errorRef("NotFound"),
  PayloadTooLarge: errorRef("PayloadTooLarge"),
  PreconditionFailed: errorRef("PreconditionFailed"),
};

const prefixMatchers = ["/contacts/", "/calendars/", "/tasks/"];
const mutating = new Set(["post", "put", "patch", "delete"]);

for (const [route, pathItem] of Object.entries(spec.paths ?? {})) {
  if (!prefixMatchers.some((prefix) => route.startsWith(prefix))) {
    continue;
  }

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!operation || typeof operation !== "object" || !operation.responses) {
      continue;
    }

    const op = method.toLowerCase();
    const merged = { ...operation.responses };

    merged["403"] = { $ref: "#/components/responses/Forbidden" };

    if (op === "get") {
      if (route.includes("{")) {
        merged["404"] = { $ref: "#/components/responses/NotFound" };
      } else if (route.endsWith("/cards") || route.endsWith("/events") || route.endsWith("/items")) {
        merged["400"] = { $ref: "#/components/responses/BadRequest" };
        merged["404"] = { $ref: "#/components/responses/NotFound" };
      }
    }

    if (mutating.has(op)) {
      merged["400"] = { $ref: "#/components/responses/BadRequest" };
      if (route.includes("{")) {
        merged["404"] = { $ref: "#/components/responses/NotFound" };
      }
      if (["post", "put", "patch"].includes(op)) {
        merged["413"] = { $ref: "#/components/responses/PayloadTooLarge" };
      }
      if (["put", "patch", "delete"].includes(op)) {
        merged["412"] = { $ref: "#/components/responses/PreconditionFailed" };
      }
    }

    operation.responses = merged;
  }
}

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log("Applied JMAP REST Error responses to openapi.json");
