import { initMesh, joinMesh, leaveMesh } from './mesh.js';
import { connectEditor, disconnectEditor, saveNow } from './editor.js';

const $ = (id) => document.getElementById(id);

let connected = false;

function setUiActive(active) {
  connected = active;
  $('joinBtn').disabled = active;
  $('leaveBtn').disabled = !active;
  $('saveBtn').disabled = !active;
  $('name').disabled = active;
}

async function join() {
  const name = $('name').value.trim();
  if (!name) {
    alert('Enter your name');
    return;
  }

  setUiActive(true);
  $('status').textContent = 'Connecting via signal.php…';

  try {
    await joinMesh(name);
    await connectEditor(name);
  } catch (err) {
    $('status').textContent = err.message;
    $('docStatus').textContent = err.message;
    await disconnectEditor().catch(() => {});
    await leaveMesh().catch(() => {});
    setUiActive(false);
  }
}

async function leave() {
  await disconnectEditor().catch(() => {});
  await leaveMesh().catch(() => {});
  setUiActive(false);
  $('status').textContent = 'Disconnected.';
}

$('joinBtn').onclick = join;
$('leaveBtn').onclick = leave;
$('saveBtn').onclick = () => saveNow().catch((err) => {
  $('docStatus').textContent = `Save failed: ${err.message}`;
});
$('name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !connected) join();
});

initMesh();
