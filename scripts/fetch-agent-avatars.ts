/**
 * Fetches DiceBear "notionists" avatars for every ZeniPay agent into
 * /public/agents/*.svg so the marketing pages can use them via
 * next/image without a runtime dependency on api.dicebear.com.
 *
 * Run:
 *   npx tsx scripts/fetch-agent-avatars.ts
 *
 * Lina is intentionally excluded — she belongs to Zeniva Travel, not
 * ZeniPay's agent roster.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS = [
  "Marco", "Sofia", "Ben",   "Luna", "Atlas", "Mia",
  "Leo",   "Rex",   "Vera",  "Nova", "Kai",
];

async function main() {
  // Resolve /public/agents relative to this file (scripts/).
  const here = typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, "..", "public", "agents");
  await mkdir(outDir, { recursive: true });

  let fetched = 0, cached = 0, failed = 0;
  for (const name of AGENTS) {
    const file = join(outDir, `${name.toLowerCase()}.svg`);
    try {
      // Skip if already present and non-empty — avoids repeated fetches
      // and lets the repo ship committed avatars.
      try {
        const existing = await readFile(file);
        if (existing.byteLength > 200) { cached++; continue; }
      } catch { /* fall through to fetch */ }

      const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();
      if (!svg.includes("<svg")) throw new Error("response is not SVG");
      await writeFile(file, svg);
      fetched++;
      // Tiny throttle so we don't hammer dicebear when fetching fresh.
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${name}: ${msg}`);
    }
  }

  console.log(`DiceBear avatars → public/agents/  (fetched=${fetched}, cached=${cached}, failed=${failed})`);
  if (failed > 0) process.exit(1);
}

void main();
