import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  Filter as FilterIcon, 
  Download, 
  Eye, 
  Pencil, 
  Trash2,
  Plus,
  Calendar,
  ShoppingBag,
  X,
  Check,
  AlertTriangle
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";

// Define the type for our enhanced order data
interface EnhancedOrder {
  id: string;
  user_id: string;
  customer: string;
  email: string | null;
  phone_number: string | null;
  formattedDate: string;
  status: string;
  items: number;
  payment: string;
  total_amount: number;
  displayTotal: string;
  products?: string[];
  created_at: string;
  is_cash_on_delivery: boolean;
  delivery_fee: number;
  delivery_address?: {
    id: string;
    type: string;
    address: string;
    area: string;
    city: string;
  };
  orderItems?: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

// Define the order status options
const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipping", label: "Shipping" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

// Define the form schema for updating order status
const orderStatusSchema = z.object({
  status: z.string(),
});

const Orders = () => {
  const { orders, orderItems, products, profiles, addresses, refreshData, updateOrderStatus, deleteOrder } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [enhancedOrders, setEnhancedOrders] = useState<EnhancedOrder[]>([]);
  const [viewOrderDialog, setViewOrderDialog] = useState(false);
  const [editOrderDialog, setEditOrderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<EnhancedOrder | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Form for order status update
  const statusForm = useForm<z.infer<typeof orderStatusSchema>>({
    resolver: zodResolver(orderStatusSchema),
    defaultValues: {
      status: "",
    },
  });

  // Prepare enhanced order data
  useEffect(() => {
    if (orders && orderItems && products && profiles && addresses) {
      // Group order items by order ID
      const orderItemsMap = orderItems.reduce((acc, item) => {
        if (!item.order_id) return acc;
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {} as Record<string, typeof orderItems>);
      
      // Create enhanced order data
      const enhanced = orders.map(order => {
        // Find corresponding order items
        const items = orderItemsMap[order.id] || [];
        
        // Find customer profile
        const customer = profiles.find(p => p.id === order.user_id);
        
        // Find delivery address if available
        const deliveryAddress = addresses.find(addr => 
          addr.id === (order as any).delivery_address_id || addr.id === (order as any).address_id
        );
        
        // Format date from ISO string
        const formattedDate = order.created_at ? 
          format(new Date(order.created_at), 'yyyy-MM-dd') : 
          'Unknown date';
        
        // Get status with proper capitalization
        let capitalizedStatus = order.status ? 
          order.status.charAt(0).toUpperCase() + order.status.slice(1) : 
          'Pending';
        
        // Get product names for items
        const orderProducts = items.map(item => {
          if (!item.product_id) return 'Unknown product';
          const product = products.find(p => p.id === item.product_id);
          return product ? product.name : 'Unknown product';
        });

        // Create enhanced order items with product details
        const enhancedOrderItems = items.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return {
            id: item.id,
            product_id: item.product_id,
            product_name: product ? product.name : 'Unknown product',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price
          };
        });
        
        return {
          ...order,
          formattedDate,
          status: capitalizedStatus,
          displayTotal: `np${order.total_amount.toFixed(2)}`,
          customer: customer?.full_name || `Customer ${order.user_id.substring(0, 8)}`,
          email: customer?.email || `user_${order.user_id.substring(0, 6)}@example.com`,
          phone_number: customer?.phone_number || null,
          items: items.length,
          payment: order.is_cash_on_delivery ? "Cash on Delivery" : "Card Payment",
          products: orderProducts,
          orderItems: enhancedOrderItems,
          delivery_address: deliveryAddress ? {
            id: deliveryAddress.id,
            type: deliveryAddress.type,
            address: deliveryAddress.address,
            area: deliveryAddress.area,
            city: deliveryAddress.city
          } : undefined
        };
      });
      
      setEnhancedOrders(enhanced);
    }
  }, [orders, orderItems, products, profiles, addresses]);

  // Filter orders by status
  const filteredOrders = statusFilter 
    ? enhancedOrders.filter(order => order.status.toLowerCase() === statusFilter.toLowerCase()) 
    : enhancedOrders;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Handle view order details
  const handleViewOrder = (order: EnhancedOrder) => {
    setSelectedOrder(order);
    setViewOrderDialog(true);
  };

  // Handle edit order status
  const handleEditOrder = (order: EnhancedOrder) => {
    setSelectedOrder(order);
    statusForm.setValue('status', order.status.toLowerCase());
    setEditOrderDialog(true);
  };

  // Handle delete order
  const handleDeleteOrder = (order: EnhancedOrder) => {
    setSelectedOrder(order);
    setDeleteConfirmDialog(true);
  };

  // Handle filter click
  const handleFilterClick = () => {
    setFilterDialogOpen(true);
  };

  // Handle applying status filter
  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setFilterDialogOpen(false);
  };

  // Handle update order status
  const handleUpdateOrderStatus = async (values: z.infer<typeof orderStatusSchema>) => {
    if (!selectedOrder) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const result = await updateOrderStatus(selectedOrder.id, values.status);
      
      if (!result.success) throw new Error(result.error);
      
      // Show success message
      setSuccessMessage(`Order status updated to ${values.status}`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Close the dialog and refresh the data
      setEditOrderDialog(false);
      await refreshData();
    } catch (error) {
      console.error('Error updating order status:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete order
  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const result = await deleteOrder(selectedOrder.id);
      
      if (!result.success) throw new Error(result.error);
      
      // Show success message
      setSuccessMessage("Order deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Close the dialog and refresh the data
      setDeleteConfirmDialog(false);
      await refreshData();
    } catch (error) {
      console.error('Error deleting order:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Status color mapping
  const statusColors: Record<string, string> = {
    Delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Shipping: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Pending: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  // Order columns
  const orderColumns = [
    { 
      header: "Order ID", 
      accessorKey: "id" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
            {order.id.substring(0, 8)}...
          </span>
        );
      }
    },
    { 
      header: "Customer", 
      accessorKey: "customer" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <div>
            <div className="font-medium">{order.customer}</div>
            <div className="text-xs text-muted-foreground">{order.email}</div>
            <div className="text-xs text-muted-foreground">ID: {order.user_id.substring(0, 8)}...</div>
          </div>
        );
      }
    },
    { 
      header: "Date", 
      accessorKey: "formattedDate" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{order.formattedDate}</span>
          </div>
        );
      }
    },
    { 
      header: "Status", 
      accessorKey: "status" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <Badge variant="outline" className={`px-2 py-1 ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
            {order.status}
          </Badge>
        );
      },
    },
    { 
      header: "Items", 
      accessorKey: "items" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.items}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-semibold mb-1">Products:</p>
                <ul className="text-xs">
                  {order.products?.map((product, i) => (
                    <li key={i}>{product}</li>
                  )) || <li>No products</li>}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    },
    { 
      header: "Payment", 
      accessorKey: "payment" as const,
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{order.payment}</span>
          </div>
        );
      }
    },
    { 
      header: "Total", 
      accessorKey: "displayTotal" as const,
    },
    {
      header: "Actions",
      id: "actions",
      cell: (info: any) => {
        const order = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <button 
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              onClick={() => handleViewOrder(order)}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button 
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              onClick={() => handleEditOrder(order)}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button 
              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
              onClick={() => handleDeleteOrder(order)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ] as const;

  return (
    <div className="space-y-8 animate-blur-in">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track customer orders ({filteredOrders.length} orders)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={handleFilterClick}
          >
            <FilterIcon className="h-4 w-4" />
            Filter
            {statusFilter && (
              <Badge variant="secondary" className="ml-1 h-5 px-1">1</Badge>
            )}
          </Button>
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
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Status filter indicator */}
      {statusFilter && (
        <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-md">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="font-semibold">Active filter:</span>
            <Badge variant="secondary" className="gap-1.5 h-6">
              Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-1 h-4 w-4 p-0"
                onClick={() => setStatusFilter(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStatusFilter(null)}
            className="h-7 text-xs"
          >
            Reset filter
          </Button>
        </div>
      )}
      
      <DataTable 
        data={filteredOrders} 
        columns={orderColumns}
        searchable
        searchPlaceholder="Search orders..."
      />

      {/* Order Details Dialog */}
      <Dialog open={viewOrderDialog} onOpenChange={setViewOrderDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected order.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedOrder && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Order ID</h3>
                    <p className="text-sm font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                    <p className="text-sm">{selectedOrder.formattedDate}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <Badge variant="outline" className={`mt-1 ${statusColors[selectedOrder.status] || ""}`}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Payment Method</h3>
                    <p className="text-sm">{selectedOrder.payment}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-2">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                      <p className="text-sm">{selectedOrder.customer}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                      <p className="text-sm">{selectedOrder.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                      <p className="text-sm">{selectedOrder.phone_number || "Not provided"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">User ID</h4>
                      <p className="text-sm font-mono">{selectedOrder.user_id}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Delivery Address</h3>
                  {selectedOrder.delivery_address ? (
                    <div className="grid grid-cols-1 gap-2 bg-secondary/30 p-3 rounded-md">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">{selectedOrder.delivery_address.type}</Badge>
                        <p className="text-sm">{selectedOrder.delivery_address.address}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.delivery_address.area}, {selectedOrder.delivery_address.city}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No address information available</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3">Order Items ({selectedOrder.items})</h3>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Product</th>
                          <th className="px-4 py-2.5 text-right w-16">Qty</th>
                          <th className="px-4 py-2.5 text-right w-24">Unit Price</th>
                          <th className="px-4 py-2.5 text-right w-24">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedOrder.orderItems?.map((item, i) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">{item.product_name}</td>
                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">np{item.unit_price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">np{item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Subtotal</h3>
                    <p className="text-sm">np{(selectedOrder.total_amount - selectedOrder.delivery_fee).toFixed(2)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Delivery Fee</h3>
                    <p className="text-sm">np{selectedOrder.delivery_fee.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Amount</h3>
                    <p className="text-lg font-semibold">{selectedOrder.displayTotal}</p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOrderDialog(false)}>Close</Button>
            <Button onClick={() => {
              setViewOrderDialog(false);
              if (selectedOrder) {
                handleEditOrder(selectedOrder);
              }
            }}>Edit Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Status Dialog */}
      <Dialog open={editOrderDialog} onOpenChange={setEditOrderDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order #{selectedOrder?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit(handleUpdateOrderStatus)} className="space-y-6">
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ORDER_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditOrderDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Updating...' : 'Update Status'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter Orders</DialogTitle>
            <DialogDescription>
              Select criteria to filter the orders list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUSES.map(status => (
                  <Button
                    key={status.value}
                    variant={statusFilter === status.value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleStatusFilter(status.value)}
                  >
                    {status.label}
                  </Button>
                ))}
                <Button
                  variant={statusFilter === null ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleStatusFilter(null)}
                >
                  All Orders
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete order #{selectedOrder?.id.substring(0, 8)} and all its items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Orders;
