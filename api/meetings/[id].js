const RETENTION_SECONDS = 60 * 60 * 24 * 90;
const MAX_BODY_BYTES = 24 * 1024;

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(body);
}

async function redis(url, token, path, body) {
  const response = await fetch(url.replace(/\/$/, '') + '/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || 'Storage request failed');
  return result.result;
}

function normalize(body, id) {
  if (!body || typeof body !== 'object' || body.id !== id || typeof body.name !== 'string' || !Array.isArray(body.members)) return null;
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return null;
  return {
    id,
    name: body.name.slice(0, 20),
    date: String(body.date || '').slice(0, 10),
    categories: Array.isArray(body.categories) ? body.categories.slice(0, 3).map(x => String(x).slice(0, 24)) : [],
    members: body.members.slice(0, 20).map((member, index) => ({
      id: String(member && member.id || 'legacy-' + index).slice(0, 100),
      name: String(member && member.name || '친구').slice(0, 12),
      condition: member && member.condition ? {
        from: String(member.condition.from || '').slice(0, 50),
        to: String(member.condition.to || '').slice(0, 50),
        depart: String(member.condition.depart || '').slice(0, 5),
        arrive: String(member.condition.arrive || '').slice(0, 5)
      } : null
    })),
    createdAt: Number(body.createdAt) || Date.now(),
    updatedAt: Number(body.updatedAt) || Date.now(),
    confirmed: Boolean(body.confirmed),
    ...(typeof body.station === 'string' ? { station: body.station.slice(0, 60) } : {})
  };
}

export default async function handler(req, res) {
  const id = String(req.query.id || '');
  if (!/^[a-zA-Z0-9_-]{7,100}$/.test(id)) return send(res, 400, { error: 'Invalid meeting id' });
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return send(res, 405, { error: 'Method not allowed' });
  }
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return send(res, 503, { error: 'Shared storage is not connected yet' });
  const key = 'moyeo:meeting:' + id;
  try {
    if (req.method === 'GET') {
      const value = await redis(url, token, 'GET/' + encodeURIComponent(key));
      if (!value) return send(res, 404, { error: 'Meeting not found' });
      const meeting = typeof value === 'string' ? JSON.parse(value) : value;
      if (!meeting || meeting.id !== id) return send(res, 404, { error: 'Meeting not found' });
      return send(res, 200, meeting);
    }
    const meeting = normalize(req.body, id);
    if (!meeting) return send(res, 400, { error: 'Invalid meeting data' });
    const previousValue = await redis(url, token, 'GET/' + encodeURIComponent(key));
    const previous = typeof previousValue === 'string' ? JSON.parse(previousValue) : previousValue;
    meeting.updatedAt = Math.max(Date.now(), Number(previous && previous.updatedAt || 0) + 1, Number(meeting.updatedAt || 0));
    const saved = await redis(url, token, 'SET/' + encodeURIComponent(key) + '?EX=' + RETENTION_SECONDS, JSON.stringify(meeting));
    if (saved !== 'OK') return send(res, 502, { error: 'Could not save meeting' });
    return send(res, 200, meeting);
  } catch (error) {
    console.error('Meeting storage request failed:', error && error.message || error);
    return send(res, 502, { error: 'Shared storage request failed' });
  }
}
