import { 
  Eye, 
  Pencil, 
  Trash2, 
  Plus, 
  Download,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  UserX,
  Calendar,
  MapPin,
  Clipboard,
  Search,
  X,
  Save
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/DataContext";
import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/lib/database.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { UserDetail } from "@/components/users/UserDetail";

// Define profile type
type Profile = Database['public']['Tables']['profiles']['Row'];

// Enhanced profile with additional calculated fields
interface EnhancedProfile extends Profile {
  timeAgo: string;
  addressCount?: number;
  orderCount?: number;
  totalSpent?: number;
}

// Default new user
const emptyUser: Partial<Profile> = {
  full_name: '',
  email: '',
  phone_number: '',
  role: 'customer',
  avatar_url: ''
};

// Users columns
const userColumns = [
  {
    header: "User",
    accessorKey: "full_name" as const,
    cell: (info: any) => {
      const user: EnhancedProfile = info.row.original;
      const avatarUrl = user.avatar_url || undefined;
      
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={user.full_name || "User"} 
                className="h-full w-full object-cover" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                }}
              />
            ) : (
              <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{user.full_name || "Unknown User"}</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                    <Clipboard className="h-3 w-3" />
                    {user.id.substring(0, 10)}...
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{user.id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }
  },
  {
    header: "Contact",
    accessorKey: "email" as const,
    cell: (info: any) => {
      const user: EnhancedProfile = info.row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{user.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{user.phone_number || "N/A"}</span>
          </div>
        </div>
      );
    }
  },
  {
    header: "Role",
    accessorKey: "role" as const,
    cell: (info: any) => {
      const user: EnhancedProfile = info.row.original;
      const role = user.role || "User";
      const roleColors: Record<string, string> = {
        "admin": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        "manager": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        "staff": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        "customer": "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
        "user": "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
      };
      
      const roleIcons: Record<string, JSX.Element> = {
        "admin": <ShieldCheck className="h-3.5 w-3.5 mr-1" />,
        "manager": <UserCheck className="h-3.5 w-3.5 mr-1" />,
        "staff": <UserCheck className="h-3.5 w-3.5 mr-1" />,
        "customer": <UserX className="h-3.5 w-3.5 mr-1" />,
        "user": <UserX className="h-3.5 w-3.5 mr-1" />,
      };
      
      const colorClass = roleColors[role.toLowerCase()] || roleColors.user;
      const icon = roleIcons[role.toLowerCase()] || null;
      
      return (
        <Badge variant="outline" className={`px-2 py-1 ${colorClass} flex items-center`}>
          {icon}
          {role}
        </Badge>
      );
    }
  },
  {
    header: "Activity",
    accessorKey: "timeAgo" as const,
    cell: (info: any) => {
      const user: EnhancedProfile = info.row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Active {user.timeAgo}</span>
          </div>
          {user.orderCount !== undefined && (
            <div className="text-xs text-muted-foreground">
              {user.orderCount} orders · np{user.totalSpent?.toFixed(2) || "0.00"} spent
            </div>
          )}
        </div>
      );
    }
  },
  {
    header: "Created At",
    accessorKey: "created_at" as const,
    cell: (info: any) => {
      const user: EnhancedProfile = info.row.original;
      try {
        return format(new Date(user.created_at), 'yyyy-MM-dd');
      } catch (e) {
        return "Unknown";
      }
    }
  }
];

// User Form Component (used for both add and edit)
const UserForm = ({
  user,
  onSubmit,
  isLoading
}: {
  user: Partial<Profile>;
  onSubmit: (data: Partial<Profile>) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<Profile>>(user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name || ''}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={handleChange}
            placeholder="Enter email address"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone Number</Label>
          <Input
            id="phone_number"
            name="phone_number"
            value={formData.phone_number || ''}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            name="role"
            value={formData.role || 'customer'}
            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="avatar_url">Avatar URL</Label>
          <Input
            id="avatar_url"
            name="avatar_url"
            value={formData.avatar_url || ''}
            onChange={handleChange}
            placeholder="Enter avatar URL (optional)"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save User'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const Users = () => {
  const { profiles, orders, addresses, loading, error, refreshData } = useData();
  const [enhancedProfiles, setEnhancedProfiles] = useState<EnhancedProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnhancedProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<EnhancedProfile | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formUser, setFormUser] = useState<Partial<Profile>>(emptyUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  // Process user data
  useEffect(() => {
    if (profiles && profiles.length > 0) {
      // Create a map to count orders and total spent by user
      const orderSummaryByUser = orders.reduce((acc, order) => {
        if (!acc[order.user_id]) {
          acc[order.user_id] = {
            orderCount: 0,
            totalSpent: 0
          };
        }
        acc[order.user_id].orderCount += 1;
        acc[order.user_id].totalSpent += order.total_amount;
        return acc;
      }, {} as Record<string, { orderCount: number, totalSpent: number }>);
      
      // Create a map to count addresses by user
      const addressCountByUser = addresses.reduce((acc, address) => {
        if (!address.user_id) return acc;
        acc[address.user_id] = (acc[address.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Enhance profiles with calculated fields
      const enhanced = profiles.map(profile => {
        // Calculate last active time
        let timeAgo = "never";
        try {
          timeAgo = formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true });
        } catch (e) {
          console.error("Date parsing error:", e);
        }
        
        return {
          ...profile,
          timeAgo,
          addressCount: addressCountByUser[profile.id] || 0,
          orderCount: orderSummaryByUser[profile.id]?.orderCount || 0,
          totalSpent: orderSummaryByUser[profile.id]?.totalSpent || 0
        };
      });
      
      setEnhancedProfiles(enhanced);
      
      // Apply filters
      let filtered = enhanced;
      
      // Apply role filter
      if (roleFilter !== "all") {
        filtered = filtered.filter(user => 
          (user.role || "user").toLowerCase() === roleFilter.toLowerCase()
        );
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(user => 
          (user.full_name?.toLowerCase().includes(query) || 
           user.email?.toLowerCase().includes(query) ||
           user.phone_number?.toLowerCase().includes(query) ||
           user.id.toLowerCase().includes(query))
        );
      }
      
      setFilteredUsers(filtered);
    } else {
      setEnhancedProfiles([]);
      setFilteredUsers([]);
    }
  }, [profiles, orders, addresses, roleFilter, searchQuery]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast({
        title: "Data refreshed",
        description: "User data has been updated successfully.",
      });
    } catch (err) {
      console.error("Error refreshing user data:", err);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing user data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Open view user dialog
  const handleViewUser = (user: EnhancedProfile) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };
  
  // Open add user dialog
  const handleAddUserClick = () => {
    setFormUser(emptyUser);
    setIsAddOpen(true);
  };
  
  // Open edit user dialog
  const handleEditUser = (user: EnhancedProfile) => {
    setSelectedUser(user);
    setFormUser(user);
    setIsEditOpen(true);
  };
  
  // Open delete user dialog
  const handleDeleteUser = (user: EnhancedProfile) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };
  
  // Handle add user submit
  const handleAddUser = async (userData: Partial<Profile>) => {
    setIsSubmitting(true);
    try {
      // Generate UUID for new user
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...userData,
          id: crypto.randomUUID(), // Generate a UUID for the new user
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: "User created",
        description: "New user has been successfully created.",
      });
      
      // Refresh data to include new user
      await refreshData();
      setIsAddOpen(false);
    } catch (err: any) {
      console.error("Error adding user:", err);
      toast({
        title: "Error creating user",
        description: err.message || "There was an error creating the user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle edit user submit
  const handleUpdateUser = async (userData: Partial<Profile>) => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id)
        .select();
      
      if (error) throw error;
      
      toast({
        title: "User updated",
        description: "User details have been successfully updated.",
      });
      
      // Refresh data to reflect changes
      await refreshData();
      setIsEditOpen(false);
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast({
        title: "Error updating user",
        description: err.message || "There was an error updating the user details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete user
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
      
      // Refresh data to reflect deletion
      await refreshData();
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error deleting user",
        description: err.message || "There was an error deleting the user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique roles for filter
  const uniqueRoles = ["all", ...new Set(enhancedProfiles.map(user => (user.role || "user").toLowerCase()))];
  
  // Add actions column for CRUD operations
  const columnsWithActions = [
    ...userColumns,
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (info: any) => {
        const user: EnhancedProfile = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <button 
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              onClick={() => handleViewUser(user)}
              title="View user details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button 
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              onClick={() => handleEditUser(user)}
              title="Edit user"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button 
              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
              onClick={() => handleDeleteUser(user)}
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-8 animate-blur-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts ({filteredUsers.length} of {enhancedProfiles.length} users)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 w-full sm:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Filter roles" />
              </SelectTrigger>
              <SelectContent>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role === "all" ? "All Roles" : role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
          
          <Button size="sm" className="gap-1.5" onClick={handleAddUserClick}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center justify-between">
          <div>Error loading users: {error}</div>
          <Button variant="destructive" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            Retry
          </Button>
        </div>
      )}
      
      <DataTable 
        data={filteredUsers} 
        columns={columnsWithActions}
        searchable={false} // We're implementing our own search
        searchPlaceholder="Search users..."
        loading={loading || isRefreshing}
        pagination={{
          pageSize,
          pageIndex: currentPage,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
      />
      
      {/* View User Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && <UserDetail user={selectedUser} />}
        </DialogContent>
      </Dialog>
      
      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. All users will need to reset their password on first login.
            </DialogDescription>
          </DialogHeader>
          
          <UserForm 
            user={formUser} 
            onSubmit={handleAddUser} 
            isLoading={isSubmitting} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          
          <UserForm 
            user={formUser} 
            onSubmit={handleUpdateUser} 
            isLoading={isSubmitting} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user account and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
