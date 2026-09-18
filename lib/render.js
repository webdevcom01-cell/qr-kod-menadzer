function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAdminPage(records) {
  const rows = records
    .map((r) => {
      const code = escapeHtml(r.code);
      return `
      <tr>
        <td>${code}</td>
        <td>${escapeHtml(r.target_url)}</td>
        <td>${r.click_count}</td>
        <td><a href="/admin/codes/${code}/qr.png" target="_blank">
          <img src="/admin/codes/${code}/qr.png" alt="QR za ${code}" width="120" height="120">
        </a></td>
        <td>
          <form method="POST" action="/admin/codes/${code}">
            <input type="url" name="target_url" value="${escapeHtml(r.target_url)}" required>
            <button type="submit">Izmeni</button>
          </form>
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <title>QR Kod Menadžer — Admin</title>
</head>
<body>
  <h1>QR Kod Menadžer</h1>

  <h2>Novi kod</h2>
  <form method="POST" action="/admin/codes">
    <input type="url" name="target_url" placeholder="https://example.com/meni" required>
    <button type="submit">Kreiraj</button>
  </form>

  <h2>Postojeći kodovi</h2>
  <table border="1" cellpadding="6">
    <thead>
      <tr>
        <th>Kod</th>
        <th>Target URL</th>
        <th>Klikova</th>
        <th>QR</th>
        <th>Izmeni target</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">Nema zapisa.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = { renderAdminPage };
