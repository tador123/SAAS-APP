/**
 * Data export utilities — CSV download and PDF/print generation.
 *
 * No external libraries needed: we build CSV strings manually
 * and use the browser's built-in print dialog for PDF output.
 */

/**
 * Convert an array of objects to a CSV string with proper escaping.
 * @param {Object[]} data - Array of row objects
 * @param {Array<{ key: string, label: string }>} columns - Column definitions
 * @returns {string} CSV text
 */
export function toCSV(data, columns) {
  const escape = (val) => {
    const str = val == null ? '' : String(val);
    // Wrap in quotes if it contains comma, newline or double-quote
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escape(typeof c.key === 'function' ? c.key(row) : row[c.key])).join(','),
  );

  return [header, ...rows].join('\r\n');
}

/**
 * Trigger a file download from a string content.
 * @param {string} content - File body
 * @param {string} filename - Name for the downloaded file
 * @param {string} mime - MIME type (e.g. 'text/csv')
 */
export function downloadFile(content, filename, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a downloaded CSV file.
 * @param {Object[]} data
 * @param {Array<{ key: string|Function, label: string }>} columns
 * @param {string} filename
 */
export function exportCSV(data, columns, filename = 'export.csv') {
  const csv = toCSV(data, columns);
  downloadFile(csv, filename);
}

/**
 * Open a print-friendly window with tabular data (doubles as "Export PDF" via the browser print
 * dialog's "Save as PDF" option).
 * @param {Object} options
 * @param {string} options.title - Document / page title
 * @param {Object[]} options.data - Rows
 * @param {Array<{ key: string|Function, label: string }>} options.columns - Columns
 */
export function printTable({ title, data, columns }) {
  const html = buildPrintHTML({ title, body: buildTableHTML(data, columns) });
  openPrintWindow(html);
}

/**
 * Open a print-friendly window for a single invoice.
 * @param {Object} invoice - Invoice object with guest, items, etc.
 */
export function printInvoice(invoice) {
  const guest = invoice.guest;
  const guestName = guest ? `${guest.firstName} ${guest.lastName}` : 'Walk-in';

  const itemsHTML = (invoice.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.description}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.total).toFixed(2)}</td>
    </tr>`,
    )
    .join('');

  const body = `
    <div style="display:flex;justify-content:space-between;margin-bottom:32px">
      <div>
        <h1 style="margin:0;font-size:28px;color:#1e3a8a">HotelSaaS</h1>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px">Hospitality Management Platform</p>
      </div>
      <div style="text-align:right">
        <h2 style="margin:0;font-size:20px;text-transform:uppercase;color:#374151">Invoice</h2>
        <p style="margin:4px 0 0;font-size:14px;color:#6b7280">${invoice.invoiceNumber}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#9ca3af">${new Date(invoice.createdAt).toLocaleDateString()}</p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px">
      <div>
        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600">Bill To</p>
        <p style="margin:4px 0 0;font-weight:600">${guestName}</p>
        ${guest?.email ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280">${guest.email}</p>` : ''}
        ${guest?.phone ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280">${guest.phone}</p>` : ''}
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600">Status</p>
        <p style="margin:4px 0 0;font-weight:600;text-transform:capitalize">${invoice.status}</p>
        ${invoice.dueDate ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280">Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">Description</th>
          <th style="padding:10px 8px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280">Price</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <div style="margin-left:auto;width:250px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6b7280">
        <span>Subtotal</span><span>$${Number(invoice.subtotal).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6b7280">
        <span>Tax</span><span>$${Number(invoice.tax).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:700;border-top:2px solid #111827;margin-top:4px">
        <span>Total</span><span>$${Number(invoice.total).toFixed(2)}</span>
      </div>
    </div>

    ${invoice.notes ? `<div style="margin-top:32px;padding:12px 16px;background:#fffbeb;border-radius:8px;font-size:13px;color:#92400e"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

    <div style="margin-top:48px;text-align:center;font-size:12px;color:#9ca3af">
      <p>Thank you for your business!</p>
    </div>
  `;

  const html = buildPrintHTML({ title: `Invoice ${invoice.invoiceNumber}`, body });
  openPrintWindow(html);
}

/* ── Helpers ─────────────────────────────────────────── */

function buildTableHTML(data, columns) {
  const headerCells = columns.map((c) => `<th style="padding:10px 8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;background:#f3f4f6">${c.label}</th>`).join('');
  const rows = data.map((row) => {
    const cells = columns.map((c) => {
      const val = typeof c.key === 'function' ? c.key(row) : (row[c.key] ?? '');
      return `<td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildPrintHTML({ title, body }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #111827; }
    @media print {
      body { margin: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return;          // popup blocked
  win.document.write(html);
  win.document.close();
  // Small delay so styles are parsed before print dialog opens
  setTimeout(() => win.print(), 300);
}
