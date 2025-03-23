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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/lib/database.types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { XCircle, CalendarIcon, PercentIcon, AlertCircle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, addDays, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// Define types
type Offer = Database['public']['Tables']['offers']['Row'];
type OfferInsert = Database['public']['Tables']['offers']['Insert'];

// Initial offer state
const initialOfferState: Partial<Offer> = {
  title: '',
  code: '',
  discount: '',
  description: '',
  image_url: '',
  valid_until: new Date(addDays(new Date(), 30)).toISOString()
};

interface OfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: Offer;
  onSave: () => void;
}

const OfferDialog: React.FC<OfferDialogProps> = ({
  open,
  onOpenChange,
  offer,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Offer>>(initialOfferState);
  const [loading, setLoading] = useState(false);
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [imageValidating, setImageValidating] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Set form data when offer changes (editing mode)
  useEffect(() => {
    if (offer) {
      setFormData(offer);
      setImagePreview(offer.image_url || '');
      
      // Try to parse the valid_until date
      try {
        if (offer.valid_until) {
          const date = parseISO(offer.valid_until);
          if (isValid(date)) {
            setValidUntilDate(date);
          }
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    } else {
      setFormData(initialOfferState);
      setValidUntilDate(addDays(new Date(), 30));
      setImagePreview('');
    }
    
    // Reset errors and connection error when dialog opens/closes
    setErrors({});
    setConnectionError(null);
    setImageUrl('');
    setImageError('');
  }, [offer, open]);

  // Update form data when validUntilDate changes
  useEffect(() => {
    if (validUntilDate) {
      setFormData(prev => ({
        ...prev,
        valid_until: validUntilDate.toISOString()
      }));
    }
  }, [validUntilDate]);

  // Validate form before saving
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.code?.trim()) {
      newErrors.code = 'Offer code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code should contain only uppercase letters, numbers, and underscores';
    }
    
    if (!formData.discount?.trim()) {
      newErrors.discount = 'Discount amount is required';
    }
    
    if (!formData.valid_until) {
      newErrors.valid_until = 'Expiration date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate image URL with a fetch request to check if image exists
  const validateImageUrl = useCallback(async (url: string): Promise<boolean> => {
    if (!url.trim()) {
      setImageError('Image URL cannot be empty');
      return false;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setImageError('Please enter a valid URL (starting with http:// or https://)');
      return false;
    }
    
    setImageValidating(true);
    
    try {
      // Attempt to fetch the image to verify it's valid
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        setImageError(`Image could not be loaded (HTTP ${response.status})`);
        return false;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        setImageError('URL does not point to a valid image');
        return false;
      }
      
      // Image is valid
      setImageError('');
      return true;
    } catch (error) {
      console.error('Error validating image URL:', error);
      setImageError('Failed to validate image. Please check the URL and try again.');
      return false;
    } finally {
      setImageValidating(false);
    }
  }, []);

  // Handle input changes
  const handleChange = (field: keyof Offer, value: any) => {
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

  // Handle image URL input
  const handleUpdateImageUrl = async () => {
    if (!imageUrl.trim()) {
      setImageError('Image URL cannot be empty');
      return;
    }
    
    const isValid = await validateImageUrl(imageUrl);
    
    if (isValid) {
      setFormData(prev => ({
        ...prev,
        image_url: imageUrl
      }));
      setImagePreview(imageUrl);
      setImageUrl('');
      toast.success('Image URL updated');
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_url: null
    }));
    setImagePreview('');
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

  // Save the offer
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setConnectionError(null);
    
    try {
      // Format discount to ensure it has % if it's just a number
      let discountFormatted = formData.discount || '';
      if (!discountFormatted.includes('%') && !isNaN(Number(discountFormatted))) {
        discountFormatted = `${discountFormatted}%`;
      }
      
      const offerData: OfferInsert = {
        title: formData.title?.trim() || '',
        code: formData.code?.trim() || '',
        discount: discountFormatted,
        description: formData.description || null,
        valid_until: formData.valid_until || new Date().toISOString(),
        image_url: formData.image_url || null
      };
      
      console.log('Saving offer data:', offerData);
      
      if (offer?.id) {
        // Update existing offer
        const { error, data } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', offer.id)
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Offer not found or no changes were made');
        }
        
        console.log('Offer updated successfully:', data);
        toast.success('Offer updated successfully');
      } else {
        // Create new offer
        const { error, data } = await supabase
          .from('offers')
          .insert([offerData])
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Failed to create offer, no data returned');
        }
        
        console.log('Offer added successfully:', data);
        toast.success('Offer added successfully');
      }
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving offer:', error);
      let errorMessage = 'Failed to save offer';
      
      // Check for specific database errors
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Look for specific Supabase/Postgres error patterns
        if (errorMessage.includes('duplicate key value')) {
          errorMessage = 'An offer with this code already exists';
          setErrors({ code: 'This code is already in use' });
        } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
          errorMessage = 'Permission error. You may not have rights to save offers.';
          
          // Try to fix permissions automatically
          tryFixPermissions();
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Check your internet connection.';
        }
      }
      
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Try to fix permissions by calling the admin policy function
  const tryFixPermissions = async () => {
    try {
      toast.info('Attempting to fix offer permissions...');
      
      const { data, error } = await supabase
        .rpc('enable_offer_admin_policies');
        
      if (error) {
        console.error('Error fixing permissions:', error);
        return;
      }
      
      if (data) {
        toast.success('Permissions fixed. Please try saving again.');
        setConnectionError('Permissions have been fixed. Please try saving again.');
      }
    } catch (err) {
      console.error('Error in permission fix attempt:', err);
    }
  };

  // Image loading fallback handler
  const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "https://placehold.co/300x200?text=Image+Error";
    setImageError('The image could not be loaded. Please check the URL.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer?.id ? 'Edit Offer' : 'Add New Offer'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2 pr-1">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Offer Title</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className={errors.title ? 'border-destructive' : ''}
              placeholder="Enter offer title..."
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          
          {/* Offer Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Offer Code</Label>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              className={`uppercase ${errors.code ? 'border-destructive' : ''}`}
              placeholder="SUMMER20"
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            <p className="text-xs text-muted-foreground">
              Customers will use this code to redeem the offer. 
              Use only uppercase letters, numbers, and underscores.
            </p>
          </div>
          
          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discount">Discount Amount</Label>
            <div className="relative">
              <PercentIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="discount"
                value={formData.discount || ''}
                onChange={(e) => handleChange('discount', e.target.value)}
                className={`pl-8 ${errors.discount ? 'border-destructive' : ''}`}
                placeholder="20% OFF"
              />
            </div>
            {errors.discount && <p className="text-xs text-destructive">{errors.discount}</p>}
            <p className="text-xs text-muted-foreground">
              Enter the discount amount (e.g., "20% OFF" or "₹100 OFF")
            </p>
          </div>
          
          {/* Valid Until Date */}
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until</Label>
            <div className={errors.valid_until ? 'border rounded border-destructive' : ''}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !validUntilDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntilDate ? format(validUntilDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntilDate}
                    onSelect={setValidUntilDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {errors.valid_until && <p className="text-xs text-destructive">{errors.valid_until}</p>}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the offer details..."
              className="resize-none h-20"
            />
          </div>
          
          {/* Image URL */}
          <div className="space-y-3">
            <Label>Offer Image (Optional)</Label>
            
            {/* Image URL Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={imageUrl}
                onChange={handleImageUrlChange}
                onKeyDown={handleImageUrlKeyDown}
                placeholder="Image URL (https://...)"
                className={`flex-1 ${imageError ? 'border-destructive' : ''}`}
                disabled={imageValidating}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleUpdateImageUrl}
                className="sm:flex-shrink-0"
                disabled={imageValidating}
              >
                {imageValidating ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Update Image'
                )}
              </Button>
            </div>
            {imageError && <p className="text-xs text-destructive mt-1">{imageError}</p>}
            <p className="text-xs text-muted-foreground">
              Add an image URL for this offer. You can press Enter to quickly update.
            </p>
            
            {/* Image Preview */}
            {imagePreview ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Offer Image</Label>
                </div>
                <div className="relative group w-full max-w-[300px] mx-auto">
                  <img
                    src={imagePreview}
                    alt={`Offer image`}
                    className="h-40 w-full object-cover rounded-md"
                    onError={handleImageLoadError}
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
          
          {/* Connection Error */}
          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="sm:justify-end gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="sm:size-default">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={loading} 
            size="sm" 
            className="sm:size-default"
          >
            {loading ? 'Saving...' : 'Save Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDialog; 