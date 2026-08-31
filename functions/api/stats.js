// Live yearly contribution count for the commit log header. Edge-cached for a day.
export async function onRequest(context) {
  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached) return cached;

  let count = null;
  try {
    const up = await fetch("https://github.com/users/NikAtNight/contributions", {
      headers: { "User-Agent": "nikhilkapadia.pages.dev" },
    });
    const html = await up.text();
    const m = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
    if (m) {
      count = m[1];
    } else {
      // fallback: sum the per-day tooltips
      const days = [...html.matchAll(/(\d+) contributions? on/g)]
        .reduce((sum, d) => sum + Number(d[1]), 0);
      if (days > 0) count = days.toLocaleString("en-US");
    }
  } catch {}

  if (!count) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = new Response(JSON.stringify({ ok: true, contributions: count }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
  context.waitUntil(cache.put(context.request, res.clone()));
  return res;
}
