'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit2,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  _id: string;
  code?: string;
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
  supplier?: string;
  notes?: string;
  warehouseId?: { _id: string; name: string; code: string };
}

interface BookData {
  _id: string;
  code: string;
  name: string;
  color?: string;
}

interface WarehouseOption {
  _id: string;
  name: string;
  code: string;
}

interface BulkRow {
  code: string;
  qty: number;
  size?: string;
  price?: number;
  isExisting?: boolean;
}

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [book, setBook] = useState<BookData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    wp: '',
    brand: 'Umar Usman',
    category: 'Wallpaper',
    color: '',
    size: '0.53m x 10m',
    unit: 'Roll',
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5,
    warehouseId: '',
    supplier: '',
    notes: '',
  });

  // Bulk Sheet Import Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Quick Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('Purchased');
  const [adjustNote, setAdjustNote] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  // Delete Password Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes, wRes] = await Promise.all([
        fetch(`/api/books/${params.id}`),
        fetch(`/api/products?bookId=${params.id}`),
        fetch('/api/warehouses'),
      ]);

      const [bData, pData, wData] = await Promise.all([bRes.json(), pRes.json(), wRes.json()]);

      if (bData.success && bData.data) {
        setBook(bData.data);
      } else {
        toast.error('Book not found');
        router.push('/books');
        return;
      }

      if (pData.success && pData.data) {
        setProducts(pData.data);
      }

      if (wData.success && wData.data) {
        setWarehouses(wData.data);
      }
    } catch {
      toast.error('Failed to load book data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      wp: '',
      brand: 'Umar Usman',
      category: 'Wallpaper',
      color: '',
      size: '0.53m x 10m',
      unit: 'Roll',
      purchasePrice: 0,
      salePrice: 0,
      stock: 0,
      minStock: 5,
      warehouseId: warehouses[0]?._id || '',
      supplier: '',
      notes: '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      wp: p.wp,
      brand: p.brand || 'Umar Usman',
      category: p.category || 'Wallpaper',
      color: p.color || '',
      size: p.size || '0.53m x 10m',
      unit: p.unit || 'Roll',
      purchasePrice: p.purchasePrice || 0,
      salePrice: p.salePrice || 0,
      stock: p.stock || 0,
      minStock: p.minStock || 5,
      warehouseId: p.warehouseId?._id || '',
      supplier: p.supplier || '',
      notes: p.notes || '',
    });
    setIsProductModalOpen(true);
  };

  // AI Photo Scan for single WP
  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'scan_code', imageBase64: base64 }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error('AI Scan Failed', { description: json.error || 'Could not detect WP code' });
          setScanLoading(false);
          return;
        }

        if (json.data?.code) {
          setFormData((prev) => ({ ...prev, wp: String(json.data.code).trim() }));
          toast.success(`Detected WP Code: ${json.data.code}`, {
            description: 'Design Name automatically updated to match WP number',
          });
        }
        setScanLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Error reading image file');
      setScanLoading(false);
    }
  };

  // AI Bulk Stock Sheet Import
  const handleSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import_sheet', imageBase64: base64 }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error('AI Sheet Parse Failed', { description: json.error || 'Could not parse sheet' });
          setBulkLoading(false);
          return;
        }

        const rows: Array<{ code: string; qty: number; size?: string; price?: number }> = Array.isArray(
          json.data
        )
          ? json.data
          : json.data?.items || [];

        if (rows.length === 0) {
          toast.error('No table rows detected in image. Please try a clearer photo.');
          setBulkLoading(false);
          return;
        }

        // Cross reference against existing products in book
        const existingMap = new Set(products.map((p) => p.wp.toLowerCase().trim()));
        const enriched: BulkRow[] = rows.map((r) => ({
          code: String(r.code || '').trim(),
          qty: Number(r.qty) || 0,
          size: r.size || '0.53m x 10m',
          price: Number(r.price) || 0,
          isExisting: existingMap.has(String(r.code || '').toLowerCase().trim()),
        }));

        setBulkRows(enriched);
        setBulkLoading(false);
        toast.success(`AI Extracted ${enriched.length} wallpapers from photo`);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Error reading sheet file');
      setBulkLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) return;

    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: params.id,
          warehouseId: bulkWarehouseId || undefined,
          items: bulkRows,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Bulk import failed', { description: json.error });
        setBulkSubmitting(false);
        return;
      }

      toast.success(json.message);
      setIsBulkModalOpen(false);
      setBulkRows([]);
      fetchData();
    } catch {
      toast.error('Network error during bulk import');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wp.trim()) {
      toast.error('Wallpaper Number is required');
      return;
    }

    setFormLoading(true);
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';

      const payload = {
        ...formData,
        bookId: params.id,
        // Design name is automatically = wp number per specification
        design: formData.wp.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to save wallpaper', { description: json.error });
        setFormLoading(false);
        return;
      }

      toast.success(editingProduct ? 'Wallpaper updated' : 'Wallpaper add ho gaya');
      setIsProductModalOpen(false);
      fetchData();
    } catch {
      toast.error('Network error');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const res = await fetch(`/api/products/${productToDelete._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete wallpaper', { description: json.error });
        return;
      }
      toast.success('Wallpaper deleted successfully');
      setProductToDelete(null);
      fetchData();
    } catch {
      toast.error('Failed to delete wallpaper');
    }
  };

  const handleOpenAdjust = (p: Product, type: 'add' | 'subtract') => {
    setAdjustingProduct(p);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustReason(type === 'add' ? 'Purchased' : 'Damaged');
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
          reference: adjustNote.trim() || `Catalog ${book?.name || ''} manual adjustment`,
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
      (p.color && p.color.toLowerCase().includes(search.toLowerCase())) ||
      (p.warehouseId?.name && p.warehouseId.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRolls = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outCount = products.filter((p) => p.stock <= 0).length;

  return (
    <AppShell title={book ? `${book.name} Catalog` : 'Wallpaper Book'}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/books')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            All Books
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: book?.color || '#1E6F6C' }}
              />
              <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
                {book?.name || 'Wallpaper Book'}
              </h1>
              <Badge variant="brass" size="sm" className="font-mono">
                {book?.code}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Designs catalog, roll stock levels, and AI sheet import
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBulkRows([]);
              setIsBulkModalOpen(true);
            }}
            leftIcon={<ImageIcon className="w-4 h-4 text-emerald-700" />}
          >
            🖼 Import Sheet (Bulk)
          </Button>

          <Button
            variant="teal"
            size="sm"
            onClick={handleOpenAddProduct}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Add Wallpaper
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-teal">
          <div className="text-xs font-semibold text-ink-muted uppercase">Designs in Catalog</div>
          <div className="text-2xl font-bold text-ink mt-1">{products.length}</div>
          <div className="text-[11px] text-ink-muted mt-0.5">Unique wallpaper numbers</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-brass">
          <div className="text-xs font-semibold text-ink-muted uppercase">Total Roll Stock</div>
          <div className="text-2xl font-bold text-ink mt-1">
            {totalRolls} <span className="text-xs text-ink-muted font-normal">Rolls</span>
          </div>
          <div className="text-[11px] text-ink-muted mt-0.5">Available across godowns</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-ink-muted uppercase">Low Stock</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{lowCount}</div>
          <div className="text-[11px] text-ink-muted mt-0.5">At or below reorder limit</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-ink-muted uppercase">Out of Stock</div>
          <div className="text-2xl font-bold text-status-danger mt-1">{outCount}</div>
          <div className="text-[11px] text-ink-muted mt-0.5">Zero rolls available</div>
        </Card>
      </div>

      {/* Search Input */}
      <Card className="p-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search wallpapers in this book by WP number, color, or warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-paper border border-warm-border rounded-lg text-ink focus:outline-none focus:border-teal"
          />
        </div>
      </Card>

      {/* Wallpaper Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-xs text-ink-muted flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
              Loading catalog designs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-ink-muted space-y-3">
              <Package className="w-12 h-12 mx-auto text-ink-muted/40" />
              <div className="text-base font-semibold text-ink">No wallpapers in this book</div>
              <p className="text-xs max-w-sm mx-auto">
                Click &ldquo;+ Add Wallpaper&rdquo; or &ldquo;📷 Import Sheet (Bulk)&rdquo; to populate this book.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-warm-border text-ink-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">WP No.</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Sale Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                        <td className="py-3 px-4 font-mono font-bold text-teal">
                          <div className="text-sm">WP {p.wp}</div>
                          {p.code && <div className="text-[10px] text-ink-muted">{p.code}</div>}
                        </td>
                        <td className="py-3 px-4 text-ink-muted">{p.color || '-'}</td>
                        <td className="py-3 px-4 text-ink font-medium">
                          {p.warehouseId ? (
                            <Link
                              href={`/warehouses/${p.warehouseId._id}`}
                              className="hover:text-teal inline-flex items-center gap-1"
                            >
                              <span>{p.warehouseId.name}</span>
                            </Link>
                          ) : (
                            <span className="text-ink-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">{formatCurrency(p.salePrice)}</td>
                        <td className="py-3 px-4 font-mono text-sm font-bold text-ink">
                          {p.stock} <span className="text-[10px] font-normal text-ink-muted">{p.unit}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isOut ? (
                            <Badge variant="danger" size="sm">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">Low ({p.stock})</Badge>
                          ) : (
                            <Badge variant="success" size="sm">In Stock</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleOpenAdjust(p, 'add')}
                            title="Add stock rolls"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-700 hover:bg-rose-50"
                            onClick={() => handleOpenAdjust(p, 'subtract')}
                            title="Subtract stock rolls"
                            disabled={p.stock <= 0}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-ink-muted hover:text-ink"
                            onClick={() => handleOpenEditProduct(p)}
                            title="Edit wallpaper"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-status-danger hover:bg-status-dangerLight"
                            onClick={() => setProductToDelete(p)}
                            title="Delete wallpaper (Admin Protected)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Wallpaper Modal (No manual Design Name field - auto = wp) */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Wallpaper (WP ${editingProduct.wp})` : `Add Wallpaper to ${book?.name}`}
        description="Design Name is automatically synchronized to match the Wallpaper Number."
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                  Wallpaper Number*
                </label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoScan}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-teal border-teal/40 hover:bg-teal-subtle"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={scanLoading}
                    leftIcon={<ImageIcon className="w-3 h-3" />}
                    title="Choose a photo from gallery or computer"
                  >
                    🖼 Choose Photo (Gallery/Computer)
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-ink-muted mb-1">
                Select a photo from your gallery or computer. AI will detect and fill the WP number.
              </p>
              <input
                type="text"
                required
                placeholder="e.g. 8821 or AY-102"
                value={formData.wp}
                onChange={(e) => setFormData({ ...formData, wp: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none font-bold font-mono"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Design Name will be automatically set to &ldquo;{formData.wp.trim() || 'WP Number'}&rdquo;.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
                Assigned Warehouse
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full rounded-lg border border-warm-border bg-paper-light px-3 py-2 text-xs text-ink focus:border-teal focus:outline-none"
              >
                <option value="">-- None / Unassigned --</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Sale Price (PKR/Roll)*"
              type="number"
              min="0"
              required
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
            />
            <Input
              label="Purchase Price (PKR)"
              type="number"
              min="0"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
            />
            <Input
              label={editingProduct ? 'Current Stock' : 'Opening Stock (Rolls)'}
              type="number"
              min="0"
              value={formData.stock}
              disabled={Boolean(editingProduct)}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Color / Shade"
              type="text"
              placeholder="e.g. Gold, Cream, Grey"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
            <Input
              label="Roll Size"
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            />
            <Input
              label="Reorder Alert (Min Stock)"
              type="number"
              min="0"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier / Vendor"
              type="text"
              placeholder="Optional supplier name"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
            <Input
              label="Notes"
              type="text"
              placeholder="Texture, batch or stock remarks"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="teal" isLoading={formLoading}>
              {editingProduct ? 'Update Wallpaper' : 'Save to Catalog'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 📷 Bulk Stock Sheet Import Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="📷 Import Wallpaper Stock Sheet (AI Vision)"
        description="Upload a photo of your paper stock list, ledger, or supplier sheet. AI will parse all wallpaper rows."
        size="lg"
      >
        <div className="space-y-4">
          {bulkRows.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-warm-border rounded-2xl text-center space-y-3">
              <input
                type="file"
                accept="image/*"
                ref={sheetInputRef}
                onChange={handleSheetUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-teal-subtle text-teal mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Upload Stock Sheet Photo</h3>
                <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                  Choose a photo from your phone gallery or browse from your computer. AI will read the codes and quantities.
                </p>
              </div>
              <Button
                type="button"
                variant="teal"
                size="sm"
                onClick={() => sheetInputRef.current?.click()}
                isLoading={bulkLoading}
                leftIcon={<ImageIcon className="w-4 h-4" />}
              >
                {bulkLoading ? 'Analyzing Sheet with AI...' : '🖼 Choose Photo (Gallery/Computer)'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-ink">
                  {bulkRows.length} Wallpapers detected from image
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkWarehouseId}
                    onChange={(e) => setBulkWarehouseId(e.target.value)}
                    className="rounded-lg border border-warm-border bg-paper-light px-2.5 py-1 text-xs text-ink focus:border-teal"
                  >
                    <option value="">Assign Warehouse (Optional)</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => sheetInputRef.current?.click()}
                  >
                    Re-scan
                  </Button>
                </div>
              </div>

              {/* Editable Review Table */}
              <div className="max-h-72 overflow-y-auto border border-warm-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper sticky top-0 border-b border-warm-border font-semibold text-ink-muted">
                    <tr>
                      <th className="py-2 px-3">WP Number</th>
                      <th className="py-2 px-3">Quantity (Rolls)</th>
                      <th className="py-2 px-3">Price (PKR)</th>
                      <th className="py-2 px-3">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-borderLight">
                    {bulkRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-bold text-teal">
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].code = e.target.value;
                              setBulkRows(updated);
                            }}
                            className="bg-paper border border-warm-border rounded px-2 py-0.5 w-24 text-xs font-bold font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].qty = Number(e.target.value) || 0;
                              setBulkRows(updated);
                            }}
                            className="bg-paper border border-warm-border rounded px-2 py-0.5 w-20 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={row.price || 0}
                            onChange={(e) => {
                              const updated = [...bulkRows];
                              updated[idx].price = Number(e.target.value) || 0;
                              setBulkRows(updated);
                            }}
                            className="bg-paper border border-warm-border rounded px-2 py-0.5 w-24 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          {row.isExisting ? (
                            <Badge variant="teal" size="sm">Add to Stock</Badge>
                          ) : (
                            <Badge variant="brass" size="sm">New Wallpaper</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-borderLight">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkRows([]);
                    setIsBulkModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="teal"
                  size="sm"
                  onClick={handleBulkSubmit}
                  isLoading={bulkSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Confirm &amp; Import {bulkRows.length} Items
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
                <div className="font-bold text-ink">Current Book Stock:</div>
                <div className="text-ink-muted">{book?.name}</div>
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
                    <option value="Purchased">Purchased / Supplier Restock</option>
                    <option value="Returned">Customer Returned</option>
                    <option value="Adjustment Add">Manual Adjustment (Add)</option>
                  </>
                ) : (
                  <>
                    <option value="Sold">Sold Manual</option>
                    <option value="Damaged">Damaged / Defective</option>
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
              placeholder="e.g. Supplier Invoice # or reason"
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

      {/* Delete Wallpaper Password Modal */}
      {productToDelete && (
        <PasswordPromptModal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          onSuccess={confirmDeleteProduct}
          type="delete"
          title={`Delete WP ${productToDelete.wp}`}
          description={`Admin Delete Protection password is required to delete wallpaper "${productToDelete.wp}" from ${book?.name}.`}
        />
      )}
    </AppShell>
  );
}
