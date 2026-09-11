'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Minus,
  RefreshCw,
  Search,
  BookOpen,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  _id: string;
  wp: string;
  design: string;
  brand?: string;
  color?: string;
  size?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  bookId?: { _id: string; name: string; code: string; color?: string };
}

interface WarehouseData {
  _id: string;
  code: string;
  name: string;
}

export default function WarehouseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('Manual Adjustment');
  const [adjustNote, setAdjustNote] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/warehouses/${params.id}`),
        fetch(`/api/products?warehouseId=${params.id}`),
      ]);

      const [wData, pData] = await Promise.all([wRes.json(), pRes.json()]);

      if (wData.success && wData.data) {
        setWarehouse(wData.data);
      } else {
        toast.error('Warehouse not found');
        router.push('/warehouses');
        return;
      }

      if (pData.success && pData.data) {
        setProducts(pData.data);
      }
    } catch {
      toast.error('Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleOpenAdjust = (p: Product, type: 'add' | 'subtract') => {
    setAdjustingProduct(p);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustReason(type === 'add' ? 'Adjustment Add' : 'Adjustment Remove');
    setAdjustNote('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    if (adjustQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (adjustType === 'subtract' && adjustQty > adjustingProduct.stock) {
      toast.error(`Cannot remove more than current stock (${adjustingProduct.stock} rolls)`);
      return;
    }

    setSubmittingStock(true);
    try {
      const delta = adjustType === 'add' ? adjustQty : -adjustQty;

      const res = await fetch(`/api/products/${adjustingProduct._id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: delta,
          reason: adjustReason,
          reference: adjustNote.trim() || `Warehouse ${warehouse?.name || ''} adjustment`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Stock adjustment failed', { description: json.error });
        setSubmittingStock(false);
        return;
      }

      toast.success(
        `${adjustType === 'add' ? '+' : '-'}${adjustQty} rolls updated for WP ${adjustingProduct.wp}`
      );
      setAdjustingProduct(null);
      fetchData();
    } catch {
      toast.error('Network error during stock adjustment');
    } finally {
      setSubmittingStock(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.wp.toLowerCase().includes(search.toLowerCase()) ||
      (p.design && p.design.toLowerCase().includes(search.toLowerCase())) ||
      (p.bookId?.name && p.bookId.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.color && p.color.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRolls = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outCount = products.filter((p) => p.stock <= 0).length;

  return (
    <AppShell title={warehouse ? `${warehouse.name} Details` : 'Warehouse'}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="md"
            className="min-h-[42px]"
            onClick={() => router.push('/warehouses')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            All Warehouses
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {warehouse?.name || 'Warehouse'}
              </h1>
              <Badge variant="teal" size="md" className="font-mono">
                {warehouse?.code}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Assigned inventory and wallpaper stock distribution
            </p>
          </div>
        </div>

        <Link href="/books">
          <Button variant="brass" size="md" className="min-h-[42px]" leftIcon={<BookOpen className="w-4 h-4" />}>
            Browse Books
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <Card className="p-5 sm:p-6 rounded-2xl shadow-warm border-l-4 border-l-teal">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">Assigned Wallpapers</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-ink mt-1.5">{products.length}</div>
          <div className="text-xs text-ink-muted mt-1">Different codes</div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl shadow-warm border-l-4 border-l-brass">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Physical Stock</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-ink mt-1.5">
            {totalRolls} <span className="text-xs sm:text-sm text-ink-muted font-normal">Rolls</span>
          </div>
          <div className="text-xs text-ink-muted mt-1">In this warehouse</div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl shadow-warm border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">Low Stock Warnings</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1.5">{lowCount}</div>
          <div className="text-xs text-ink-muted mt-1">Reorder soon</div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl shadow-warm border-l-4 border-l-status-danger">
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">Out of Stock</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-status-danger mt-1.5">{outCount}</div>
          <div className="text-xs text-ink-muted mt-1">0 rolls available</div>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="p-4 sm:p-5 rounded-2xl shadow-warm mb-6 sm:mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search wallpapers in this warehouse by code, book, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-sm bg-paper border border-warm-border rounded-xl text-ink focus:outline-none focus:border-teal min-h-[44px]"
          />
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading wallpapers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <Package className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No wallpapers in this warehouse</div>
              <p className="text-xs max-w-sm mx-auto">
                No products are currently assigned to {warehouse?.name}. You can assign wallpapers from the Books or Stock page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">WP No.</th>
                    <th className="py-3.5 px-4">Book</th>
                    <th className="py-3.5 px-4">Color</th>
                    <th className="py-3.5 px-4">Sale Price</th>
                    <th className="py-3.5 px-4">Stock Quantity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Stock +/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {filtered.map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= p.minStock;

                    return (
                      <tr
                        key={p._id}
                        id={`row-wp-${p.wp}`}
                        className={`hover:bg-paper transition-colors ${
                          isOut ? 'bg-rose-50/40' : isLow ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-4 px-4 font-mono font-bold text-teal">
                          <div className="text-sm sm:text-base">WP {p.wp}</div>
                          {p.design && p.design !== p.wp && (
                            <div className="text-xs text-ink-muted font-normal mt-0.5">{p.design}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-ink font-medium">
                          {p.bookId ? (
                            <Link
                              href={`/books/${p.bookId._id}`}
                              className="hover:text-teal inline-flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: p.bookId.color || '#1E6F6C' }}
                              />
                              <span className="font-semibold">{p.bookId.name}</span>
                            </Link>
                          ) : (
                            <span className="text-ink-muted">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-ink-muted">{p.color || '-'}</td>
                        <td className="py-4 px-4 font-bold text-ink">{formatCurrency(p.salePrice)}</td>
                        <td className="py-4 px-4 font-mono text-sm sm:text-base font-bold text-ink">
                          {p.stock} <span className="text-xs font-normal text-ink-muted">{p.unit}</span>
                        </td>
                        <td className="py-4 px-4">
                          {isOut ? (
                            <Badge variant="danger" size="md">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="md">Low Stock ({p.stock})</Badge>
                          ) : (
                            <Badge variant="success" size="md">In Stock</Badge>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-lg text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleOpenAdjust(p, 'add')}
                            title="Add stock rolls"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-lg text-rose-700 hover:bg-rose-50"
                            onClick={() => handleOpenAdjust(p, 'subtract')}
                            title="Subtract stock rolls"
                            disabled={p.stock <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <Modal
          isOpen={Boolean(adjustingProduct)}
          onClose={() => setAdjustingProduct(null)}
          title={`${adjustType === 'add' ? 'Add Stock' : 'Subtract Stock'} — WP ${adjustingProduct.wp}`}
          size="sm"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="p-3 bg-paper rounded-xl border border-warm-border text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-ink">Current Stock:</div>
                <div className="text-ink-muted">{warehouse?.name}</div>
              </div>
              <div className="text-lg font-bold font-mono text-teal">
                {adjustingProduct.stock} Rolls
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Reason
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
              >
                {adjustType === 'add' ? (
                  <>
                    <option value="Purchased">Purchased / New Restock</option>
                    <option value="Returned">Customer Returned</option>
                    <option value="Adjustment Add">Manual Adjustment (Add)</option>
                  </>
                ) : (
                  <>
                    <option value="Sold">Sold Manual</option>
                    <option value="Damaged">Damaged / Scrap</option>
                    <option value="Adjustment Remove">Manual Adjustment (Remove)</option>
                  </>
                )}
              </select>
            </div>

            <Input
              label={`Quantity to ${adjustType === 'add' ? 'Add' : 'Remove'} (Rolls)`}
              type="number"
              min="1"
              max={adjustType === 'subtract' ? adjustingProduct.stock : undefined}
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
            />

            <Input
              label="Reference / Note"
              type="text"
              placeholder="e.g. Order #123 or Warehouse transfer"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-borderLight">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdjustingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={adjustType === 'add' ? 'teal' : 'danger'}
                size="sm"
                isLoading={submittingStock}
              >
                {adjustType === 'add' ? `+ Add ${adjustQty} Rolls` : `- Remove ${adjustQty} Rolls`}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
