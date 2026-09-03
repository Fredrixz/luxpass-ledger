import { createHash } from 'node:crypto';

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

  calculateHash() {
    const payload =
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce;

    return createHash('sha256').update(payload).digest('hex');
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
