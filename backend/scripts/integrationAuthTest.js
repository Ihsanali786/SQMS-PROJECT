/**
 * Auth & token integration smoke tests (no secrets printed).
 * Usage: node scripts/integrationAuthTest.js [baseUrl]
 * Default base: http://localhost:5001/api
 */
const base = (process.argv[2] || 'http://localhost:5001/api').replace(/\/$/, '');

const testEmail = `sqms_test_${Date.now()}@example.com`;
const testPassword = 'TestPass123!';
const testName = 'SQMS Test User';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
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

  const badLogin = await req('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'definitely-wrong-password-xyz'
  });
  if (badLogin.status === 401 && badLogin.json?.success === false) {
    pass('invalid login returns 401');
  } else {
    fail('invalid login', `status=${badLogin.status}`);
  }

  const reg = await req('POST', '/auth/register', {
    name: testName,
    email: testEmail,
    password: testPassword
  });
  if (reg.status === 201 && reg.json?.success && reg.json?.data?.accessToken) {
    pass('registration with valid input');
  } else {
    fail('registration', `status=${reg.status} msg=${reg.json?.message}`);
  }

  const dup = await req('POST', '/auth/register', {
    name: testName,
    email: testEmail,
    password: testPassword
  });
  if (dup.status === 400 && dup.json?.message?.includes('exists')) {
    pass('duplicate registration rejected');
  } else {
    fail('duplicate registration', `status=${dup.status}`);
  }

  const login = await req('POST', '/auth/login', {
    email: testEmail,
    password: testPassword
  });
  const token = login.json?.data?.accessToken;
  if (login.status === 200 && login.json?.success && token) {
    pass('valid login returns accessToken');
  } else {
    fail('valid login', `status=${login.status}`);
  }

  const noAuth = await req('GET', '/auth/me');
  if (noAuth.status === 401) {
    pass('protected /auth/me without token → 401');
  } else {
    fail('no token me', `status=${noAuth.status}`);
  }

  const me = await req('GET', '/auth/me', null, token);
  if (me.status === 200 && me.json?.success && me.json?.data?.email === testEmail) {
    pass('protected /auth/me with token');
  } else {
    fail('/auth/me with token', `status=${me.status}`);
  }

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin1234'
  });
  const adminToken = adminLogin.json?.data?.accessToken;
  if (adminLogin.status === 200 && adminToken) {
    pass('admin login (seed defaults)');
  } else {
    fail('admin login', `status=${adminLogin.status} — check ADMIN_PASSWORD in .env`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const gen = await req(
    'POST',
    '/tokens',
    {
      service: 'Account Opening',
      serviceType: 'bank',
      branch: 'Main Branch',
      date: today,
      time: '10:00'
    },
    token
  );
  if (gen.status === 201 && gen.json?.success && gen.json?.data?.tokenNumber) {
    pass('token generation after login');
  } else {
    fail('token generation', `status=${gen.status} msg=${gen.json?.message}`);
  }

  const myTokens = await req('GET', '/tokens/my-tokens', null, token);
  if (myTokens.status === 200 && Array.isArray(myTokens.json?.data) && myTokens.json.data.length >= 1) {
    pass('get my tokens');
  } else {
    fail('my tokens', `status=${myTokens.status}`);
  }

  console.log('\nDone.');
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
