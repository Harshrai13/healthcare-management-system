const PDFDocument = require('pdfkit');

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#059669').text('VerdantCare Medical Center', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Healthcare Management System', { align: 'center' });
    doc.moveDown(2);

    // Invoice title
    doc.fontSize(18).fillColor('#111').text('INVOICE', { align: 'right' });
    doc.moveDown(1);

    // Invoice details
    doc.fontSize(10).fillColor('#666');
    doc.text(`Invoice ID: ${invoice._id.toString().slice(-8).toUpperCase()}`, { align: 'right' });
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, { align: 'right' });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: 'right' });
    doc.text(`Status: ${invoice.status}`, { align: 'right' });
    doc.moveDown(2);

    // Patient info
    const patient = invoice.patientId;
    doc.fontSize(12).fillColor('#111').text('Bill To:');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666');
    if (patient) {
      doc.text(`${patient.firstName} ${patient.lastName}`);
      doc.text(patient.email);
      if (patient.phone) doc.text(patient.phone);
    }
    doc.moveDown(2);

    // Items table
    doc.fontSize(11).fillColor('#111').text('Services:');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [250, 80, 80, 90];

    // Table header
    doc.fontSize(9).fillColor('#fff').rect(tableLeft, tableTop, colWidths[0], 25).fill('#059669');
    doc.text('Description', tableLeft + 5, tableTop + 7, { width: colWidths[0] - 10 });
    doc.rect(tableLeft + colWidths[0], tableTop, colWidths[1], 25).fill('#059669');
    doc.text('Qty', tableLeft + colWidths[0] + 5, tableTop + 7, { width: colWidths[1] - 10 });
    doc.rect(tableLeft + colWidths[0] + colWidths[1], tableTop, colWidths[2], 25).fill('#059669');
    doc.text('Rate', tableLeft + colWidths[0] + colWidths[1] + 5, tableTop + 7, { width: colWidths[2] - 10 });
    doc.rect(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop, colWidths[3], 25).fill('#059669');
    doc.text('Amount', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, tableTop + 7, { width: colWidths[3] - 10 });

    let currentY = tableTop + 30;

    // Table rows
    const items = invoice.items || [];
    items.forEach((item, index) => {
      const rowHeight = 25;
      const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';

      doc.fillColor(bgColor).rect(tableLeft, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill();
      doc.fillColor('#111').fontSize(9);
      doc.text(item.description || 'Service', tableLeft + 5, currentY + 7, { width: colWidths[0] - 10 });
      doc.text(String(item.quantity || 1), tableLeft + colWidths[0] + 5, currentY + 7, { width: colWidths[1] - 10 });
      doc.text(formatCurrency(item.rate || item.price || 0), tableLeft + colWidths[0] + colWidths[1] + 5, currentY + 7, { width: colWidths[2] - 10 });
      doc.text(formatCurrency(item.amount || (item.quantity || 1) * (item.rate || item.price || 0)), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 7, { width: colWidths[3] - 10 });

      currentY += rowHeight;
    });

    // Totals
    currentY += 10;
    doc.fontSize(10).fillColor('#666');
    doc.text('Subtotal:', 350, currentY, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.subtotal), 460, currentY, { width: 90 });
    currentY += 20;
    doc.text('Tax:', 350, currentY, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.tax), 460, currentY, { width: 90 });
    currentY += 25;
    doc.fontSize(12).fillColor('#059669').font('Helvetica-Bold');
    doc.text('Total:', 350, currentY, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.total), 460, currentY, { width: 90 });

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).fillColor('#999').text('Thank you for choosing VerdantCare Medical Center.', { align: 'center' });
    doc.text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();
  });
}

async function generateReceiptPDF(payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const invoice = payment.invoiceId;
    const patient = invoice?.patientId;

    // Header
    doc.fontSize(24).fillColor('#059669').text('VerdantCare Medical Center', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Healthcare Management System', { align: 'center' });
    doc.moveDown(2);

    // Receipt title
    doc.fontSize(18).fillColor('#111').text('PAYMENT RECEIPT', { align: 'right' });
    doc.moveDown(1);

    // Receipt details
    doc.fontSize(10).fillColor('#666');
    doc.text(`Receipt ID: ${payment._id.toString().slice(-8).toUpperCase()}`, { align: 'right' });
    doc.text(`Date: ${formatDate(payment.createdAt)}`, { align: 'right' });
    doc.text(`Payment Method: ${payment.method}`, { align: 'right' });
    if (payment.transactionId) doc.text(`Transaction ID: ${payment.transactionId}`, { align: 'right' });
    doc.moveDown(2);

    // Patient info
    doc.fontSize(12).fillColor('#111').text('Received From:');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666');
    if (patient) {
      doc.text(`${patient.firstName} ${patient.lastName}`);
      doc.text(patient.email);
    }
    doc.moveDown(2);

    // Payment details
    doc.fontSize(11).fillColor('#111').text('Payment Details:');
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#666');
    doc.text(`Invoice ID: ${invoice?._id.toString().slice(-8).toUpperCase() || '-'}`);
    doc.moveDown(0.5);
    doc.text(`Amount Paid: ${formatCurrency(payment.amount)}`);
    doc.moveDown(0.5);
    doc.text(`Gateway: ${payment.gateway || 'manual'}`);
    doc.moveDown(2);

    // Status
    doc.fontSize(14).fillColor('#059669').font('Helvetica-Bold');
    doc.text(`Status: ${payment.status}`, { align: 'center' });

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).fillColor('#999').font('Helvetica');
    doc.text('Thank you for your payment.', { align: 'center' });
    doc.text('This is a computer-generated receipt.', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoicePDF, generateReceiptPDF };
