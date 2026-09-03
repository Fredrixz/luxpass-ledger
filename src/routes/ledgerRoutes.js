import { Router } from 'express';
import { createLedgerController } from '../controllers/ledgerController.js';

/**
 * Mappar HTTP-metoder mot CRUD-operationer på ledgern:
 *   GET  /api/chain           -> läs hela liggaren
 *   GET  /api/pending         -> läs poolen
 *   POST /api/transactions    -> skapa transaktion (valideras mot state)
 *   POST /api/mine            -> "commit": mina poolen till ett block
 *   GET  /api/verify/:id      -> läs historik + nuvarande status för ett pass
 */
export function createLedgerRoutes(blockchain) {
  const router = Router();
  const controller = createLedgerController(blockchain);

  router.get('/chain', controller.getChain);
  router.get('/pending', controller.getPending);
  router.post('/transactions', controller.createTransaction);
  router.post('/mine', controller.mine);
  router.get('/verify/:id', controller.verify);

  return router;
}
