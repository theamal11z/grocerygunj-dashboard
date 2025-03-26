import React, { useState, useEffect, useCallback } from 'react';
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
import { Database } from "@/lib/database.types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Define types
type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];

// Add Base64 encoding size limit (2MB recommended for database storage)
const MAX_BASE64_SIZE = 2 * 1024 * 1024; // 2MB

// Initial category state
const initialCategoryState: Partial<Category> = {
  name: '',
  image_url: '',
};

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  onSave: () => void;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({
  open,
  onOpenChange,
  category,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Category>>(initialCategoryState);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  // Add state for Base64 mode - default to true to avoid storage issues
  const [useBase64, setUseBase64] = useState<boolean>(true);

  // Set form data when category changes (editing mode)
  useEffect(() => {
    if (category) {
      setFormData(category);
    } else {
      setFormData(initialCategoryState);
    }
  }, [category]);

  // Validate image URL
  const isValidImageUrl = (url: string): boolean => {
    return url.trim() !== '' && 
      (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Category, value: any) => {
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

  const handleUpdateImageUrl = () => {
    if (!imageUrl.trim()) {
      setImageError('Image URL cannot be empty');
      return;
    }
    
    if (!isValidImageUrl(imageUrl)) {
      setImageError('Please enter a valid URL (starting with http://, https://, or data:image/)');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      image_url: imageUrl
    }));
    setImageUrl('');
    setImageError('');
    toast.success('Image URL updated');
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_url: null
    }));
    toast.success('Image removed');
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
      handleUpdateImageUrl();
    }
  };

  // Handle file upload using Base64 encoding (no storage bucket needed)
  const handleBase64Upload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Invalid file type. Please upload JPEG, PNG, WebP, or GIF images only.');
      return;
    }
    
    // Validate file size (max 2MB for Base64 to avoid database issues)
    if (file.size > MAX_BASE64_SIZE) {
      setImageError(`File too large. Maximum size is ${MAX_BASE64_SIZE/1024/1024}MB for Base64 encoding.`);
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(10);
      
      console.log('Starting Base64 encoding for:', file.name);
      console.log('File size:', Math.round(file.size / 1024), 'KB');
      
      // Read the file as Base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          if (e.target?.result) {
            // Result contains the Base64 data URL
            resolve(e.target.result as string);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        // Read file as data URL (includes Base64 data)
        reader.readAsDataURL(file);
      });
      
      setUploadProgress(90);
      console.log('Base64 encoding complete. Length:', base64Image.length);
      
      // Update form data with the new Base64 image
      setFormData(prev => ({
        ...prev,
        image_url: base64Image
      }));
      
      setUploadProgress(100);
      toast.success('Image encoded and added successfully');
      
    } catch (error) {
      console.error('Error processing image:', error);
      let errorMessage = 'Failed to process image.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setImageError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  }, []);

  // Handle file upload via storage bucket
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Invalid file type. Please upload JPEG, PNG, WebP, or GIF images only.');
      return;
    }
    
    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setImageError('File too large. Maximum size is 5MB.');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(10);
      
      // Implement your existing bucket storage upload logic here
      // This is just a placeholder for now
      toast.error('Storage bucket upload not implemented. Use Base64 mode instead.');
      setImageError('Storage bucket upload not implemented');
      
    } catch (error) {
      console.error('Upload error:', error);
      setImageError('Failed to upload image to storage bucket');
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, []);

  // Combined file input handler
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(''); // Clear any previous errors
    
    if (useBase64) {
      handleBase64Upload(event);
    } else {
      handleFileUpload(event);
    }
  }, [useBase64, handleBase64Upload, handleFileUpload]);

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const categoryData: CategoryInsert = {
        name: formData.name?.trim() || '',
        image_url: formData.image_url
      };
      
      // Validate name is not empty after trimming
      if (!categoryData.name) {
        throw new Error('Category name cannot be empty');
      }
      
      // Log the data being saved for debugging
      console.log('Saving category data:', categoryData);
      
      let result;
      
      if (category?.id) {
        // Update existing category
        result = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)
          .select();
      } else {
        // Create new category
        result = await supabase
          .from('categories')
          .insert([categoryData])
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.data || result.data.length === 0) {
        throw new Error('Failed to save category, no data returned');
      }
      
      // Success
      console.log(category?.id ? 'Category updated successfully:' : 'Category added successfully:', result.data);
      toast.success(category?.id ? 'Category updated successfully' : 'Category added successfully');
      onSave();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error saving category:', error);
      let errorMessage = 'Failed to save category';
      
      // Check for specific database errors
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Look for specific Supabase/Postgres error patterns
        if (errorMessage.includes('duplicate key value')) {
          errorMessage = 'A category with this name already exists';
        } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
          errorMessage = 'Permission error. You may not have rights to save categories.';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Check your internet connection.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'The category could not be found. It may have been deleted.';
        } else if (errorMessage.includes('validation')) {
          errorMessage = 'Validation error. Please check your input values.';
        } else if (errorMessage.includes('JWT')) {
          errorMessage = 'Authentication error. Please try logging out and back in.';
        }
      }
      
      toast.error(errorMessage, {
        description: 'Check browser console for more details. You may need to refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
              placeholder="Category name"
            />
            {errors.name && <p className="text-destructive text-sm col-start-2 col-span-3">{errors.name}</p>}
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="image" className="text-right pt-2">
              Image
            </Label>
            <div className="col-span-3 space-y-2">
              {/* Image storage method toggle */}
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="use-base64"
                  checked={useBase64}
                  onCheckedChange={(checked) => setUseBase64(checked as boolean)}
                />
                <Label htmlFor="use-base64" className="text-xs cursor-pointer">
                  Use Base64 encoding (store in database)
                </Label>
              </div>
              
              <div className="flex gap-2">
                <Input
                  id="image-url"
                  value={imageUrl}
                  onChange={handleImageUrlChange}
                  onKeyDown={handleImageUrlKeyDown}
                  placeholder="Image URL"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateImageUrl}
                >
                  Update
                </Button>
              </div>
              
              {/* File upload input */}
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="flex-1"
                />
              </div>
              
              {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              {imageError && <p className="text-destructive text-sm">{imageError}</p>}
              
              {formData.image_url && (
                <div className="relative border rounded p-1 mt-2">
                  <img 
                    src={formData.image_url as string} 
                    alt="Category image"
                    className="w-full h-32 object-contain"
                    onError={() => setImageError('Invalid image URL')}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {useBase64
                  ? 'Base64 mode: Image will be stored directly in the database'
                  : 'URL mode: Image will be referenced from an external source'}
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="sm:size-default">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={loading} size="sm" className="sm:size-default">
            {loading ? 'Saving...' : 'Save Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog; 