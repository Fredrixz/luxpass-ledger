import { createHash } from 'node:crypto';

/**
 * Fältordningen som hashas. Låst med flit: JSON.stringify bevarar den ordning
 * nycklarna sattes in i, så genom att alltid bygga objekten i den här ordningen
 * blir hashen identisk oavsett plattform eller i vilken ordning klienten råkade
 * skicka in fälten.
 */
const TRANSACTION_FIELDS = [
  'serialNumber',
  'fromAddress',
  'toAddress',
  'timestamp',
];

function normalizeTransaction(transaction) {
  const ordered = {};
  for (const field of TRANSACTION_FIELDS) {
    ordered[field] = transaction[field];
  }
  return ordered;
}

/**
 * Ett enskilt block i kedjan.
 *
 * Blocket bär en array av transaktioner (state-förändringar) och binder ihop
 * sig med föregående block via previousHash. hash räknas fram från *allt*
 * innehåll, så minsta ändring i datan ger en helt annan hash.
 */
export default class Block {
  constructor(index, timestamp, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  /**
   * Serialiserar blocket till den exakta sträng som ska hashas. Görs i ett eget
   * steg så att datan är "ren" (bara kända fält, bestämd ordning) innan den går
   * in i crypto.createHash() – annars kan olika nyckelordning ge olika hashar
   * för samma data.
   */
  serialize() {
    return JSON.stringify({
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      transactions: this.transactions.map(normalizeTransaction),
      nonce: this.nonce,
    });
  }

  calculateHash() {
    return createHash('sha256').update(this.serialize()).digest('hex');
  }

  /**
   * Proof-of-Work: höj nonce tills hashen börjar med `difficulty` nollor.
   * Det finns ingen genväg – man får helt enkelt prova sig fram, vilket är
   * själva poängen med PoW (dyrt att skapa, billigt att verifiera).
   */
  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    return this;
  }
}
