'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Download, RefreshCw, FileText } from 'lucide-react';

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
        Generating Wallmaster quotation &amp; bill...
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
  const ownerName = settings?.sellerName || 'UMAR NAWAZ';
  const phone = settings?.phone || '+92 307 4333227';
  const email = settings?.email || 'info@umarusmanwallpaper.com';
  const address =
    settings?.address ||
    'College road near five star naan shop, Lahore Punjab Pakistan';

  const customerName = invoice.customerId?.name || 'Walk-in Customer';
  const customerAddress =
    invoice.customerId?.address ||
    `${invoice.customerId?.city || 'Lahore'}, Pakistan`;
  const customerMobile = invoice.customerId?.mobile || '-';
  const invoiceRef = invoice.reference || '0';
  const invoiceTerms = invoice.terms || 'Custom';
  const statusLabel =
    invoice.jobStatus || (invoice.remaining === 0 ? 'Fully Paid' : 'On Order');

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:py-0 print:bg-white text-gray-900 font-sans">
      {/* Non-printable Action Toolbar */}
      <div className="max-w-4xl mx-auto mb-4 px-4 flex items-center justify-between no-print">
        <Link href={`/invoices/${invoice._id}`}>
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Invoice
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="teal"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download / Save as PDF (A4)
          </Button>
          <Button
            variant="brass"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Quotation
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container — Exact Wallmaster Docx Match */}
      <div className="printable-area max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:p-0 print:m-0 border border-gray-300 print:border-none rounded-lg print:rounded-none">
        {/* Header: Company Info on Left, Quotation & Balance Due on Right */}
        <div className="flex justify-between items-start pb-6 border-b border-gray-300">
          {/* Company Branding */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 shrink-0 p-1 border border-gray-200 rounded-lg flex items-center justify-center bg-white shadow-sm">
              <img
                src="/logo.png"
                alt="Umar Usman Interior Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
                {businessName}
              </h1>
              <div className="text-xs font-bold text-gray-800 mt-1.5">{ownerName}</div>
              <div className="text-xs text-gray-700 font-medium">{phone}</div>
              <div className="text-xs text-gray-600 font-mono">{email}</div>
              <p className="text-xs text-gray-600 max-w-sm mt-0.5 leading-snug">
                {address}
              </p>
            </div>
          </div>

          {/* Quotation & Balance Due Box */}
          <div className="text-right">
            <div className="text-xl font-black text-gray-900 uppercase tracking-wide">
              Quotation
            </div>
            <div className="font-mono text-sm font-bold text-teal mt-0.5">
              # {invoice.number.startsWith('INV-') ? invoice.number.replace('INV-', 'QTN-') : invoice.number}
            </div>

            {/* Prominent Balance Due Box */}
            <div className="mt-3 inline-block border-2 border-gray-900 bg-gray-50 px-4 py-2 rounded text-right shadow-sm">
              <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Balance Due:
              </div>
              <div className="text-base font-black text-gray-900 font-mono">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Metadata Table (Bill To, Reference, Date & Terms) */}
        <div className="grid grid-cols-3 border border-gray-300 my-6 text-xs divide-x divide-gray-300">
          {/* Column 1: Bill To */}
          <div className="p-3 bg-gray-50/50">
            <div className="font-bold text-gray-800 uppercase text-[10px] tracking-wider mb-1">
              Bill To
            </div>
            <div className="font-bold text-gray-900 text-sm">{customerName}</div>
            <div className="text-gray-700 mt-0.5">{customerAddress}</div>
            <div className="text-gray-700 font-medium mt-0.5">{customerMobile}</div>
          </div>

          {/* Column 2: Reference */}
          <div className="p-3">
            <div className="font-bold text-gray-800 uppercase text-[10px] tracking-wider mb-1">
              Reference
            </div>
            <div className="text-gray-900 font-semibold">{invoiceRef}</div>
          </div>

          {/* Column 3: Date & Terms */}
          <div className="p-3 space-y-1.5">
            <div>
              <span className="font-bold text-gray-700">Quotation Date : </span>
              <span className="text-gray-900">{formatDate(invoice.date)}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">Terms : </span>
              <span className="text-gray-900 font-semibold">{invoiceTerms}</span>
            </div>
          </div>
        </div>

        {/* 7-Column Line Items Table */}
        <div className="border border-gray-300 mb-6 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold text-gray-800 uppercase">
                <th className="py-2.5 px-3 border-r border-gray-300 text-center w-12">S. No</th>
                <th className="py-2.5 px-3 border-r border-gray-300">Code</th>
                <th className="py-2.5 px-3 border-r border-gray-300">Description</th>
                <th className="py-2.5 px-3 border-r border-gray-300 text-center w-28">Status</th>
                <th className="py-2.5 px-3 border-r border-gray-300 text-center w-14">Qty</th>
                <th className="py-2.5 px-3 border-r border-gray-300 text-right w-28">UnitPrice</th>
                <th className="py-2.5 px-3 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-medium text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 font-bold text-gray-900">
                    {item.wp}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-gray-800">
                    {item.design}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-medium">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold text-gray-900">
                    {item.qty}
                  </td>
                  <td className="py-2.5 px-3 border-r border-gray-200 text-right font-medium text-gray-800 font-mono">
                    {item.rate ? item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-mono">
                    {item.amount ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Table & Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-72 border border-gray-300 rounded divide-y divide-gray-200 text-xs">
            <div className="flex justify-between py-2 px-3 bg-gray-50">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-black text-gray-900 font-mono">
                PKR {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.paid > 0 && (
              <div className="flex justify-between py-2 px-3 text-emerald-800">
                <span className="font-semibold">Advance Received / Paid</span>
                <span className="font-bold font-mono">
                  PKR {invoice.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2.5 px-3 bg-gray-100 text-sm font-black">
              <span className="text-gray-900 uppercase">Balance Due:</span>
              <span className="text-gray-900 font-mono">
                PKR {invoice.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Golden Business Rules (8 Instructions) */}
        <div className="border-t border-gray-300 pt-5 text-xs text-gray-800 space-y-3">
          <div>
            <span className="font-bold text-gray-900">Notes: </span>
            <span>{invoice.notes || 'Thanks for your business.'}</span>
          </div>

          <div>
            <div className="font-black text-gray-900 uppercase tracking-wider text-[11px] mb-2">
              Note and instructions
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-700 leading-relaxed">
              <li>Payment terms 100% advance in cash.</li>
              <li>All items are imported, hence won&apos;t be reserved for anyone.</li>
              <li>10% handling shall be charged on returns.</li>
              <li>We do not accept returns of by order products.</li>
              <li>Wall preparation is mandatory for wall paper installation.</li>
              <li>Site should be clear and clean before installation.</li>
              <li>All complaints will be charged after installation.</li>
              <li>Client is responsible to provide ladder, scaffolding or any necessary item for installation.</li>
            </ol>
          </div>
        </div>

        {/* Footer / Signatures */}
        <div className="flex justify-between items-end pt-10 mt-6 border-t border-gray-200 text-xs text-gray-600">
          <div className="text-center w-48">
            <div className="border-b border-gray-400 pb-8 mb-1"></div>
            <span className="font-medium">Client Acceptance</span>
          </div>

          <div className="text-center w-48">
            <div className="border-b border-gray-400 pb-8 mb-1">
              <span className="font-bold text-gray-900">{ownerName}</span>
            </div>
            <span className="font-medium">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
