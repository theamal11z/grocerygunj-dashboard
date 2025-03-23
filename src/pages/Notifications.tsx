import { useState, useEffect } from "react";
import { 
  Check, 
  CheckCheck,
  Trash2, 
  RefreshCw, 
  CheckSquare, 
  Filter, 
  Bell, 
  Clock, 
  AlertCircle, 
  Loader2,
  X
} from "lucide-react";
import { useData } from "@/lib/DataContext";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/lib/database.types";

type Notification = Database['public']['Tables']['notifications']['Row'];
type FilterType = 'all' | 'unread' | 'read';

const Notifications = () => {
  const { 
    notifications, 
    refreshData, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification 
  } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Filter notifications based on type and search
  const filteredNotifications = notifications?.filter(notification => {
    // Filter by read/unread
    if (filterType === 'unread' && notification.read) return false;
    if (filterType === 'read' && !notification.read) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }
    
    return true;
  }) || [];

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  // Get notification status badge
  const getStatusBadge = (read: boolean) => {
    return read 
      ? <Badge variant="outline" className="text-muted-foreground">Read</Badge>
      : <Badge>New</Badge>;
  };

  // Format notification date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch (e) {
      return "Invalid date";
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { success, error } = await markNotificationAsRead(notificationId);
      
      if (success) {
        toast.success("Notification marked as read");
      } else if (error) {
        toast.error("Failed to mark notification as read");
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error("Failed to mark notification as read");
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsRefreshing(true);
      
      // If there are selected notifications, mark only those as read
      if (selectedNotifications.length > 0) {
        // Mark each selected notification as read
        const promises = selectedNotifications.map(id => markNotificationAsRead(id));
        const results = await Promise.all(promises);
        
        // Check if all operations were successful
        const allSuccess = results.every(result => result.success);
        
        if (allSuccess) {
          toast.success("Selected notifications marked as read");
        } else {
          toast.error("Failed to mark some notifications as read");
        }
      } else {
        // Mark all notifications as read
        const { success, error } = await markAllNotificationsAsRead();
        
        if (success) {
          toast.success("All notifications marked as read");
        } else if (error) {
          toast.error("Failed to mark all notifications as read");
          console.error('Error marking all notifications as read:', error);
        }
      }
      
      // Reset selection
      setSelectedNotifications([]);
      setSelectAll(false);
      
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error("Failed to mark notifications as read");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { success, error } = await deleteNotification(notificationId);
      
      if (success) {
        toast.success("Notification deleted");
      } else if (error) {
        toast.error("Failed to delete notification");
        console.error('Error deleting notification:', error);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error("Failed to delete notification");
    }
  };

  // Delete selected notifications
  const handleDeleteSelected = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      setIsDeleting(true);
      setProcessingError(null);
      
      // Delete each selected notification
      const promises = selectedNotifications.map(id => deleteNotification(id));
      const results = await Promise.all(promises);
      
      // Check if all operations were successful
      const allSuccess = results.every(result => result.success);
      
      if (allSuccess) {
        toast.success(`${selectedNotifications.length} notification(s) deleted`);
        
        // Reset selection
        setSelectedNotifications([]);
        setSelectAll(false);
        setShowDeleteConfirm(false);
      } else {
        // Some operations failed
        const errors = results
          .filter(result => !result.success && result.error)
          .map(result => result.error)
          .join(', ');
        
        setProcessingError(`Failed to delete some notifications: ${errors}`);
        toast.error("Failed to delete some notifications");
      }
      
    } catch (error) {
      console.error('Error deleting notifications:', error);
      setProcessingError(
        error instanceof Error ? error.message : "Failed to delete notifications"
      );
      toast.error("Failed to delete notifications");
    } finally {
      setIsDeleting(false);
    }
  };

  // Refresh notifications
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshData();
      toast.success("Notifications refreshed");
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      toast.error("Failed to refresh notifications");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle checkbox selection
  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId]);
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!selectAll) {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    } else {
      setSelectedNotifications([]);
    }
    setSelectAll(!selectAll);
  };

  // Update selectAll state when selection changes
  useEffect(() => {
    if (filteredNotifications.length > 0 && 
        selectedNotifications.length === filteredNotifications.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedNotifications, filteredNotifications]);

  // Count of unread notifications
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            View and manage all your notifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedNotifications.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isRefreshing}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark as Read
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search notifications..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={(value) => setFilterType(value as FilterType)}>
          <TabsList>
            <TabsTrigger value="all" className="min-w-20">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="min-w-20">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="read" className="min-w-20">
              Read
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <Card>
        <CardHeader className="p-4 md:px-6">
          <div className="flex items-center">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              className="mr-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <Label htmlFor="select-all" className="text-xs font-medium cursor-pointer">
              Select All
            </Label>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className="p-4 md:p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex gap-4">
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onCheckedChange={(checked) => 
                        handleSelectNotification(notification.id, checked === true)
                      }
                      className="mt-1"
                    />
                    
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-medium", !notification.read && "font-semibold")}>
                              {notification.title}
                            </h3>
                            {getStatusBadge(notification.read)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteNotification(notification.id)}
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-lg">No notifications found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : filterType === "unread"
                  ? "No unread notifications"
                  : filterType === "read"
                  ? "No read notifications"
                  : "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {processingError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>{processingError}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Search = ({ className, ...props }: React.ComponentProps<typeof X>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-search", className)}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
};

export default Notifications; 