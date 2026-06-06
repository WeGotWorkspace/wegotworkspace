#!/usr/bin/env node
/**
 * Assign x-wgw-access on OpenAPI operations that lack it.
 * guest: public + meet/rooms + installer + auth
 * admin: /admin/*
 * user: everything else under /api/v1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const specPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../openapi/openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

function accessForPath(openApiPath) {
  if (openApiPath.startsWith("/admin/")) return "admin";
  if (
    openApiPath.startsWith("/auth/") ||
    openApiPath === "/health" ||
    openApiPath === "/capabilities" ||
    openApiPath.startsWith("/.well-known/") ||
    openApiPath.startsWith("/installer/") ||
    openApiPath.startsWith("/meetings/") ||
    openApiPath.startsWith("/rooms/")
  ) {
    return "guest";
  }
  return "user";
}

let updated = 0;
for (const [openApiPath, pathItem] of Object.entries(spec.paths ?? {})) {
  if (!pathItem || typeof pathItem !== "object") continue;
  for (const [method, definition] of Object.entries(pathItem)) {
    if (!definition || typeof definition !== "object") continue;
    if (["parameters", "summary", "description", "servers"].includes(method)) continue;
    if (definition["x-wgw-access"]) continue;
    definition["x-wgw-access"] = accessForPath(openApiPath);
    updated += 1;
  }
}

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`backfill-openapi-access: set x-wgw-access on ${updated} operation(s)`);
