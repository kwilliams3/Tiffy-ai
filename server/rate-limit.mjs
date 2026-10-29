// In-memory limits are per process. Use Vercel WAF for enforcement across instances.
export function createRateLimiter({ requests = 8, windowMs = 60_000, perClientConcurrent = 2, globalConcurrent = 6, maxClients = 10_000, now = Date.now } = {}) {
  const clients = new Map();
  let running = 0, sweepAt = 0;
  return {
    acquire(key) {
      const time = now();
      if (time >= sweepAt) {
        for (const [id, record] of clients) if (!record.running && (!record.times.length || record.times.at(-1) <= time - windowMs)) clients.delete(id);
        sweepAt = time + windowMs;
      }
      const record = clients.get(key) || { times: [], running: 0 };
      record.times = record.times.filter(t => t > time - windowMs);
      if (record.times.length >= requests) return { allowed: false, retryAfter: Math.max(1, Math.ceil((record.times[0] + windowMs - time) / 1000)) };
      if (record.running >= perClientConcurrent || running >= globalConcurrent || (!clients.has(key) && clients.size >= maxClients)) return { allowed: false, retryAfter: 5 };
      clients.set(key, record);
      record.times.push(time);
      record.running++;
      running++;
      let released = false;
      return { allowed: true, release() { if (!released) { released = true; record.running--; running--; } } };
    },
  };
}

export function clientAddress(req, trustedVercel = process.env.VERCEL === "1") {
  const forwarded = trustedVercel && req.headers["x-vercel-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
}
