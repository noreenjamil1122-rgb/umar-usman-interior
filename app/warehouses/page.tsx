'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, Layers, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  productCount?: number;
  totalStock?: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleDelete = async (w: Warehouse) => {
    if (!confirm(`Are you sure you want to delete warehouse "${w.name}"?`)) return;

    try {
      const res = await fetch(`/api/warehouses/${w._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete warehouse', { description: json.error });
        return;
      }
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch {
      toast.error('Failed to delete warehouse');
    }
  };

  return (
    <AppShell title="Warehouses">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Storage Warehouses &amp; Locations
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Manage physical godowns and store room locations across Lahore
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
      ) : warehouses.length === 0 ? (
        <Card className="py-12 text-center text-ink-muted">
          <WarehouseIcon className="w-10 h-10 mx-auto text-ink-muted/40 mb-2" />
          <div className="text-sm font-semibold text-ink">No warehouses registered</div>
          <p className="text-xs mt-1">Add a warehouse or storage unit to allocate stock.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {warehouses.map((w) => (
            <Card
              key={w._id}
              variant="elevated"
              className="flex flex-col justify-between hover:border-teal/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-paper border border-warm-border text-teal">
                    {w.code}
                  </span>
                  <WarehouseIcon className="w-4 h-4 text-ink-muted" />
                </div>

                <h3 className="text-base font-bold text-ink mb-1">{w.name}</h3>
                <div className="space-y-1 text-xs text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal" />
                    <span>{w.productCount || 0} Distinct Products</span>
                  </div>
                  <div className="font-semibold text-ink">
                    {(w.totalStock || 0).toLocaleString()} Total Rolls in Storage
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-warm-borderLight mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleEdit(w)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-status-danger hover:bg-status-dangerLight"
                  onClick={() => handleDelete(w)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
