/**
 * Domän-/affärslogik för de digitala äkthetspassen.
 *
 * Här ligger reglerna för när ett ägarbyte över huvud taget får bli en
 * transaktion. Engine-lagret (Block/Blockchain) vet inget om "ägare" – det
 * hanterar bara hashning och block. Verifieringen bor alltså här, datan i
 * kedjan.
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 422;
  }
}

const REQUIRED_FIELDS = ['serialNumber', 'fromAddress', 'toAddress'];

/**
 * Plockar ut de fält vi bryr oss om ur en inkommande payload, trimmar
 * strängar och sätter timestamp om den saknas. Kastar ValidationError vid
 * uppenbart trasig input.
 */
export function buildTransaction(payload = {}) {
  for (const field of REQUIRED_FIELDS) {
    const value = payload[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(`Fältet "${field}" saknas eller är tomt.`);
    }
  }

  const timestamp =
    typeof payload.timestamp === 'number' && Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : Date.now();

  return {
    serialNumber: payload.serialNumber.trim(),
    fromAddress: payload.fromAddress.trim(),
    toAddress: payload.toAddress.trim(),
    timestamp,
  };
}

/**
 * Kontrollerar transaktionen mot ledgerns nuvarande state.
 *
 *  - Första gången ett serienummer dyker upp = utfärdande ("mint"). Då får
 *    fromAddress vara vem som helst (tillverkaren) och toAddress blir
 *    förste ägaren.
 *  - Därefter måste fromAddress vara den som *just nu* äger passet, annars
 *    kan vem som helst skriva om ägarskapet.
 *  - Man kan inte överlåta till sig själv.
 */
export function validateAgainstState(blockchain, transaction) {
  const { serialNumber, fromAddress, toAddress } = transaction;

  if (fromAddress === toAddress) {
    throw new ValidationError('fromAddress och toAddress kan inte vara samma.');
  }

  const state = blockchain.getPassportState(serialNumber);

  if (!state.exists) {
    return; // utfärdande – inget tidigare ägarskap att kollidera med
  }

  if (state.currentOwner !== fromAddress) {
    throw new ValidationError(
      `Ägarbyte nekat: ${fromAddress} äger inte ${serialNumber}. ` +
        `Nuvarande ägare är ${state.currentOwner}.`,
    );
  }
}
