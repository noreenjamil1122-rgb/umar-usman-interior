'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  productCount?: number;
  totalStock?: number;
  lowCount?: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Password Modal
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses');
      const json = await res.json();
      if (json.success) {
        setWarehouses(json.data);
      }
    } catch {
      toast.error('Could not load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setName(w.name);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const method = editingWarehouse ? 'PUT' : 'POST';
      const url = editingWarehouse ? `/api/warehouses/${editingWarehouse._id}` : '/api/warehouses';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to save warehouse', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success(editingWarehouse ? 'Warehouse updated' : 'Warehouse add ho gaya');
      setIsOpen(false);
      setEditingWarehouse(null);
      setName('');
      fetchWarehouses();
    } catch {
      toast.error('Network Error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;

    try {
      const res = await fetch(`/api/warehouses/${warehouseToDelete._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete warehouse', { description: json.error });
        return;
      }
      toast.success('Warehouse deleted successfully');
      setWarehouseToDelete(null);
      fetchWarehouses();
    } catch {
      toast.error('Failed to delete warehouse');
    }
  };

  return (
    <AppShell title="Warehouses (Home)">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Warehouses &amp; Inventory Storage
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Manage physical godowns and monitor wallpaper rolls distribution
          </p>
        </div>

        <Button
          variant="teal"
          size="sm"
          onClick={() => {
            setEditingWarehouse(null);
            setName('');
            setIsOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Warehouse
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
          Loading warehouse locations...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {warehouses.map((w) => (
            <Card
              key={w._id}
              variant="elevated"
              className="flex flex-col justify-between hover:border-teal/50 transition-all hover:shadow-warm-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-paper border border-warm-border text-teal">
                    {w.code}
                  </span>
                  <WarehouseIcon className="w-4 h-4 text-ink-muted" />
                </div>

                <Link href={`/warehouses/${w._id}`} className="group">
                  <h3 className="text-base font-bold text-ink group-hover:text-teal transition-colors flex items-center gap-1.5 mb-1">
                    <span>{w.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                </Link>

                <div className="space-y-1.5 text-xs text-ink-muted mt-2">
                  <div className="flex items-center justify-between">
                    <span>Assigned Wallpapers:</span>
                    <span className="font-semibold text-ink">{w.productCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Quantity:</span>
                    <span className="font-bold text-ink font-mono">
                      {(w.totalStock || 0).toLocaleString()} Rolls
                    </span>
                  </div>
                  {(w.lowCount || 0) > 0 && (
                    <div className="flex items-center justify-between text-amber-700 font-medium">
                      <span>Low/Out Stock:</span>
                      <span>{w.lowCount} warning(s)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-warm-borderLight mt-4 flex items-center justify-between">
                <Link href={`/warehouses/${w._id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                    View Stock
                  </Button>
                </Link>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(w)}
                    title="Edit name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-status-danger hover:bg-status-dangerLight"
                    onClick={() => setWarehouseToDelete(w)}
                    title="Delete warehouse (Protected)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* + Add Warehouse Card */}
          <button
            type="button"
            onClick={() => {
              setEditingWarehouse(null);
              setName('');
              setIsOpen(true);
            }}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-warm-border rounded-2xl hover:border-teal hover:bg-paper/60 transition-all text-center group min-h-[170px]"
          >
            <div className="w-10 h-10 rounded-full bg-teal-subtle text-teal flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-ink group-hover:text-teal">
              + Add Warehouse
            </span>
            <span className="text-[11px] text-ink-muted mt-0.5">
              Register a new godown or storage unit
            </span>
          </button>
        </div>
      )}

      {/* Delete Password Modal */}
      {warehouseToDelete && (
        <PasswordPromptModal
          isOpen={Boolean(warehouseToDelete)}
          onClose={() => setWarehouseToDelete(null)}
          onSuccess={confirmDelete}
          type="delete"
          title={`Delete Warehouse ${warehouseToDelete.name}`}
          description={`Admin Delete Protection password is required to delete warehouse "${warehouseToDelete.name}" (${warehouseToDelete.code}).`}
        />
      )}

      {/* Add / Edit Warehouse Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingWarehouse ? `Edit Warehouse (${editingWarehouse.code})` : 'Add Warehouse Location'}
        description="Physical location or godown where wallpaper rolls are stored."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Warehouse Name"
            type="text"
            required
            placeholder="e.g. Warehouse 1, Gulberg Godown, Hall Road Store"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-borderLight">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={submitting}
            >
              {editingWarehouse ? 'Update Warehouse' : 'Save Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
