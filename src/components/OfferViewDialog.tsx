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
import { formatDistanceToNow, parseISO, isValid, isPast, intervalToDuration, format } from 'date-fns';
import { X, Calendar, Ticket, Copy, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define types
type Offer = Database['public']['Tables']['offers']['Row'];

interface OfferViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: Offer;
}

const OfferViewDialog: React.FC<OfferViewDialogProps> = ({
  open,
  onOpenChange,
  offer
}) => {
  const [imageError, setImageError] = useState(false);
  
  if (!offer) return null;

  // Parse and validate date
  let validUntilFormatted: string = 'Unknown date';
  let timeRemaining: string = '';
  let isExpired = false;
  
  try {
    if (offer.valid_until) {
      const date = parseISO(offer.valid_until);
      
      if (isValid(date)) {
        validUntilFormatted = formatDistanceToNow(date, { addSuffix: true });
        isExpired = isPast(date);
        
        // Calculate time remaining for active offers
        if (!isExpired) {
          const now = new Date();
          const duration = intervalToDuration({ start: now, end: date });
          
          const parts = [];
          if (duration.months && duration.months > 0) {
            parts.push(`${duration.months} month${duration.months > 1 ? 's' : ''}`);
          }
          if (duration.days && duration.days > 0) {
            parts.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
          }
          if (duration.hours && duration.hours > 0 && duration.months === 0) {
            parts.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
          }
          
          if (parts.length > 0) {
            timeRemaining = parts.join(', ');
          }
        }
      }
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  // Format expiry date for display
  const formattedExpiryDate = (() => {
    try {
      if (offer.valid_until) {
        const date = parseISO(offer.valid_until);
        if (isValid(date)) {
          return format(date, 'MMMM d, yyyy');
        }
      }
      return 'Invalid date';
    } catch (e) {
      return 'Invalid date';
    }
  })();

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Copy offer code to clipboard
  const copyOfferCode = () => {
    if (offer.code) {
      navigator.clipboard.writeText(offer.code)
        .then(() => toast.success(`Copied offer code: ${offer.code}`))
        .catch(() => toast.error('Failed to copy code to clipboard'));
    }
  };

  // Open image in new tab
  const openImageInNewTab = () => {
    if (offer.image_url) {
      window.open(offer.image_url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offer Details</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Offer Header with Image */}
          <div className="grid gap-4">
            {offer.image_url && !imageError ? (
              <div className="relative overflow-hidden rounded-lg group">
                <img
                  src={offer.image_url}
                  alt={`${offer.title} offer`}
                  className="h-[200px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={handleImageError}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={openImageInNewTab}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center bg-muted rounded-lg">
                <Ticket className="h-12 w-12 opacity-20" />
              </div>
            )}
          </div>

          {/* Offer Details */}
          <div className="grid gap-3">
            {/* Title and Status */}
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold">{offer.title}</h3>
              <Badge variant={isExpired ? "destructive" : "default"}>
                {isExpired ? "Expired" : "Active"}
              </Badge>
            </div>

            {/* Offer Code */}
            <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Discount Code</p>
                <p className="text-lg font-mono font-semibold">{offer.code}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={copyOfferCode}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            </div>

            {/* Discount Amount */}
            <div className="mt-1">
              <p className="text-sm text-muted-foreground">Discount Amount</p>
              <p className="text-lg font-semibold">{offer.discount}</p>
            </div>

            {/* Valid Until */}
            <div className="space-y-1 mt-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className={`text-sm ${isExpired ? 'text-destructive' : ''}`}>
                  {isExpired ? 'Expired' : 'Valid'} {validUntilFormatted}
                </p>
              </div>
              
              {!isExpired && timeRemaining && (
                <div className="ml-6">
                  <Badge variant="outline" className="font-normal">
                    {timeRemaining} remaining
                  </Badge>
                </div>
              )}
              
              <div className="ml-6 text-xs text-muted-foreground">
                Expiry date: {formattedExpiryDate}
              </div>
            </div>

            {/* Description */}
            {offer.description && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                <p className="text-sm whitespace-pre-line">{offer.description}</p>
              </div>
            )}
            
            {/* Image Error Warning */}
            {imageError && offer.image_url && (
              <Alert variant="warning" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  The offer image could not be loaded. 
                  <a 
                    href={offer.image_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    View image URL
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferViewDialog; 