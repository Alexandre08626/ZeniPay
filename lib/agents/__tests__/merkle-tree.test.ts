// Merkle tree unit tests — correctness + security edge cases.
//
// Leaf-swap MUST change the root (the whole point of a Merkle tree).
// Odd-count must promote the unpaired node unchanged (no duplication).

import { describe, it, expect } from "vitest";
import { hashLeaf, buildTree, buildProof, verifyProof, buildAllProofs } from "../audit/merkle-tree";
import type { AuditEntry } from "../audit/types";

function entry(i: number): AuditEntry {
  return {
    id: `aud_${String(i).padStart(6, "0")}`,
    organization_id: "org_test",
    actor_type: "system",
    actor_id: null,
    event_type: "test.event",
    payload: { i, note: `row-${i}` },
    created_at: new Date(1_700_000_000_000 + i * 1000).toISOString(),
  };
}

describe("merkle-tree", () => {
  it("matches known vector for a 1-entry tree (root = leaf hash)", () => {
    const e = entry(1);
    const leaf = hashLeaf(e);
    const { root } = buildTree([leaf]);
    expect(root.toString("hex")).toBe(leaf.toString("hex"));
  });

  it("4-entry tree balances cleanly", () => {
    const entries = [entry(1), entry(2), entry(3), entry(4)];
    const leaves = entries.map(hashLeaf);
    const { root, layers } = buildTree(leaves);
    expect(layers.length).toBe(3);
    expect(root).toBeDefined();
    // Verify every proof round-trips.
    for (let i = 0; i < 4; i++) {
      const proof = buildProof(layers, i);
      expect(verifyProof(leaves[i].toString("hex"), proof, root.toString("hex"))).toBe(true);
    }
  });

  it("odd count: 3-entry tree promotes the last node unchanged", () => {
    const leaves = [entry(1), entry(2), entry(3)].map(hashLeaf);
    const { root, layers } = buildTree(leaves);
    // layer 0: [l0, l1, l2], layer 1: [hash(l0|l1), l2], layer 2: [hash(h01|l2)]
    expect(layers[1].length).toBe(2);
    expect(layers[1][1].equals(leaves[2])).toBe(true);
    expect(verifyProof(leaves[2].toString("hex"), buildProof(layers, 2), root.toString("hex"))).toBe(true);
  });

  it("leaf-swap detection — any modification changes the root", () => {
    const original = [entry(1), entry(2), entry(3), entry(4)].map(hashLeaf);
    const { root: root0 } = buildTree(original);
    const tampered = original.slice();
    [tampered[0], tampered[3]] = [tampered[3], tampered[0]];
    const { root: root1 } = buildTree(tampered);
    expect(root0.toString("hex")).not.toBe(root1.toString("hex"));
  });

  it("payload mutation changes the leaf hash, hence the root", () => {
    const e = entry(1);
    const mutated = { ...e, payload: { ...e.payload, note: "tampered" } };
    expect(hashLeaf(e).toString("hex")).not.toBe(hashLeaf(mutated).toString("hex"));
  });

  it("10K-entry tree — proof verification stays correct + reasonably fast", () => {
    const entries = Array.from({ length: 10_000 }, (_, i) => entry(i));
    const leaves = entries.map(hashLeaf);
    const { root, layers } = buildTree(leaves);
    // Verify 5 random proofs.
    const picks = [0, 1, 999, 5000, 9999];
    for (const i of picks) {
      const proof = buildProof(layers, i);
      expect(verifyProof(leaves[i].toString("hex"), proof, root.toString("hex"))).toBe(true);
    }
  });

  it("empty tree returns a deterministic sentinel root", () => {
    const { root } = buildTree([]);
    expect(root.toString("hex")).toMatch(/^[0-9a-f]{64}$/);
    // Same root twice = deterministic
    const { root: again } = buildTree([]);
    expect(root.toString("hex")).toBe(again.toString("hex"));
  });

  it("buildAllProofs produces one proof per entry with correct row_index", () => {
    const entries = [entry(1), entry(2), entry(3)];
    const leaves = entries.map(hashLeaf);
    const { layers } = buildTree(leaves);
    const proofs = buildAllProofs(entries, leaves, layers);
    expect(proofs.length).toBe(3);
    expect(proofs[0].row_index).toBe(0);
    expect(proofs[2].row_index).toBe(2);
    expect(proofs[1].entry_id).toBe(entries[1].id);
  });
});
