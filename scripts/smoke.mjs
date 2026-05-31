/**
 * Smoke test HTTP do app rodando (não precisa de browser).
 * Uso:
 *   BASE_URL=https://better-control.vercel.app \
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.mjs
 *
 * Sem SMOKE_EMAIL, roda só os checks públicos (login 200, rota protegida redireciona).
 */
const BASE = process.env.BASE_URL || "https://better-control.vercel.app";
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

let cookies = {};
function cookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) cookies[pair.slice(0, i)] = pair.slice(i + 1);
  }
}

let failures = 0;
function check(name, cond, detail = "") {
  const ok = !!cond;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

async function get(path, redirect = "manual") {
  const res = await fetch(`${BASE}${path}`, {
    redirect,
    headers: cookies && Object.keys(cookies).length ? { cookie: cookieHeader() } : {},
  });
  storeCookies(res);
  return res;
}

async function main() {
  console.log(`Smoke @ ${BASE}`);

  check("GET /login => 200", (await get("/login")).status === 200);

  const dash = await get("/dashboard");
  check("GET /dashboard sem login redireciona", [302, 303, 307].includes(dash.status), `status ${dash.status}`);

  if (EMAIL && PASSWORD) {
    const csrfRes = await get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    const body = new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${BASE}/dashboard` });
    const login = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
      body,
    });
    storeCookies(login);
    check("login criou sessão", !!cookies["authjs.session-token"] || !!cookies["__Secure-authjs.session-token"]);

    check("GET /dashboard logado => 200", (await get("/dashboard", "follow")).status === 200);
    check("GET /tasks logado => 200", (await get("/tasks", "follow")).status === 200);
  } else {
    console.log("(sem SMOKE_EMAIL/SMOKE_PASSWORD — pulando checks autenticados)");
  }

  console.log(failures === 0 ? "\nSMOKE OK" : `\nSMOKE FALHOU (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no smoke:", e);
  process.exit(1);
});
