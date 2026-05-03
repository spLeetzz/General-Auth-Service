// vercel routing

export default async function middleware(req) {
  const url = new URL(req.url);
  const target = `${process.env.VPS_HOST}${url.pathname}${url.search}`;

  return fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
  });
}

export const config = {
  matcher: "/(.*)",
};
