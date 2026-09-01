import { daftraClient } from "../client.js";
import { DaftraError } from "../errors.js";
import type { DaftraPaymentRecord } from "../types.js";
import { getInvoice } from "./invoices.js";

export async function addInvoicePayment(data: {
  invoice_id: number;
  amount: number;
  payment_method?: string;
  transaction_number?: string;
  notes?: string;
}): Promise<DaftraPaymentRecord> {
  // Check invoice exists & check balance
  const invoice = await getInvoice(data.invoice_id);

  if (invoice.status === "paid" || (invoice.balance !== undefined && invoice.balance <= 0)) {
    throw new DaftraError("DAFTRA_VALIDATION_ERROR", `Invoice #${data.invoice_id} is already fully paid.`);
  }

  const payload = {
    Payment: {
      invoice_id: invoice.id,
      amount: data.amount,
      payment_method: data.payment_method || "bank_transfer",
      transaction_number: data.transaction_number || "",
      notes: data.notes || "",
      date: new Date().toISOString().split("T")[0],
    },
  };

  const response = await daftraClient.post("/api2/invoice_payments.json", payload);
  const created = response?.data?.Payment || response?.data || response;

  if (!created || !created.id) {
    throw new DaftraError("DAFTRA_WRITE_UNCERTAIN", "Failed to confirm payment creation response from Daftra ERP");
  }

  return {
    id: parseInt(String(created.id), 10),
    invoice_id: invoice.id,
    amount: parseFloat(String(created.amount || data.amount)),
    payment_method: created.payment_method || data.payment_method,
    transaction_number: created.transaction_number || data.transaction_number,
    date: created.date || new Date().toISOString().split("T")[0],
  };
}
