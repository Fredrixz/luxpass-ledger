import Block from './Block.js';
import { validateAgainstState } from '../domain/passportRules.js';

const GENESIS_TIMESTAMP = Date.parse('2026-01-01T00:00:00.000Z');

/**
 * Själva ledgern.
 *
 * Kedjan startar med ett hårdkodat genesis-block. Nya transaktioner samlas
 * först i pendingTransactions och "låses in" i ett block först när
 * minePendingTransactions() körs.
 */
export default class Blockchain {
  constructor(difficulty = 2) {
    this.difficulty = difficulty;
    this.pendingTransactions = [];
    this.chain = [Blockchain.createGenesisBlock()];
  }

  static createGenesisBlock() {
    const genesis = new Block(0, GENESIS_TIMESTAMP, [], '0');
    genesis.hash = genesis.calculateHash();
    return genesis;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /** Alla transaktioner som redan ligger i ett minat block. */
  getConfirmedTransactions() {
    return this.chain.flatMap((block) => block.transactions);
  }

  /**
   * Lägg en transaktion i poolen. Kastar om domänreglerna säger nej –
   * kontrollen sker mot både minade block och det som redan väntar i poolen,
   * så man kan inte "dubbel-sälja" samma produkt inom samma block.
   */
  addTransaction(transaction) {
    validateAgainstState(this, transaction);
    this.pendingTransactions.push(transaction);
    return transaction;
  }

  minePendingTransactions() {
    if (this.pendingTransactions.length === 0) {
      throw new Error('Inga väntande transaktioner att mina.');
    }

    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash,
    );
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];

    return block;
  }

  /**
   * Går igenom kedjan och kontrollerar att
   *  - varje block-hash fortfarande stämmer med innehållet
   *  - varje block pekar på rätt föregående hash
   *  - varje block faktiskt uppfyller Proof-of-Work
   */
  isChainValid() {
    const target = '0'.repeat(this.difficulty);

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
      if (!current.hash.startsWith(target)) return false;
    }

    return true;
  }

  /**
   * Bygger upp nuvarande state för ett serienummer genom att spela upp alla
   * transaktioner i ordning (minade först, sedan väntande).
   */
  getPassportState(serialNumber, { includePending = true } = {}) {
    const history = [
      ...this.getConfirmedTransactions(),
      ...(includePending ? this.pendingTransactions : []),
    ].filter((tx) => tx.serialNumber === serialNumber);

    if (history.length === 0) {
      return { exists: false, currentOwner: null, history: [] };
    }

    return {
      exists: true,
      currentOwner: history[history.length - 1].toAddress,
      issuedBy: history[0].fromAddress,
      history,
    };
  }
}
