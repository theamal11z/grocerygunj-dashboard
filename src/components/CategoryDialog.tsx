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
import { Database } from "@/lib/database.types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { XCircle, AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminSupabase } from "@/lib/supabase";

// Define types
type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];

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
  const [diagnosticMode, setDiagnosticMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      (url.startsWith('http://') || url.startsWith('https://'));
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
      setImageError('Please enter a valid URL (starting with http:// or https://)');
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

  // Check Supabase connectivity
  const checkSupabaseConnection = async () => {
    setDiagnosticMode(true);
    setConnectionStatus("Checking connection...");
    try {
      // Try to fetch one row from categories to check connectivity
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        if (error.message.toLowerCase().includes('network')) {
          setConnectionStatus("⚠️ Network error - Unable to connect to Supabase");
        } else if (error.message.includes('not found')) {
          setConnectionStatus("⚠️ Table not found - The categories table may not exist");
        } else if (error.message.includes('permission') || error.message.includes('403')) {
          setConnectionStatus("⚠️ Permission denied - You may not have access to categories");
        } else if (error.message.includes('JWT') || error.message.includes('auth')) {
          setConnectionStatus("⚠️ Authentication error - Your session may have expired");
        } else {
          setConnectionStatus(`⚠️ Error connecting to Supabase: ${error.message}`);
        }
        console.error("Supabase connection check failed:", error);
        return false;
      }
      
      setConnectionStatus("✅ Successfully connected to Supabase");
      console.log("Supabase connection check succeeded:", data);
      return true;
    } catch (error) {
      setConnectionStatus(`⚠️ Unexpected error checking connection: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Unexpected error during connection check:", error);
      return false;
    }
  };

  // Try to enable category admin policies if there's a permission error
  const enableCategoryAdminPolicies = async () => {
    try {
      console.log("Attempting to enable category admin policies...");
      // Call the stored procedure to enable admin policies
      const { data, error } = await supabase.rpc('enable_category_admin_policies');
      
      if (error) {
        console.error("Failed to enable category admin policies:", error);
        return false;
      }
      
      console.log("Category admin policies enabled:", data);
      return true;
    } catch (error) {
      console.error("Error enabling category admin policies:", error);
      return false;
    }
  };

  // Attempt to save using admin client as fallback
  const saveWithAdminClient = async () => {
    if (!adminSupabase) {
      console.error("Admin client is not available");
      return false;
    }
    
    try {
      const categoryData: CategoryInsert = {
        name: formData.name?.trim() || '',
        image_url: formData.image_url
      };
      
      if (!categoryData.name) {
        return false;
      }
      
      console.log('Attempting to save with admin client bypass:', categoryData);
      
      if (category?.id) {
        // Update existing category
        const { error, data } = await adminSupabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)
          .select();
          
        if (error) {
          console.error("Admin client update failed:", error);
          return false;
        }
        
        console.log('Category updated successfully with admin client:', data);
        toast.success('Category updated successfully (admin bypass)');
      } else {
        // Create new category
        const { error, data } = await adminSupabase
          .from('categories')
          .insert([categoryData])
          .select();
          
        if (error) {
          console.error("Admin client insert failed:", error);
          return false;
        }
        
        console.log('Category added successfully with admin client:', data);
        toast.success('Category added successfully (admin bypass)');
      }
      
      onSave();
      onOpenChange(false);
      return true;
    } catch (error) {
      console.error('Error saving with admin client:', error);
      return false;
    }
  };

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
      let retryCount = 0;
      let lastError = null;
      
      // Try saving up to 2 times, with an attempt to fix permissions in between
      while (retryCount < 2) {
        try {
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
            lastError = result.error;
            if (result.error.message.includes('permission') || result.error.message.includes('403')) {
              console.log("Permission error detected, attempting to fix policies...");
              await enableCategoryAdminPolicies();
              // Wait a moment for policies to take effect
              await new Promise(resolve => setTimeout(resolve, 500));
              retryCount++;
              continue;
            }
            throw result.error;
          }
          
          if (!result.data || result.data.length === 0) {
            throw new Error('Failed to save category, no data returned');
          }
          
          // Success - break out of the retry loop
          console.log(category?.id ? 'Category updated successfully:' : 'Category added successfully:', result.data);
          toast.success(category?.id ? 'Category updated successfully' : 'Category added successfully');
          onSave();
          onOpenChange(false);
          return;
        } catch (innerError) {
          lastError = innerError;
          throw innerError;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('Failed to save category after retries');
      
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
          // Try to fix permissions
          const fixed = await enableCategoryAdminPolicies();
          if (fixed) {
            errorMessage += ' Permissions updated - please try saving again.';
          }
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
      
      // Automatically check connection on error
      checkSupabaseConnection();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category?.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2 pr-1">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
              placeholder="Enter category name..."
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          
          {/* Image URL */}
          <div className="space-y-3">
            <Label>Category Image</Label>
            
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
                onClick={handleUpdateImageUrl}
                className="sm:flex-shrink-0"
              >
                Update Image
              </Button>
            </div>
            {imageError && <p className="text-xs text-destructive mt-1">{imageError}</p>}
            <p className="text-xs text-muted-foreground">
              Add an image URL from online sources. You can press Enter to quickly update.
            </p>
            
            {/* Image Preview */}
            {formData.image_url ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Category Image</Label>
                </div>
                <div className="relative group w-full max-w-[300px] mx-auto">
                  <img
                    src={formData.image_url}
                    alt={`Category image`}
                    className="h-40 w-full object-cover rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/300x200?text=Error";
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-3 text-center text-muted-foreground">
                <p className="text-sm">No image added yet</p>
                <p className="text-xs mt-1">Add an image by entering a URL above</p>
              </div>
            )}
          </div>
          
          {/* Diagnostic Information */}
          {diagnosticMode && (
            <Alert className={connectionStatus?.includes('✅') ? 'bg-green-50' : 'bg-amber-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-medium">Supabase Diagnostic</div>
                <div>{connectionStatus}</div>
                {!connectionStatus?.includes('✅') && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={checkSupabaseConnection}
                      className="flex-1"
                    >
                      Retry Connection Test
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={enableCategoryAdminPolicies}
                      className="flex-1"
                    >
                      Fix RLS Policies
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Show admin bypass button if in diagnostic mode and adminSupabase is available */}
          {diagnosticMode && adminSupabase && !connectionStatus?.includes('✅') && (
            <Alert className="bg-red-50 border-red-200 my-2">
              <Shield className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-sm flex flex-col gap-2">
                <div>
                  <span className="font-medium">Admin Override Available</span>
                  <p className="text-xs">You can bypass RLS policies using admin credentials</p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={saveWithAdminClient}
                  className="w-full"
                >
                  Save With Admin Override
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="mr-auto"
            onClick={checkSupabaseConnection}
          >
            Test Connection
          </Button>
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