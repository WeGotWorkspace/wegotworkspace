#!/usr/bin/env node

import { execFileSync } from "node:child_process";

/** %G? values where the commit object has no valid signature. */
const UNSIGNED_SIGNATURE_STATUSES = new Set(["N", "B"]);

function gitConfig(key) {
  try {
    return execFileSync("git", ["config", "--get", key], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function signatureStatus() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%G?"], { encoding: "utf8" }).trim();
  } catch {
    return "N";
  }
}

function undoUnsignedCommit() {
  try {
    execFileSync("git", ["rev-parse", "--verify", "HEAD~1"], { stdio: "ignore" });
    execFileSync("git", ["reset", "--soft", "HEAD~1"], { stdio: "ignore" });
    return;
  } catch {
    // First commit on a branch: drop HEAD but keep the index staged.
  }

  try {
    execFileSync("git", ["update-ref", "-d", "HEAD"], { stdio: "ignore" });
  } catch {
    // Best effort — signature check already failed.
  }
}

function printSetupInstructions(status) {
  const gpgSign = gitConfig("commit.gpgSign");
  const signingKey = gitConfig("user.signingkey");
  const gpgFormat = gitConfig("gpg.format") || "openpgp";

  console.error(
    status === "B"
      ? "Commit rejected: HEAD has an invalid signature."
      : "Commit rejected: HEAD is not cryptographically signed.",
  );
  console.error("");
  console.error("Branch protection on main requires signed commits (GPG or SSH).");
  console.error("The unsigned commit was undone; your changes remain staged.");
  console.error("");
  console.error("Current git signing config:");
  console.error(`  commit.gpgSign=${gpgSign || "(unset)"}`);
  console.error(`  user.signingkey=${signingKey || "(unset)"}`);
  console.error(`  gpg.format=${gpgFormat}`);
  console.error("");
  console.error("Configure signing (SSH example):");
  console.error("  git config gpg.format ssh");
  console.error("  git config user.signingkey ~/.ssh/id_ed25519.pub");
  console.error("  git config commit.gpgSign true");
  console.error("");
  console.error("Or sign a single commit:");
  console.error('  git commit -S -m "type(scope): subject"');
  console.error("");
  console.error("GPG alternative:");
  console.error("  git config gpg.format gpg");
  console.error("  git config user.signingkey <KEY_ID>");
  console.error("  git config commit.gpgSign true");
  console.error("");
  console.error("Agents: fix signing config and recommit. Do not use --no-verify or HUSKY=0 unless the user explicitly asks.");
}

const status = signatureStatus();
if (UNSIGNED_SIGNATURE_STATUSES.has(status)) {
  undoUnsignedCommit();
  printSetupInstructions(status);
  process.exit(1);
}
