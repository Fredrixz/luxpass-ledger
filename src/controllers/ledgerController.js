import { buildTransaction } from '../domain/passportRules.js';

/**
 * Controllers – översätter HTTP till anrop mot blockchain-instansen och
 * formar svaret. Ingen affärslogik här, den ligger i domain-lagret.
 *
 * `blockchain` skickas in via createLedgerController() så att servern och
 * testerna kan använda varsin färsk instans.
 */
export function createLedgerController(blockchain) {
  return {
    // GET /api/chain
    getChain(req, res) {
      res.json({
        length: blockchain.chain.length,
        difficulty: blockchain.difficulty,
        valid: blockchain.isChainValid(),
        pendingTransactions: blockchain.pendingTransactions.length,
        chain: blockchain.chain,
      });
    },

    // GET /api/pending
    getPending(req, res) {
      res.json({
        count: blockchain.pendingTransactions.length,
        transactions: blockchain.pendingTransactions,
      });
    },

    // POST /api/transactions
    createTransaction(req, res) {
      const transaction = buildTransaction(req.body);
      blockchain.addTransaction(transaction);

      res.status(201).json({
        message: 'Transaktionen lades i poolen och väntar på att minas.',
        transaction,
        pendingTransactions: blockchain.pendingTransactions.length,
      });
    },

    // POST /api/mine
    mine(req, res) {
      if (blockchain.pendingTransactions.length === 0) {
        return res
          .status(400)
          .json({ error: 'Det finns inga väntande transaktioner att mina.' });
      }

      const block = blockchain.minePendingTransactions();

      res.status(201).json({
        message: `Block #${block.index} minat med ${block.transactions.length} transaktion(er).`,
        block,
      });
    },

    // GET /api/verify/:id
    verify(req, res) {
      const serialNumber = req.params.id;
      const state = blockchain.getPassportState(serialNumber);

      if (!state.exists) {
        return res.status(404).json({
          serialNumber,
          error: 'Inget pass hittades för det serienumret.',
        });
      }

      res.json({
        serialNumber,
        status: 'REGISTERED',
        issuedBy: state.issuedBy,
        currentOwner: state.currentOwner,
        transfers: state.history.length - 1,
        history: state.history,
        chainValid: blockchain.isChainValid(),
      });
    },
  };
}
