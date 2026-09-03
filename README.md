# LuxPass Ledger

Inlämningsuppgift 2, kursen Blockchain (Node.js) på Medieinstitutet.

REST API i Node.js/Express med ett eget Proof-of-Work-ledger i bakgrunden.
Scenario: digitala äkthetspass för lyxprodukter. Varje produkt knyts till ett
serienummer och alla ägarbyten sparas som transaktioner i en blockkedja. Ett
ägarbyte går bara igenom om avsändaren faktiskt äger produkten, och eftersom
varje block hashar in föregående block går gamla transaktioner inte att ändra
i efterhand.

## Köra

```bash
npm install
copy .env.example .env
npm start
```

Servern lyssnar på http://localhost:3000.

`.env`:

```
PORT=3000
POW_DIFFICULTY=1
```

`POW_DIFFICULTY` = antal ledande nollor blockets hash måste börja med. Låg siffra
under utveckling så mining går snabbt.

## Tester

```bash
npm test
```

Kör Nodes inbyggda testrunner. `test/engine.test.js` testar Block/Blockchain,
`test/api.test.js` startar appen och kör HTTP-anrop mot den.

## Endpoints

| Metod | Route | Beskrivning |
|-------|-------|-------------|
| GET | `/api/chain` | hela kedjan |
| GET | `/api/pending` | väntande transaktioner |
| POST | `/api/transactions` | validerar ett ägarbyte mot state-reglerna och lägger det i poolen |
| POST | `/api/mine` | minar poolen till ett nytt block |
| GET | `/api/verify/:id` | historik och nuvarande ägare för ett serienummer |

Färdiga exempelanrop finns i `api.http`.

Transaktion:

```json
{
  "serialNumber": "ROLEX-SUB-9981",
  "fromAddress": "0xManufacturerKey",
  "toAddress": "0xCollectorA",
  "timestamp": 1772188800000
}
```

`timestamp` är valfri.

## Struktur

```
src/
  engine/
    Block.js        block + calculateHash() (crypto) + mineBlock(difficulty)
    Blockchain.js   genesis-block, addTransaction, minePendingTransactions,
                    isChainValid, getPassportState
  domain/
    passportRules.js  reglerna för vad som får bli en transaktion
  controllers/      tar emot HTTP-anrop och anropar kedjan
  routes/           kopplar HTTP-metoder till controllers
  app.js            Express-appen, 404 och felhantering
  server.js         läser .env, skapar kedjan, startar servern
```

`engine` känner inte till "ägare" – den hanterar bara block och hashning. All
affärslogik ligger i `domain`.

## Begränsningar

- Kedjan ligger i minnet och nollställs vid omstart.
- `fromAddress` är en sträng, inte en riktig nyckel – ingen signering.
- Mining triggas manuellt, ingen belöning och inga konkurrerande noder.
