'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  Search,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductItem {
  _id: string;
  code?: string;
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
  warehouseId?: { _id: string; name: string; code: string };
}

interface BookOption {
  _id: string;
  name: string;
  code: string;
}

interface WarehouseOption {
  _id: string;
  name: string;
  code: string;
}

export default function StockPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Stock Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('Manual Restock');
  const [adjustNote, setAdjustNote] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const [prodRes, bookRes, whRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/books'),
        fetch('/api/warehouses'),
      ]);

      const [prodData, bookData, whData] = await Promise.all([
        prodRes.json(),
        bookRes.json(),
        whRes.json(),
      ]);

      if (prodData.success) setProducts(prodData.data);
      if (bookData.success) setBooks(bookData.data);
      if (whData.success) setWarehouses(whData.data);
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const handleOpenAdjust = (p: ProductItem, type: 'add' | 'subtract') => {
    setAdjustingProduct(p);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustReason(type === 'add' ? 'Manual Restock' : 'Damaged / Defect Roll');
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

    // If subtracting, we can proceed directly or confirm
    setSubmittingStock(true);
    try {
      const delta = adjustType === 'add' ? adjustQty : -adjustQty;

      const res = await fetch(`/api/products/${adjustingProduct._id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: delta,
          reason: adjustReason,
          reference: adjustNote.trim() || `Stock management ${adjustType}`,
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
      fetchStockData();
    } catch {
      toast.error('Network error during stock adjustment');
    } finally {
      setSubmittingStock(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.wp.toLowerCase().includes(search.toLowerCase()) ||
      p.design.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

    const matchesBook = !selectedBook || (p.bookId && p.bookId._id === selectedBook);
    const matchesWarehouse =
      !selectedWarehouse || (p.warehouseId && p.warehouseId._id === selectedWarehouse);
    const matchesLowStock = !filterLowStockOnly || p.stock <= (p.minStock || 3);

    return matchesSearch && matchesBook && matchesWarehouse && matchesLowStock;
  });

  // Aggregated Stats
  const totalStockRolls = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalLowStockItems = products.filter((p) => p.stock <= (p.minStock || 3)).length;
  const totalOutOfStock = products.filter((p) => p.stock <= 0).length;

  return (
    <AppShell title="Stock Management">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Stock &amp; Inventory Management
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Live inventory counts, quick +/- adjustments, and low-stock alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link href="/books">
            <Button variant="outline" size="md" leftIcon={<BookOpen className="w-4 h-4" />}>
              Wallpaper Books
            </Button>
          </Link>
          <Link href="/warehouses">
            <Button variant="teal" size="md" leftIcon={<Warehouse className="w-4 h-4" />} className="shadow-warm">
              Warehouses
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-5 sm:p-6 bg-paper border border-warm-border shadow-warm">
          <div className="text-xs sm:text-sm font-bold uppercase text-ink-muted">Total Wallpapers</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-ink mt-1.5">{products.length}</div>
          <div className="text-xs text-ink-muted mt-1">Distinct designs registered</div>
        </Card>

        <Card className="p-5 sm:p-6 bg-paper border border-warm-border shadow-warm">
          <div className="text-xs sm:text-sm font-bold uppercase text-ink-muted">Total Rolls In Stock</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal mt-1.5">
            {totalStockRolls.toLocaleString()}
          </div>
          <div className="text-xs text-ink-muted mt-1">Available for dispatch</div>
        </Card>

        <Card className="p-5 sm:p-6 bg-paper border border-warm-border shadow-warm">
          <div className="text-xs sm:text-sm font-bold uppercase text-ink-muted">Low Stock Warnings</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1.5">
            {totalLowStockItems}
          </div>
          <div className="text-xs text-ink-muted mt-1">&le; 3 rolls remaining</div>
        </Card>

        <Card className="p-5 sm:p-6 bg-paper border border-warm-border shadow-warm">
          <div className="text-xs sm:text-sm font-bold uppercase text-ink-muted">Out of Stock</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-status-danger mt-1.5">
            {totalOutOfStock}
          </div>
          <div className="text-xs text-ink-muted mt-1">0 rolls available</div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 sm:mb-8 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search WP#, design, code (PRD-XXXXX)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          {/* Dropdown Filters & Low Stock Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-paper border border-warm-border text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="">All Wallpaper Books ({books.length})</option>
              {books.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-paper border border-warm-border text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="">All Warehouses ({warehouses.length})</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                filterLowStockOnly
                  ? 'bg-amber-500 text-white shadow-warm'
                  : 'bg-paper text-ink-muted hover:text-ink border border-warm-border'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Low Stock Only</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-sm text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading stock inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-ink-muted space-y-3">
              <Package className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-bold text-ink">No wallpapers match criteria</div>
              <p className="text-xs sm:text-sm max-w-sm mx-auto">
                Try clearing your search query or book filters to inspect other inventory rolls.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-bold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">WP No</th>
                    <th className="py-3.5 px-4">Book Name</th>
                    <th className="py-3.5 px-4">Warehouse</th>
                    <th className="py-3.5 px-4 text-center">Unit</th>
                    <th className="py-3.5 px-4 text-right">Sale Price</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-right">Quick Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock <= (p.minStock || 3);

                    return (
                      <tr key={p._id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-teal text-sm sm:text-base">WP {p.wp}</div>
                          <div className="text-xs font-mono text-ink-muted mt-0.5">{p.code || '-'}</div>
                        </td>

                        <td className="py-4 px-4 font-semibold text-ink">
                          {p.bookId ? (
                            <Link
                              href={`/books/${p.bookId._id}`}
                              className="hover:text-teal hover:underline flex items-center gap-1.5"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-teal" />
                              <span>{p.bookId.name}</span>
                            </Link>
                          ) : (
                            <span className="text-ink-muted">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-ink font-medium">
                          {p.warehouseId ? (
                            <Link
                              href={`/warehouses/${p.warehouseId._id}`}
                              className="hover:text-teal hover:underline flex items-center gap-1.5 font-semibold"
                            >
                              <Warehouse className="w-3.5 h-3.5 text-ink-muted" />
                              <span>{p.warehouseId.name}</span>
                            </Link>
                          ) : (
                            <span className="text-ink-muted">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center text-ink-muted font-medium">
                          {p.unit || 'Roll'}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-ink">
                          {formatCurrency(p.salePrice)}
                        </td>

                        <td className="py-4 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="inline-block px-3 py-1 rounded-lg bg-red-100 text-status-danger font-bold text-xs border border-red-300">
                              0 (Out of Stock)
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-block px-3 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                              {p.stock} rolls (Low)
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200">
                              {p.stock} rolls
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p, 'add')}
                              className="w-8 h-8 rounded-lg bg-teal-subtle text-teal hover:bg-teal hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                              title="Add Stock (+)"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p, 'subtract')}
                              disabled={p.stock <= 0}
                              className="w-8 h-8 rounded-lg bg-red-50 text-status-danger hover:bg-status-danger hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors"
                              title="Reduce Stock (-)"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
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
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Stock — WP ${adjustingProduct?.wp}`}
        description={`Current in-hand stock: ${adjustingProduct?.stock || 0} rolls`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setAdjustType('add');
                setAdjustReason('Manual Restock');
              }}
              className={`min-h-[44px] py-2.5 px-4 text-sm font-bold rounded-xl border transition-all ${
                adjustType === 'add'
                  ? 'bg-teal text-white border-teal shadow-warm'
                  : 'bg-paper text-ink-muted border-warm-border'
              }`}
            >
              + Add Rolls (Stock In)
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustType('subtract');
                setAdjustReason('Damaged / Defect Roll');
              }}
              className={`min-h-[44px] py-2.5 px-4 text-sm font-bold rounded-xl border transition-all ${
                adjustType === 'subtract'
                  ? 'bg-status-danger text-white border-status-danger shadow-warm'
                  : 'bg-paper text-ink-muted border-warm-border'
              }`}
            >
              - Deduct Rolls (Stock Out)
            </button>
          </div>

          <Input
            label="Rolls Quantity"
            type="number"
            min="1"
            max={adjustType === 'subtract' ? adjustingProduct?.stock || 1 : 9999}
            required
            value={adjustQty}
            onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
          />

          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-bold text-ink">Reason</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-warm-border bg-paper px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-teal focus:outline-none"
            >
              {adjustType === 'add' ? (
                <>
                  <option value="Manual Restock">Fresh Shipment / Restock</option>
                  <option value="Returned">Customer Return (Restored)</option>
                  <option value="Inventory Audit Plus">Physical Audit Overcount</option>
                  <option value="Other Add">Other Stock Addition</option>
                </>
              ) : (
                <>
                  <option value="Damaged / Defect Roll">Damaged / Defect Roll</option>
                  <option value="Sample Cut">Display Sample / Cut Piece</option>
                  <option value="Inventory Audit Minus">Physical Audit Undercount</option>
                  <option value="Shop Display Use">Shop Showroom Fitting</option>
                  <option value="Other Deduct">Other Stock Reduction</option>
                </>
              )}
            </select>
          </div>

          <Input
            label="Note / Reference"
            type="text"
            placeholder="e.g. Bill number, carton number, or defect note"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setAdjustingProduct(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={adjustType === 'add' ? 'teal' : 'danger'}
              size="md"
              isLoading={submittingStock}
            >
              {adjustType === 'add' ? 'Add to Stock' : 'Deduct from Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
