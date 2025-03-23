import React from 'react';
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
import { Tag } from "lucide-react";

// Define types
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface ProductViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  category?: Category;
}

const ProductViewDialog: React.FC<ProductViewDialogProps> = ({
  open,
  onOpenChange,
  product,
  category
}) => {
  if (!product) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Product header with image */}
          <div className="flex items-start gap-4">
            {product.image_urls && product.image_urls.length > 0 ? (
              <div className="h-32 w-32 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                  }}
                />
              </div>
            ) : (
              <div className="h-32 w-32 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{product.name}</h3>
              
              {category && (
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  <span>{category.name}</span>
                </div>
              )}
              
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={product.in_stock ? "success" : "destructive"}>
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </Badge>
                
                {product.discount && product.discount > 0 && (
                  <Badge variant="secondary">{product.discount}% Discount</Badge>
                )}
              </div>
              
              <div className="mt-4">
                <span className="text-2xl font-bold">np{product.price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground ml-1">per {product.unit}</span>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <div>
            <h4 className="font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">
              {product.description || "No description available"}
            </p>
          </div>
          
          {/* Additional images */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div>
              <h4 className="font-medium mb-2">Additional Images</h4>
              <div className="grid grid-cols-4 gap-2">
                {product.image_urls.slice(1).map((url, index) => (
                  <div key={index} className="rounded-md overflow-hidden bg-secondary aspect-square">
                    <img
                      src={url}
                      alt={`${product.name} - Image ${index + 2}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Product details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span>
              <span className="ml-2">{product.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2">{new Date(product.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>
              <span className="ml-2">{new Date(product.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button type="button">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog; 