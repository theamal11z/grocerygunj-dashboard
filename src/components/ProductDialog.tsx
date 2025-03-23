import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "@/lib/database.types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, XCircle } from "lucide-react";

// Define types
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

// Initial product state
const initialProductState: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  category_id: '',
  image_urls: [],
  in_stock: true,
  unit: '',
  discount: 0,
};

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  categories: Category[];
  onSave: () => void;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  onOpenChange,
  product,
  categories,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(initialProductState);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productId, setProductId] = useState<string | null>(null);

  // Set form data when product changes (editing mode)
  useEffect(() => {
    if (product) {
      setFormData(product);
      setProductId(product.id);
    } else {
      setFormData(initialProductState);
      setProductId(null);
    }
  }, [product]);

  // Validate image URL
  const isValidImageUrl = (url: string): boolean => {
    return url.trim() !== '' && 
      (url.startsWith('http://') || url.startsWith('https://'));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (!formData.unit?.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) {
      setImageError('Image URL cannot be empty');
      return;
    }
    
    if (!isValidImageUrl(imageUrl)) {
      setImageError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      image_urls: [...(prev.image_urls || []), imageUrl]
    }));
    setImageUrl('');
    setImageError('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: (prev.image_urls || []).filter((_, i) => i !== index)
    }));
  };

  // Handle image URL input change
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setImageError('');
  };

  // Handle Enter key in image URL input
  const handleImageUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddImage();
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Validate image URLs to ensure they can be saved to the database
      let validatedImageUrls = formData.image_urls || [];
      
      // Filter out any invalid URLs
      const originalLength = validatedImageUrls.length;
      validatedImageUrls = validatedImageUrls.filter(url => {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
      });
      
      if (originalLength !== validatedImageUrls.length) {
        toast.warning(`Removed ${originalLength - validatedImageUrls.length} invalid image URLs`);
      }
      
      const productData: ProductInsert = {
        name: formData.name || '',
        description: formData.description,
        price: formData.price || 0,
        category_id: formData.category_id,
        image_urls: validatedImageUrls,
        in_stock: formData.in_stock !== undefined ? formData.in_stock : true,
        unit: formData.unit || '',
        discount: formData.discount,
      };
      
      if (product?.id) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
          
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // If we've created a temporary product ID, use it
        if (productId) {
          productData.id = productId;
        }
        
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([productData]);
          
        if (error) throw error;
        toast.success('Product added successfully');
      }
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving product:', error);
      let errorMessage = 'Failed to save product';
      
      // Check for specific database errors
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Look for specific Supabase/Postgres error patterns
        if (errorMessage.includes('permission') || errorMessage.includes('403')) {
          errorMessage = 'Permission error. You may not have rights to save products.';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Check your internet connection.';
        }
      }
      
      toast.error(errorMessage, {
        description: 'Check browser console for more details'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[65vw] xl:max-w-[50vw] h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2 pr-1">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id || ''}
                onValueChange={(value) => handleChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Price & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e) => handleChange('unit', e.target.value)}
                className={errors.unit ? 'border-destructive' : ''}
                placeholder="kg, g, L, pcs, etc."
              />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
            </div>
            
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                value={formData.discount || 0}
                onChange={(e) => handleChange('discount', parseInt(e.target.value, 10))}
                min="0"
                max="100"
              />
            </div>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="resize-none sm:resize-vertical"
            />
          </div>
          
          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in_stock"
              checked={formData.in_stock}
              onCheckedChange={(checked) => handleChange('in_stock', checked)}
            />
            <Label htmlFor="in_stock">In Stock</Label>
          </div>
          
          {/* Images - simplified to only URL input */}
          <div className="space-y-3">
            <Label>Product Images</Label>
            
            {/* Image URL Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={imageUrl}
                onChange={handleImageUrlChange}
                onKeyDown={handleImageUrlKeyDown}
                placeholder="Image URL (https://...)"
                className={`flex-1 ${imageError ? 'border-destructive' : ''}`}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddImage}
                className="sm:flex-shrink-0"
              >
                Add Image
              </Button>
            </div>
            {imageError && <p className="text-xs text-destructive mt-1">{imageError}</p>}
            <p className="text-xs text-muted-foreground">
              Add image URLs from online sources. You can press Enter to quickly add an image.
            </p>
            
            {/* Image Preview */}
            {formData.image_urls && formData.image_urls.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Product Images ({formData.image_urls.length})</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {formData.image_urls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Product image ${index + 1}`}
                        className="h-16 sm:h-20 w-full object-cover rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-3 text-center text-muted-foreground">
                <p className="text-sm">No images added yet</p>
                <p className="text-xs mt-1">Add images by entering URLs above</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="sm:size-default">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={loading} size="sm" className="sm:size-default">
            {loading ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog; 