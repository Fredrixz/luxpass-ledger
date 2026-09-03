import test from 'node:test';
import assert from 'node:assert/strict';

import Block from '../src/engine/Block.js';
import Blockchain from '../src/engine/Blockchain.js';
import { ValidationError } from '../src/domain/passportRules.js';

test('genesis-blocket finns och har index 0', () => {
  const chain = new Blockchain(1);
  assert.equal(chain.chain.length, 1);
  assert.equal(chain.getLatestBlock().index, 0);
  assert.equal(chain.getLatestBlock().previousHash, '0');
});

test('mineBlock ger en hash med rätt antal ledande nollor', () => {
  const block = new Block(1, Date.now(), [{ serialNumber: 'X' }], 'abc');
  block.mineBlock(2);
  assert.ok(block.hash.startsWith('00'));
  assert.equal(block.hash, block.calculateHash());
});

test('hashen är deterministisk oavsett nyckelordning och skräpfält', () => {
  const a = new Block(
    1,
    1000,
    [{ serialNumber: 'A', fromAddress: 'x', toAddress: 'y', timestamp: 5 }],
    'prev',
  );
  const b = new Block(
    1,
    1000,
    [{ timestamp: 5, toAddress: 'y', fromAddress: 'x', serialNumber: 'A', extra: 1 }],
    'prev',
  );
  assert.equal(a.hash, b.hash);
});

test('minePendingTransactions lägger till block och tömmer poolen', () => {
  const chain = new Blockchain(1);
  chain.addTransaction({
    serialNumber: 'ROLEX-SUB-9981',
    fromAddress: '0xManufacturer',
    toAddress: '0xCollectorA',
    timestamp: Date.now(),
  });

  const block = chain.minePendingTransactions();

  assert.equal(chain.chain.length, 2);
  assert.equal(chain.pendingTransactions.length, 0);
  assert.equal(block.previousHash, chain.chain[0].hash);
  assert.ok(chain.isChainValid());
});

test('isChainValid upptäcker manipulerad data', () => {
  const chain = new Blockchain(1);
  chain.addTransaction({
    serialNumber: 'BIRKIN-2022-01',
    fromAddress: '0xHermes',
    toAddress: '0xBarbie',
    timestamp: Date.now(),
  });
  chain.minePendingTransactions();

  // Peta i ett redan minat block
  chain.chain[1].transactions[0].toAddress = '0xKen';

  assert.equal(chain.isChainValid(), false);
});

test('ägarbyte nekas om fromAddress inte är nuvarande ägare', () => {
  const chain = new Blockchain(1);
  chain.addTransaction({
    serialNumber: 'BIRKIN-2022-01',
    fromAddress: '0xHermes',
    toAddress: '0xBarbie',
    timestamp: Date.now(),
  });
  chain.minePendingTransactions();

  assert.throws(
    () =>
      chain.addTransaction({
        serialNumber: 'BIRKIN-2022-01',
        fromAddress: '0xKen', // Ken äger den inte
        toAddress: '0xSkelly',
        timestamp: Date.now(),
      }),
    ValidationError,
  );
});

test('dubbel-överlåtelse inom samma pool blockeras', () => {
  const chain = new Blockchain(1);
  chain.addTransaction({
    serialNumber: 'ART-0001',
    fromAddress: '0xGallery',
    toAddress: '0xBuyerA',
    timestamp: Date.now(),
  });
  // Galleriet försöker sälja igen innan minering, men äger den inte längre
  assert.throws(
    () =>
      chain.addTransaction({
        serialNumber: 'ART-0001',
        fromAddress: '0xGallery',
        toAddress: '0xBuyerB',
        timestamp: Date.now(),
      }),
    ValidationError,
  );
});

test('giltig ägarkedja går igenom och getPassportState följer med', () => {
  const chain = new Blockchain(1);
  chain.addTransaction({
    serialNumber: 'ART-0001',
    fromAddress: '0xGallery',
    toAddress: '0xBuyerA',
    timestamp: Date.now(),
  });
  chain.minePendingTransactions();
  chain.addTransaction({
    serialNumber: 'ART-0001',
    fromAddress: '0xBuyerA',
    toAddress: '0xBuyerB',
    timestamp: Date.now(),
  });
  chain.minePendingTransactions();

  const state = chain.getPassportState('ART-0001');
  assert.equal(state.currentOwner, '0xBuyerB');
  assert.equal(state.issuedBy, '0xGallery');
  assert.equal(state.history.length, 2);
  assert.ok(chain.isChainValid());
});
