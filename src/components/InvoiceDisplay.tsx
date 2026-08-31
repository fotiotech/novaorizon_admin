"use client";

import {
  getInvoiceByOrderNumber,
  downloadInvoice,
} from "@/app/actions/invoice";
import { useEffect, useState } from "react";

interface InvoiceDisplayProps {
  orderNumber: string;
}

export default function InvoiceDisplay({ orderNumber }: InvoiceDisplayProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      setLoading(true);
      const result = await getInvoiceByOrderNumber(orderNumber);
      if (result.success && result.invoice) {
        setInvoice(result.invoice);
      }
      setLoading(false);
    }

    fetchInvoice();
  }, [orderNumber]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    setDownloadingPDF(true);
    const result = await downloadInvoice(invoice.invoiceNumber);

    if (result.success && result.data) {
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice ${result.data.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
              .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .invoice-title { font-size: 28px; font-weight: bold; }
              .invoice-number { font-size: 14px; color: #666; }
              .invoice-section { margin-bottom: 20px; }
              .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #333; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th { background-color: #f5f5f5; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              td { padding: 10px; border-bottom: 1px solid #eee; }
              .totals { display: flex; justify-content: flex-end; margin-top: 30px; }
              .totals-table { width: 300px; }
              .totals-table tr td:first-child { text-align: right; }
              .totals-table tr td:last-child { text-align: right; font-weight: bold; }
              .total-row td { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding: 15px 10px; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="invoice-header">
                <div>
                  <div class="invoice-title">INVOICE</div>
                  <div class="invoice-number">${result.data.invoiceNumber}</div>
                </div>
                <div style="text-align: right;">
                  <div class="invoice-number">Date: ${result.data.issuedAt}</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
                <div class="invoice-section">
                  <div class="section-title">BILL TO:</div>
                  <div>${result.data.customer}</div>
                  <div>${result.data.email}</div>
                  <div>${result.data.billingAddress.street}</div>
                  <div>${result.data.billingAddress.city}, ${result.data.billingAddress.region}</div>
                  <div>${result.data.billingAddress.country}</div>
                </div>

                <div class="invoice-section">
                  <div class="section-title">SHIP TO:</div>
                  <div>${result.data.shippingAddress.street}</div>
                  <div>${result.data.shippingAddress.city}, ${result.data.shippingAddress.region}</div>
                  <div>${result.data.shippingAddress.country}</div>
                </div>
              </div>

              <div class="invoice-section">
                <div class="section-title">ORDER DETAILS:</div>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${result.data.products
                      .map(
                        (p: any) => `
                      <tr>
                        <td>${p.name}</td>
                        <td>${p.quantity}</td>
                        <td>${p.price} CFA</td>
                        <td>${p.price * p.quantity} CFA</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>

              <div class="totals">
                <table class="totals-table">
                  <tr><td>Subtotal:</td><td>${result.data.subtotal} CFA</td></tr>
                  <tr><td>Tax:</td><td>${result.data.tax} CFA</td></tr>
                  <tr><td>Shipping:</td><td>${result.data.shippingCost} CFA</td></tr>
                  <tr><td>Discount:</td><td>-${result.data.discount} CFA</td></tr>
                  <tr class="total-row"><td>TOTAL:</td><td>${result.data.total} CFA</td></tr>
                </table>
              </div>

              <div class="footer">
                <p>Payment Method: ${result.data.paymentMethod}</p>
                <p>Thank you for your business!</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([invoiceHTML], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.data.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    setDownloadingPDF(false);
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="text-sm text-slate-500">No invoice available yet.</div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-emerald-700">
            Invoice Available
          </h3>
          <p className="text-xs text-emerald-600 mt-1">
            Invoice #{invoice.invoiceNumber}
          </p>
          <p className="text-xs text-emerald-600">
            Issued: {new Date(invoice.issuedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {downloadingPDF ? "Downloading..." : "Download Invoice"}
        </button>
      </div>
    </div>
  );
}
