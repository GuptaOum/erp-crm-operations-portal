import PDFDocument from 'pdfkit';
import { env } from '../config/env';
import { ChallanRecord } from '../modules/challans/challans.service';

const PAGE_MARGIN = 48;
const CONTENT_RIGHT = 547;
const ROW_HEIGHT = 20;
const PAGE_BOTTOM = 720;

const columns = {
  index: { x: 48, width: 24 },
  sku: { x: 72, width: 90 },
  name: { x: 162, width: 180 },
  quantity: { x: 342, width: 50 },
  rate: { x: 392, width: 75 },
  amount: { x: 467, width: 80 },
};

const money = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value: Date) {
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function drawRule(doc: PDFKit.PDFDocument, y: number, thickness = 0.5) {
  doc.lineWidth(thickness).moveTo(PAGE_MARGIN, y).lineTo(CONTENT_RIGHT, y).stroke('#000000');
}

function drawHeader(doc: PDFKit.PDFDocument) {
  doc.font('Helvetica-Bold').fontSize(16).text(env.company.name, PAGE_MARGIN, PAGE_MARGIN);
  doc.font('Helvetica').fontSize(9);
  doc.text(env.company.address, PAGE_MARGIN, doc.y + 2, { width: 300 });
  doc.text(`GSTIN ${env.company.gst}`, PAGE_MARGIN, doc.y + 1);

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('DELIVERY CHALLAN', PAGE_MARGIN, PAGE_MARGIN + 4, {
      width: CONTENT_RIGHT - PAGE_MARGIN,
      align: 'right',
    });

  drawRule(doc, 112, 1);
}

function drawParties(doc: PDFKit.PDFDocument, challan: ChallanRecord) {
  const top = 126;
  const { customer } = challan;

  doc.font('Helvetica-Bold').fontSize(9).text('BILL TO', PAGE_MARGIN, top);
  doc.font('Helvetica').fontSize(10);
  doc.text(customer.businessName, PAGE_MARGIN, top + 14, { width: 250 });
  doc.fontSize(9);
  doc.text(customer.name, PAGE_MARGIN, doc.y + 1, { width: 250 });
  doc.text(`${customer.addressLine}, ${customer.city}`, PAGE_MARGIN, doc.y + 1, { width: 250 });
  doc.text(`${customer.state} ${customer.pincode}`, PAGE_MARGIN, doc.y + 1, { width: 250 });
  doc.text(`Mobile ${customer.mobile}`, PAGE_MARGIN, doc.y + 1, { width: 250 });

  if (customer.gstNumber) {
    doc.text(`GSTIN ${customer.gstNumber}`, PAGE_MARGIN, doc.y + 1, { width: 250 });
  }

  const rightX = 342;
  const rows = [
    ['Challan No', challan.challanNumber],
    ['Date', formatDate(challan.createdAt)],
    ['Status', challan.status],
    ['Prepared by', challan.createdBy.name],
  ];

  let y = top;

  for (const [label, value] of rows) {
    doc.font('Helvetica').fontSize(9).text(label, rightX, y, { width: 80 });
    doc.font('Helvetica-Bold').fontSize(9).text(value, rightX + 85, y, {
      width: CONTENT_RIGHT - rightX - 85,
      align: 'right',
    });
    y += 14;
  }

  return Math.max(doc.y, y) + 12;
}

function drawTableHead(doc: PDFKit.PDFDocument, y: number) {
  doc.rect(PAGE_MARGIN, y, CONTENT_RIGHT - PAGE_MARGIN, ROW_HEIGHT).fill('#eeeeee');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

  const textY = y + 6;
  doc.text('#', columns.index.x + 4, textY, { width: columns.index.width });
  doc.text('SKU', columns.sku.x, textY, { width: columns.sku.width });
  doc.text('Product', columns.name.x, textY, { width: columns.name.width });
  doc.text('Qty', columns.quantity.x, textY, { width: columns.quantity.width, align: 'right' });
  doc.text('Rate', columns.rate.x, textY, { width: columns.rate.width, align: 'right' });
  doc.text('Amount', columns.amount.x, textY, {
    width: columns.amount.width - 4,
    align: 'right',
  });

  return y + ROW_HEIGHT;
}

function drawItems(doc: PDFKit.PDFDocument, challan: ChallanRecord, startY: number) {
  let y = drawTableHead(doc, startY);
  let position = 1;

  for (const item of challan.items) {
    if (y + ROW_HEIGHT > PAGE_BOTTOM) {
      doc.addPage();
      y = drawTableHead(doc, PAGE_MARGIN);
    }

    const textY = y + 6;
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    doc.text(String(position), columns.index.x + 4, textY, { width: columns.index.width });
    doc.text(item.productSku, columns.sku.x, textY, { width: columns.sku.width });
    doc.text(item.productName, columns.name.x, textY, {
      width: columns.name.width,
      ellipsis: true,
      lineBreak: false,
    });
    doc.text(String(item.quantity), columns.quantity.x, textY, {
      width: columns.quantity.width,
      align: 'right',
    });
    doc.text(money.format(Number(item.unitPrice)), columns.rate.x, textY, {
      width: columns.rate.width,
      align: 'right',
    });
    doc.text(money.format(Number(item.lineTotal)), columns.amount.x, textY, {
      width: columns.amount.width - 4,
      align: 'right',
    });

    y += ROW_HEIGHT;
    drawRule(doc, y, 0.25);
    position += 1;
  }

  return y;
}

function drawTotals(doc: PDFKit.PDFDocument, challan: ChallanRecord, startY: number) {
  let y = startY + 8;

  doc.font('Helvetica').fontSize(9);
  doc.text('Total quantity', columns.rate.x - 90, y, { width: 140, align: 'right' });
  doc.font('Helvetica-Bold').text(String(challan.totalQuantity), columns.amount.x, y, {
    width: columns.amount.width - 4,
    align: 'right',
  });

  y += 16;
  doc.font('Helvetica').fontSize(10);
  doc.text('Total amount', columns.rate.x - 90, y, { width: 140, align: 'right' });
  doc.font('Helvetica-Bold').text(money.format(Number(challan.totalAmount)), columns.amount.x, y, {
    width: columns.amount.width - 4,
    align: 'right',
  });

  y += 20;
  drawRule(doc, y, 1);

  return y + 16;
}

function drawFooter(doc: PDFKit.PDFDocument, challan: ChallanRecord, startY: number) {
  let y = startY;

  if (challan.notes) {
    doc.font('Helvetica-Bold').fontSize(9).text('Notes', PAGE_MARGIN, y);
    doc.font('Helvetica').fontSize(9).text(challan.notes, PAGE_MARGIN, y + 12, { width: 320 });
    y = doc.y;
  }

  const signatureY = Math.max(y + 48, 660);

  drawRule(doc, signatureY, 0.5);
  doc.font('Helvetica').fontSize(8);
  doc.text('Received in good condition', PAGE_MARGIN, signatureY + 6, { width: 200 });
  doc.text(`For ${env.company.name}`, 347, signatureY + 6, { width: 200, align: 'right' });
}

export function buildChallanPdf(challan: ChallanRecord): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });

  doc.fillColor('#000000').strokeColor('#000000');

  drawHeader(doc);
  const itemsTop = drawParties(doc, challan);
  const itemsBottom = drawItems(doc, challan, itemsTop);
  const totalsBottom = drawTotals(doc, challan, itemsBottom);
  drawFooter(doc, challan, totalsBottom);

  doc.end();

  return doc;
}
