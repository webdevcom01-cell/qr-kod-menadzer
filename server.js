const express = require('express');
const basicAuth = require('express-basic-auth');

const db = require('./db');
const { createUniqueCode } = require('./lib/codegen');

if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_USER i ADMIN_PASSWORD env varijable moraju biti setovane pre starta servera.'
  );
}

function isValidHttpUrl(str) {
  // Found by independent Checker review of Spawn B: new URL() stringifies
  // non-string input (e.g. a one-element array survives String() coercion),
  // so a JSON body with target_url as an array could slip past this check
  // and fail deeper in db.js instead of returning a clean 400 here.
  if (typeof str !== 'string') return false;
  let parsed;
  try {
    parsed = new URL(str);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/r/:code', (req, res) => {
  const record = db.getByCode(req.params.code);
  if (!record) {
    res.status(404).send('Not found');
    return;
  }
  db.incrementClickAtomic(req.params.code);
  res.redirect(302, record.target_url);
});

const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD },
  challenge: true,
});

app.use('/admin', adminAuth);

app.post('/admin/codes', (req, res) => {
  const targetUrl = req.body && req.body.target_url;
  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    res.status(400).json({ error: 'target_url mora biti validan http:// ili https:// URL' });
    return;
  }
  const code = createUniqueCode(targetUrl);
  res.status(201).json({ code, target_url: targetUrl });
});

app.post('/admin/codes/:code', (req, res) => {
  const targetUrl = req.body && req.body.target_url;
  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    res.status(400).json({ error: 'target_url mora biti validan http:// ili https:// URL' });
    return;
  }
  const existing = db.getByCode(req.params.code);
  if (!existing) {
    res.status(404).json({ error: 'Kod ne postoji' });
    return;
  }
  db.updateTargetUrl(req.params.code, targetUrl);
  res.json({ code: req.params.code, target_url: targetUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
