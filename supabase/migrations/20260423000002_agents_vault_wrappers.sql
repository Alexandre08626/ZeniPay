-- SECURITY DEFINER wrappers over vault.create_secret / vault.decrypted_secrets.
-- The `vault` schema is not exposed to PostgREST on our Supabase project, so
-- supabase-js cannot call `schema("vault").rpc("create_secret", …)` directly
-- (it errors with "Invalid schema: vault"). These wrappers expose the same
-- operations under the `agents` namespace, which IS exposed.
--
-- Used by:
--   - scripts/bootstrap-audit-signing-key.ts (PR 5 — insert seed, one-shot)
--   - lib/agents/audit/ed25519-signer.ts (PR 5 — read seed at sign time)
--   - lib/agents/approvals/vault-secrets.ts (PR 3 — TOTP enroll + verify, same fix)

CREATE OR REPLACE FUNCTION agents.vault_create_secret(
  p_secret      TEXT,
  p_name        TEXT,
  p_description TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_id UUID;
BEGIN
  SELECT vault.create_secret(p_secret, p_name, p_description) INTO new_id;
  RETURN new_id::text;
END;
$$;

CREATE OR REPLACE FUNCTION agents.vault_read_secret(
  p_vault_secret_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  plaintext TEXT;
BEGIN
  SELECT decrypted_secret INTO plaintext
    FROM vault.decrypted_secrets
   WHERE id = p_vault_secret_id::uuid;
  RETURN plaintext;
END;
$$;

REVOKE ALL ON FUNCTION agents.vault_create_secret(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION agents.vault_read_secret(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION agents.vault_create_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT  EXECUTE ON FUNCTION agents.vault_read_secret(TEXT)               TO service_role;

-- PR 4 + PR 5 added new tables to the `agents` schema. The initial migration
-- granted SELECT/ALL on all EXISTING tables at that time, but GRANTs don't
-- auto-propagate to future tables. Re-run the block so the service_role
-- client can read/write zp_audit_keys + audit_export_runs + export_url_nonces.
GRANT SELECT ON ALL TABLES IN SCHEMA agents TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA agents TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA agents TO service_role;
