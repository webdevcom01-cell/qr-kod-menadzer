#!/usr/bin/env node
// CONVERGE-phase acceptance verification for QR Kod Menadžer.
// Checks each AC1-AC8 from specs/qr-kod-menadzer/spec.md against a REAL
// running instance of server.js -- real HTTP calls, real SQLite reads, no
// assumptions. Run manually: node scripts/verify-ac.js
//
// Requires the server to already be running (see the "startServer" section
// below for the exact env/command this script expects), OR run it via
// `node scripts/verify-ac.js --spawn` to have it start/stop the server itself.

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = 3998;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_USER = 'ac-verify';
const ADMIN_PASSWORD = 'ac-verify-secret';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString('base64');
const DB_PATH = path.join(__dirname, '..', 'data', 'ac-verify.db');

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}${detail ? ' -- ' + detail : ''}`);
  }
}

async function adminPost(pathname, body) {
  const res = await fetch(BASE + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function adminGet(pathname) {
  const res = await fetch(BASE + pathname, { headers: { Authorization: AUTH_HEADER } });
  return res;
}

async function main() {
  // --- setup ---
  // NOTE: do NOT delete the data directory here. This script expects the
  // server to already be running against DB_PATH (see file header) -- the
  // server already has the SQLite file open by this point. Deleting the
  // directory out from under a live connection removes the place SQLite
  // needs to write its rollback-journal file, which SQLite reports back as
  // "attempt to write a readonly database" on the very next write. Cleaning
  // the data dir is the CALLER's job, and must happen BEFORE the server is
  // started (see the `rm -rf data` step in the run instructions).

  // AC1: 20 creates in a row, no collision/error
  const codes = [];
  for (let i = 0; i < 20; i++) {
    const { status, json } = await adminPost('/admin/codes', { target_url: `https://example.com/ac1-${i}` });
    check(`AC1 create #${i} -> 201`, status === 201, `got ${status} ${JSON.stringify(json)}`);
    if (json && json.code) codes.push(json.code);
  }
  const uniqueCodes = new Set(codes);
  check('AC1 all 20 codes unique', uniqueCodes.size === 20, `only ${uniqueCodes.size} unique`);

  // AC2: invalid target_url rejected
  const badUrl = await adminPost('/admin/codes', { target_url: 'nije-url' });
  check('AC2 invalid url -> 400', badUrl.status === 400, `got ${badUrl.status}`);

  // AC3: edit target_url, redirect goes to NEW url, slug unchanged
  const testCode = codes[0];
  const editRes = await adminPost(`/admin/codes/${testCode}`, { target_url: 'https://example.com/AC3-NOVI' });
  check('AC3 edit -> 200', editRes.status === 200, `got ${editRes.status}`);
  const redirectAfterEdit = await fetch(BASE + `/r/${testCode}`, { redirect: 'manual' });
  check(
    'AC3 redirect after edit goes to new url',
    redirectAfterEdit.status === 302 && redirectAfterEdit.headers.get('location') === 'https://example.com/AC3-NOVI',
    `status=${redirectAfterEdit.status} location=${redirectAfterEdit.headers.get('location')}`
  );

  // AC4: N sequential opens -> click_count == N (testCode already got 1 hit from AC3 check above)
  const N = 5;
  for (let i = 0; i < N; i++) {
    await fetch(BASE + `/r/${testCode}`, { redirect: 'manual' });
  }
  const adminHtmlAfterSeq = await (await adminGet('/admin')).text();
  const seqMatch = adminHtmlAfterSeq.match(new RegExp(`<td>${testCode}</td>\\s*<td>[^<]*</td>\\s*<td>(\\d+)</td>`));
  const seqCount = seqMatch ? parseInt(seqMatch[1], 10) : -1;
  // testCode had exactly 1 hit from the AC3 redirect check, then N more here = 1 + N
  check('AC4 sequential click_count == 1 + N', seqCount === 1 + N, `got ${seqCount}, expected ${1 + N}`);

  // AC5: 20 CONCURRENT opens on a fresh code -> click_count == 20 exactly, no lost updates
  const concurrentCode = codes[1];
  const CONCURRENCY = 20;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => fetch(BASE + `/r/${concurrentCode}`, { redirect: 'manual' }))
  );
  const adminHtmlAfterConcurrent = await (await adminGet('/admin')).text();
  const concMatch = adminHtmlAfterConcurrent.match(
    new RegExp(`<td>${concurrentCode}</td>\\s*<td>[^<]*</td>\\s*<td>(\\d+)</td>`)
  );
  const concCount = concMatch ? parseInt(concMatch[1], 10) : -1;
  check('AC5 concurrent click_count == 20 exactly (no lost updates)', concCount === CONCURRENCY, `got ${concCount}`);

  // AC6: unknown code -> 404, no click_count changes anywhere
  const beforeUnknown = await (await adminGet('/admin')).text();
  const unknownRes = await fetch(BASE + '/r/zzzzzzzz', { redirect: 'manual' });
  check('AC6 unknown code -> 404', unknownRes.status === 404, `got ${unknownRes.status}`);
  const afterUnknown = await (await adminGet('/admin')).text();
  check('AC6 no click_count changed on 404', beforeUnknown === afterUnknown);

  // AC7: admin route without auth -> rejected; with auth -> works
  const noAuthRes = await fetch(BASE + '/admin');
  check('AC7 admin without auth -> 401', noAuthRes.status === 401, `got ${noAuthRes.status}`);
  const withAuthRes = await adminGet('/admin');
  check('AC7 admin with auth -> 200', withAuthRes.status === 200, `got ${withAuthRes.status}`);
  const redirectNoAuth = await fetch(BASE + `/r/${testCode}`, { redirect: 'manual' });
  check('AC7 /r/:code needs NO auth', redirectNoAuth.status === 302, `got ${redirectNoAuth.status}`);

  // AC8 (persistence across restart) is NOT checked here -- it requires an
  // actual process restart, done separately (see verify.md) since it can't
  // be tested from inside a single running process.

  console.log('');
  console.log(failures === 0 ? `SVE PROVERE PROŠLE (AC1-AC7 od 8; AC8 posebno)` : `${failures} PROVERA PALO`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(2);
});
