import { 
  Eye, 
  Pencil, 
  Trash2, 
  Plus, 
  Download,
  Filter,
  Tag,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { useState } from "react";
import { Database } from "@/lib/database.types";
import ProductDialog from "@/components/ProductDialog";
import ProductViewDialog from "@/components/ProductViewDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

// Define product type from our database
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

const Products = () => {
  const { products, categories, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Selected product for operations
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  // Transform products to display format
  const transformedProducts = products.map(product => {
    // Find the category name
    const category = categories.find(cat => cat.id === product.category_id);
    
    // Determine status based on stock
    const status = product.in_stock ? "In Stock" : "Out of Stock";
    
    return {
      ...product,
      category: category?.name || "Uncategorized",
      status,
      displayPrice: `np${product.price.toFixed(2)}`,
      imageUrl: product.image_urls && product.image_urls.length > 0 
        ? product.image_urls[0] 
        : "https://placehold.co/100x100?text=No+Image"
    };
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };
  
  // Handle view product
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewDialogOpen(true);
  };
  
  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };
  
  // Handle delete product click
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id);
        
      if (error) throw error;
      
      toast.success('Product deleted successfully');
      refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle add new product click
  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setAddDialogOpen(true);
  };
  
  // Export products as CSV
  const handleExport = () => {
    // Prepare data for export
    const exportData = transformedProducts.map(product => ({
      ID: product.id,
      Name: product.name,
      Category: product.category,
      Price: product.price,
      Unit: product.unit,
      'In Stock': product.in_stock ? 'Yes' : 'No',
      Discount: product.discount || 0,
      Description: product.description || ''
    }));
    
    // Convert to CSV
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    // Download the file
    saveAs(blob, `products-export-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Products exported successfully');
  };

  // Get selected product's category
  const getSelectedProductCategory = () => {
    if (!selectedProduct || !selectedProduct.category_id) return undefined;
    return categories.find(cat => cat.id === selectedProduct.category_id);
  };

  // Products columns
  const productColumns = [
    {
      header: "Product",
      accessorKey: "name" as const,
      cell: (info: any) => {
        const product = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="h-full w-full object-cover" 
                loading="lazy"
              />
            </div>
            <div>
              <div className="font-medium">{product.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> {product.category}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Price",
      accessorKey: "displayPrice" as const,
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (info: any) => {
        const product = info.row.original;
        const statusColors: Record<string, string> = {
          "In Stock": "bg-green-100 text-green-800",
          "Out of Stock": "bg-red-100 text-red-800",
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}>
            {product.status}
          </span>
        );
      }
    },
    {
      header: "Unit",
      accessorKey: "unit" as const,
    },
    {
      header: "Discount",
      accessorKey: "discount" as const,
      cell: (info: any) => {
        const product = info.row.original;
        return product.discount ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {product.discount}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">No discount</span>
        );
      }
    },
    {
      header: "Available",
      accessorKey: "in_stock" as const,
      cell: (info: any) => {
        const product = info.row.original;
        return product.in_stock ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        );
      }
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (info: any) => {
        const product = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleViewProduct(product)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleEditProduct(product)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={() => handleDeleteClick(product)}
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
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product inventory ({products.length} products)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <Filter className="h-4 w-4" />
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
            onClick={handleAddProduct}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>
      
      <DataTable 
        data={transformedProducts} 
        columns={productColumns}
        searchable
        searchPlaceholder="Search products..."
      />
      
      {/* Add Product Dialog */}
      <ProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSave={refreshData}
      />
      
      {/* Edit Product Dialog */}
      <ProductDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        product={selectedProduct}
        categories={categories}
        onSave={refreshData}
      />
      
      {/* View Product Dialog */}
      <ProductViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        product={selectedProduct}
        category={getSelectedProductCategory()}
      />
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Products;
