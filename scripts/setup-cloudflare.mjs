/**
 * Configure Cloudflare for owovo.xyz → GitHub Pages (no ICP).
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — API Token with:
 *     Zone:Zone:Read, Zone:DNS:Edit, Zone:Zone Settings:Edit,
 *     Zone:Cache Rules / rulesets Edit (cache + dynamic redirect)
 *
 * Optional env:
 *   CLOUDFLARE_ZONE_NAME  — default owovo.xyz
 *   GITHUB_PAGES_HOST     — e.g. username.github.io (required)
 *   CF_DRY_RUN=1          — log planned mutations only (GETs still run)
 *   CF_BEST_EFFORT=1      — warn and continue on step failures; exit 0
 *                           (default: accumulate failures → exit 1)
 *
 * Side effects (apply mode):
 *   Upserts proxied CNAME for apex + www; DELETES conflicting A/AAAA/extra
 *   CNAMEs at those names. Sets zone settings, cache rules, www→apex redirect.
 *
 * Usage:
 *   $env:CLOUDFLARE_API_TOKEN="..."
 *   $env:GITHUB_PAGES_HOST="yourname.github.io"
 *   node scripts/setup-cloudflare.mjs
 */

const API = "https://api.cloudflare.com/client/v4";
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "owovo.xyz";
const PAGES_HOST = (process.env.GITHUB_PAGES_HOST || "").replace(/\.$/, "");
const DRY = process.env.CF_DRY_RUN === "1" || process.env.CF_DRY_RUN === "true";
const BEST_EFFORT =
  process.env.CF_BEST_EFFORT === "1" || process.env.CF_BEST_EFFORT === "true";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/** @type {string[]} */
const failures = [];

if (!TOKEN) {
  console.error("Missing CLOUDFLARE_API_TOKEN");
  process.exit(1);
}
if (!PAGES_HOST || !PAGES_HOST.endsWith(".github.io")) {
  console.error(
    'Set GITHUB_PAGES_HOST to your Pages host, e.g. "username.github.io"',
  );
  process.exit(1);
}

class CfApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status: number, codes: number[], path: string, method: string }} detail
   */
  constructor(message, detail) {
    super(message);
    this.name = "CfApiError";
    this.status = detail.status;
    this.codes = detail.codes;
    this.path = detail.path;
    this.method = detail.method;
  }

  /** Entrypoint ruleset missing (create next). */
  get isMissing() {
    if (this.status === 404) return true;
    // Cloudflare: 10000 often "could not route" / not found for ruleset entrypoints
    return this.codes.includes(10000);
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown }} [opts]
 */
async function cf(path, { method = "GET", body } = {}) {
  if (DRY && method !== "GET") {
    console.log(`[dry-run] ${method} ${path}`, body === undefined ? "" : body);
    return null;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const apiErrors = Array.isArray(json.errors) ? json.errors : [];
    const codes = apiErrors
      .map((e) => e.code)
      .filter((c) => typeof c === "number");
    const errs = apiErrors.map((e) => `${e.code}: ${e.message}`).join("; ");
    throw new CfApiError(
      `${method} ${path} → HTTP ${res.status} ${errs || res.statusText}`,
      { status: res.status, codes, path, method },
    );
  }
  return json.result;
}

/** @param {unknown} result @param {string} label */
function asArray(result, label) {
  if (!Array.isArray(result)) {
    throw new Error(`Expected array from ${label}, got ${typeof result}`);
  }
  return result;
}

/** @param {string} msg */
function logOk(msg) {
  console.log(DRY ? `· [dry-run] ${msg}` : `✓ ${msg}`);
}

/**
 * Run a named step: failures are recorded and never abort the remaining plan.
 * Exit code is decided at the end (strict → 1 if any failure; best-effort → 0).
 *
 * @param {string} label
 * @param {() => Promise<void>} fn
 */
async function step(label, fn) {
  try {
    await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${label}: ${msg}`);
    console.warn(`⚠ ${label}: ${msg}`);
  }
}

async function setSetting(zoneId, id, value) {
  await cf(`/zones/${zoneId}/settings/${id}`, {
    method: "PATCH",
    body: { value },
  });
  logOk(`setting ${id}`);
}

/**
 * Plan: one desired CNAME per name; delete every other A/AAAA/CNAME at that name.
 * @param {Array<{ id: string, type: string, name: string, content: string, proxied?: boolean }>} records
 * @param {{ type: string, name: string, content: string, proxied: boolean }} want
 */
function planDnsForName(records, want) {
  const matches = records.filter(
    (r) =>
      r.name === want.name &&
      (r.type === "CNAME" || r.type === "A" || r.type === "AAAA"),
  );
  const existingCname = matches.find((r) => r.type === "CNAME");
  /** @type {{ kind: "create" | "update" | "ok", record?: typeof existingCname }} */
  let upsert = { kind: "create" };
  if (existingCname) {
    const content = existingCname.content.replace(/\.$/, "");
    const same =
      content === want.content && existingCname.proxied === want.proxied;
    upsert = same
      ? { kind: "ok", record: existingCname }
      : { kind: "update", record: existingCname };
  }
  const remove = matches.filter((r) => {
    if (
      upsert.kind !== "create" &&
      upsert.record &&
      r.id === upsert.record.id
    ) {
      return false;
    }
    return true;
  });
  return { want, upsert, remove };
}

async function ensureDns(zoneId) {
  const records = asArray(
    await cf(`/zones/${zoneId}/dns_records?per_page=100`),
    "dns_records",
  );

  /** @type {{ type: string, name: string, content: string, proxied: boolean }[]} */
  const desired = [
    {
      type: "CNAME",
      name: ZONE_NAME,
      content: PAGES_HOST,
      proxied: true,
    },
    {
      type: "CNAME",
      name: `www.${ZONE_NAME}`,
      content: ZONE_NAME,
      proxied: true,
    },
  ];

  for (const want of desired) {
    const plan = planDnsForName(records, want);
    const body = {
      type: "CNAME",
      name: want.name,
      content: want.content,
      proxied: want.proxied,
      ttl: 1,
    };

    if (plan.upsert.kind === "ok") {
      console.log(`· DNS ok ${want.name}`);
    } else if (plan.upsert.kind === "update" && plan.upsert.record) {
      await cf(`/zones/${zoneId}/dns_records/${plan.upsert.record.id}`, {
        method: "PATCH",
        body,
      });
      logOk(`DNS updated CNAME ${want.name} → ${want.content} (proxied)`);
    } else {
      await cf(`/zones/${zoneId}/dns_records`, { method: "POST", body });
      logOk(`DNS created CNAME ${want.name} → ${want.content} (proxied)`);
    }

    for (const r of plan.remove) {
      await cf(`/zones/${zoneId}/dns_records/${r.id}`, { method: "DELETE" });
      logOk(`DNS deleted conflict ${r.type} ${r.name} (${r.content})`);
    }
  }
}

/**
 * Upsert our rules at the phase entrypoint; keep foreign rules.
 * Our rules are placed first (static cache must precede broad HTML matchers).
 *
 * @param {string} zoneId
 * @param {string} phase
 * @param {object[]} rules  each must have unique `ref`
 * @param {string} label
 */
async function ensurePhaseRules(zoneId, phase, rules, label) {
  const ourRefs = new Set(rules.map((r) => r.ref));

  let entry = null;
  try {
    entry = await cf(`/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`);
  } catch (e) {
    if (e instanceof CfApiError && e.isMissing) {
      entry = null;
    } else {
      throw e;
    }
  }

  if (entry?.id) {
    const existing = Array.isArray(entry.rules) ? entry.rules : [];
    const kept = existing.filter((r) => !ourRefs.has(r.ref));
    await cf(`/zones/${zoneId}/rulesets/${entry.id}`, {
      method: "PUT",
      body: { rules: [...rules, ...kept] },
    });
    logOk(`${label} updated (entrypoint)`);
    return;
  }

  await cf(`/zones/${zoneId}/rulesets`, {
    method: "POST",
    body: {
      name: "default",
      kind: "zone",
      phase,
      rules,
    },
  });
  logOk(`${label} created`);
}

function cacheRules() {
  // Static paths first: HTML rule matches trailing "/" and would catch /css/ etc.
  const staticExpr = `(http.host eq "${ZONE_NAME}" and (starts_with(http.request.uri.path, "/css/") or starts_with(http.request.uri.path, "/js/") or starts_with(http.request.uri.path, "/fonts/") or starts_with(http.request.uri.path, "/icons/") or starts_with(http.request.uri.path, "/images/") or starts_with(http.request.uri.path, "/pagefind/") or starts_with(http.request.uri.path, "/love/")))`;

  const htmlExpr = `(http.host eq "${ZONE_NAME}" and (http.request.uri.path eq "/" or ends_with(http.request.uri.path, "/") or ends_with(http.request.uri.path, ".html")))`;

  return [
    {
      ref: "owovo_static_long_cache",
      description: "owovo static long cache",
      expression: staticExpr,
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "override_origin", default: 2592000 },
        browser_ttl: { mode: "override_origin", default: 86400 },
      },
      enabled: true,
    },
    {
      ref: "owovo_html_short_cache",
      description: "owovo html short cache",
      expression: htmlExpr,
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "override_origin", default: 7200 },
        browser_ttl: { mode: "respect_origin" },
      },
      enabled: true,
    },
  ];
}

function redirectRules() {
  return [
    {
      ref: "owovo_www_to_apex",
      description: "www → apex 301",
      expression: `http.host eq "www.${ZONE_NAME}"`,
      action: "redirect",
      action_parameters: {
        from_value: {
          status_code: 301,
          target_url: {
            expression: `concat("https://${ZONE_NAME}", http.request.uri.path)`,
          },
          preserve_query_string: true,
        },
      },
      enabled: true,
    },
  ];
}

/** Zone settings: SRI-safe (no rocket loader / email rewrite). Auto Minify is retired. */
const ZONE_SETTINGS = [
  ["ssl", "full"],
  ["always_use_https", "on"],
  ["min_tls_version", "1.2"],
  ["tls_1_3", "on"],
  ["automatic_https_rewrites", "on"],
  ["brotli", "on"],
  ["http3", "on"],
  ["0rtt", "on"],
  ["rocket_loader", "off"],
  ["email_obfuscation", "off"],
  ["server_side_exclude", "off"],
];

async function main() {
  console.log(`Zone: ${ZONE_NAME}`);
  console.log(`Pages origin: ${PAGES_HOST}`);
  console.log(
    DRY
      ? "Mode: DRY RUN"
      : BEST_EFFORT
        ? "Mode: APPLY (best-effort)"
        : "Mode: APPLY (strict)",
  );
  console.log(
    "Note: will upsert apex/www CNAME and delete conflicting A/AAAA/extra CNAMEs at those names.",
  );

  const zones = asArray(
    await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`),
    "zones",
  );
  const zone = zones[0];
  if (!zone?.id) {
    console.error(
      `Zone ${ZONE_NAME} not found. Add the site in Cloudflare and wait until Active, then re-run.`,
    );
    process.exit(1);
  }
  if (zone.status !== "active") {
    console.warn(
      `⚠ Zone status is "${zone.status}" (want active). DNS at registrar may still be switching NS.`,
    );
  }
  console.log(`✓ zone id ${zone.id} status=${zone.status}`);

  await step("dns", () => ensureDns(zone.id));

  for (const [id, value] of ZONE_SETTINGS) {
    await step(`setting:${id}`, () => setSetting(zone.id, id, value));
  }

  await step("cache-rules", () =>
    ensurePhaseRules(
      zone.id,
      "http_request_cache_settings",
      cacheRules(),
      "cache rules",
    ),
  );
  await step("redirect-www", () =>
    ensurePhaseRules(
      zone.id,
      "http_request_dynamic_redirect",
      redirectRules(),
      "www → apex redirect",
    ),
  );

  if (failures.length) {
    console.error(`\nFailed (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    if (BEST_EFFORT) {
      console.warn("Finished with failures (CF_BEST_EFFORT=1); exit 0.");
    } else {
      console.error(
        "Strict mode: exit 1. Re-run after fixing token/permissions.",
      );
      console.error(
        "Or set CF_BEST_EFFORT=1 to continue despite step failures.",
      );
    }
  } else {
    console.log("\nDone.");
  }

  console.log("Next (manual on GitHub):");
  console.log(`  1. Merge static/CNAME (${ZONE_NAME}) and deploy Pages`);
  console.log(`  2. Settings → Pages → Custom domain → ${ZONE_NAME}`);
  console.log("  3. Enforce HTTPS");
  console.log(
    "  4. If DNS check fails: grey-cloud apex CNAME, recheck, then proxied again",
  );
  console.log(`  5. curl -sI https://${ZONE_NAME} | findstr /i cf-ray`);

  if (failures.length && !BEST_EFFORT) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
