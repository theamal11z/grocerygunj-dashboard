import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  Plus, 
  Download,
  RefreshCw,
  Calendar,
  PercentCircle,
  AlertCircle,
  ChevronDown,
  CalendarIcon,
  Filter,
  X,
  CheckSquare,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { format, isPast, isValid, parseISO, isWithinInterval } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OfferDialog from "@/components/OfferDialog";
import OfferViewDialog from "@/components/OfferViewDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import Papa from 'papaparse';
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import { cn } from '@/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Type for offer from database
type Offer = Database['public']['Tables']['offers']['Row'];

// Type for transformed offer for display
interface TransformedOffer extends Offer {
  expires: string;
  expiryDate: Date | null;
  status: string;
  image: string;
  actions?: string; // Add actions property to match column accessorKey
}

// Filter types
type StatusFilter = 'all' | 'active' | 'expired' | 'invalid';
type DateFilter = 'all' | 'sevenDays' | 'thirtyDays' | 'custom';

const Offers = () => {
  const { offers, refreshData, loading, error } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [transformedOffers, setTransformedOffers] = useState<TransformedOffer[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Bulk selection
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Process and validate offers data
  useEffect(() => {
    try {
      if (!offers) {
        setTransformedOffers([]);
        return;
      }
      
      // Transform offers to display format
      const transformed = offers.map(offer => {
        // Safely format expiry date
        let formattedExpiry = 'Invalid date';
        let status = 'Invalid';
        let expiryDate: Date | null = null;
        
        try {
          if (offer.valid_until) {
            expiryDate = parseISO(offer.valid_until);
            
            if (isValid(expiryDate)) {
              formattedExpiry = format(expiryDate, 'yyyy-MM-dd');
              status = isPast(expiryDate) ? 'Expired' : 'Active';
            }
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
        
        // Ensure we have a valid discount format
        let displayDiscount = offer.discount || '0%';
        if (!displayDiscount.includes('%') && !isNaN(Number(displayDiscount))) {
          displayDiscount = `${displayDiscount}%`;
        }
        
        return {
          ...offer,
          expires: formattedExpiry,
          expiryDate,
          status,
          // Use placeholder image if none provided
          image: offer.image_url || "https://placehold.co/100x100?text=No+Image",
          discount: displayDiscount
        };
      });
      
      // Sort by expiry date (active first, then by date)
      transformed.sort((a, b) => {
        // Put active offers first
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        
        // Then sort by date
        if (a.expiryDate && b.expiryDate) {
          return a.expiryDate.getTime() - b.expiryDate.getTime();
        }
        
        return 0;
      });
      
      setTransformedOffers(transformed);
      setProcessingError(null);
    } catch (err) {
      console.error('Error processing offers data:', err);
      setProcessingError('Failed to process offers data. Please refresh.');
    }
  }, [offers]);

  // Apply filters to the transformed offers
  const filteredOffers = useMemo(() => {
    // Reset selection when filters change
    setSelectedOffers([]);
    setSelectAll(false);
    
    if (transformedOffers.length === 0) return [];
    
    return transformedOffers.filter(offer => {
      // Apply status filter
      if (statusFilter !== 'all' && offer.status.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // Apply date filter
      if (dateFilter === 'custom' && dateRange.from && offer.expiryDate) {
        // For custom date range
        const from = dateRange.from;
        const to = dateRange.to || new Date();
        
        return isWithinInterval(offer.expiryDate, { start: from, end: to });
      } else if (dateFilter === 'sevenDays' && offer.expiryDate) {
        // Next 7 days
        const now = new Date();
        const sevenDays = new Date();
        sevenDays.setDate(now.getDate() + 7);
        
        return isWithinInterval(offer.expiryDate, { start: now, end: sevenDays });
      } else if (dateFilter === 'thirtyDays' && offer.expiryDate) {
        // Next 30 days
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(now.getDate() + 30);
        
        return isWithinInterval(offer.expiryDate, { start: now, end: thirtyDays });
      }
      
      return true;
    });
  }, [transformedOffers, statusFilter, dateFilter, dateRange]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setProcessingError(null);
    try {
      await refreshData();
    } catch (err) {
      console.error("Error refreshing offers data:", err);
      setProcessingError("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fix DB policy recursion issue
  const handleFixRecursion = async () => {
    setIsRefreshing(true);
    try {
      // First try to manually run the migration
      const { error: migrationError } = await supabase.rpc('is_admin_direct');
      
      if (migrationError) {
        console.error("Error applying recursion fix:", migrationError);
        
        // If that fails, try the offer policy fix
        const { error: policyError } = await supabase.rpc('enable_offer_admin_policies');
        
        if (policyError) {
          throw new Error("Failed to fix policy recursion issues");
        } else {
          toast.success("Successfully fixed policy permissions");
        }
      } else {
        toast.success("Successfully fixed recursion issue");
      }
      
      // Refresh data after fix
      await refreshData();
    } catch (err) {
      console.error("Error fixing recursion issue:", err);
      setProcessingError("Failed to fix policy recursion. Contact administrator.");
      toast.error("Failed to fix policy issue");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Count active and expired offers
  const activeOffers = transformedOffers.filter(o => o.status === 'Active').length;
  const expiredOffers = transformedOffers.filter(o => o.status === 'Expired').length;
  const invalidOffers = transformedOffers.filter(o => o.status === 'Invalid').length;

  // Open add dialog
  const handleAddOffer = () => {
    setSelectedOffer(undefined);
    setIsAddDialogOpen(true);
  };

  // Open edit dialog
  const handleEditOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsEditDialogOpen(true);
  };

  // Open view dialog
  const handleViewOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsViewDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedOffer) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', selectedOffer.id);
        
      if (error) throw error;
      
      toast.success(`Offer "${selectedOffer.title}" deleted successfully`);
      setIsDeleteDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete confirmation
  const handleBulkDeleteConfirm = async () => {
    if (selectedOffers.length === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .in('id', selectedOffers);
        
      if (error) throw error;
      
      toast.success(`${selectedOffers.length} offers deleted successfully`);
      setIsBulkActionDialogOpen(false);
      setSelectedOffers([]);
      refreshData();
    } catch (error) {
      console.error('Error bulk deleting offers:', error);
      toast.error('Failed to delete offers. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle export
  const handleExport = () => {
    setIsExporting(true);
    
    try {
      // Prepare data for CSV export
      const dataToExport = filteredOffers.map(offer => ({
        'Title': offer.title,
        'Code': offer.code,
        'Discount': offer.discount,
        'Description': offer.description || '',
        'Expiry Date': offer.expires,
        'Status': offer.status,
        'Image URL': offer.image_url || ''
      }));
      
      // Convert to CSV
      const csv = Papa.unparse(dataToExport);
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offers_export_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Offers exported successfully');
    } catch (err) {
      console.error('Error exporting offers:', err);
      toast.error('Failed to export offers');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      // Select all visible offers
      setSelectedOffers(filteredOffers.map(offer => offer.id));
    } else {
      // Deselect all
      setSelectedOffers([]);
    }
  };
  
  // Handle individual checkbox selection
  const handleSelectOffer = (offerId: string, checked: boolean) => {
    if (checked) {
      setSelectedOffers(prev => [...prev, offerId]);
    } else {
      setSelectedOffers(prev => prev.filter(id => id !== offerId));
    }
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setIsFilterActive(false);
    setIsFilterDialogOpen(false);
  };

  // Apply filters
  const applyFilters = () => {
    setIsFilterActive(
      statusFilter !== 'all' || 
      dateFilter !== 'all'
    );
    setIsFilterDialogOpen(false);
  };

  // Open filter dialog with current filters
  const openFilterDialog = () => {
    setIsFilterDialogOpen(true);
  };

  // Offers columns
  const offerColumns = [
    // Selection column
    {
      header: () => (
        <Checkbox
          checked={selectAll}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      accessorKey: "selection",
      cell: (info: any) => {
        const offer = info.row.original;
        const isSelected = selectedOffers.includes(offer.id);
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleSelectOffer(offer.id, !!checked)}
            aria-label={`Select ${offer.title}`}
          />
        );
      }
    },
    {
      header: "Offer",
      accessorKey: "title" as const,
      cell: (info: any) => {
        const offer = info.row.original;
        return (
          <div className="flex items-center gap-3 max-w-[24rem]">
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
              <img
                src={offer.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-medium truncate">{offer.title}</span>
              <span className="text-muted-foreground text-xs truncate mt-0.5">
                Code: <span className="font-mono">{offer.code}</span>
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: "Discount",
      accessorKey: "discount" as const,
      cell: (info: any) => <span className="font-medium">{info.getValue()}</span>
    },
    {
      header: "Expires",
      accessorKey: "expires" as const,
      cell: (info: any) => {
        const offer = info.row.original;
        return (
          <div className="flex flex-col">
            <span>{offer.expires}</span>
            {offer.status === 'Active' && offer.expiryDate && (
              <span className="text-xs text-muted-foreground">
                {format(offer.expiryDate, 'MMM d, yyyy')}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (info: any) => {
        const offer = info.row.original;
        
        const statusColors: Record<string, string> = {
          "Active": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          "Expired": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
          "Invalid": "bg-gray-100 text-gray-800",
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>
            {offer.status}
          </span>
        );
      }
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (info: any) => {
        const offer = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleViewOffer(offer)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleEditOffer(offer)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteClick(offer)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ] as any[]; // Type assertion to avoid column type errors

  return (
    <div className="space-y-8 animate-blur-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Offers</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional offers ({transformedOffers.length} offers, {activeOffers} active)
          </p>
          {invalidOffers > 0 && (
            <p className="text-amber-600 text-xs mt-1">Note: {invalidOffers} offers have invalid dates</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Tabs 
              defaultValue="all"
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              className="hidden md:block"
            >
              <TabsList>
                <TabsTrigger 
                  value="all" 
                  className="text-xs px-3"
                >
                  All ({transformedOffers.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="text-xs px-3"
                >
                  Active ({activeOffers})
                </TabsTrigger>
                <TabsTrigger 
                  value="expired" 
                  className="text-xs px-3"
                >
                  Expired ({expiredOffers})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Mobile Filter Button */}
            <div className="md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("h-9 gap-1.5", isFilterActive && "border-primary text-primary")}
                onClick={openFilterDialog}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
                {isFilterActive && (
                  <Badge variant="secondary" className="h-5 ml-1 bg-primary/10 text-primary">
                    Active
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* Desktop Advanced Filter */}
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("h-9 gap-1.5 hidden md:flex", isFilterActive && "border-primary text-primary")}
              onClick={openFilterDialog}
            >
              <Filter className="h-3.5 w-3.5" />
              Advanced Filter
              {isFilterActive && (
                <Badge variant="secondary" className="h-5 ml-1 bg-primary/10 text-primary">
                  Active
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 items-center">
            {selectedOffers.length > 0 && (
              <Badge variant="secondary" className="h-[30px] gap-1.5 px-3">
                {selectedOffers.length} selected
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-1 h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedOffers([])}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {selectedOffers.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setIsBulkActionDialogOpen(true)}
              >
                Delete Selected
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden md:inline">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={isExporting || transformedOffers.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddOffer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Offer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              size="sm" 
              className="gap-1.5"
              onClick={handleAddOffer}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Offer</span>
            </Button>
          </div>
        </div>
      </div>
      
      {(error || processingError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span>{error || processingError}</span>
              {error && error.includes("infinite recursion") && (
                <p className="text-xs mt-1">
                  This error is caused by a database policy issue. Click the Fix button to resolve.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {error && error.includes("infinite recursion") && (
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleFixRecursion}
                  disabled={isRefreshing}
                  className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Fix
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {isFilterActive && (
        <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-md">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="font-semibold">Active filters:</span>
            
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 h-6">
                Status: {statusFilter}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setStatusFilter('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 h-6">
                {dateFilter === 'sevenDays' ? 'Next 7 days' : 
                 dateFilter === 'thirtyDays' ? 'Next 30 days' : 
                 dateFilter === 'custom' ? 'Custom date range' : ''}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-1 h-4 w-4 p-0"
                  onClick={() => setDateFilter('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-7 text-xs"
          >
            Reset all filters
          </Button>
        </div>
      )}
      
      <DataTable 
        data={filteredOffers} 
        columns={offerColumns}
        searchable
        searchPlaceholder="Search offers..."
        loading={loading || isRefreshing}
      />

      {/* Add Offer Dialog */}
      <OfferDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => setIsAddDialogOpen(open)}
        onSave={handleRefresh}
      />

      {/* Edit Offer Dialog */}
      <OfferDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => setIsEditDialogOpen(open)}
        offer={selectedOffer}
        onSave={handleRefresh}
      />

      {/* View Offer Dialog */}
      <OfferViewDialog
        open={isViewDialogOpen}
        onOpenChange={(open) => setIsViewDialogOpen(open)}
        offer={selectedOffer}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => setIsDeleteDialogOpen(open)}
        title="Delete Offer"
        description={`Are you sure you want to delete the offer "${selectedOffer?.title}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
      
      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isBulkActionDialogOpen}
        onOpenChange={(open) => setIsBulkActionDialogOpen(open)}
        title="Delete Selected Offers"
        description={`Are you sure you want to delete ${selectedOffers.length} selected offers? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirm}
        isLoading={isBulkDeleting}
      />
      
      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Offers</DialogTitle>
            <DialogDescription>
              Set filters to narrow down your offers list.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Status Filter */}
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Filter */}
            <div className="grid gap-2">
              <Label>Expiry Date</Label>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="sevenDays">Next 7 Days</SelectItem>
                  <SelectItem value="thirtyDays">Next 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid gap-2">
                <Label>Custom Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          format(dateRange.from, "PPP")
                        ) : (
                          <span>Start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? (
                          format(dateRange.to, "PPP")
                        ) : (
                          <span>End date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        disabled={(date) => 
                          dateRange.from ? date < dateRange.from : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Offers;
