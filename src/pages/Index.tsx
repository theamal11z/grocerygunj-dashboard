import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  CreditCard,
  ArrowUpRight,
  ListOrdered,
  PackageCheck,
  PackageX,
  Clock,
  Truck,
  RefreshCw
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DataTable } from "@/components/ui/DataTable";
import { useData } from "@/lib/DataContext";
import { useState, useEffect } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { products, categories, orders, offers, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activityItems, setActivityItems] = useState<any[]>([]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
    setLastUpdated(new Date());
  };

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const formattedRevenue = `np${totalRevenue.toFixed(2)}`;

  // Count pending orders
  const pendingOrders = orders.filter(order => 
    order.status.toLowerCase() === 'pending' || 
    order.status.toLowerCase() === 'processing'
  ).length;

  // Transform the most recent 5 orders for display
  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(order => {
      // Format date
      const formattedDate = format(new Date(order.created_at), 'yyyy-MM-dd');
      
      // Get status with proper capitalization
      const capitalizedStatus = order.status.charAt(0).toUpperCase() + order.status.slice(1);
      
      return {
        id: order.id.substring(0, 8),
        customer: `Customer ${order.user_id.substring(0, 8)}`,
        date: formattedDate,
        status: capitalizedStatus,
        total: `np${order.total_amount.toFixed(2)}`
      };
    });

  // Generate activity items based on real data
  useEffect(() => {
    const newActivityItems = [];
    
    // Add recent orders to activity
    if (orders.length > 0) {
      const latestOrder = orders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      newActivityItems.push({
        type: "order",
        icon: PackageCheck,
        iconColor: "text-green-500",
        title: `New order #${latestOrder.id.substring(0, 8)} placed`,
        time: formatDistanceToNow(parseISO(latestOrder.created_at), { addSuffix: true })
      });
    }
    
    // Add out of stock products
    const outOfStockProduct = products.find(p => !p.in_stock);
    if (outOfStockProduct) {
      newActivityItems.push({
        type: "product",
        icon: PackageX,
        iconColor: "text-red-500",
        title: `Product '${outOfStockProduct.name}' out of stock`,
        time: "Recently"
      });
    }
    
    // Add active offers
    const activeOffer = offers.find(o => new Date(o.valid_until) > new Date());
    if (activeOffer) {
      newActivityItems.push({
        type: "offer",
        icon: CreditCard,
        iconColor: "text-blue-500",
        title: `Offer '${activeOffer.title}' is active`,
        time: `Expires ${format(new Date(activeOffer.valid_until), 'MMM dd, yyyy')}`
      });
    }
    
    // Add shipping order if exists
    const shippingOrder = orders.find(o => o.status.toLowerCase() === 'shipping');
    if (shippingOrder) {
      newActivityItems.push({
        type: "order",
        icon: Truck,
        iconColor: "text-purple-500",
        title: `Order #${shippingOrder.id.substring(0, 8)} shipped to customer`,
        time: formatDistanceToNow(parseISO(shippingOrder.created_at), { addSuffix: true })
      });
    }
    
    setActivityItems(newActivityItems);
  }, [orders, products, offers]);

  // Order columns
  const orderColumns = [
    { 
      header: "Order ID", 
      accessorKey: "id" as const,
    },
    { 
      header: "Customer", 
      accessorKey: "customer" as const,
    },
    { 
      header: "Date", 
      accessorKey: "date" as const,
    },
    { 
      header: "Status", 
      accessorKey: "status" as const,
      cell: (order: any) => {
        const statusColors: Record<string, string> = {
          Delivered: "bg-green-100 text-green-800",
          Shipping: "bg-blue-100 text-blue-800",
          Processing: "bg-yellow-100 text-yellow-800",
          Pending: "bg-gray-100 text-gray-800",
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
            {order.status}
          </span>
        );
      },
    },
    { 
      header: "Total", 
      accessorKey: "total" as const,
    },
  ];

  return (
    <div className="space-y-8 animate-blur-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to your admin panel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Last updated: {format(lastUpdated, 'h:mm a')}</span>
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
        </div>
      </div>
      
      {/* Stats section */}
      <div className="dashboard-grid">
        <StatCard 
          title="Total Revenue" 
          value={formattedRevenue} 
          change={{ value: "Updated", isPositive: true }}
          icon={CreditCard}
          iconColor="text-primary"
        />
        <StatCard 
          title="Total Orders" 
          value={orders.length.toString()} 
          change={{ value: "Real-time", isPositive: true }}
          icon={ShoppingBag}
          iconColor="text-purple-500"
        />
        <StatCard 
          title="Products" 
          value={products.length.toString()} 
          change={{ value: `${categories.length} categories`, isPositive: true }}
          icon={PackageCheck}
          iconColor="text-blue-500"
        />
        <StatCard 
          title="Pending Orders" 
          value={pendingOrders.toString()} 
          change={{ value: "Needs attention", isPositive: pendingOrders === 0 }}
          icon={Clock}
          iconColor="text-yellow-500"
        />
      </div>
      
      {/* Chart section */}
      <RevenueChart />
      
      {/* Recent orders section */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DataTable 
            data={recentOrders} 
            columns={orderColumns} 
            title="Recent Orders" 
            description="Latest customer orders" 
            pageSize={5}
          />
        </div>
        
        <div>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Recent Activity</h3>
              <button className="text-primary text-sm flex items-center gap-1 hover:underline">
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {activityItems.length > 0 ? (
                activityItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${item.iconColor.replace('text-', 'bg-')}/10 shrink-0`}>
                      <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No recent activity to display</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
