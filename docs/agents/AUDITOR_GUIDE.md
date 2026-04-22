# ZeniPay Agents — Auditor's Verification Guide

**Audience**: SOC2 / external auditors who have received a ZeniPay Agents audit
export (NDJSON file) and need to verify its integrity.

**Cryptographic model**:
- Each audit entry is hashed with SHA-256.
- Leaves form a binary Merkle tree — odd unpaired nodes propagate unchanged
  (no duplication; prevents proof ambiguity).
- The tree's root is signed with a global Ed25519 key belonging to ZeniPay.
- The public key is published at
  <https://zenipay.ca/.well-known/audit-signing-key.pub>.

## 1. File layout

An export is a UTF-8 NDJSON file. One JSON document per line. Structure:

```
{"header":{"format_version":"1","key_id":"zp_audit_v1","organization_id":"org_…","scope":"organization","scope_ref":null,"window_start":"2026-04-01T00:00:00Z","window_end":"2026-04-30T00:00:00Z","generated_at":"2026-05-01T00:00:00Z"}}
{"entry":{"id":"aud_…","organization_id":"org_…","actor_type":"user","actor_id":"…","event_type":"card.paused","payload":{…},"created_at":"2026-04-15T12:34:56.789Z"}}
…
{"merkle_proofs":[…]}        // optional — only if you requested `include_merkle_proofs=true`
{"trailer":{"format_version":"1","key_id":"zp_audit_v1","organization_id":"…","scope":"…","scope_ref":null,"window_start":"…","window_end":"…","row_count":1234,"merkle_root_hex":"…","generated_at":"…","signature_b64":"…"}}
```

The trailer is the only line that's cryptographically signed.

## 2. Verification steps

### 2.1 Fetch the public key

```
curl -s https://zenipay.ca/.well-known/audit-signing-key.pub -o zenipay_audit_key.pub
```

The file is PEM-encoded `SubjectPublicKeyInfo` (RFC 8410) for Ed25519.

### 2.2 Re-compute each entry's leaf hash

For every `{"entry": {…}}` line in the file, extract the `entry` object
(without the outer wrapper), serialize it with **canonical JSON** (keys
sorted alphabetically at every nesting level; no whitespace; same escape
rules as RFC 8259), and compute SHA-256 of the UTF-8 bytes.

```js
const canonical = (v) =>
  v === null ? "null"
  : typeof v === "number" ? Number.isFinite(v) ? JSON.stringify(v) : "null"
  : typeof v === "string" || typeof v === "boolean" ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;

const leaf = crypto.createHash("sha256").update(canonical(entry)).digest();
```

### 2.3 Rebuild the Merkle tree

Combine pairs with `SHA-256(left || right)` (raw byte concatenation). If the
current layer has an odd count, promote the last unpaired node unchanged.
Repeat until one node remains — that's the root.

```js
let layer = leaves;
while (layer.length > 1) {
  const next = [];
  for (let i = 0; i < layer.length; i += 2) {
    if (i + 1 < layer.length) {
      next.push(crypto.createHash("sha256").update(Buffer.concat([layer[i], layer[i+1]])).digest());
    } else {
      next.push(layer[i]);
    }
  }
  layer = next;
}
const computedRoot = layer[0];
```

Compare `computedRoot.toString("hex")` against `trailer.merkle_root_hex`.
**They must match exactly.** A mismatch means at least one entry has been
modified, added, or removed.

### 2.4 Verify the signature

The trailer's `signature_b64` is an Ed25519 signature over canonical JSON
of `trailer` **without** the `signature_b64` field.

```js
const signable = { ...trailer };
delete signable.signature_b64;
const canonicalTrailer = canonical(signable);
const sig = Buffer.from(trailer.signature_b64, "base64");
const ok = crypto.verify(null, Buffer.from(canonicalTrailer, "utf8"), pubKeyPem, sig);
```

A valid signature over a valid Merkle root is proof that ZeniPay produced
the export at `trailer.generated_at` and that no bytes have been altered
since.

### 2.5 (Optional) Per-row Merkle proof verification

If the export includes a `{"merkle_proofs": […]}` line, each proof contains
enough sibling hashes to walk from a single leaf up to the root. Use this
when you want to verify a specific row without re-hashing the full log.

```js
function verifyProof(leafHex, proof, rootHex) {
  let cur = Buffer.from(leafHex, "hex");
  for (const step of proof) {
    const sibling = Buffer.from(step.hash_hex, "hex");
    cur = step.side === "L"
      ? crypto.createHash("sha256").update(Buffer.concat([sibling, cur])).digest()
      : crypto.createHash("sha256").update(Buffer.concat([cur, sibling])).digest();
  }
  return cur.toString("hex") === rootHex;
}
```

## 3. Key rotation

When ZeniPay rotates the signing key, the replaced key stays in our
`zp_audit_keys` table with a `retired_at` timestamp. The retired public
key is also preserved in this repository's git history at
`public/.well-known/audit-signing-key.pub`. If you're verifying an old
export signed with a retired key:

1. Note the `trailer.key_id` (e.g. `zp_audit_v1`).
2. Check this repo's git history for the `public/.well-known/audit-signing-key.pub`
   file at the time the export was generated.
3. Confirm the retired key wasn't revoked out-of-band. If you don't have
   a direct channel with ZeniPay security, treat a retired-key signature
   as provisional pending contact.

Current active key's creation/retirement timestamps are visible by running
the ZeniPay audit export CLI (to be released) or querying the public key
file's header comments.

## 4. Failure modes & what they mean

| Symptom | Likely cause |
|---|---|
| `row_count_declared != row_count_parsed` | Entry line added or removed from the file after export. Reject. |
| `merkle_root_declared != merkle_root_recomputed` | At least one entry's content was modified. Reject. |
| `signature_valid = false` but root matches | Trailer was modified (e.g. window dates) after signing, OR wrong public key. Re-fetch pubkey; if still failing, reject. |
| Parse errors on specific lines | File was truncated or corrupted in transit. Request a fresh export. |
| All checks pass | Export is authentic and complete within its declared window. |

## 5. Reference implementation

The verifier code lives at
[`lib/agents/audit/tamper-verifier.ts`](../../lib/agents/audit/tamper-verifier.ts)
in the ZeniPay repository. It has zero runtime dependencies beyond
`node:crypto` — auditors can vendor it into their own tooling.

The canonical JSON implementation is at
[`lib/agents/audit/merkle-tree.ts`](../../lib/agents/audit/merkle-tree.ts).

## 6. Contact

Security issues: <security@zeniva.ca>
Auditor inquiries: <info@zeniva.ca>
