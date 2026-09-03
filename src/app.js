import express from 'express';
import { createLedgerRoutes } from './routes/ledgerRoutes.js';
import { ValidationError } from './domain/passportRules.js';

/**
 * Bygger Express-appen kring en given blockchain-instans.
 * Separerat från server.js så att testerna kan starta appen på egen port.
 */
export function createApp(blockchain) {
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      name: 'LuxPass Ledger',
      description:
        'Proof-of-Work-ledger för digitala äkthetspass till lyxprodukter.',
      endpoints: {
        'GET /api/chain': 'Hela liggaren',
        'GET /api/pending': 'Väntande transaktioner',
        'POST /api/transactions': 'Registrera ägarbyte / utfärda pass',
        'POST /api/mine': 'Mina väntande transaktioner till ett block',
        'GET /api/verify/:id': 'Historik och nuvarande ägare för ett serienummer',
      },
    });
  });

  app.use('/api', createLedgerRoutes(blockchain));

  // 404 – ingen route matchade
  app.use((req, res) => {
    res
      .status(404)
      .json({ error: `Hittade inte ${req.method} ${req.originalUrl}` });
  });

  // Central felhantering: domänfel -> 422, trasig JSON -> 400, resten -> 500.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Ogiltig JSON i request-body.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internt serverfel.' });
  });

  return app;
}
