-- Additive BIM tables only. Run explicitly, never as part of a website build.
CREATE TABLE IF NOT EXISTS bim_releases (
  version text PRIMARY KEY, archive bytea NOT NULL CHECK (octet_length(archive) BETWEEN 1 AND 4000000),
  sha256 text NOT NULL, features text[] NOT NULL, runtime_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bim_orders (
  id uuid PRIMARY KEY, product_id text NOT NULL, price_id text NOT NULL, features text[] NOT NULL, amount integer NOT NULL CHECK(amount > 0),
  currency text NOT NULL DEFAULT 'usd', receipt_hash text NOT NULL, session_id text UNIQUE,
  livemode boolean NOT NULL, release_version text NOT NULL REFERENCES bim_releases(version),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','revoked')),
  email text, payment_intent text UNIQUE, key_hash text UNIQUE, key_cipher text,
  machine_limit integer NOT NULL DEFAULT 2 CHECK(machine_limit BETWEEN 1 AND 10), terms_version text NOT NULL DEFAULT '2026-09-03',
  created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
CREATE TABLE IF NOT EXISTS bim_activations (
  order_id uuid NOT NULL REFERENCES bim_orders(id), machine_hash text NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(order_id,machine_hash)
);
CREATE TABLE IF NOT EXISTS bim_revocations (
  payment_intent text PRIMARY KEY, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bim_rate_limits (
  bucket text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE OR REPLACE FUNCTION bim_activate(p_key_hash text,p_machine_hash text,p_feature text,p_live boolean)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE lic bim_orders; used integer;
BEGIN
  SELECT * INTO lic FROM bim_orders WHERE key_hash=p_key_hash FOR UPDATE;
  IF NOT FOUND OR lic.status <> 'paid' OR lic.livemode <> p_live THEN RETURN 'invalid_license'; END IF;
  IF NOT p_feature=ANY(lic.features) THEN RETURN 'not_entitled'; END IF;
  IF EXISTS(SELECT 1 FROM bim_activations WHERE order_id=lic.id AND machine_hash=p_machine_hash) THEN
    UPDATE bim_activations SET last_seen_at=now() WHERE order_id=lic.id AND machine_hash=p_machine_hash;
    RETURN 'active';
  END IF;
  SELECT count(*) INTO used FROM bim_activations WHERE order_id=lic.id;
  IF used >= lic.machine_limit THEN RETURN 'activation_limit'; END IF;
  INSERT INTO bim_activations(order_id,machine_hash) VALUES(lic.id,p_machine_hash);
  RETURN 'active';
END; $$;
-- No browser database role may read purchase data, keys, or private release bytes.
REVOKE ALL ON bim_releases,bim_orders,bim_activations,bim_revocations,bim_rate_limits FROM PUBLIC;
REVOKE ALL ON FUNCTION bim_activate(text,text,text,boolean) FROM PUBLIC;
