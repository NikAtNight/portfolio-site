// Live GitHub contribution graph, recolored to the site's gold ramp.
// Edge-cached for a day; falls back to the deployed static snapshot if upstream is down.
const UPSTREAM = "https://ghchart.rshah.org/4da3ff/NikAtNight";

function recolor(svg) {
  // first #EEEEEE fill is the background rect
  svg = svg.replace("fill:#EEEEEE", "fill:none");
  return svg
    .replaceAll("fill:#EEEEEE", "fill:#1a2434") // zero-contribution days
    .replaceAll("fill:#9af0ff", "fill:#554320") // low
    .replaceAll("fill:#80d6ff", "fill:#86682c") // mid
    .replaceAll("fill:#4da3ff", "fill:#b8923f") // high
    .replaceAll("fill:#3e82cc", "fill:#d9b45b") // max = site gold
    .replaceAll("fill:#767676", "fill:#6d829e"); // month/day labels
}

export async function onRequest(context) {
  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached) return cached;

  let body;
  try {
    const up = await fetch(UPSTREAM, {
      headers: { "User-Agent": "nikhilkapadia.pages.dev" },
    });
    if (!up.ok) throw new Error("upstream " + up.status);
    body = recolor(await up.text());
  } catch {
    // serve the committed static snapshot instead
    return context.env.ASSETS.fetch(context.request);
  }

  const res = new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
  context.waitUntil(cache.put(context.request, res.clone()));
  return res;
}
