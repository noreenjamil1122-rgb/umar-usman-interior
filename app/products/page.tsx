'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  Plus,
  Grid,
  List,
  Edit2,
  Trash2,
  BookOpen,
  Warehouse as WarehouseIcon,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  _id: string;
  wp: string;
  design: string;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  bookId?: { _id: string; name: string; code: string; color: string };
  warehouseId?: { _id: string; name: string; code: string };
  notes?: string;
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

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialWp = searchParams.get('wp') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [search, setSearch] = useState(initialWp);
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'in_stock' | 'low_stock' | 'out_of_stock'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Add / Edit Product Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    wp: '',
    design: '',
    brand: 'Umar Usman',
    category: 'Wallpaper',
    color: '',
    size: '0.53m x 10m',
    unit: 'Roll',
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5,
    bookId: '',
    warehouseId: '',
    notes: '',
  });

  // Quick Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Restock');
  const [adjustRef, setAdjustRef] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Fetch initial books & warehouses
  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then((d) => d.success && setBooks(d.data));
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then((d) => d.success && setWarehouses(d.data));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (selectedBook) params.set('bookId', selectedBook);
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      } else {
        toast.error('Could not load products', { description: json.error });
      }
    } catch {
      toast.error('Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedBook, selectedWarehouse, statusFilter]);

  // Open Edit modal
  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      wp: p.wp,
      design: p.design,
      brand: p.brand || 'Umar Usman',
      category: p.category || 'Wallpaper',
      color: p.color || '',
      size: p.size || '0.53m x 10m',
      unit: p.unit || 'Roll',
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      stock: p.stock,
      minStock: p.minStock,
      bookId: p.bookId?._id || '',
      warehouseId: p.warehouseId?._id || '',
      notes: p.notes || '',
    });
    setIsAddOpen(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error('Product save failed', { description: json.error });
        setFormLoading(false);
        return;
      }

      toast.success(editingProduct ? 'Product updated' : 'Product add ho gaya');
      setIsAddOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch {
      toast.error('Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Quick Stock Adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setAdjustLoading(true);
    const delta = adjustType === 'add' ? Math.abs(adjustQty) : -Math.abs(adjustQty);

    try {
      const res = await fetch(`/api/products/${adjustingProduct._id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: delta,
          reason: adjustReason,
          reference: adjustRef || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error('Adjustment failed', { description: json.error });
        setAdjustLoading(false);
        return;
      }

      toast.success('Stock update ho gaya', {
        description: `New stock for ${adjustingProduct.wp}: ${json.data.product.stock} rolls`,
      });

      setAdjustingProduct(null);
      setAdjustQty(1);
      setAdjustRef('');
      fetchProducts();
    } catch {
      toast.error('Failed to adjust stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Delete Product
  const handleDelete = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete WP# "${p.wp}" (${p.design})?`)) return;

    try {
      const res = await fetch(`/api/products/${p._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete product', { description: json.error });
        return;
      }
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <AppShell title="Wallpaper Inventory">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Wallpaper Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Catalog books, rolls inventory, pricing, and stock audit
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-paper border border-warm-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'grid' ? 'bg-teal text-white shadow-warm' : 'text-ink-muted hover:text-ink'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-teal text-white shadow-warm' : 'text-ink-muted hover:text-ink'
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="teal"
            size="lg"
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                wp: '',
                design: '',
                brand: 'Umar Usman',
                category: 'Wallpaper',
                color: '',
                size: '0.53m x 10m',
                unit: 'Roll',
                purchasePrice: 0,
                salePrice: 0,
                stock: 0,
                minStock: 5,
                bookId: books[0]?._id || '',
                warehouseId: warehouses[0]?._id || '',
                notes: '',
              });
              setIsAddOpen(true);
            }}
            leftIcon={<Plus className="w-5 h-5" />}
            className="shadow-warm"
          >
            Add Wallpaper
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="mb-6 sm:mb-8 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search WP#, design, brand, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm bg-paper border border-warm-border rounded-xl text-ink font-semibold focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          {/* Book Filter */}
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold bg-paper border border-warm-border rounded-xl text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            <option value="">All Catalog Books</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Warehouse Filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold bg-paper border border-warm-border rounded-xl text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold bg-paper border border-warm-border rounded-xl text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock Only</option>
            <option value="low_stock">Low Stock Only</option>
            <option value="out_of_stock">Out of Stock Only</option>
          </select>
        </div>
      </Card>

      {/* Product Display Area */}
      {loading ? (
        <div className="py-20 text-center text-sm text-ink-muted flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal mb-2" />
          Loading wallpaper inventory...
        </div>
      ) : products.length === 0 ? (
        <Card className="py-20 text-center text-ink-muted space-y-3">
          <Package className="w-12 h-12 mx-auto text-ink-muted/40" />
          <div className="text-base font-bold text-ink">No products found</div>
          <p className="text-xs sm:text-sm max-w-sm mx-auto">
            Try adjusting your search filters or click &ldquo;Add Wallpaper&rdquo; to add rolls to your catalog.
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {products.map((p) => {
            const isOutOfStock = p.stock <= 0;
            const isLowStock = !isOutOfStock && p.stock <= p.minStock;

            return (
              <Card
                key={p._id}
                variant="elevated"
                className="p-5 sm:p-6 flex flex-col justify-between hover:border-teal/50 transition-all group shadow-warm"
              >
                <div>
                  {/* Top Bar: WP Badge & Stock Status */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-teal text-white shadow-warm">
                      {p.wp}
                    </span>
                    {isOutOfStock ? (
                      <Badge variant="danger" size="sm">Out of Stock</Badge>
                    ) : isLowStock ? (
                      <Badge variant="warning" size="sm">Low Stock ({p.stock})</Badge>
                    ) : (
                      <Badge variant="success" size="sm">{p.stock} Rolls</Badge>
                    )}
                  </div>

                  {/* Design & Brand */}
                  <h3 className="text-base sm:text-lg font-bold text-ink leading-snug group-hover:text-teal transition-colors">
                    {p.design}
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Brand: <span className="text-ink font-semibold">{p.brand || 'Umar Usman'}</span>
                  </p>

                  {/* Badges / Meta */}
                  <div className="flex flex-wrap gap-1.5 my-3.5">
                    {p.bookId && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-brass-subtle text-brass-dark border border-brass/20">
                        <BookOpen className="w-3.5 h-3.5" />
                        {p.bookId.name}
                      </span>
                    )}
                    {p.warehouseId && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-paper border border-warm-border text-ink-muted">
                        <WarehouseIcon className="w-3.5 h-3.5" />
                        {p.warehouseId.name}
                      </span>
                    )}
                  </div>

                  {/* Pricing Details */}
                  <div className="pt-3 border-t border-warm-borderLight flex items-baseline justify-between text-xs sm:text-sm">
                    <span className="text-ink-muted">Sale Price:</span>
                    <span className="text-base font-extrabold text-ink">{formatCurrency(p.salePrice)}</span>
                  </div>
                </div>

                {/* Footer Controls: Quick Stock Adjustment & Actions */}
                <div className="pt-4 border-t border-warm-borderLight mt-4 flex items-center justify-between gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] text-xs font-semibold flex-1 gap-1"
                    onClick={() => {
                      setAdjustingProduct(p);
                      setAdjustQty(1);
                      setAdjustType('add');
                      setAdjustReason('Restock');
                    }}
                  >
                    <span>Adjust Stock</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-lg text-status-danger hover:bg-status-dangerLight transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-bold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">WP#</th>
                    <th className="py-3.5 px-4">Design</th>
                    <th className="py-3.5 px-4">Book</th>
                    <th className="py-3.5 px-4">Warehouse</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Sale Rate</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-borderLight">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-paper transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-teal">{p.wp}</td>
                      <td className="py-4 px-4 font-bold text-ink">
                        <div>{p.design}</div>
                        <div className="text-xs text-ink-muted font-normal mt-0.5">{p.brand}</div>
                      </td>
                      <td className="py-4 px-4 text-ink font-medium">{p.bookId?.name || '-'}</td>
                      <td className="py-4 px-4 text-ink font-medium">{p.warehouseId?.name || '-'}</td>
                      <td className="py-4 px-4">
                        {p.stock <= 0 ? (
                          <Badge variant="danger" size="sm">0 Rolls</Badge>
                        ) : p.stock <= p.minStock ? (
                          <Badge variant="warning" size="sm">{p.stock} Rolls</Badge>
                        ) : (
                          <Badge variant="success" size="sm">{p.stock} Rolls</Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-ink">{formatCurrency(p.salePrice)}</td>
                      <td className="py-4 px-4 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[34px] px-2.5 text-xs text-teal font-semibold"
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustQty(1);
                            setAdjustType('add');
                          }}
                        >
                          Stock
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 rounded-lg text-ink-muted hover:text-ink"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 rounded-lg text-status-danger hover:bg-status-dangerLight"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingProduct ? `Edit Product (WP# ${editingProduct.wp})` : 'Add Wallpaper Product'}
        description="Enter wallpaper roll specifications, catalog grouping, and pricing."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="WP Number (Wallpaper Code)"
              type="text"
              required
              placeholder="e.g. WP-105"
              value={formData.wp}
              onChange={(e) => setFormData({ ...formData, wp: e.target.value })}
            />
            <Input
              label="Design Name / Number"
              type="text"
              required
              placeholder="e.g. Royal Damask Cream"
              value={formData.design}
              onChange={(e) => setFormData({ ...formData, design: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Catalog Book
              </label>
              <select
                value={formData.bookId}
                onChange={(e) => setFormData({ ...formData, bookId: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              >
                <option value="">Select Book</option>
                {books.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Storage Warehouse
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Brand"
              type="text"
              placeholder="Umar Usman"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category / Texture"
              type="text"
              placeholder="Textured Silk, Vinyl, Non-Woven"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <Input
              label="Roll Size"
              type="text"
              placeholder="0.53m x 10m"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-paper rounded-xl border border-warm-border">
            <Input
              label="Purchase Rate (PKR)"
              type="number"
              min="0"
              placeholder="2500"
              value={formData.purchasePrice || ''}
              onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
            />
            <Input
              label="Sale Rate (PKR)"
              type="number"
              required
              min="0"
              placeholder="4200"
              value={formData.salePrice || ''}
              onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
            />
            {!editingProduct && (
              <Input
                label="Opening Stock"
                type="number"
                min="0"
                placeholder="20"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              />
            )}
            <Input
              label="Min Stock Alert"
              type="number"
              min="0"
              placeholder="5"
              value={formData.minStock || ''}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Internal Notes"
            type="text"
            placeholder="Rack number, supplier, or matching fabric notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={formLoading}
            >
              {editingProduct ? 'Update Product' : 'Save Wallpaper'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Stock — WP# ${adjustingProduct?.wp}`}
        description={`${adjustingProduct?.design} • Current: ${adjustingProduct?.stock} rolls in stock`}
      >
        <form onSubmit={handleStockAdjustment} className="space-y-4">
          <div className="flex items-center justify-center gap-3 p-3 bg-paper rounded-xl border border-warm-border">
            <button
              type="button"
              onClick={() => setAdjustType('add')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                adjustType === 'add'
                  ? 'bg-teal text-white shadow-warm'
                  : 'bg-paper-light border border-warm-border text-ink-muted'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Stock (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('subtract')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                adjustType === 'subtract'
                  ? 'bg-status-danger text-white shadow-warm'
                  : 'bg-paper-light border border-warm-border text-ink-muted'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Deduct Stock (-)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity (Rolls)"
              type="number"
              min="1"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Reason
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
              >
                <option value="Restock">Restock / New Shipment</option>
                <option value="Adjustment">Inventory Count Adjustment</option>
                <option value="Damage">Damaged Roll</option>
                <option value="Return">Customer Return</option>
                <option value="Correction">Data Correction</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Reference / Invoice / Notes"
            type="text"
            placeholder="e.g. Shipment invoice #492"
            value={adjustRef}
            onChange={(e) => setAdjustRef(e.target.value)}
          />

          {/* New Stock Preview */}
          <div className="p-3 bg-teal-subtle text-teal rounded-lg text-xs flex items-center justify-between font-medium">
            <span>Resulting Stock:</span>
            <span className="font-bold text-sm">
              {adjustType === 'add'
                ? (adjustingProduct?.stock || 0) + adjustQty
                : (adjustingProduct?.stock || 0) - adjustQty}{' '}
              Rolls
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustingProduct(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={adjustType === 'add' ? 'teal' : 'danger'}
              isLoading={adjustLoading}
            >
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-ink-muted">
          Loading wallpaper catalog...
        </div>
      }
    >
      <ProductsContent />
    </React.Suspense>
  );
}
