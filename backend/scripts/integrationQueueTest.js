/**
 * Queue staff operations smoke test (uses admin + simulated tokens only).
 * Usage: node scripts/integrationQueueTest.js [baseUrl]
 */
const base = (process.argv[2] || 'http://localhost:5001/api').replace(/\/$/, '');

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function pass(label) {
  console.log(`PASS: ${label}`);
}
function fail(label, detail) {
  console.log(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  process.exitCode = 1;
}

(async () => {
  console.log(`Base URL: ${base}\n`);
  const serviceType = 'bank';

  const login = await req('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin1234'
  });
  const token = login.json?.data?.accessToken;
  if (!token) {
    fail('admin login');
    return;
  }
  pass('admin login');

  await req('POST', `/queue/${serviceType}/simulation/reset`, {}, token);

  const sim = await req('POST', `/queue/${serviceType}/simulate`, {
    customerName: 'Queue Test Sim',
    service: 'Test Service'
  }, token);
  if (sim.status !== 201 || !sim.json?.data?.isSimulated) {
    fail('simulate arrival', `status=${sim.status}`);
  } else {
    pass('simulate arrival creates isSimulated token');
  }

  const beforeCounter = await req('PUT', `/queue/${serviceType}/counter`, { action: 'set', count: 2 }, token);
  if (beforeCounter.status === 200 && beforeCounter.json?.data?.openCounters === 2) {
    pass('set counters to 2');
  } else {
    fail('set counters', JSON.stringify(beforeCounter.json));
  }

  const q1 = await req('GET', `/queue/${serviceType}`, null, token);
  const waiting = q1.json?.data?.tokens?.filter((t) => t.status === 'waiting') || [];
  if (!waiting.length) {
    fail('queue has waiting tokens');
    return;
  }
  pass(`queue lists ${waiting.length} waiting token(s)`);

  const next = await req('PUT', `/queue/${serviceType}/next`, {}, token);
  if (next.status === 200 && next.json?.data?.status === 'serving') {
    pass('call next → serving');
  } else {
    fail('call next', `status=${next.status}`);
  }

  const servingId = next.json?.data?._id;
  const complete = await req('PUT', `/queue/${serviceType}/complete/${servingId}`, {}, token);
  if (complete.status === 200 && complete.json?.data?.status === 'completed') {
    pass('complete token');
  } else {
    fail('complete', `status=${complete.status}`);
  }

  const sim2 = await req('POST', `/queue/${serviceType}/simulate`, {}, token);
  const skipId = sim2.json?.data?._id;
  const skip = await req('PUT', `/queue/${serviceType}/skip/${skipId}`, {}, token);
  if (skip.status === 200 && skip.json?.data?.status === 'skipped') {
    pass('skip token');
  } else {
    fail('skip', `status=${skip.status}`);
  }

  const analytics = await req('GET', `/queue/${serviceType}/analytics`, null, token);
  if (analytics.status === 200 && analytics.json?.data?.serviceType === serviceType) {
    pass('analytics endpoint');
  } else {
    fail('analytics', `status=${analytics.status}`);
  }

  const pub = await req('GET', `/tokens/queue/${serviceType}`);
  if (pub.status === 200 && typeof pub.json?.data?.waitingCount === 'number') {
    pass('public queue status');
  } else {
    fail('public queue status');
  }

  await req('PUT', `/queue/${serviceType}/counter`, { action: 'set', count: 0 }, token);
  const pausedSim = await req('POST', `/queue/${serviceType}/simulate`, { customerName: 'Paused ETA Test' }, token);
  const pausedEta = pausedSim.json?.data?.estimatedWaitTime;
  if (pausedSim.status === 201 && pausedEta === -1) {
    pass('zero open counters → ETA paused (-1)');
  } else {
    fail('zero counters ETA', `expected -1 got ${pausedEta} (restart backend if code was just updated)`);
  }

  await req('PUT', `/queue/${serviceType}/counter`, { action: 'set', count: 1 }, token);
  await req('POST', `/queue/${serviceType}/simulation/reset`, {}, token);
  pass('simulation reset (cleanup)');

  console.log('\nDone.');
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
