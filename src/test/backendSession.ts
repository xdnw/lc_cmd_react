type CookieAttributes = {
  maxAge?: number;
  expires?: number;
};

type CookieRecord = {
  value: string;
  attributes: CookieAttributes;
};

type CookieStore = Map<string, CookieRecord>;

type FetchWithCookieJar = typeof fetch & {
  __lcCookieJarInstalled?: boolean;
};

const API_BASE_URL = `${process.env.API_URL ?? ""}`;
const cookieStore: CookieStore = new Map();

function parseSetCookieHeader(setCookie: string): { name: string; value: string; attributes: CookieAttributes } | null {
  const parts = setCookie.split(";").map((part) => part.trim()).filter(Boolean);
  const [nameValue, ...attributeParts] = parts;
  if (!nameValue) return null;

  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) return null;

  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1).trim();
  const attributes: CookieAttributes = {};

  for (const attributePart of attributeParts) {
    const [rawKey, rawValue] = attributePart.split("=");
    const key = rawKey.trim().toLowerCase();
    const parsedValue = rawValue?.trim();

    if (key === "max-age" && parsedValue) {
      const maxAge = Number(parsedValue);
      if (Number.isFinite(maxAge)) {
        attributes.maxAge = maxAge;
      }
      continue;
    }

    if (key === "expires" && parsedValue) {
      const expires = Date.parse(parsedValue);
      if (Number.isFinite(expires)) {
        attributes.expires = expires;
      }
    }
  }

  return { name, value, attributes };
}

function getSetCookieHeaders(headers: Headers): string[] {
  const augmentedHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof augmentedHeaders.getSetCookie === "function") {
    return augmentedHeaders.getSetCookie();
  }

  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}

function isExpired(record: CookieRecord): boolean {
  if (record.attributes.maxAge != null && record.attributes.maxAge <= 0) {
    return true;
  }

  if (record.attributes.expires != null && record.attributes.expires <= Date.now()) {
    return true;
  }

  return false;
}

function buildCookieHeader(): string {
  const pairs: string[] = [];

  for (const [name, record] of cookieStore.entries()) {
    if (isExpired(record)) {
      cookieStore.delete(name);
      continue;
    }

    pairs.push(`${name}=${record.value}`);
  }

  return pairs.join("; ");
}

function storeCookiesFromResponse(response: Response): void {
  for (const setCookie of getSetCookieHeaders(response.headers)) {
    const parsed = parseSetCookieHeader(setCookie);
    if (!parsed) continue;

    if (parsed.attributes.maxAge === 0) {
      cookieStore.delete(parsed.name);
      continue;
    }

    cookieStore.set(parsed.name, {
      value: parsed.value,
      attributes: parsed.attributes,
    });
  }
}

function readOptionalProcessEnv(name: string): string | undefined {
  const env = (process as unknown as { env?: Record<string, unknown> }).env;
  const value = env?.[name];
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || undefined;
}

async function postForm(path: string, form: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams(form).toString();
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/msgpack, application/json;q=0.9, */*;q=0.8",
    },
    body,
  });
}

async function ensureOk(response: Response, step: string): Promise<void> {
  if (response.ok) return;

  const responseBody = await response.text().catch(() => "");
  const suffix = responseBody ? `\n${responseBody}` : "";
  throw new Error(`${step} failed: ${response.status} ${response.statusText}${suffix}`);
}

export function clearBackendSessionCookies(): void {
  cookieStore.clear();
}

export function installBackendSessionCookieJar(): void {
  const currentFetch = globalThis.fetch as FetchWithCookieJar;
  if (currentFetch.__lcCookieJarInstalled) {
    return;
  }

  const originalFetch = currentFetch;
  const wrappedFetch: FetchWithCookieJar = async (input, init) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    const cookieHeader = buildCookieHeader();

    if (cookieHeader && !headers.has("cookie")) {
      headers.set("cookie", cookieHeader);
    }

    const response = await originalFetch(request, {
      headers,
    });

    storeCookiesFromResponse(response);
    return response;
  };

  wrappedFetch.__lcCookieJarInstalled = true;
  globalThis.fetch = wrappedFetch;
}

export function readBackendSessionEnv(): { token?: string; guildId?: string } {
  return {
    token: readOptionalProcessEnv("LC_TEST_AUTH_TOKEN") ?? readOptionalProcessEnv("TEST_AUTH_TOKEN"),
    guildId: readOptionalProcessEnv("LC_TEST_GUILD_ID") ?? readOptionalProcessEnv("TEST_GUILD_ID"),
  };
}

export async function bootstrapBackendSessionFromEnv(): Promise<void> {
  if (!API_BASE_URL) {
    console.warn("[tests] Skipping backend auth bootstrap because API_URL is not configured.");
    return;
  }

  installBackendSessionCookieJar();

  const { token, guildId } = readBackendSessionEnv();
  if (!token && !guildId) {
    console.info("[tests] Running input examples against anonymous backend session.");
    return;
  }

  if (!token) {
    throw new Error("LC_TEST_GUILD_ID/TEST_GUILD_ID was provided without LC_TEST_AUTH_TOKEN/TEST_AUTH_TOKEN.");
  }

  clearBackendSessionCookies();

  const authResponse = await postForm("set_token", { token });
  await ensureOk(authResponse, "set_token");

  if (guildId) {
    const guildResponse = await postForm("set_guild", { guild: guildId });
    await ensureOk(guildResponse, "set_guild");
  }

  console.info(`[tests] Bootstrapped backend session${guildId ? ` with guild ${guildId}` : ""}.`);
}
