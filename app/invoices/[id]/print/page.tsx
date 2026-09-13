'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Download, RefreshCw, CheckCircle2 } from 'lucide-react';

interface InvoicePrintData {
  invoice: {
    _id: string;
    number: string;
    date: string;
    items: Array<{
      productId?: string;
      wp: string;
      design: string;
      qty: number;
      rate: number;
      amount: number;
      isCustom?: boolean;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paid: number;
    remaining: number;
    method: string;
    jobStatus?: string;
    reference?: string;
    terms?: string;
    notes?: string;
    sellerName?: string;
    sellerContact?: string;
    createdByName?: string;
    customerId: {
      name: string;
      mobile: string;
      whatsapp?: string;
      address?: string;
      city?: string;
      code: string;
    };
  };
  settings?: {
    businessName?: string;
    logo?: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    sellerName?: string;
    sellerContact?: string;
    invoiceInstructions?: string;
  };
}

export default function InvoicePrintPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<InvoicePrintData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
        Generating Umar Usman Interior quotation &amp; bill...
      </div>
    );
  }

  if (!data || !data.invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-xs text-gray-500">
        Invoice not found.{' '}
        <Link href="/invoices" className="text-teal underline font-semibold">
          Return to list
        </Link>
      </div>
    );
  }

  const { invoice, settings } = data;
  const businessName = settings?.businessName || 'UMAR USMAN INTERIOR';
  const phone = settings?.phone || '+92 303 4333227';
  const email = settings?.email || 'info@umarusmanwallpaper.com';
  const address =
    settings?.address ||
    'College road near five star naan shop, Lahore Punjab Pakistan';

  // Seller Details (from invoice, with fallback to settings/defaults)
  const sellerName =
    invoice.sellerName ||
    invoice.createdByName ||
    settings?.sellerName ||
    'Umar Nawaz';
  const sellerContact =
    invoice.sellerContact ||
    settings?.sellerContact ||
    settings?.phone ||
    settings?.whatsapp ||
    '+92 300 4131532';

  const customerName = invoice.customerId?.name || 'Walk-in Customer';
  const customerAddress =
    invoice.customerId?.address ||
    `${invoice.customerId?.city || 'Lahore'}, Pakistan`;
  const customerMobile = invoice.customerId?.mobile || '-';
  const customerCode = invoice.customerId?.code || '';
  const invoiceRef = invoice.reference && invoice.reference !== '0' ? invoice.reference : '';
  const invoiceTerms = invoice.terms || '100% Advance / Cash';
  const statusLabel =
    invoice.jobStatus || (invoice.remaining === 0 ? 'Fully Paid' : 'On Order');

  return (
    <div className="min-h-screen bg-gray-100 py-4 print:py-0 print:bg-white text-gray-900 font-sans">
      {/* Global CSS to strictly force 1-page A4 print layout */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm 6mm 8mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Non-printable Action Toolbar */}
      <div className="max-w-4xl mx-auto mb-3 px-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Link href={`/invoices/${invoice._id}`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Invoice
            </Button>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            1-Page Cover Optimized (A4)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="teal"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Save as PDF
          </Button>
          <Button
            variant="brass"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Quotation (1 Page)
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container — Single Page Cover */}
      <div className="printable-area max-w-4xl mx-auto bg-white p-6 sm:p-8 print:p-0 print:m-0 border border-gray-300 print:border-none rounded-lg print:rounded-none shadow-md print:shadow-none">
        {/* Header: Company Info on Left, Quotation & Balance Due on Right */}
        <div className="flex justify-between items-start pb-3 print:pb-2 border-b border-gray-300 avoid-break">
          {/* Company Branding */}
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 print:w-12 print:h-12 shrink-0 p-1 border border-gray-200 rounded flex items-center justify-center bg-white shadow-xs">
              <img
                src="/logo.png"
                alt="Umar Usman Interior Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl print:text-lg font-black text-gray-900 uppercase tracking-tight leading-none">
                {businessName}
              </h1>
              <div className="text-[11px] print:text-[10px] text-gray-600 font-medium mt-1 leading-tight">
                {address}
              </div>
              <div className="text-[11px] print:text-[10px] text-gray-700 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Tel: <strong>{phone}</strong></span>
                <span>•</span>
                <span>Email: {email}</span>
              </div>
              <div className="text-[11px] print:text-[10px] text-gray-900 font-semibold mt-0.5">
                Seller / Sales Rep: <strong className="text-gray-950 font-black">{sellerName}</strong> ({sellerContact})
              </div>
            </div>
          </div>

          {/* Quotation & Balance Due Box */}
          <div className="text-right shrink-0">
            <div className="text-lg print:text-base font-black text-gray-900 uppercase tracking-wide">
              Quotation / Bill
            </div>
            <div className="font-mono text-xs sm:text-sm print:text-xs font-bold text-teal mt-0.5">
              # {invoice.number.startsWith('INV-') ? invoice.number.replace('INV-', 'QTN-') : invoice.number}
            </div>

            {/* Prominent Balance Due Box */}
            <div className="mt-1.5 inline-block border-2 border-gray-900 bg-gray-50 px-3 py-1 print:px-2.5 print:py-0.5 rounded text-right shadow-xs">
              <div className="text-[10px] print:text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                Balance Due:
              </div>
              <div className="text-sm sm:text-base print:text-sm font-black text-gray-900 font-mono leading-none mt-0.5">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Metadata Table: Bill To (Customer), Seller Info (Name & Number), Quotation Details */}
        <div className="grid grid-cols-3 border border-gray-300 my-3 print:my-1.5 text-xs print:text-[10.5px] divide-x divide-gray-300 rounded overflow-hidden avoid-break">
          {/* Column 1: Bill To (Customer Details) */}
          <div className="p-2.5 print:p-1.5 bg-gray-50/60">
            <div className="font-bold text-gray-800 uppercase text-[10px] print:text-[9px] tracking-wider mb-0.5">
              Bill To (Customer)
            </div>
            <div className="font-bold text-gray-900 text-xs sm:text-sm print:text-xs">
              {customerName} {customerCode && <span className="text-[10px] text-teal font-mono">({customerCode})</span>}
            </div>
            <div className="text-gray-700 text-[11px] print:text-[10px] mt-0.5 truncate">{customerAddress}</div>
            <div className="text-gray-800 font-semibold text-[11px] print:text-[10px] mt-0.5">
              Phone: {customerMobile}
            </div>
          </div>

          {/* Column 2: Seller Information (Seller Name & Phone Number) */}
          <div className="p-2.5 print:p-1.5 bg-gray-50/30">
            <div className="font-bold text-gray-800 uppercase text-[10px] print:text-[9px] tracking-wider mb-0.5">
              Seller / Sales Officer
            </div>
            <div className="font-black text-gray-950 text-xs sm:text-sm print:text-xs">
              {sellerName}
            </div>
            <div className="text-gray-900 font-bold text-[11px] print:text-[10px] mt-0.5">
              Phone: {sellerContact}
            </div>
            {invoiceRef && (
              <div className="text-gray-600 text-[10px] print:text-[9px] mt-0.5">
                Ref / Memo: <span className="font-medium text-gray-800">{invoiceRef}</span>
              </div>
            )}
          </div>

          {/* Column 3: Quotation & Terms */}
          <div className="p-2.5 print:p-1.5 space-y-0.5">
            <div className="flex justify-between">
              <span className="font-bold text-gray-700 text-[11px] print:text-[10px]">Date:</span>
              <span className="text-gray-900 font-medium text-[11px] print:text-[10px]">{formatDate(invoice.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-700 text-[11px] print:text-[10px]">Terms:</span>
              <span className="text-gray-900 font-semibold text-[11px] print:text-[10px]">{invoiceTerms}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-700 text-[11px] print:text-[10px]">Job Status:</span>
              <span className="text-gray-900 font-medium text-[11px] print:text-[10px]">{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* 7-Column Line Items Table */}
        <div className="border border-gray-300 mb-3 print:mb-1.5 overflow-hidden rounded avoid-break">
          <table className="w-full text-left text-xs print:text-[10.5px] border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-[10.5px] print:text-[9.5px] font-bold text-gray-800 uppercase">
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300 text-center w-10">S#</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300">Code / WP#</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300">Description</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300 text-center w-24">Status</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300 text-center w-12">Qty</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-300 text-right w-24">UnitPrice</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 text-center font-medium text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 font-bold text-gray-900">
                    {item.wp}
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 text-gray-800">
                    {item.design}
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 text-center font-medium">
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] print:text-[8.5px] font-bold bg-gray-100 text-gray-800">
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 text-center font-bold text-gray-900">
                    {item.qty}
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 border-r border-gray-200 text-right font-medium text-gray-800 font-mono">
                    {item.rate ? item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 print:py-1 print:px-2 text-right font-bold text-gray-900 font-mono">
                    {item.amount ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Table & Summary */}
        <div className="flex justify-end mb-3 print:mb-1.5 avoid-break">
          <div className="w-68 sm:w-72 print:w-64 border border-gray-300 rounded divide-y divide-gray-200 text-xs print:text-[10px]">
            {invoice.subtotal && invoice.subtotal !== invoice.total && (
              <div className="flex justify-between py-1 px-2.5 print:py-0.5 print:px-2 text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold font-mono">
                  PKR {invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 px-2.5 print:py-0.5 print:px-2 text-red-700">
                <span>Discount</span>
                <span className="font-semibold font-mono">
                  - PKR {invoice.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 px-2.5 print:py-0.5 print:px-2 bg-gray-50">
              <span className="font-bold text-gray-800">Total Bill</span>
              <span className="font-black text-gray-900 font-mono">
                PKR {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.paid > 0 && (
              <div className="flex justify-between py-1 px-2.5 print:py-0.5 print:px-2 text-emerald-800">
                <span className="font-semibold">Advance Received / Paid</span>
                <span className="font-bold font-mono">
                  PKR {invoice.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1.5 px-2.5 print:py-1 print:px-2 bg-gray-100 text-xs print:text-[11px] font-black">
              <span className="text-gray-900 uppercase">Balance Due:</span>
              <span className="text-gray-900 font-mono">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Golden Business Rules (8 Instructions in 2-Column Compact Grid) */}
        <div className="border-t border-gray-300 pt-2 print:pt-1.5 text-xs text-gray-800 space-y-1.5 print:space-y-1 avoid-break">
          {invoice.notes && (
            <div className="text-[11px] print:text-[9.5px]">
              <span className="font-bold text-gray-900">Notes: </span>
              <span>{invoice.notes}</span>
            </div>
          )}

          <div>
            <div className="font-black text-gray-900 uppercase tracking-wider text-[10px] print:text-[9px] mb-1">
              Note and Instructions:
            </div>
            <ol className="grid grid-cols-2 gap-x-4 gap-y-0.5 list-decimal list-inside text-[9.5px] print:text-[8px] text-gray-600 leading-tight">
              <li>Payment terms 100% advance in cash.</li>
              <li>All items imported; won&apos;t be reserved without advance.</li>
              <li>10% handling charges apply on approved returns.</li>
              <li>No return or exchange accepted on by-order products.</li>
              <li>Wall preparation is mandatory for wallpaper installation.</li>
              <li>Site should be clean, clear and dry before installation.</li>
              <li>All complaints will be charged after installation signoff.</li>
              <li>Client provides ladder, scaffolding or required installation gear.</li>
            </ol>
          </div>
        </div>

        {/* Footer / Signatures with Seller Info */}
        <div className="flex justify-between items-end pt-3 mt-2 print:pt-2 print:mt-1 border-t border-gray-200 text-xs print:text-[9.5px] text-gray-600 avoid-break">
          <div className="text-center w-44 print:w-40">
            <div className="border-b border-gray-400 pb-3 print:pb-2.5 mb-0.5"></div>
            <span className="font-medium text-[10px] print:text-[9px]">Client Acceptance &amp; Signature</span>
          </div>

          <div className="text-center w-48 print:w-44">
            <div className="border-b border-gray-400 pb-3 print:pb-2.5 mb-0.5">
              <span className="font-bold text-gray-950 text-xs print:text-[10px]">{sellerName}</span>
            </div>
            <span className="font-medium text-[10px] print:text-[9px]">
              Authorized Signatory • {sellerContact}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
