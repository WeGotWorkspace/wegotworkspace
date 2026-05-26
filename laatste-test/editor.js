import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as syncProtocol from 'y-protocols/sync.js';
import {
  broadcastMesh,
  getMyMeshId,
  getMeshPeerIds,
  meshLinkCount,
  onMeshMessage,
  sendMeshTo,
} from './mesh.js';

const DOCUMENT_URL = 'document.php';
const YJS_URL = 'document.php?format=yjs';
const SAVE_DELAY_MS = 2000;
const MESH_ORIGIN = 'mesh';
const SEED_ORIGIN = 'seed';

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04',
  '#9333ea', '#0891b2', '#db2777', '#ea580c',
];

const $ = (id) => document.getElementById(id);

let editor = null;
let ydoc = null;
let awareness = null;
let provider = null;
let saveTimer = null;
let seedTimer = null;
let unsubMesh = null;
let pendingMarkdown = '';
let seedDone = false;
let myUser = null;

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function isYDocEmpty(doc = ydoc) {
  if (!doc) return true;
  return doc.getXmlFragment('default').length === 0;
}

async function loadMarkdown() {
  const res = await fetch(DOCUMENT_URL);
  if (!res.ok) throw new Error(`Could not load document (${res.status})`);
  return res.text();
}

async function loadYjsSnapshot(target) {
  const res = await fetch(YJS_URL);
  if (res.status === 204 || !res.ok) return false;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) return false;
  Y.applyUpdate(target, buf, SEED_ORIGIN);
  return true;
}

async function saveDocument(markdown) {
  const body = {
    markdown,
    yjs: ydoc ? Array.from(Y.encodeStateAsUpdate(ydoc)) : [],
  };
  const res = await fetch(DOCUMENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let err = text;
    try { err = JSON.parse(text).error; } catch (_) {}
    throw new Error(err || res.statusText);
  }
}

/**
 * Issue yjs/yjs-demos#16: never setContent on a collaborative editor.
 * Build state in a throwaway Y.Doc, then applyUpdate on the real doc.
 */
function applyMarkdownToYDoc(target, markdown) {
  const temp = new Y.Doc();
  const tempEditor = new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: temp }),
      Markdown,
    ],
  });
  tempEditor.commands.setContent(markdown, { contentType: 'markdown' });
  Y.applyUpdate(target, Y.encodeStateAsUpdate(temp), SEED_ORIGIN);
  tempEditor.destroy();
}

function setDocStatus(msg) {
  $('docStatus').textContent = msg;
}

function updateSyncStatus(extra = '') {
  const links = meshLinkCount();
  const users = editor?.storage?.collaborationCaret?.users
    ?.map((u) => u.name)
    .filter(Boolean)
    .join(', ');
  const line = `Collab · ${links} link(s)${users ? ` · ${users}` : ''} · via signal.php`;
  if (!$('docStatus').textContent.startsWith('Saved')) {
    setDocStatus(extra ? `${extra} · ${line}` : line);
  }
}

function scheduleSave() {
  if (!editor) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await saveDocument(editor.getMarkdown());
      setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setDocStatus(`Save failed: ${err.message}`);
    }
  }, SAVE_DELAY_MS);
}

function hasOtherPeers() {
  return getMeshPeerIds().length > 0;
}

function amLowestMeshPeer() {
  const my = getMyMeshId();
  if (!my) return true;
  let min = my;
  for (const id of getMeshPeerIds()) {
    if (id < min) min = id;
  }
  return my === min;
}

function markDocReady() {
  seedDone = true;
}

function trySeedFromFile() {
  if (seedDone || !ydoc || !pendingMarkdown) return;
  if (!isYDocEmpty()) {
    markDocReady();
    return;
  }

  if (hasOtherPeers()) {
    if (!amLowestMeshPeer()) return;
    if (meshLinkCount() === 0) return;
  }

  applyMarkdownToYDoc(ydoc, pendingMarkdown);
  markDocReady();
  updateSyncStatus('Loaded document.md');
}

function scheduleSeeding() {
  clearTimeout(seedTimer);
  const tick = () => trySeedFromFile();
  seedTimer = setTimeout(tick, 1000);
  setTimeout(tick, 3000);
}

function sendSyncStep1(toPeerId) {
  const encoder = encoding.createEncoder();
  syncProtocol.writeSyncStep1(encoder, ydoc);
  const msg = { type: 'sync', u: Array.from(encoding.toUint8Array(encoder)) };
  if (toPeerId) sendMeshTo(toPeerId, msg);
  else broadcastMesh(msg);
}

function handleSyncMessage(bytes, replyTo) {
  const decoder = decoding.createDecoder(bytes);
  const encoder = encoding.createEncoder();
  syncProtocol.readSyncMessage(decoder, encoder, ydoc, MESH_ORIGIN);
  if (!isYDocEmpty()) markDocReady();
  if (encoding.length(encoder) > 1) {
    const reply = { type: 'sync', u: Array.from(encoding.toUint8Array(encoder)) };
    if (replyTo) sendMeshTo(replyTo, reply);
    else broadcastMesh(reply);
  }
}

function handleMeshMessage(msg) {
  if (!ydoc || !awareness) return;

  if (msg.type === 'sync' && Array.isArray(msg.u)) {
    handleSyncMessage(Uint8Array.from(msg.u), msg.from);
  }
  if (msg.type === 'awareness' && Array.isArray(msg.u)) {
    awarenessProtocol.applyAwarenessUpdate(
      awareness,
      Uint8Array.from(msg.u),
      MESH_ORIGIN,
    );
  }
  if (msg.type === 'dc-open' && msg.from) {
    sendSyncStep1(msg.from);
    if (isYDocEmpty()) trySeedFromFile();
  }
  updateSyncStatus();
}

function destroySession() {
  clearTimeout(saveTimer);
  clearTimeout(seedTimer);
  unsubMesh?.();
  unsubMesh = null;
  editor?.destroy();
  editor = null;
  ydoc = null;
  awareness = null;
  provider = null;
  pendingMarkdown = '';
  seedDone = false;
  myUser = null;
}

export async function connectEditor(name) {
  if (editor) destroySession();

  if (!getMyMeshId()) {
    throw new Error('Join mesh before opening the editor');
  }

  setDocStatus('Loading document…');
  pendingMarkdown = await loadMarkdown();
  seedDone = false;
  myUser = { name, color: colorForName(name) };

  ydoc = new Y.Doc();
  const hadSnapshot = await loadYjsSnapshot(ydoc);
  if (hadSnapshot) seedDone = true;

  awareness = new awarenessProtocol.Awareness(ydoc);
  awareness.setLocalStateField('user', myUser);
  provider = { awareness };

  ydoc.on('update', (update, origin) => {
    if (origin === MESH_ORIGIN || origin === SEED_ORIGIN) return;
    const encoder = encoding.createEncoder();
    syncProtocol.writeUpdate(encoder, update);
    const payload = { type: 'sync', u: Array.from(encoding.toUint8Array(encoder)) };
    broadcastMesh(payload);
  });

  awareness.on('update', ({ added, updated, removed }, origin) => {
    if (origin === MESH_ORIGIN) return;
    const changed = added.concat(updated, removed);
    const encoded = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
    broadcastMesh({ type: 'awareness', u: Array.from(encoded) });
  });

  unsubMesh = onMeshMessage(handleMeshMessage);

  editor = new Editor({
    element: $('editor'),
    editable: true,
    enableContentCheck: false,
    autofocus: 'end',
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({ provider, user: myUser }),
      Markdown,
      Placeholder.configure({
        placeholder: 'Type here — synced over mesh (signal.php + WebRTC)…',
      }),
    ],
    onUpdate: ({ transaction }) => {
      if (isChangeOrigin(transaction)) return;
      scheduleSave();
    },
    onSelectionUpdate: () => {
      editor.commands.updateUser(myUser);
    },
    onContentError: ({ error }) => {
      setDocStatus(`Editor error: ${error.message}`);
    },
  });

  editor.commands.updateUser(myUser);

  if (!seedDone && isYDocEmpty()) {
    if (!hasOtherPeers()) {
      applyMarkdownToYDoc(ydoc, pendingMarkdown);
      markDocReady();
      updateSyncStatus('Loaded document.md');
    } else {
      scheduleSeeding();
    }
  } else {
    updateSyncStatus(hadSnapshot ? 'Restored Yjs snapshot' : '');
  }
}

export async function disconnectEditor() {
  if (editor) {
    try {
      await saveDocument(editor.getMarkdown());
    } catch (_) {}
  }
  destroySession();
  setDocStatus('');
}

export async function saveNow() {
  if (!editor) return;
  clearTimeout(saveTimer);
  await saveDocument(editor.getMarkdown());
  setDocStatus(`Saved · ${new Date().toLocaleTimeString()}`);
}
