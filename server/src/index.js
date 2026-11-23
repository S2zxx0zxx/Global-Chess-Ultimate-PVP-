import { DurableObject } from 'cloudflare:workers';
import { applyMove, initialMatch, publicMatchState } from './rules.mjs';

const ROOM = /^[A-Z0-9]{12}$/;
const token = () => {
  const data = new Uint8Array(32);
  crypto.getRandomValues(data);
  return Array.from(data, b => b.toString(16).padStart(2, '0')).join('');
};
const randomRoom = () => {
  const data = new Uint8Array(12);
  crypto.getRandomValues(data);
  return Array.from(data, b => (b % 36).toString(36).toUpperCase()).join('');
};
const json = (value, status = 200, extra = {}) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const safeOrigin = (request, env) => {
  const origin = request.headers.get('Origin');
  if (!origin) return null; // no implicit trust in the absence of Origin for sensitive mutations
  const allowed = String(env.APP_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
};
const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, service: 'global-chess-private-rooms' });
    const origin = safeOrigin(request, env);
    if (!origin) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    const responseHeaders = cors(origin);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const id = randomRoom();
      const stub = ctx.exports.MatchRoom.getByName(id);
      const response = await stub.fetch(new Request('https://room.internal/create', { method: 'POST' }));
      const body = await response.json();
      return json({ roomId: id, ...body }, response.status, responseHeaders);
    }
    const matched = /^\/api\/rooms\/([A-Z0-9]{12})\/(join|socket)$/.exec(url.pathname);
    if (!matched || !ROOM.test(matched[1])) return json({ error: 'NOT_FOUND' }, 404, responseHeaders);
    const [, roomId, action] = matched;
    const stub = ctx.exports.MatchRoom.getByName(roomId);
    if (action === 'join' && request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 1024) return json({ error: 'BAD_REQUEST' }, 413, responseHeaders);
      let body;
      try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: 'BAD_JSON' }, 400, responseHeaders); }
      const reply = await stub.fetch(new Request('https://room.internal/join', { method: 'POST', body: JSON.stringify(body) }));
      return json(await reply.json(), reply.status, responseHeaders);
    }
    if (action === 'socket' && request.method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return stub.fetch(request);
    }
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405, responseHeaders);
  },
};

export class MatchRoom extends DurableObject {
  async read() {
    return await this.ctx.storage.get('match') || null;
  }
  async fetch(request) {
    const url = new URL(request.url);
    let state = await this.read();
    if (url.pathname === '/create' && request.method === 'POST') {
      if (state) return json({ error: 'ROOM_EXISTS' }, 409);
      const hostToken = token();
      state = initialMatch(hostToken, Date.now() + 24 * 60 * 60 * 1000);
      await this.ctx.storage.put('match', state);
      await this.ctx.storage.setAlarm(state.expiresAt);
      return json({ seat: 'w', token: hostToken, expiresAt: state.expiresAt }, 201);
    }
    if (!state || state.expiresAt <= Date.now()) return json({ error: 'ROOM_EXPIRED' }, 410);
    if (url.pathname === '/join' && request.method === 'POST') {
      let args;
      try { args = await request.json(); } catch { return json({ error: 'BAD_JSON' }, 400); }
      const outcome = await this.ctx.storage.transaction(async storage => {
        const current = await storage.get('match');
        if (!current || current.expiresAt <= Date.now()) return { error: 'ROOM_EXPIRED', status: 410 };
        if (args?.token === current.hostToken) return { seat: 'w', token: current.hostToken, status: 200 };
        if (args?.token && args.token === current.guestToken) return { seat: 'b', token: current.guestToken, status: 200 };
        if (current.guestToken) return { error: 'ROOM_FULL', status: 409 };
        const guestToken = token();
        current.guestToken = guestToken;
        current.status = 'active';
        await storage.put('match', current);
        return { seat: 'b', token: guestToken, status: 201, updated: current };
      });
      if (outcome.updated) await this.broadcast(outcome.updated);
      const { updated, status, ...response } = outcome;
      return json(response, status);
    }
    if (url.pathname.endsWith('/socket') && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(x => x.trim());
      if (!protocols.includes('gcu-v1')) return json({ error: 'PROTOCOL_REQUIRED' }, 400);
      const seatToken = protocols.find(p => /^seat\.[0-9a-f]{64}$/.test(p))?.slice(5);
      const side = seatToken && seatToken === state.hostToken ? 'w' : seatToken && seatToken === state.guestToken ? 'b' : null;
      if (!side) return json({ error: 'INVALID_TOKEN' }, 403);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ side, nonce: crypto.randomUUID() });
      server.send(JSON.stringify(publicMatchState(state, side)));
      return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'gcu-v1' } });
    }
    return json({ error: 'NOT_FOUND' }, 404);
  }
  async broadcast(state) {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        const attachment = socket.deserializeAttachment();
        if (attachment?.side === 'w' || attachment?.side === 'b')
          socket.send(JSON.stringify(publicMatchState(state, attachment.side)));
      } catch { /* disconnected socket; hibernation runtime manages cleanup */ }
    }
  }
  async webSocketMessage(socket, input) {
    if (typeof input !== 'string' || input.length > 512) {
      socket.send(JSON.stringify({ type: 'error', error: 'BAD_MESSAGE' }));
      return;
    }
    let command;
    try { command = JSON.parse(input); }
    catch { socket.send(JSON.stringify({ type: 'error', error: 'BAD_JSON' })); return; }
    const now = Date.now();
    const attachment = socket.deserializeAttachment() || {};
    const sameWindow = now - (attachment.windowAt || 0) < 1000;
    const events = sameWindow ? (attachment.events || 0) + 1 : 1;
    if (events > 15) { socket.close(1008, 'Rate limit'); return; }
    socket.serializeAttachment({ ...attachment, windowAt: sameWindow ? attachment.windowAt : now, events });
    const seat = attachment.side;
    const transaction = await this.ctx.storage.transaction(async storage => {
      const current = await storage.get('match');
      if (!current || !seat || current.expiresAt <= Date.now()) return { expired: true };
      const result = applyMove(current, seat, command);
      if (!result.ok) return { error: result.error, state: current };
      await storage.put('match', result.next);
      return { updated: result.next };
    });
    if (transaction.expired) return socket.close(1008, 'Expired room');
    if (transaction.error) {
      socket.send(JSON.stringify({ type: 'error', error: transaction.error, revision: transaction.state.revision }));
      socket.send(JSON.stringify(publicMatchState(transaction.state, seat)));
      return;
    }
    if (transaction.updated) await this.broadcast(transaction.updated);
  }
  async alarm() {
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.close(1001, 'Room expired'); } catch {}
    }
    await this.ctx.storage.deleteAll();
  }
}
