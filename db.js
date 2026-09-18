const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = process.env.DB_PATH || './data/qr.db';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY,
    target_url TEXT NOT NULL,
    click_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

function getByCode(code) {
  const stmt = db.prepare('SELECT * FROM codes WHERE code = ?');
  return stmt.get(code);
}

function getAllCodes() {
  const stmt = db.prepare('SELECT * FROM codes ORDER BY created_at DESC');
  return stmt.all();
}

function insertCode(code, targetUrl) {
  const stmt = db.prepare('INSERT INTO codes (code, target_url) VALUES (?, ?)');
  stmt.run(code, targetUrl);
}

function updateTargetUrl(code, newUrl) {
  const stmt = db.prepare('UPDATE codes SET target_url = ? WHERE code = ?');
  stmt.run(newUrl, code);
}

function incrementClickAtomic(code) {
  const stmt = db.prepare('UPDATE codes SET click_count = click_count + 1 WHERE code = ?');
  stmt.run(code);
}

function getCodeCount() {
  const stmt = db.prepare('SELECT COUNT(*) AS count FROM codes');
  return stmt.get().count;
}

module.exports = {
  db,
  getByCode,
  getAllCodes,
  insertCode,
  updateTargetUrl,
  incrementClickAtomic,
  getCodeCount,
};
