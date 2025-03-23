import { 
  Eye, 
  Trash2, 
  Download,
  Filter,
  Heart,
  ShoppingCart,
  RefreshCw,
  User,
  Check,
  AlertTriangle,
  X,
  Loader2
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Define enhanced wishlist type
interface EnhancedWishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  user_name: string;
  user_email: string | null;
  product_name: string;
  product_price: number;
  product_image: string | null;
  time_ago: string;
}

// Loading Skeleton component for wishlists
const WishlistSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array(3).fill(0).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border rounded-md p-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Wishlists = () => {
  const navigate = useNavigate();
  const { 
    wishlists, 
    products, 
    profiles, 
    loading, 
    error, 
    refreshData, 
    removeFromWishlist,
    addToCart
  } = useData();
  const { toast } = useToast();
  const [enhancedWishlists, setEnhancedWishlists] = useState<EnhancedWishlist[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<EnhancedWishlist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    type: 'delete' | 'addToCart';
    wishlist: EnhancedWishlist | null;
  }>({ type: 'delete', wishlist: null });
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [successStates, setSuccessStates] = useState<Record<string, boolean>>({});

  // Process wishlist data when data is available
  useEffect(() => {
    if (wishlists && wishlists.length > 0 && products && profiles) {
      const enhanced = wishlists.map(wishlist => {
        // Find related product
        const product = products.find(p => p.id === wishlist.product_id);
        
        // Find related user
        const user = profiles.find(p => p.id === wishlist.user_id);
        
        // Calculate time ago
        let timeAgo = "Unknown";
        try {
          timeAgo = formatDistanceToNow(new Date(wishlist.created_at), { addSuffix: true });
        } catch (e) {
          console.error("Date parsing error:", e);
        }
        
        return {
          ...wishlist,
          user_name: user?.full_name || "Unknown User",
          user_email: user?.email || null,
          product_name: product?.name || "Unknown Product",
          product_price: product?.price || 0,
          product_image: product?.image_urls?.[0] || null,
          time_ago: timeAgo
        };
      });
      
      setEnhancedWishlists(enhanced);
    } else {
      setEnhancedWishlists([]);
    }
  }, [wishlists, products, profiles]);

  // Handle viewing a wishlist item
  const handleViewWishlist = (wishlist: EnhancedWishlist) => {
    setSelectedWishlist(wishlist);
    setShowProductModal(true);
  };

  // Handle deleting a wishlist item
  const handleDeleteWishlist = (wishlist: EnhancedWishlist) => {
    setPendingOperation({
      type: 'delete',
      wishlist
    });
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!pendingOperation.wishlist) return;
    
    setIsDeleting(true);
    try {
      const result = await removeFromWishlist(pendingOperation.wishlist.id);
      
      if (result.success) {
        toast({
          title: "Item removed",
          description: `Removed ${pendingOperation.wishlist.product_name} from your wishlist`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove item from wishlist",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPendingOperation({ type: 'delete', wishlist: null });
    }
  };

  // Handle adding to cart
  const handleAddToCart = async (wishlist: EnhancedWishlist) => {
    // Don't allow multiple simultaneous operations on the same item
    if (isAddingToCart === wishlist.id) return;
    
    setIsAddingToCart(wishlist.id);
    try {
      const result = await addToCart(wishlist.product_id, 1);
      
      if (result.success) {
        // Show success state
        setSuccessStates(prev => ({ ...prev, [wishlist.id]: true }));
        
        // Clear success state after animation
        setTimeout(() => {
          setSuccessStates(prev => ({ ...prev, [wishlist.id]: false }));
        }, 2000);
        
        toast({
          title: "Added to cart",
          description: `${wishlist.product_name} has been added to your cart`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add item to cart",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(null);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast({
        title: "Refreshed",
        description: "Wishlist data has been updated",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh wishlist data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle navigation to products page
  const handleBrowseProducts = () => {
    navigate("/products");
  };

  // Handle navigation to product details page
  const handleViewProductDetails = (productId: string) => {
    // Since there's no product detail page, just show a notification
    toast({
      title: "Product View",
      description: "This would navigate to the product details page if implemented",
    });
    // Close the modal
    setShowProductModal(false);
  };

  // Wishlists columns with loading state for cart button
  const getWishlistColumnsWithState = useMemo(() => [
  {
    header: "User",
    accessorKey: "user_id" as const,
    cell: (info: any) => {
      const wishlist: EnhancedWishlist = info.row.original;
      
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
            {!wishlist.user_name ? (
              <User className="h-5 w-5 text-muted-foreground" />
            ) : (
              <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {wishlist.user_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{wishlist.user_name || "Unknown User"}</div>
            <div className="text-xs text-muted-foreground">{wishlist.user_email || "No email"}</div>
            <div className="text-xs text-muted-foreground">ID: {wishlist.user_id.substring(0, 8)}...</div>
          </div>
        </div>
      );
    }
  },
  {
    header: "Product",
    accessorKey: "product_id" as const,
    cell: (info: any) => {
      const wishlist: EnhancedWishlist = info.row.original;
      
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
            {wishlist.product_image ? (
              <img 
                src={wishlist.product_image} 
                alt={wishlist.product_name} 
                className="h-full w-full object-cover" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <Heart className="h-4 w-4" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{wishlist.product_name || "Unknown Product"}</div>
            <div className="text-xs text-muted-foreground">
              {typeof wishlist.product_price === 'number' 
                ? `np${wishlist.product_price.toFixed(2)}` 
                : 'Price not available'}
            </div>
            <div className="text-xs text-muted-foreground">ID: {wishlist.product_id.substring(0, 8)}...</div>
          </div>
        </div>
      );
    }
  },
  {
    header: "Added",
    accessorKey: "time_ago" as const,
    cell: (info: any) => info.getValue()
  },
  {
    header: "Actions",
      id: "actions",
    cell: (info: any) => {
      const wishlist = info.row.original;
        const isItemAddingToCart = isAddingToCart === wishlist.id;
        const showSuccess = successStates[wishlist.id];
        
      return (
        <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <button 
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                    onClick={() => handleViewWishlist(wishlist)}
          >
            <Eye className="h-4 w-4" />
          </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <button 
                    className={`p-1.5 rounded-md hover:bg-secondary ${showSuccess ? 'text-green-500' : 'text-muted-foreground'}`}
                    onClick={() => handleAddToCart(wishlist)}
                    disabled={isItemAddingToCart}
                  >
                    {isItemAddingToCart ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : showSuccess ? (
                      <Check className="h-4 w-4" />
                    ) : (
                  <ShoppingCart className="h-4 w-4" />
                    )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                  <p>{isItemAddingToCart ? 'Adding to cart...' : showSuccess ? 'Added to cart!' : 'Add to cart'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
            
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <button 
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                    onClick={() => handleDeleteWishlist(wishlist)}
                    disabled={isDeleting || isItemAddingToCart}
                  >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove from wishlist</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }
  }
  ], [handleViewWishlist, handleDeleteWishlist, handleAddToCart, isAddingToCart, isDeleting, successStates]);

  return (
    <div className="space-y-8 animate-blur-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Wishlists</h1>
          <p className="text-muted-foreground mt-1">
            User saved items for future purchase ({enhancedWishlists.length} items)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md border border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Error loading wishlists</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Show loading skeleton */}
      {(loading || isRefreshing) && (
        <div className="p-4 border rounded-md space-y-6">
          <WishlistSkeleton />
        </div>
      )}
      
      {enhancedWishlists.length === 0 && !loading && !isRefreshing && !error && (
        <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items in wishlist</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Items added to your wishlist will appear here for easy access later. Browse products and click the heart icon to add them to your wishlist.
          </p>
          <Button variant="default" onClick={handleBrowseProducts}>
            Browse Products
          </Button>
        </div>
      )}
      
      {/* Only show the table when there's data and after initial loading */}
      {!loading && enhancedWishlists.length > 0 && (
        <div className="bg-background border rounded-md shadow-sm">
      <DataTable 
        data={enhancedWishlists} 
            columns={getWishlistColumnsWithState}
        searchable
        searchPlaceholder="Search wishlists..."
            loading={isRefreshing}
          />
        </div>
      )}

      {/* Product Details Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Detailed information about this wishlist item
            </DialogDescription>
          </DialogHeader>
          
          {selectedWishlist && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/3 h-[120px] rounded-md overflow-hidden bg-secondary flex-shrink-0">
                  {selectedWishlist.product_image ? (
                    <img 
                      src={selectedWishlist.product_image} 
                      alt={selectedWishlist.product_name} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <Heart className="h-8 w-8" />
                    </div>
                  )}
                </div>
                
                <div className="w-full sm:w-2/3 space-y-2">
                  <h3 className="text-lg font-medium">{selectedWishlist.product_name}</h3>
                  <div className="flex items-center">
                    <Badge variant="outline" className="text-primary">
                      np{selectedWishlist.product_price.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Added to wishlist {selectedWishlist.time_ago}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Product Details</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Product ID: {selectedWishlist.product_id}</p>
                  <p>Date Added: {format(new Date(selectedWishlist.created_at), 'PPP')}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowProductModal(false)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  setShowProductModal(false);
                  if (selectedWishlist) {
                    handleViewProductDetails(selectedWishlist.product_id);
                  }
                }}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                View Product
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  setShowProductModal(false);
                  if (selectedWishlist) {
                    handleDeleteWishlist(selectedWishlist);
                  }
                }}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => {
                  if (selectedWishlist) {
                    handleAddToCart(selectedWishlist);
                    setShowProductModal(false);
                  }
                }}
                className="gap-1.5"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from wishlist?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingOperation.wishlist && (
                <>
                  Are you sure you want to remove <span className="font-medium">{pendingOperation.wishlist.product_name}</span> from your wishlist? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className={isDeleting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Wishlists;
