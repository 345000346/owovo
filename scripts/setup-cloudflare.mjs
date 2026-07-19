/**
 * Configure Cloudflare for owovo.xyz → GitHub Pages (no ICP).
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — API Token with:
 *     Zone:Zone:Read, Zone:DNS:Edit, Zone:Zone Settings:Edit,
 *     Zone:Cache Rules:Edit (or Account-level equivalent for rulesets)
 *
 * Optional env:
 *   CLOUDFLARE_ZONE_NAME  — default owovo.xyz
 *   GITHUB_PAGES_HOST     — e.g. ligtman.github.io (required if not set)
 *   CF_DRY_RUN=1          — print planned changes only
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
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

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

async function cf(path, { method = "GET", body } = {}) {
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
    const errs = (json.errors || [])
      .map((e) => `${e.code}: ${e.message}`)
      .join("; ");
    throw new Error(
      `${method} ${path} → HTTP ${res.status} ${errs || res.statusText}`,
    );
  }
  return json.result;
}

async function setSetting(zoneId, id, value) {
  if (DRY) {
    console.log(`[dry-run] setting ${id} =`, value);
    return;
  }
  try {
    await cf(`/zones/${zoneId}/settings/${id}`, {
      method: "PATCH",
      body: { value },
    });
    console.log(`✓ setting ${id}`);
  } catch (e) {
    console.warn(`⚠ setting ${id}: ${e.message}`);
  }
}

async function ensureDns(zoneId) {
  const records = await cf(`/zones/${zoneId}/dns_records?per_page=100`);
  const list = Array.isArray(records) ? records : [];

  /** @type {{type:string,name:string,content:string,proxied:boolean}[]} */
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
    const matches = list.filter(
      (r) =>
        r.name === want.name &&
        (r.type === "CNAME" || r.type === "A" || r.type === "AAAA"),
    );

    // Prefer a single CNAME; remove conflicting A/AAAA/extra CNAMEs after upsert.
    const existingCname = matches.find((r) => r.type === "CNAME");
    if (existingCname) {
      const needsUpdate =
        existingCname.content.replace(/\.$/, "") !== want.content ||
        existingCname.proxied !== want.proxied;
      if (needsUpdate) {
        if (DRY) {
          console.log(`[dry-run] update DNS ${want.name}`, want);
        } else {
          await cf(`/zones/${zoneId}/dns_records/${existingCname.id}`, {
            method: "PATCH",
            body: {
              type: "CNAME",
              name: want.name,
              content: want.content,
              proxied: want.proxied,
              ttl: 1,
            },
          });
          console.log(
            `✓ DNS updated ${want.type} ${want.name} → ${want.content} (proxied)`,
          );
        }
      } else {
        console.log(`· DNS ok ${want.name}`);
      }
    } else {
      if (DRY) {
        console.log(`[dry-run] create DNS ${want.name}`, want);
      } else {
        await cf(`/zones/${zoneId}/dns_records`, {
          method: "POST",
          body: {
            type: "CNAME",
            name: want.name,
            content: want.content,
            proxied: want.proxied,
            ttl: 1,
          },
        });
        console.log(
          `✓ DNS created ${want.type} ${want.name} → ${want.content} (proxied)`,
        );
      }
    }

    // Drop A/AAAA (and extra CNAMEs) that fight the apex/www CNAME.
    for (const r of matches) {
      if (r.type === "CNAME" && existingCname && r.id === existingCname.id) {
        continue;
      }
      if (r.type === "CNAME" || r.type === "A" || r.type === "AAAA") {
        if (DRY) {
          console.log(
            `[dry-run] delete conflicting ${r.type} ${r.name} (${r.content})`,
          );
        } else {
          await cf(`/zones/${zoneId}/dns_records/${r.id}`, {
            method: "DELETE",
          });
          console.log(`✓ DNS deleted conflict ${r.type} ${r.name}`);
        }
      }
    }
  }
}

async function ensureCacheRules(zoneId) {
  // Phase: http_request_cache_settings
  const entry = await cf(
    `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`,
  ).catch(async (e) => {
    // Entrypoint may not exist yet — create via PUT after empty ruleset discovery.
    if (
      String(e.message).includes("10000") ||
      String(e.message).includes("not found")
    ) {
      return null;
    }
    // Some accounts return 404 with different shape
    if (String(e.message).includes("404")) return null;
    throw e;
  });

  const staticExpr = `(http.host eq "${ZONE_NAME}" and (starts_with(http.request.uri.path, "/css/") or starts_with(http.request.uri.path, "/js/") or starts_with(http.request.uri.path, "/fonts/") or starts_with(http.request.uri.path, "/icons/") or starts_with(http.request.uri.path, "/images/") or starts_with(http.request.uri.path, "/pagefind/") or starts_with(http.request.uri.path, "/love/")))`;

  const htmlExpr = `(http.host eq "${ZONE_NAME}" and (http.request.uri.path eq "/" or ends_with(http.request.uri.path, "/") or ends_with(http.request.uri.path, ".html")))`;

  const rules = [
    {
      ref: "owovo_static_long_cache",
      description: "owovo static long cache",
      expression: staticExpr,
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: {
          mode: "override_origin",
          default: 2592000, // 30 days
        },
        browser_ttl: {
          mode: "override_origin",
          default: 86400, // 1 day
        },
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
        edge_ttl: {
          mode: "override_origin",
          default: 7200, // 2 hours
        },
        browser_ttl: {
          mode: "respect_origin",
        },
      },
      enabled: true,
    },
  ];

  if (DRY) {
    console.log(
      "[dry-run] cache rulesets entrypoint rules:",
      JSON.stringify(rules, null, 2),
    );
    return;
  }

  if (entry?.id) {
    // Merge: replace our refs, keep other rules
    const existing = entry.rules || [];
    const kept = existing.filter(
      (r) =>
        r.ref !== "owovo_static_long_cache" &&
        r.ref !== "owovo_html_short_cache",
    );
    await cf(`/zones/${zoneId}/rulesets/${entry.id}`, {
      method: "PUT",
      body: {
        rules: [...rules, ...kept],
      },
    });
    console.log("✓ cache rules updated (entrypoint)");
    return;
  }

  // Create phase entrypoint ruleset
  await cf(`/zones/${zoneId}/rulesets`, {
    method: "POST",
    body: {
      name: "default",
      kind: "zone",
      phase: "http_request_cache_settings",
      rules,
    },
  });
  console.log("✓ cache rules created");
}

async function ensureRedirectWww(zoneId) {
  // Dynamic redirect via http_request_dynamic_redirect phase
  let entry;
  try {
    entry = await cf(
      `/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
    );
  } catch {
    entry = null;
  }

  const rule = {
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
  };

  if (DRY) {
    console.log("[dry-run] redirect rule", rule);
    return;
  }

  if (entry?.id) {
    const existing = entry.rules || [];
    const kept = existing.filter((r) => r.ref !== "owovo_www_to_apex");
    await cf(`/zones/${zoneId}/rulesets/${entry.id}`, {
      method: "PUT",
      body: { rules: [rule, ...kept] },
    });
    console.log("✓ www → apex redirect updated");
    return;
  }

  try {
    await cf(`/zones/${zoneId}/rulesets`, {
      method: "POST",
      body: {
        name: "default",
        kind: "zone",
        phase: "http_request_dynamic_redirect",
        rules: [rule],
      },
    });
    console.log("✓ www → apex redirect created");
  } catch (e) {
    console.warn(`⚠ redirect rule (optional): ${e.message}`);
  }
}

async function main() {
  console.log(`Zone: ${ZONE_NAME}`);
  console.log(`Pages origin: ${PAGES_HOST}`);
  console.log(DRY ? "Mode: DRY RUN" : "Mode: APPLY");

  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zone = Array.isArray(zones) ? zones[0] : zones?.[0];
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

  await ensureDns(zone.id);

  // SSL / performance / safety
  await setSetting(zone.id, "ssl", "full");
  await setSetting(zone.id, "always_use_https", "on");
  await setSetting(zone.id, "min_tls_version", "1.2");
  await setSetting(zone.id, "tls_1_3", "on");
  await setSetting(zone.id, "automatic_https_rewrites", "on");
  await setSetting(zone.id, "brotli", "on");
  await setSetting(zone.id, "http3", "on");
  await setSetting(zone.id, "0rtt", "on");
  await setSetting(zone.id, "rocket_loader", "off");
  // Auto Minify can break SRI; prefer off (value shape is object on older API)
  await setSetting(zone.id, "minify", { css: "off", html: "off", js: "off" });
  await setSetting(zone.id, "email_obfuscation", "off");
  await setSetting(zone.id, "server_side_exclude", "off");

  await ensureCacheRules(zone.id);
  await ensureRedirectWww(zone.id);

  console.log("\nDone.");
  console.log("Next (manual on GitHub):");
  console.log(`  1. Merge static/CNAME (${ZONE_NAME}) and deploy Pages`);
  console.log(`  2. Settings → Pages → Custom domain → ${ZONE_NAME}`);
  console.log("  3. Enforce HTTPS");
  console.log(
    "  4. If DNS check fails: grey-cloud apex CNAME, recheck, then proxied again",
  );
  console.log(`  5. curl -sI https://${ZONE_NAME} | findstr /i cf-ray`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
