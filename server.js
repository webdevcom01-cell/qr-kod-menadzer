const express = require('express');
const basicAuth = require('express-basic-auth');
const QRCode = require('qrcode');

const db = require('./db');
const { createUniqueCode } = require('./lib/codegen');
const { renderAdminPage } = require('./lib/render');

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

app.get('/admin', (req, res) => {
  const records = db.getAllCodes();
  res.type('html').send(renderAdminPage(records));
});

app.get('/admin/codes/:code/qr.png', async (req, res) => {
  const record = db.getByCode(req.params.code);
  if (!record) {
    res.status(404).send('Not found');
    return;
  }
  const redirectUrl = `${req.protocol}://${req.get('host')}/r/${req.params.code}`;
  // Explicit try/catch (Checker finding on Spawn C): don't rely on Express 5's
  // automatic async-rejection forwarding alone -- fail loudly with a real 500
  // instead of an unhandled state if QR generation ever throws.
  try {
    const png = await QRCode.toBuffer(redirectUrl, { type: 'png' });
    res.type('png').send(png);
  } catch (err) {
    res.status(500).send('QR generisanje neuspešno');
  }
});

// HTML <form> submissions (no JS/fetch, per spec) post as
// application/x-www-form-urlencoded and expect a 302 back to /admin so a
// page refresh doesn't resubmit the form; JSON API callers get JSON back.
function isFormSubmission(req) {
  return Boolean(req.is('application/x-www-form-urlencoded'));
}

app.post('/admin/codes', (req, res) => {
  const targetUrl = req.body && req.body.target_url;
  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    if (isFormSubmission(req)) {
      res.status(400).send('target_url mora biti validan http:// ili https:// URL');
      return;
    }
    res.status(400).json({ error: 'target_url mora biti validan http:// ili https:// URL' });
    return;
  }
  const code = createUniqueCode(targetUrl);
  if (isFormSubmission(req)) {
    res.redirect(302, '/admin');
    return;
  }
  res.status(201).json({ code, target_url: targetUrl });
});

app.post('/admin/codes/:code', (req, res) => {
  const targetUrl = req.body && req.body.target_url;
  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    if (isFormSubmission(req)) {
      res.status(400).send('target_url mora biti validan http:// ili https:// URL');
      return;
    }
    res.status(400).json({ error: 'target_url mora biti validan http:// ili https:// URL' });
    return;
  }
  const existing = db.getByCode(req.params.code);
  if (!existing) {
    if (isFormSubmission(req)) {
      res.status(404).send('Kod ne postoji');
      return;
    }
    res.status(404).json({ error: 'Kod ne postoji' });
    return;
  }
  db.updateTargetUrl(req.params.code, targetUrl);
  if (isFormSubmission(req)) {
    res.redirect(302, '/admin');
    return;
  }
  res.json({ code: req.params.code, target_url: targetUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
