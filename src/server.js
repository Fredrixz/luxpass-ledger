import 'dotenv/config';
import { createApp } from './app.js';
import Blockchain from './engine/Blockchain.js';

const PORT = Number(process.env.PORT) || 3000;
const POW_DIFFICULTY = Number(process.env.POW_DIFFICULTY) || 2;

const blockchain = new Blockchain(POW_DIFFICULTY);
const app = createApp(blockchain);

app.listen(PORT, () => {
  console.log(`LuxPass Ledger körs på http://localhost:${PORT}`);
  console.log(`Proof-of-Work difficulty: ${POW_DIFFICULTY}`);
});
