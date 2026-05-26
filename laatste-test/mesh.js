const SIGNAL = 'signal.php';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const DC_LABEL = 'collab';

let myId = null;
let myName = '';
let pollTimer = null;
let lastMsgId = 0;
/** @type {Map<string, { name: string, pc: RTCPeerConnection, dc: RTCDataChannel | null, link: string }>} */
const mesh = new Map();
/** @type {Set<(msg: object) => void>} */
const meshListeners = new Set();

const $ = (id) => document.getElementById(id);

async function api(action, body = {}) {
  const res = await fetch(SIGNAL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await res.text();
  if (text.startsWith('<?php') || text.trimStart().startsWith('<!')) {
    throw new Error(
      'Signaling not running. Start: pnpm dev — then open http://localhost:5173/',
    );
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const hint = res.status === 502
      ? ' (502 — restart pnpm dev so PHP starts on port 8081)'
      : ` (${res.status})`;
    throw new Error(`Invalid response from signal.php${hint}: ${text.slice(0, 60)}`);
  }
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

function linkState(pc) {
  const s = pc.iceConnectionState;
  if (s === 'connected' || s === 'completed') return 'connected';
  if (s === 'checking' || s === 'new') return 'connecting';
  if (s === 'failed') return 'failed';
  if (s === 'disconnected') return 'disconnected';
  if (s === 'closed') return 'closed';
  return s;
}

function emitMesh(msg) {
  for (const fn of meshListeners) fn(msg);
}

export function onMeshMessage(fn) {
  meshListeners.add(fn);
  return () => meshListeners.delete(fn);
}

export function broadcastMesh(msg) {
  const raw = JSON.stringify(msg);
  for (const [, entry] of mesh) {
    if (entry.dc?.readyState === 'open') {
      try {
        entry.dc.send(raw);
      } catch (_) {}
    }
  }
}

export function meshLinkCount() {
  let n = 0;
  for (const [, entry] of mesh) {
    if (entry.dc?.readyState === 'open') n += 1;
  }
  return n;
}

export function getMyMeshId() {
  return myId;
}

export function getMeshPeerIds() {
  return Array.from(mesh.keys());
}

function renderPeers(roomPeers = []) {
  const ul = $('peerList');
  ul.innerHTML = '';

  const selfLi = document.createElement('li');
  selfLi.className = 'self';
  selfLi.innerHTML = `<span>${myName || '—'} <small>(you)</small></span><span class="badge connected">here</span>`;
  ul.appendChild(selfLi);

  const seen = new Set();
  for (const p of roomPeers) {
    seen.add(p.id);
    const entry = mesh.get(p.id);
    const link = entry?.dc?.readyState === 'open' ? 'connected' : (entry?.link ?? 'new');
    ul.appendChild(peerRow(p.name, link));
  }

  for (const [id, entry] of mesh) {
    if (!seen.has(id)) {
      ul.appendChild(peerRow(entry.name + ' (left?)', entry.link));
    }
  }

  if (!myId) {
    const li = document.createElement('li');
    li.textContent = 'Join to see peers.';
    ul.appendChild(li);
  }
}

function peerRow(name, link) {
  const li = document.createElement('li');
  const badge = document.createElement('span');
  badge.className = `badge ${link}`;
  badge.textContent = link;
  li.innerHTML = `<span>${escapeHtml(name)}</span>`;
  li.appendChild(badge);
  return li;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function sendSignal(to, type, payload) {
  return api('signal', { peerId: myId, to, type, payload });
}

function makePc(remoteId) {
  const pc = new RTCPeerConnection(ICE);
  pc.onicecandidate = (e) => {
    if (e.candidate) sendSignal(remoteId, 'ice', e.candidate.toJSON());
  };
  pc.oniceconnectionstatechange = () => {
    const entry = mesh.get(remoteId);
    if (entry) {
      entry.link = linkState(pc);
      renderPeers();
      emitMesh({ type: 'link' });
    }
  };
  return pc;
}

function attachDataChannel(dc, remoteId) {
  const entry = mesh.get(remoteId);
  if (!entry) return;
  entry.dc = dc;

  dc.onopen = () => {
    entry.link = 'connected';
    renderPeers();
    emitMesh({ type: 'dc-open', from: remoteId });
  };

  dc.onclose = () => {
    if (entry.dc === dc) entry.dc = null;
    renderPeers();
  };

  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg && typeof msg === 'object') emitMesh({ ...msg, from: remoteId });
    } catch (_) {}
  };
}

export function sendMeshTo(remoteId, msg) {
  const entry = mesh.get(remoteId);
  if (entry?.dc?.readyState !== 'open') return;
  try {
    entry.dc.send(JSON.stringify(msg));
  } catch (_) {}
}

async function connectTo(remoteId, remoteName) {
  if (mesh.has(remoteId)) return;

  const pc = makePc(remoteId);
  mesh.set(remoteId, { name: remoteName, pc, dc: null, link: 'connecting' });

  const initiator = myId < remoteId;
  if (initiator) {
    const dc = pc.createDataChannel(DC_LABEL);
    attachDataChannel(dc, remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(remoteId, 'offer', pc.localDescription);
  } else {
    pc.ondatachannel = (e) => {
      if (e.channel.label === DC_LABEL) attachDataChannel(e.channel, remoteId);
    };
  }
  renderPeers();
}

function removePeer(remoteId) {
  const entry = mesh.get(remoteId);
  if (entry) {
    entry.dc?.close();
    entry.pc.close();
    mesh.delete(remoteId);
  }
}

async function handleOffer(from, sdp) {
  let entry = mesh.get(from);
  if (!entry) {
    const pc = makePc(from);
    entry = { name: from.slice(0, 8), pc, dc: null, link: 'connecting' };
    mesh.set(from, entry);
    pc.ondatachannel = (e) => {
      if (e.channel.label === DC_LABEL) attachDataChannel(e.channel, from);
    };
  }
  await entry.pc.setRemoteDescription(sdp);
  const answer = await entry.pc.createAnswer();
  await entry.pc.setLocalDescription(answer);
  await sendSignal(from, 'answer', entry.pc.localDescription);
  renderPeers();
}

async function handleAnswer(from, sdp) {
  const entry = mesh.get(from);
  if (!entry) return;
  await entry.pc.setRemoteDescription(sdp);
  renderPeers();
}

async function handleIce(from, candidate) {
  const entry = mesh.get(from);
  if (!entry) return;
  try {
    await entry.pc.addIceCandidate(candidate);
  } catch (_) { /* can arrive before remote description */ }
}

async function onPoll({ peers, messages }) {
  const roomIds = new Set(peers.map((p) => p.id));

  for (const p of peers) {
    await connectTo(p.id, p.name);
  }

  for (const id of [...mesh.keys()]) {
    if (!roomIds.has(id)) removePeer(id);
  }

  for (const m of messages) {
    lastMsgId = Math.max(lastMsgId, m.id);
    const entry = mesh.get(m.from);
    if (entry && m.type !== 'ice') {
      entry.name = peers.find((p) => p.id === m.from)?.name ?? entry.name;
    }

    if (m.type === 'offer') await handleOffer(m.from, m.payload);
    else if (m.type === 'answer') await handleAnswer(m.from, m.payload);
    else if (m.type === 'ice') await handleIce(m.from, m.payload);
  }

  renderPeers(peers);
  const links = meshLinkCount();
  $('status').innerHTML =
    `Mesh · <span id="you">${escapeHtml(myName)}</span> · ` +
    `<code>${myId?.slice(0, 8)}…</code> · ` +
    `${peers.length} other peer(s) · ${links} collab link(s)`;
}

async function pollLoop() {
  if (!myId) return;
  try {
    const data = await api('poll', { peerId: myId, since: lastMsgId });
    await onPoll(data);
  } catch (err) {
    $('status').textContent = 'Mesh poll error: ' + err.message;
  }
  pollTimer = setTimeout(pollLoop, 2000);
}

export async function joinMesh(name) {
  myName = name;
  const data = await api('join', { name: myName });
  myId = data.peerId;
  await onPoll({ peers: data.peers, messages: [] });
  pollLoop();
}

export async function leaveMesh() {
  clearTimeout(pollTimer);
  if (myId) {
    try {
      await api('leave', { peerId: myId });
    } catch (_) {}
  }
  for (const id of [...mesh.keys()]) removePeer(id);
  myId = null;
  myName = '';
  lastMsgId = 0;
  renderPeers();
}

export function initMesh() {
  renderPeers();
}
