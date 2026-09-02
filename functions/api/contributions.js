// The static SVG must remain usable when GitHub is unavailable.
const CACHE_VERSION = "1";
const UPSTREAM = "https://github.com/users/NikAtNight/contributions";

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])
  );
}

export function parseContributions(html) {
  const tooltips = new Map(
    [...html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)].map(([, raw, text]) => {
      const { for: componentId } = attributes(raw);
      return [componentId, text.replace(/<[^>]*>/g, "").trim()];
    })
  );

  const days = [...html.matchAll(/<td\b[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"[^>]*>/g)]
    .map(match => {
      const { id, "data-date": date, "data-level": level } = attributes(match[0]);
      const tooltip = tooltips.get(id);
      const count = tooltip?.match(/^(\d+) contributions?\b/);
      if (!/^contribution-day-component-\d+-\d+$/.test(id || "") || !date || !/^[0-4]$/.test(level || "") ||
          (!count && !/^No contributions\b/.test(tooltip || ""))) {
        throw new Error("Unexpected GitHub contributions markup");
      }
      return { date, count: Number(count?.[1] || 0), level: Number(level) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) throw new Error("GitHub returned no contribution days");
  return days;
}

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(`/api/contributions?v=${CACHE_VERSION}`, context.request.url));
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let days;
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: { "User-Agent": "nikhilkapadia.pages.dev" },
    });
    if (!upstream.ok) throw new Error(`GitHub returned ${upstream.status}`);
    days = parseContributions(await upstream.text());
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const total = days.reduce((sum, day) => sum + day.count, 0);
  const response = new Response(JSON.stringify({ ok: true, total, days }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
