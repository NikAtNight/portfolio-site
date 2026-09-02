// Live GitHub contribution graph, recolored to the site's gold ramp.
// Edge-cached for a day; falls back to the deployed static snapshot if upstream is down.
const UPSTREAM = "https://ghchart.rshah.org/4da3ff/NikAtNight";

// Bumping this drops the edge-cached copy so a restyle shows up right away
// instead of after the day-long cache expires.
const CACHE_VERSION = "2";

function recolor(svg) {
  // first #EEEEEE fill is the background rect
  svg = svg.replace("fill:#EEEEEE", "fill:none");
  return svg
    // Empty days sit just above the panel colour so the grid recedes and
    // only activity reads, which is what makes GitHub's own graph easy on
    // the eye.
    .replaceAll("fill:#EEEEEE", "fill:#111a2a") // zero-contribution days
    .replaceAll("fill:#9af0ff", "fill:#5f4c22") // low
    .replaceAll("fill:#80d6ff", "fill:#8b6b2d") // mid
    .replaceAll("fill:#4da3ff", "fill:#b8923f") // high
    .replaceAll("fill:#3e82cc", "fill:#d9b45b") // max = site gold
    .replaceAll("fill:#767676", "fill:#6d829e"); // month/day labels
}

// Upstream draws 10px squares on a 12px pitch with square, crisp edges.
// Shrink each day to 9px, centre it in its cell, round the corners so the
// gaps read as gaps, and give each day a title so the page can show the
// count on hover.
function reshape(svg) {
  return svg.replace(
    /<rect ([^>]*?)x="([\d.]+)" y="([\d.]+)" width="10" height="10"\/>/g,
    (match, attrs, x, y) => {
      const count = Number((attrs.match(/data-count="(\d+)"/) || [])[1] ?? (attrs.match(/data-score="(\d+)"/) || [])[1] ?? 0);
      const date = (attrs.match(/data-date="([^"]+)"/) || [])[1] ?? "";
      const cleaned = attrs.replace("shape-rendering:crispedges;", "");
      return `<rect ${cleaned}x="${Number(x) + 0.5}" y="${Number(y) + 0.5}" width="9" height="9" rx="2"><title>${count} on ${date}</title></rect>`;
    }
  );
}

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(`/ghchart.svg?v=${CACHE_VERSION}`, context.request.url));
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let body;
  try {
    const up = await fetch(UPSTREAM, {
      headers: { "User-Agent": "nikhilkapadia.pages.dev" },
    });
    if (!up.ok) throw new Error("upstream " + up.status);
    body = reshape(recolor(await up.text()));
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
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
