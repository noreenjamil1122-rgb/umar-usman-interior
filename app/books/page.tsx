'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, Plus, Edit2, Trash2, Layers, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Book {
  _id: string;
  code: string;
  name: string;
  color?: string;
  productCount?: number;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1E6F6C');
  const [submitting, setSubmitting] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/books');
      const json = await res.json();
      if (json.success) {
        setBooks(json.data);
      }
    } catch {
      toast.error('Could not load catalog books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleEdit = (b: Book) => {
    setEditingBook(b);
    setName(b.name);
    setColor(b.color || '#1E6F6C');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const method = editingBook ? 'PUT' : 'POST';
      const url = editingBook ? `/api/books/${editingBook._id}` : '/api/books';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to save book', { description: json.error });
        setSubmitting(false);
        return;
      }

      toast.success(editingBook ? 'Book updated' : 'Book add ho gaya');
      setIsOpen(false);
      setEditingBook(null);
      setName('');
      fetchBooks();
    } catch {
      toast.error('Network Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (b: Book) => {
    if (!confirm(`Are you sure you want to delete book "${b.name}"?`)) return;

    try {
      const res = await fetch(`/api/books/${b._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete book', { description: json.error });
        return;
      }
      toast.success('Book deleted successfully');
      fetchBooks();
    } catch {
      toast.error('Failed to delete book');
    }
  };

  return (
    <AppShell title="Catalog Books">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Wallpaper Catalog Books
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Group rolls into books (e.g. Rainbow8, Ayzah, Spanish) with color tagging
          </p>
        </div>

        <Button
          variant="teal"
          size="sm"
          onClick={() => {
            setEditingBook(null);
            setName('');
            setColor('#1E6F6C');
            setIsOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Catalog Book
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-ink-muted flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-teal mr-2" />
          Loading catalog books...
        </div>
      ) : books.length === 0 ? (
        <Card className="py-12 text-center text-ink-muted">
          <BookOpen className="w-10 h-10 mx-auto text-ink-muted/40 mb-2" />
          <div className="text-sm font-semibold text-ink">No catalog books yet</div>
          <p className="text-xs mt-1">Create your first book collection to organize wallpaper designs.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b) => (
            <Card
              key={b._id}
              variant="elevated"
              className="flex flex-col justify-between hover:border-teal/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-paper border border-warm-border text-teal">
                    {b.code}
                  </span>
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: b.color || '#1E6F6C' }}
                    title={`Tag color: ${b.color}`}
                  />
                </div>

                <h3 className="text-base font-bold text-ink mb-1">{b.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Layers className="w-3.5 h-3.5 text-teal" />
                  <span>{b.productCount || 0} Products Assigned</span>
                </div>
              </div>

              <div className="pt-3 border-t border-warm-borderLight mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleEdit(b)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-status-danger hover:bg-status-dangerLight"
                  onClick={() => handleDelete(b)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingBook ? `Edit Book (${editingBook.code})` : 'Add Catalog Book'}
        description="Catalog books organize wallpaper designs in presentation albums."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Book Name"
            type="text"
            required
            placeholder="e.g. Rainbow8, Ayzah, Spanish"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-light">
              Badge / Spine Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-warm-border cursor-pointer p-0.5 bg-paper"
              />
              <span className="text-xs font-mono text-ink">{color}</span>
            </div>
          </div>

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
              {editingBook ? 'Update Book' : 'Save Book'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
