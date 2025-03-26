import React, { useState } from 'react';
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
import { Tag, ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  
  if (!product) return null;
  
  const hasImages = product.image_urls && product.image_urls.length > 0;
  const imageCount = hasImages ? product.image_urls.length : 0;
  
  const nextImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev + 1) % imageCount);
  };
  
  const prevImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };
  
  const toggleFullscreen = () => {
    setFullscreenMode(!fullscreenMode);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[600px]",
        fullscreenMode && "max-w-[95vw] sm:max-w-[95vw] h-[90vh] max-h-[90vh]"
      )}>
        {!fullscreenMode && (
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
        )}
        
        {fullscreenMode ? (
          // Fullscreen image gallery mode
          <div className="relative h-full flex flex-col">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 z-10" 
              onClick={toggleFullscreen}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 relative flex items-center justify-center">
              {hasImages ? (
                <img
                  src={product.image_urls[activeImageIndex]}
                  alt={`${product.name} - Image ${activeImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-12 w-12 opacity-30" />
                  <span className="text-muted-foreground">No images available</span>
                </div>
              )}
              
              {hasImages && imageCount > 1 && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 rounded-full"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 rounded-full"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
            
            {hasImages && imageCount > 1 && (
              <div className="p-2 flex justify-center gap-1.5 mt-auto">
                {product.image_urls.map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 w-8 rounded-full transition-all ${
                      index === activeImageIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Regular product view 
          <div className="space-y-6">
            {/* Product header with image */}
            <div className="flex items-start gap-4">
              {hasImages ? (
                <div className="relative h-32 w-32 rounded-md overflow-hidden bg-secondary flex-shrink-0 group cursor-pointer" onClick={toggleFullscreen}>
                  <img
                    src={product.image_urls[activeImageIndex]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
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
            
            {/* Image gallery */}
            {hasImages && imageCount > 1 && (
              <div>
                <h4 className="font-medium mb-2">Product Images</h4>
                <div className="relative">
                  {imageCount > 4 && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 rounded-full"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 rounded-full"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <div className="grid grid-cols-4 gap-2 px-1">
                    {product.image_urls.map((url, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "rounded-md overflow-hidden bg-secondary aspect-square cursor-pointer transition-all",
                          activeImageIndex === index && "ring-2 ring-primary"
                        )}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img
                          src={url}
                          alt={`${product.name} - Image ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                          }}
                        />
                      </div>
                    ))}
                  </div>
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
        )}
        
        {!fullscreenMode && (
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button type="button">
                Close
              </Button>
            </DialogClose>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog; 