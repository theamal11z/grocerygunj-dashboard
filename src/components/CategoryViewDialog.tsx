import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Database } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define types
type Category = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface CategoryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  products: Product[];
}

const CategoryViewDialog: React.FC<CategoryViewDialogProps> = ({
  open,
  onOpenChange,
  category,
  products
}) => {
  const [error, setError] = useState<string | null>(null);
  
  // Reset error when dialog opens or category changes
  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open, category]);
  
  // Validate category data
  useEffect(() => {
    if (!open) return;
    
    if (!category) {
      setError("Category data is missing or invalid");
      return;
    }
    
    if (!products) {
      setError("Product data could not be loaded");
      return;
    }
  }, [category, products, open]);
  
  if (!category) {
    return open ? (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to display category. Category data is missing or invalid.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    ) : null;
  }
  
  // Get products in this category
  const categoryProducts = products?.filter(product => product.category_id === category.id) || [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[600px] h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
        </DialogHeader>
        
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Category header with image */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/3 rounded-md overflow-hidden bg-secondary">
                <img 
                  src={category.image_url || "https://placehold.co/300x200?text=No+Image"} 
                  alt={category.name} 
                  className="w-full aspect-video object-cover"
                  onError={(e) => {
                    console.error(`Error loading image from URL: ${category.image_url}`);
                    (e.target as HTMLImageElement).src = "https://placehold.co/300x200?text=Error";
                  }}
                />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{category.name}</h3>
                
                <div className="mt-1 text-sm text-muted-foreground">
                  <span>Created: {new Date(category.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {categoryProducts.length} Products
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Products in category */}
            <div>
              <h4 className="font-medium mb-3">Products in this Category</h4>
              {categoryProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryProducts.map(product => (
                    <div key={product.id} className="p-2 border rounded-md flex items-center gap-2">
                      <div className="h-10 w-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                        <img 
                          src={product.image_urls && product.image_urls.length > 0 
                              ? product.image_urls[0] 
                              : "https://placehold.co/100x100?text=No+Image"
                          } 
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error(`Error loading product image from URL: ${
                              product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'No URL'
                            }`);
                            (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">${product.price.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md p-4 text-center text-muted-foreground flex flex-col items-center">
                  <Package className="h-8 w-8 mb-2 text-muted-foreground/50" />
                  <p>No products in this category</p>
                  <p className="text-xs mt-1">Add products to this category to see them here</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryViewDialog; 