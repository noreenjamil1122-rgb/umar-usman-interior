'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Download, RefreshCw, CheckCircle2, Eye, ZoomIn, ZoomOut } from 'lucide-react';

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
  const [printSize, setPrintSize] = useState<'normal' | 'large' | 'xlarge'>('large');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-600">
        <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
        Generating Umar Usman Interior quotation &amp; bill...
      </div>
    );
  }

  if (!data || !data.invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-sm text-gray-600">
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
    <div className="min-h-screen bg-gray-100 py-4 print:py-0 print:bg-white text-gray-950 font-sans">
      {/* Global CSS to strictly force 1-page A4 print layout with crystal-clear high visibility */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 7mm 9mm 7mm 9mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
      <div className="max-w-4xl mx-auto mb-3 px-4 flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${invoice._id}`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Invoice
            </Button>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            1-Page Cover (Large High-Visibility A4)
          </span>
        </div>

        {/* Print Size / Vision Accessibility Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-white border border-gray-300 rounded-md p-0.5 shadow-xs text-xs font-semibold">
            <span className="px-2 text-gray-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-teal" />
              Size:
            </span>
            <button
              type="button"
              onClick={() => setPrintSize('normal')}
              className={`px-2.5 py-1 rounded transition-colors ${
                printSize === 'normal'
                  ? 'bg-teal text-white font-bold shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setPrintSize('large')}
              className={`px-2.5 py-1 rounded transition-colors ${
                printSize === 'large'
                  ? 'bg-teal text-white font-bold shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Bada (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setPrintSize('xlarge')}
              className={`px-2.5 py-1 rounded transition-colors ${
                printSize === 'xlarge'
                  ? 'bg-teal text-white font-bold shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Extra Large
            </button>
          </div>

          <Button
            variant="teal"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Save PDF
          </Button>
          <Button
            variant="brass"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            className="font-bold shadow-sm"
          >
            Print (1 Page)
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container — Single Page Cover with High-Contrast Typography */}
      <div
        className={`printable-area max-w-4xl mx-auto bg-white border border-gray-400 print:border-none rounded-lg print:rounded-none shadow-md print:shadow-none transition-all duration-150 ${
          printSize === 'xlarge'
            ? 'p-6 sm:p-7 print:p-0 text-[14px]'
            : printSize === 'normal'
            ? 'p-5 sm:p-6 print:p-0 text-[12px]'
            : 'p-6 sm:p-8 print:p-0 text-[13px]'
        }`}
      >
        {/* Header: Company Info on Left, Quotation & Balance Due on Right */}
        <div className="flex justify-between items-start pb-3 print:pb-2.5 border-b-2 border-gray-900 avoid-break">
          {/* Company Branding */}
          <div className="flex items-start gap-3.5">
            <div className="w-16 h-16 print:w-14 print:h-14 shrink-0 p-1 border border-gray-300 rounded flex items-center justify-center bg-white shadow-xs">
              <img
                src="/logo.png"
                alt="Umar Usman Interior Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl print:text-2xl font-black text-gray-950 uppercase tracking-tight leading-none">
                {businessName}
              </h1>
              <div className="text-xs print:text-[12px] text-gray-850 font-medium mt-1 leading-tight">
                {address}
              </div>
              <div className="text-xs print:text-[12px] text-gray-900 font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Tel: <strong className="text-black font-black">{phone}</strong></span>
                <span>•</span>
                <span>Email: <strong className="text-black font-bold">{email}</strong></span>
              </div>
              <div className="text-xs print:text-[12px] text-gray-950 font-bold mt-0.5">
                Seller / Sales Rep: <strong className="text-black font-black">{sellerName}</strong> ({sellerContact})
              </div>
            </div>
          </div>

          {/* Quotation & Prominent Balance Due Box */}
          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl print:text-xl font-black text-gray-950 uppercase tracking-wide leading-none">
              Quotation / Bill
            </div>
            <div className="font-mono text-sm sm:text-base print:text-sm font-black text-teal-800 mt-1">
              # {invoice.number.startsWith('INV-') ? invoice.number.replace('INV-', 'QTN-') : invoice.number}
            </div>

            {/* Prominent High-Contrast Balance Due Box */}
            <div className="mt-1.5 inline-block border-2 border-black bg-gray-100 px-3.5 py-1.5 print:px-3 print:py-1 rounded text-right shadow-xs">
              <div className="text-[11px] print:text-[11px] font-black text-gray-800 uppercase tracking-wider">
                Balance Due:
              </div>
              <div className="text-base sm:text-lg print:text-base font-black text-black font-mono leading-none mt-0.5">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Metadata Table: Bill To (Customer), Seller Info (Name & Number), Quotation Details */}
        <div className="grid grid-cols-3 border-2 border-gray-400 my-3 print:my-2.5 divide-x-2 divide-gray-400 rounded overflow-hidden avoid-break">
          {/* Column 1: Bill To (Customer Details) */}
          <div className="p-3 print:p-2 bg-gray-50/80">
            <div className="font-black text-gray-900 uppercase text-[11px] print:text-[11px] tracking-wider mb-0.5">
              Bill To (Customer)
            </div>
            <div className="font-black text-gray-950 text-sm sm:text-base print:text-[14px] leading-tight">
              {customerName} {customerCode && <span className="text-xs text-teal-800 font-mono font-bold">({customerCode})</span>}
            </div>
            <div className="text-gray-900 font-medium text-xs print:text-[12px] mt-1 leading-tight">
              {customerAddress}
            </div>
            <div className="text-gray-950 font-bold text-xs print:text-[12.5px] mt-1">
              Phone: <span className="font-black text-black">{customerMobile}</span>
            </div>
          </div>

          {/* Column 2: Seller Information (Seller Name & Phone Number) */}
          <div className="p-3 print:p-2 bg-gray-50/40">
            <div className="font-black text-gray-900 uppercase text-[11px] print:text-[11px] tracking-wider mb-0.5">
              Seller / Sales Officer
            </div>
            <div className="font-black text-gray-950 text-sm sm:text-base print:text-[14px] leading-tight">
              {sellerName}
            </div>
            <div className="text-gray-950 font-bold text-xs print:text-[12.5px] mt-1">
              Phone: <span className="font-black text-black">{sellerContact}</span>
            </div>
            {invoiceRef && (
              <div className="text-gray-800 font-medium text-xs print:text-[11px] mt-1">
                Ref / Memo: <span className="font-bold text-black">{invoiceRef}</span>
              </div>
            )}
          </div>

          {/* Column 3: Quotation & Terms */}
          <div className="p-3 print:p-2 bg-white space-y-1">
            <div className="flex justify-between items-center text-xs print:text-[12px]">
              <span className="font-bold text-gray-800">Date:</span>
              <span className="text-black font-black font-mono">{formatDate(invoice.date)}</span>
            </div>
            <div className="flex justify-between items-center text-xs print:text-[12px]">
              <span className="font-bold text-gray-800">Terms:</span>
              <span className="text-black font-black">{invoiceTerms}</span>
            </div>
            <div className="flex justify-between items-center text-xs print:text-[12px]">
              <span className="font-bold text-gray-800">Job Status:</span>
              <span className="text-black font-black">{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* 7-Column Line Items Table with High-Contrast Typography */}
        <div className="border-2 border-gray-400 mb-3 print:mb-2 overflow-hidden rounded avoid-break">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-400 text-xs print:text-[12px] font-black text-black uppercase tracking-wider">
                <th className="py-2 px-2.5 print:py-1.5 print:px-2 border-r-2 border-gray-400 text-center w-10">S#</th>
                <th className="py-2 px-3 print:py-1.5 print:px-2.5 border-r-2 border-gray-400">Code / WP#</th>
                <th className="py-2 px-3 print:py-1.5 print:px-2.5 border-r-2 border-gray-400">Description</th>
                <th className="py-2 px-2 print:py-1.5 print:px-2 border-r-2 border-gray-400 text-center w-24">Status</th>
                <th className="py-2 px-2 print:py-1.5 print:px-2 border-r-2 border-gray-400 text-center w-14">Qty</th>
                <th className="py-2 px-3 print:py-1.5 print:px-2.5 border-r-2 border-gray-400 text-right w-28">UnitPrice</th>
                <th className="py-2 px-3 print:py-1.5 print:px-2.5 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 text-xs sm:text-sm print:text-[13px]">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2 px-2.5 print:py-1.5 print:px-2 border-r border-gray-300 text-center font-bold text-gray-700">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 print:py-1.5 print:px-2.5 border-r border-gray-300 font-black text-black text-sm print:text-[14px]">
                    {item.wp}
                  </td>
                  <td className="py-2 px-3 print:py-1.5 print:px-2.5 border-r border-gray-300 font-semibold text-gray-950">
                    {item.design}
                  </td>
                  <td className="py-2 px-2 print:py-1.5 print:px-2 border-r border-gray-300 text-center font-bold">
                    <span className="px-2 py-0.5 rounded text-[11px] print:text-[10.5px] font-black bg-gray-100 border border-gray-300 text-gray-950">
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-2 px-2 print:py-1.5 print:px-2 border-r border-gray-300 text-center font-black text-black text-sm print:text-[14px]">
                    {item.qty}
                  </td>
                  <td className="py-2 px-3 print:py-1.5 print:px-2.5 border-r border-gray-300 text-right font-bold text-gray-950 font-mono">
                    {item.rate ? item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 px-3 print:py-1.5 print:px-2.5 text-right font-black text-black font-mono text-sm print:text-[14px]">
                    {item.amount ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Table & Summary */}
        <div className="flex justify-end mb-3 print:mb-2 avoid-break">
          <div className="w-72 sm:w-80 print:w-76 border-2 border-gray-400 rounded divide-y divide-gray-300 text-xs sm:text-sm print:text-[12.5px]">
            {invoice.subtotal && invoice.subtotal !== invoice.total && (
              <div className="flex justify-between py-1.5 px-3 print:py-1 print:px-2.5 text-gray-800 font-semibold">
                <span>Subtotal</span>
                <span className="font-bold font-mono text-black">
                  PKR {invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {invoice.discount > 0 && (
              <div className="flex justify-between py-1.5 px-3 print:py-1 print:px-2.5 text-red-700 font-bold">
                <span>Discount</span>
                <span className="font-black font-mono">
                  - PKR {invoice.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1.5 px-3 print:py-1.5 print:px-2.5 bg-gray-100">
              <span className="font-black text-gray-900">Total Bill</span>
              <span className="font-black text-black font-mono text-sm print:text-[14px]">
                PKR {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.paid > 0 && (
              <div className="flex justify-between py-1.5 px-3 print:py-1 print:px-2.5 text-emerald-900 font-bold">
                <span>Advance Received / Paid</span>
                <span className="font-black font-mono">
                  PKR {invoice.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 px-3 print:py-1.5 print:px-2.5 bg-gray-200 text-sm sm:text-base print:text-[15px] font-black">
              <span className="text-black uppercase">Balance Due:</span>
              <span className="text-black font-mono">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Golden Business Rules (8 Instructions in 2-Column Compact Grid) */}
        <div className="border-t-2 border-gray-300 pt-2.5 print:pt-2 text-xs text-gray-900 space-y-1.5 avoid-break">
          {invoice.notes && (
            <div className="text-xs print:text-[12px] bg-amber-50/70 p-2 rounded border border-amber-200">
              <span className="font-black text-gray-950">Notes: </span>
              <span className="font-semibold text-gray-900">{invoice.notes}</span>
            </div>
          )}

          <div>
            <div className="font-black text-gray-950 uppercase tracking-wider text-xs print:text-[11.5px] mb-1">
              Note and Instructions:
            </div>
            <ol className="grid grid-cols-2 gap-x-5 gap-y-1 list-decimal list-inside text-xs print:text-[11px] text-gray-900 font-semibold leading-tight">
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
        <div className="flex justify-between items-end pt-4 mt-3 print:pt-3 print:mt-2 border-t border-gray-300 text-xs print:text-[11px] text-gray-800 avoid-break">
          <div className="text-center w-48 print:w-44">
            <div className="border-b-2 border-gray-700 pb-4 print:pb-3 mb-1"></div>
            <span className="font-bold text-xs print:text-[11px] text-gray-900">Client Acceptance &amp; Signature</span>
          </div>

          <div className="text-center w-52 print:w-48">
            <div className="border-b-2 border-gray-700 pb-4 print:pb-3 mb-1">
              <span className="font-black text-black text-sm print:text-[13px]">{sellerName}</span>
            </div>
            <span className="font-bold text-xs print:text-[11px] text-gray-900">
              Authorized Signatory • {sellerContact}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
