import { adminDb } from "./firebase";

export type CompanyForPdf = {
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

const PDF_DEFAULTS: CompanyForPdf = {
  companyName: "Ayman Frozen Foods LTD",
  tagline: "A Fresh Choice",
  address: "Unit 42 Camp Hill Ind. Estate. John Kempe Way. Birmingham B12 OHU",
  phone: "0121 572 9610",
  email: "info@aymanfoods.co.uk",
  bankName: "Lloyds Bank",
  sortCode: "30-99-50",
  accountNumber: "85098360",
  chequesPayableTo: "Ayman Frozen Foods Ltd.",
};

function hasAnyContent(data: Record<string, unknown>): boolean {
  const keys: (keyof CompanyForPdf)[] = [
    "companyName",
    "tagline",
    "address",
    "phone",
    "email",
    "bankName",
    "sortCode",
    "accountNumber",
    "chequesPayableTo",
  ];
  return keys.some((k) => {
    const v = data[k];
    return v != null && String(v).trim() !== "";
  });
}

function buildCompany(data: Record<string, unknown> | null): CompanyForPdf {
  if (!data || !hasAnyContent(data)) return PDF_DEFAULTS;
  return {
    companyName:
      (data.companyName != null && String(data.companyName).trim()) || PDF_DEFAULTS.companyName,
    tagline:
      data.tagline != null && String(data.tagline).trim()
        ? String(data.tagline).trim()
        : PDF_DEFAULTS.tagline,
    address:
      data.address != null && String(data.address).trim()
        ? String(data.address).trim()
        : PDF_DEFAULTS.address,
    phone:
      data.phone != null && String(data.phone).trim()
        ? String(data.phone).trim()
        : PDF_DEFAULTS.phone,
    email:
      data.email != null && String(data.email).trim()
        ? String(data.email).trim()
        : PDF_DEFAULTS.email,
    bankName:
      data.bankName != null && String(data.bankName).trim()
        ? String(data.bankName).trim()
        : PDF_DEFAULTS.bankName,
    sortCode:
      data.sortCode != null && String(data.sortCode).trim()
        ? String(data.sortCode).trim()
        : PDF_DEFAULTS.sortCode,
    accountNumber:
      data.accountNumber != null && String(data.accountNumber).trim()
        ? String(data.accountNumber).trim()
        : PDF_DEFAULTS.accountNumber,
    chequesPayableTo:
      data.chequesPayableTo != null && String(data.chequesPayableTo).trim()
        ? String(data.chequesPayableTo).trim()
        : PDF_DEFAULTS.chequesPayableTo,
  };
}

/**
 * Load company settings for PDF generation. Uses Firestore companySettings/default.
 * If the doc is missing or has no content, returns PDF_DEFAULTS so the invoice always renders.
 */
export async function getCompanyForPdf(): Promise<CompanyForPdf> {
  const ref = adminDb.collection("companySettings").doc("default");
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : null;
  return buildCompany(data);
}
