const supabaseUrl = mustGet("SUPABASE_URL").replace(/\/+$/, "");
const supabaseKey =
  process.env.SUPABASE_API_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const tableName = process.env.SUPABASE_KEEPALIVE_TABLE || "";
const bucketName = process.env.SUPABASE_KEEPALIVE_BUCKET || "";
const objectPath = process.env.SUPABASE_KEEPALIVE_OBJECT || "";
const externalUrls = collectUrls(
  "https://sdet-study-playground.dheeraj474.workers.dev/",
  process.env.STREAMLIT_KEEPALIVE_URL,
  process.env.KEEPALIVE_URLS,
);

const headers = supabaseKey ? buildSupabaseHeaders(supabaseKey) : {};
const checks = [];

if (tableName) {
  checks.push({
    name: `table:${tableName}`,
    url: `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}?select=*&limit=1`,
    options: { headers },
  });
}

if (bucketName && objectPath) {
  const cleanPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  checks.push({
    name: `storage:${bucketName}/${objectPath}`,
    url: `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucketName)}/${cleanPath}`,
    options: { method: "HEAD", headers },
  });
}

for (const url of externalUrls) {
  checks.push({
    name: `url:${url}`,
    url,
    options: {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "portfolio-keepalive/1.0" },
    },
    allowFetchError: true,
    allowNonServerError: true,
    logWebsiteEvidence: true,
  });
}

if (!checks.length) {
  checks.push({
    name: "project-api",
    url: `${supabaseUrl}/rest/v1/`,
    options: { headers },
    allowClientError: true,
  });
}

for (const check of checks) {
  const startedAt = Date.now();
  let response;

  try {
    response = await fetch(check.url, check.options);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error?.cause?.message || error?.message || "fetch failed";

    if (check.allowFetchError) {
      console.log(`${check.name}: fetch attempted, ${message} in ${elapsedMs}ms`);
      continue;
    }

    throw error;
  }

  const elapsedMs = Date.now() - startedAt;
  const ok =
    response.ok ||
    (check.allowClientError && response.status < 500) ||
    (check.allowNonServerError && response.status < 500);

  console.log(`${check.name}: HTTP ${response.status} in ${elapsedMs}ms`);

  if (check.logWebsiteEvidence) {
    await logWebsiteEvidence(check, response);
  }

  if (!ok) {
    const body = await safeBody(response);
    throw new Error(`${check.name} failed with HTTP ${response.status}${body ? `: ${body}` : ""}`);
  }
}

function buildSupabaseHeaders(key) {
  const headers = { apikey: key };

  if (!key.startsWith("sb_publishable_") && !key.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function collectUrls(...values) {
  return values
    .flatMap((value) => (value || "").split(/[\n,]/))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function logWebsiteEvidence(check, response) {
  const location = response.headers.get("location");
  if (location) {
    console.log(`${check.name}: redirects to ${new URL(location, check.url).href}`);
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    console.log(`${check.name}: content-type ${contentType || "unknown"}`);
    return;
  }

  const body = await safeBody(response, 5000);
  const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  console.log(`${check.name}: title ${title || "not found"}`);
}

function mustGet(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function safeBody(response, maxLength = 500) {
  try {
    return (await response.text()).slice(0, maxLength);
  } catch {
    return "";
  }
}
