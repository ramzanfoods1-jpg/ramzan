import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type CompanySettings = {
  companyName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  chequesPayableTo: string | null;
};

type InvoiceData = {
  invoiceNumber: number;
  date: string;
  customerId?: string | null;
  customer: { name: string };
  salesperson: { name: string | null; salespersonCode: string | null };
  job: string | null;
  paymentTerms: string | null;
  dueDate: string | null;
  lineItems: Array<{ description: string; qty: number; unitPrice: number; lineTotal: number }>;
  totalBoxes: number | null;
  subtotal: number;
  salesTax: number;
  total: number;
};

const RED = rgb(0.82, 0.11, 0.11);
const BLUE = rgb(0.11, 0.25, 0.58);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

function formatDate(s: string): string {
  const d = new Date(s);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function buildInvoicePdf(
  settings: CompanySettings,
  invoice: InvoiceData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const page = doc.addPage([595, 842]);
  const margin = 50;
  const pageWidth = 595;
  const rightMargin = pageWidth - margin;
  let y = 820;

  const draw = (
    text: string,
    opts: {
      x: number;
      y: number;
      size?: number;
      font?: typeof font;
      color?: ReturnType<typeof rgb>;
    } = { x: margin, y: 0 }
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    const color = opts.color ?? BLACK;
    page.drawText(text, {
      x: opts.x,
      y: opts.y,
      size,
      font: f,
      color,
    });
  };

  // ----- 1. Logo: top-left corner -----
  const logoW = 140;
  let logoH = 40;
  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoX = margin;
  if (existsSync(logoPath)) {
    try {
      const logoBytes = readFileSync(logoPath);
      const logoImage = await doc.embedPng(logoBytes);
      logoH = (logoImage.height / logoImage.width) * logoW;
      page.drawImage(logoImage, { x: logoX, y: y - logoH, width: logoW, height: logoH });
    } catch {
      draw("Ramzan", { x: logoX, y: y - 14, size: 22, font: bold, color: RED });
      draw("FOOD PRODUCTS", { x: logoX, y: y - 28, size: 9 });
      logoH = 32;
    }
  } else {
    draw("Ramzan", { x: logoX, y: y - 14, size: 22, font: bold, color: RED });
    draw("FOOD PRODUCTS", { x: logoX, y: y - 28, size: 9 });
    logoH = 32;
  }

  // ----- 2. Thin blue line below logo -----
  const line1Y = y - logoH - 10;
  page.drawRectangle({
    x: margin,
    y: line1Y - 2,
    width: pageWidth - 2 * margin,
    height: 2,
    color: BLUE,
  });

  // ----- 3. Company name & tagline (left) | Date, Invoice #, Customer ID (right) -----
  const rightX = 380;
  const contentY = line1Y - 14;
  draw(settings.companyName || "Company Name", { x: margin, y: contentY, size: 14, font: bold });
  const taglineY = contentY - 14;
  if (settings.tagline) {
    draw(settings.tagline, { x: margin, y: taglineY, size: 10, font: italic });
  }
  draw(`Date: ${formatDate(invoice.date)}`, { x: rightX, y: contentY, size: 10 });
  draw(`Invoice #: ${invoice.invoiceNumber}`, { x: rightX, y: contentY - 14, size: 10, font: bold });
  draw(`Customer ID: ${invoice.customerId ?? ""}`, { x: rightX, y: contentY - 28, size: 10 });

  // ----- 4. Thin blue line below company / invoice details -----
  const line2Y = contentY - 28 - 12;
  page.drawRectangle({
    x: margin,
    y: line2Y - 2,
    width: pageWidth - 2 * margin,
    height: 2,
    color: BLUE,
  });

  // ----- To: Customer name -----
  y = line2Y - 14;
  draw("To:", { x: margin, y, size: 10, font: bold });
  y -= 14;
  draw(invoice.customer.name, { x: margin, y, size: 11, font: bold });
  y -= 20;

  // ----- Salesperson: blue box header + value -----
  const salespersonLabelWidth = 80;
  const salespersonBoxHeight = 18;
  page.drawRectangle({
    x: margin,
    y: y - salespersonBoxHeight + 4,
    width: salespersonLabelWidth,
    height: salespersonBoxHeight,
    color: BLUE,
  });
  draw("Salesperson", { x: margin + 4, y: y - 10, size: 9, font: bold, color: WHITE });
  draw(
    invoice.salesperson.salespersonCode ?? invoice.salesperson.name ?? "",
    { x: margin, y: y - 28, size: 10 }
  );
  y -= 38;

  // ----- Table: blue header row (Qty, Description, Unit Price, Line Total) -----
  const colQty = margin;
  const colDesc = margin + 38;
  const colTotal = 480;
  const tableWidth = rightMargin - margin;
  const rowHeight = 16;
  const headerHeight = 20;
  const headerY = y - 14;
  const gapBelowHeader = 8;

  page.drawRectangle({
    x: margin,
    y: y - headerHeight + 4,
    width: tableWidth,
    height: headerHeight,
    color: BLUE,
  });
  draw("Qty", { x: colQty + 4, y: headerY, size: 9, font: bold, color: WHITE });
  draw("Description", { x: colDesc + 4, y: headerY, size: 9, font: bold, color: WHITE });
  const unitPriceW = bold.widthOfTextAtSize("Unit Price", 9);
  const lineTotalW = bold.widthOfTextAtSize("Line Total", 9);
  draw("Unit Price", { x: colTotal - 4 - unitPriceW, y: headerY, size: 9, font: bold, color: WHITE });
  draw("Line Total", { x: rightMargin - 4 - lineTotalW, y: headerY, size: 9, font: bold, color: WHITE });
  y -= headerHeight + gapBelowHeader;

  for (const line of invoice.lineItems) {
    draw(String(line.qty || ""), { x: colQty, y, size: 9 });
    const desc =
      line.description.length > 52 ? line.description.slice(0, 49) + "…" : line.description;
    draw(desc, { x: colDesc, y, size: 9 });
    const unitPriceText = `£${Number(line.unitPrice).toFixed(2)}`;
    const lineTotalText = `£${Number(line.lineTotal).toFixed(2)}`;
    draw(unitPriceText, { x: colTotal - 4 - font.widthOfTextAtSize(unitPriceText, 9), y, size: 9 });
    draw(lineTotalText, { x: rightMargin - 4 - font.widthOfTextAtSize(lineTotalText, 9), y, size: 9 });
    y -= rowHeight;
  }

  // Total Boxes row (one row: Qty col = count, Description = "Total Boxes", Line Total = £0.00)
  y -= 4;
  draw(invoice.totalBoxes != null ? String(invoice.totalBoxes) : "0", {
    x: colQty,
    y,
    size: 10,
    font: bold,
  });
  draw("Total Boxes", { x: colDesc, y, size: 10, font: bold });
  const zeroW = font.widthOfTextAtSize("£0.00", 10);
  draw("£0.00", { x: rightMargin - 4 - zeroW, y, size: 10 });
  y -= 24;

  // ----- Summary: Subtotal, Sales Tax, Total (right-aligned) -----
  const sumX = 400;
  draw("Subtotal", { x: sumX, y, size: 10 });
  const subtotalText = `£${invoice.subtotal.toFixed(2)}`;
  draw(subtotalText, { x: rightMargin - 4 - font.widthOfTextAtSize(subtotalText, 10), y, size: 10 });
  y -= 12;
  draw("Sales Tax", { x: sumX, y, size: 10 });
  const salesTaxText = invoice.salesTax > 0 ? `£${invoice.salesTax.toFixed(2)}` : "";
  if (salesTaxText) draw(salesTaxText, { x: rightMargin - 4 - font.widthOfTextAtSize(salesTaxText, 10), y, size: 10 });
  y -= 12;
  draw("Total", { x: sumX, y, size: 11, font: bold });
  const totalText = `£${invoice.total.toFixed(2)}`;
  draw(totalText, { x: rightMargin - 4 - font.widthOfTextAtSize(totalText, 11), y, size: 11, font: bold });
  y -= 28;

  // ----- Received: Account, Cash, Cheque -----
  draw("Received", { x: margin, y, size: 10, font: bold });
  draw("Account", { x: margin + 75, y, size: 9 });
  draw("Cash", { x: margin + 145, y, size: 9 });
  draw("Cheque", { x: margin + 195, y, size: 9 });
  y -= 36;

  // ----- Footer: centered, bank & contact -----
  const centerX = pageWidth / 2;
  const defaultFooterLines = [
    "Make all checks payable to Ayman Frozen Foods Ltd.",
    "Lloyds Bank: S/C: 30-99-50 A/C No. 85098360",
    "Unit 42 Camp Hill Ind. Estate. John Kempe Way. Birmingham B12 OHU",
    "Phone. 0121572 9610 E-mail: info@aymanfoods.co.uk",
  ];
  let footerLines: string[] = [];
  if (settings.chequesPayableTo) {
    footerLines.push(`Make all checks payable to ${settings.chequesPayableTo}`);
  }
  if (settings.bankName || settings.sortCode || settings.accountNumber) {
    const bankParts = [
      settings.bankName,
      settings.sortCode && `S/C: ${settings.sortCode}`,
      settings.accountNumber && `A/C No. ${settings.accountNumber}`,
    ].filter(Boolean);
    footerLines.push(bankParts.join(" "));
  }
  if (settings.address) footerLines.push(settings.address);
  if (settings.phone || settings.email) {
    footerLines.push(
      `Phone: ${settings.phone ?? ""} E-mail: ${settings.email ?? ""}`.trim()
    );
  }
  if (footerLines.length === 0) footerLines = defaultFooterLines;

  const footerSize = 9;
  const footerLineHeight = 14;
  for (const line of footerLines) {
    const textWidth = font.widthOfTextAtSize(line, footerSize);
    draw(line, {
      x: centerX - textWidth / 2,
      y,
      size: footerSize,
    });
    y -= footerLineHeight;
  }

  return doc.save();
}
