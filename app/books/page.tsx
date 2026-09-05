'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { BookOpen, Plus, Edit2, Trash2, Layers, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Book {
  _id: string;
  code: string;
  name: string;
  color?: string;
  productCount?: number;
  totalStock?: number;
  lowCount?: number;
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

  // Delete Password Modal
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

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

  const confirmDelete = async () => {
    if (!bookToDelete) return;

    try {
      const res = await fetch(`/api/books/${bookToDelete._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Cannot delete book', { description: json.error });
        return;
      }
      toast.success('Book deleted successfully');
      setBookToDelete(null);
      fetchBooks();
    } catch {
      toast.error('Failed to delete book');
    }
  };

  return (
    <AppShell title="Wallpaper Books">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Wallpaper Catalog Books
          </h1>
          <p className="text-xs md:text-sm text-ink-muted">
            Group rolls into branded catalog books with color tags and stock tracking
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b) => (
            <Card
              key={b._id}
              variant="elevated"
              className="flex flex-col justify-between hover:border-teal/50 transition-all hover:shadow-warm-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-paper border border-warm-border text-teal">
                    {b.code}
                  </span>
                  <div className="flex items-center gap-2">
                    {(b.lowCount || 0) > 0 && (
                      <Badge variant="warning" size="sm" className="text-[10px] px-1.5 py-0">
                        {b.lowCount} Low
                      </Badge>
                    )}
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                      style={{ backgroundColor: b.color || '#1E6F6C' }}
                      title={`Theme: ${b.color}`}
                    />
                  </div>
                </div>

                <Link href={`/books/${b._id}`} className="group">
                  <h3 className="text-base font-bold text-ink group-hover:text-teal transition-colors flex items-center gap-1.5 mb-1">
                    <span>{b.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                </Link>

                <div className="space-y-1.5 text-xs text-ink-muted mt-2">
                  <div className="flex items-center justify-between">
                    <span>Catalog Designs:</span>
                    <span className="font-semibold text-ink">{b.productCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Stock:</span>
                    <span className="font-bold text-ink font-mono">
                      {(b.totalStock || 0).toLocaleString()} Rolls
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-warm-borderLight mt-4 flex items-center justify-between">
                <Link href={`/books/${b._id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                    View Catalog
                  </Button>
                </Link>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(b)}
                    title="Edit book"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-status-danger hover:bg-status-dangerLight"
                    onClick={() => setBookToDelete(b)}
                    title="Delete book (Protected)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* + Add Book Card */}
          <button
            type="button"
            onClick={() => {
              setEditingBook(null);
              setName('');
              setColor('#1E6F6C');
              setIsOpen(true);
            }}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-warm-border rounded-2xl hover:border-teal hover:bg-paper/60 transition-all text-center group min-h-[170px]"
          >
            <div className="w-10 h-10 rounded-full bg-teal-subtle text-teal flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-ink group-hover:text-teal">
              + Add Book
            </span>
            <span className="text-[11px] text-ink-muted mt-0.5">
              Register a new wallpaper collection catalog
            </span>
          </button>
        </div>
      )}

      {/* Delete Password Modal */}
      {bookToDelete && (
        <PasswordPromptModal
          isOpen={Boolean(bookToDelete)}
          onClose={() => setBookToDelete(null)}
          onSuccess={confirmDelete}
          type="delete"
          title={`Delete Book ${bookToDelete.name}`}
          description={`Admin Delete Protection password is required to delete wallpaper book "${bookToDelete.name}" (${bookToDelete.code}).`}
        />
      )}

      {/* Add / Edit Book Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingBook ? `Edit Book (${editingBook.code})` : 'Add Catalog Book'}
        description="Create a collection book to organize matching wallpaper patterns."
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
