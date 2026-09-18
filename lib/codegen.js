const crypto = require('node:crypto');
const { insertCode } = require('../db');

// Base62 minus visually-ambiguous chars: 0/O, 1/I/l
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const CODE_LENGTH = 8;
const MAX_ATTEMPTS = 5;

function randomCode() {
  // crypto.randomInt does internal rejection sampling, so this is uniform
  // over ALPHABET (unlike randomBytes()[i] % ALPHABET.length, which biases
  // toward the first 256 % ALPHABET.length characters). Found by independent
  // Checker review of Spawn A, fixed same iteration.
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return code;
}

function createUniqueCode(targetUrl) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    try {
      insertCode(code, targetUrl);
      return code;
    } catch (err) {
      const isUniqueViolation =
        err.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(err.message);
      if (!isUniqueViolation) throw err;
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Failed to generate unique code after ${MAX_ATTEMPTS} attempts`);
      }
    }
  }
}

module.exports = { ALPHABET, CODE_LENGTH, createUniqueCode };
