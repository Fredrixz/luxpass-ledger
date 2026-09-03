import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';
import Blockchain from '../src/engine/Blockchain.js';

/** Startar appen på en ledig port och ger tillbaka en liten fetch-hjälpare. */
async function startServer() {
  const blockchain = new Blockchain(1);
  const server = createApp(blockchain).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  const api = (path, options) =>
    fetch(`http://127.0.0.1:${port}${path}`, options);

  const postJson = (path, body) =>
    api(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  return {
    api,
    postJson,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('GET /api/chain returnerar genesis-blocket', async (t) => {
  const s = await startServer();
  t.after(s.close);

  const res = await s.api('/api/chain');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body.valid, true);
});

test('full flöde: utfärda -> mina -> överlåta -> verifiera', async (t) => {
  const s = await startServer();
  t.after(s.close);

  let res = await s.postJson('/api/transactions', {
    serialNumber: 'ROLEX-SUB-9981',
    fromAddress: '0xManufacturerKey',
    toAddress: '0xCollectorA',
  });
  assert.equal(res.status, 201);

  res = await s.postJson('/api/mine', {});
  const mined = await res.json();
  assert.equal(res.status, 201);
  assert.ok(mined.block.hash.startsWith('0'));

  res = await s.postJson('/api/transactions', {
    serialNumber: 'ROLEX-SUB-9981',
    fromAddress: '0xCollectorA',
    toAddress: '0xCollectorB',
  });
  assert.equal(res.status, 201);
  await s.postJson('/api/mine', {});

  res = await s.api('/api/verify/ROLEX-SUB-9981');
  const verified = await res.json();
  assert.equal(res.status, 200);
  assert.equal(verified.currentOwner, '0xCollectorB');
  assert.equal(verified.issuedBy, '0xManufacturerKey');
  assert.equal(verified.history.length, 2);
  assert.equal(verified.chainValid, true);
});

test('POST /api/transactions nekar ägarbyte från fel adress (422)', async (t) => {
  const s = await startServer();
  t.after(s.close);

  await s.postJson('/api/transactions', {
    serialNumber: 'BIRKIN-2022-01',
    fromAddress: '0xHermes',
    toAddress: '0xBarbie',
  });
  await s.postJson('/api/mine', {});

  const res = await s.postJson('/api/transactions', {
    serialNumber: 'BIRKIN-2022-01',
    fromAddress: '0xKen',
    toAddress: '0xSkelly',
  });

  assert.equal(res.status, 422);
});

test('POST /api/transactions med saknade fält ger 422', async (t) => {
  const s = await startServer();
  t.after(s.close);

  const res = await s.postJson('/api/transactions', { serialNumber: 'X' });
  assert.equal(res.status, 422);
});

test('POST /api/mine utan väntande transaktioner ger 400', async (t) => {
  const s = await startServer();
  t.after(s.close);

  const res = await s.postJson('/api/mine', {});
  assert.equal(res.status, 400);
});

test('GET /api/verify/:id för okänt serienummer ger 404', async (t) => {
  const s = await startServer();
  t.after(s.close);

  const res = await s.api('/api/verify/OKAND-123');
  assert.equal(res.status, 404);
});
