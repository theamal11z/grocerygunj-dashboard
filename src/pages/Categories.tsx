import { 
  Eye, 
  Pencil, 
  Trash2, 
  Plus, 
  Download,
  Filter,
  FolderTree,
  RefreshCw,
  AlertCircle,
  Tag,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CategoryDialog from "@/components/CategoryDialog";
import CategoryViewDialog from "@/components/CategoryViewDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// Define types
type Category = Database['public']['Tables']['categories']['Row'];

const Categories = () => {
  const { categories, products, refreshData, loading, error } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transformedCategories, setTransformedCategories] = useState<any[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Selected category for operations
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  // Transform and validate categories
  useEffect(() => {
    try {
      if (!categories || !products) {
        setTransformedCategories([]);
        return;
      }
      
      // Transform categories to display format
      const transformed = categories.map(category => {
        // Count products in this category
        const productCount = products.filter(p => p.category_id === category.id).length;
        
        // Get some sample products for this category (max 3)
        const categoryProducts = products
          .filter(p => p.category_id === category.id)
          .slice(0, 3)
          .map(p => p.name);
          
        const sampleProducts = categoryProducts.length 
          ? categoryProducts.join(", ")
          : "No products";
        
        return {
          ...category,
          products: productCount,
          sampleProducts,
          imageUrl: category.image_url || "https://placehold.co/100x100?text=No+Image",
          // Add a simple placeholder description since our schema doesn't have description
          description: `${category.name} category with ${productCount} products`
        };
      });
      
      setTransformedCategories(transformed);
      setProcessingError(null);
    } catch (error) {
      console.error("Error processing categories:", error);
      setProcessingError("Failed to process categories data. Please try refreshing.");
      setTransformedCategories([]);
    }
  }, [categories, products]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log("Refreshing categories data...");
      await refreshData();
      console.log("Categories data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data", {
        description: "Please check your network connection and try again."
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle view category
  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category);
    setViewDialogOpen(true);
  };
  
  // Handle edit category
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };
  
  // Handle delete category click
  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      // Check if category has products
      const categoryProducts = products.filter(p => p.category_id === selectedCategory.id);
      if (categoryProducts.length > 0) {
        toast.error(
          'Cannot delete category with products', 
          { description: `This category has ${categoryProducts.length} products. Remove or reassign them first.` }
        );
        setDeleteDialogOpen(false);
        return;
      }
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', selectedCategory.id);
        
      if (error) throw error;
      
      toast.success('Category deleted successfully');
      refreshData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle add new category click
  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setAddDialogOpen(true);
  };
  
  // Export categories as CSV
  const handleExport = () => {
    // Prepare data for export
    const exportData = transformedCategories.map(category => ({
      ID: category.id,
      Name: category.name,
      'Product Count': category.products,
      'Sample Products': category.sampleProducts,
      'Created At': new Date(category.created_at).toLocaleDateString(),
      'Image URL': category.image_url || ''
    }));
    
    // Convert to CSV
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    // Download the file
    saveAs(blob, `categories-export-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Categories exported successfully');
  };

  // Category columns
  const categoryColumns = [
    {
      header: "Category",
      accessorKey: "name" as const,
      cell: (info: any) => {
        const category = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
              <img 
                src={category.imageUrl} 
                alt={category.name} 
                className="h-full w-full object-cover" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                }}
              />
            </div>
            <div>
              <div className="font-medium">{category.name}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Products",
      accessorKey: "products" as const,
      cell: (info: any) => {
        const category = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {category.products}
            </span>
          </div>
        );
      }
    },
    {
      header: "Sample Products",
      accessorKey: "sampleProducts" as const,
      cell: (info: any) => {
        const category = info.row.original;
        return (
          <div className="max-w-[300px] truncate text-sm">
            {category.sampleProducts}
          </div>
        );
      }
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (info: any) => {
        const category = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleViewCategory(category)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleEditCategory(category)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={() => handleDeleteClick(category)}
              disabled={category.products > 0}
              title={category.products > 0 ? "Cannot delete category with products" : "Delete category"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-8 animate-blur-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage product categories ({categories.length} categories)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            size="sm" 
            className="gap-1.5"
            onClick={handleAddCategory}
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>
      
      {(error || processingError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error || processingError}</span>
            <Button variant="destructive" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <DataTable 
        data={transformedCategories} 
        columns={categoryColumns}
        searchable
        searchPlaceholder="Search categories..."
        loading={loading || isRefreshing}
      />
      
      {/* Add Category Dialog */}
      <CategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={refreshData}
      />
      
      {/* Edit Category Dialog */}
      <CategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={selectedCategory}
        onSave={refreshData}
      />
      
      {/* View Category Dialog */}
      <CategoryViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        category={selectedCategory}
        products={products}
      />
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Categories;
