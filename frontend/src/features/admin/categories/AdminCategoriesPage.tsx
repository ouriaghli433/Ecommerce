import { useState } from 'react';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { ErrorState, PageHeader } from '@/components/common';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/components/ui';
import { useCategories } from '@/features/categories/useCategories';
import { parseApiError } from '@/services/http/errorParser';
import type { Category } from '@/types';
import { useDeleteCategory } from '../useAdminQueries';
import { CategoryFormModal } from './CategoryFormModal';

export function AdminCategoriesPage() {
  const toast = useToast();
  const categoriesQuery = useCategories();
  const deleteCategory = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const categories = categoriesQuery.data ?? [];

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCategory.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (error) {
      toast.error(
        'Cannot delete category',
        parseApiError(error).message || 'Ensure no products still belong to this category.'
      );
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Create, update, and remove storefront product categories."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Create Category
          </Button>
        }
      />

      {categoriesQuery.isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : categoriesQuery.isError ? (
        <ErrorState
          title="Could not load categories"
          error={categoriesQuery.error}
          onRetry={() => categoriesQuery.refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-6 w-6" />}
          title="No categories yet"
          description="Create your first category to start organizing products."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Slug</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-semibold text-slate-900">{category.name}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{category.slug}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-slate-500">
                  {category.description ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? 'success' : 'neutral'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(category);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CategoryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingCategory={editing}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteCategory.isPending}
        title="Delete Category"
        description={`Delete "${deleting?.name ?? ''}"? Categories with existing products cannot be deleted due to foreign key constraints.`}
        confirmLabel="Delete Category"
      />
    </div>
  );
}
