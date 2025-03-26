import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/lib/database.types";

// Define profile type
type Profile = Database['public']['Tables']['profiles']['Row'];

// Enhanced profile with additional calculated fields
interface EnhancedProfile extends Profile {
  timeAgo: string;
  addressCount?: number;
  orderCount?: number;
  totalSpent?: number;
}

// User detail component for dialog
export const UserDetail = ({ user }: { user: EnhancedProfile }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.full_name || "User"} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-medium">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">{user.full_name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="orders">Orders ({user.orderCount || 0})</TabsTrigger>
          <TabsTrigger value="addresses">Addresses ({user.addressCount || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p>{user.full_name || "Not provided"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Role</Label>
              <p className="capitalize">{user.role || "customer"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p>{user.email || "Not provided"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Phone</Label>
              <p>{user.phone_number || "Not provided"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Created</Label>
              <p>{format(new Date(user.created_at), 'PPP')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Last Active</Label>
              <p>{user.timeAgo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">User ID</Label>
              <p className="text-xs font-mono">{user.id}</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="orders" className="pt-4">
          {user.orderCount ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Customer has placed {user.orderCount} orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">np{user.totalSpent?.toFixed(2) || "0.00"}</div>
                <p className="text-muted-foreground text-sm">Total spent</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">View All Orders</Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              This user hasn't placed any orders yet.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="addresses" className="pt-4">
          {user.addressCount ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Customer has {user.addressCount} saved addresses</p>
              <Button variant="outline" size="sm">View Addresses</Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              This user hasn't added any addresses yet.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}; 