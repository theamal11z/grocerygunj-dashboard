import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tag, 
  Percent, 
  Users, 
  Heart, 
  Settings,
  ChevronLeft,
  LogOut,
  User,
  Bell
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useData } from "@/lib/DataContext";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const { user, session, signOut } = useAuth();
  const { profiles, notifications } = useData();
  
  // Prevent animation on first render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get unread notifications count
  const unreadNotificationsCount = notifications?.filter(n => !n.read).length || 0;

  // Get user profile from profiles list if available
  const getUserProfile = () => {
    if (!user || !profiles || profiles.length === 0) return null;
    return profiles.find(profile => profile.id === user.id);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "U";
    
    // Try to get from profile
    const profile = getUserProfile();
    if (profile?.full_name) {
      const nameParts = profile.full_name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    // Try to get from user metadata
    if (user.user_metadata?.full_name) {
      const nameParts = user.user_metadata.full_name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    // If no full name, use email
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return "U";
  };

  // Get display name
  const getDisplayName = () => {
    if (!user) return "User";
    
    // Try to get from profile
    const profile = getUserProfile();
    if (profile?.full_name) {
      return profile.full_name;
    }
    
    // Try to get from user metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    if (user.email) {
      // Show email username part (before the @)
      const emailParts = user.email.split('@');
      return emailParts[0];
    }
    
    return "User";
  };

  // Get email address
  const getEmail = () => {
    if (!user) return "No email";
    
    // Try to get from profile
    const profile = getUserProfile();
    if (profile?.email) {
      return profile.email;
    }
    
    // Fallback to user email
    return user.email || "No email";
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
  };

  // Define navigation items
  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard
    },
    {
      name: "Orders",
      path: "/orders",
      icon: ShoppingCart
    },
    {
      name: "Products",
      path: "/products",
      icon: Package
    },
    {
      name: "Categories",
      path: "/categories",
      icon: Tag
    },
    {
      name: "Offers",
      path: "/offers",
      icon: Percent
    },
    {
      name: "Users",
      path: "/users",
      icon: Users
    },
    {
      name: "Wishlists",
      path: "/wishlists",
      icon: Heart
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen w-[280px] bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg",
          open ? "translate-x-0" : "-translate-x-full",
          mounted ? "transition-transform" : ""
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-sidebar-border justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white font-semibold">
                A
              </div>
              <span className="text-lg font-display font-medium">Admin Panel</span>
            </Link>
            
            <button 
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 hover:bg-sidebar-accent text-sidebar-foreground lg:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          
          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-6 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon size={20} />
                      <span>{item.name}</span>
                      {item.badge !== undefined && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* User profile */}
          <div className="mt-auto border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {user ? (
                  <span className="font-medium text-primary">{getUserInitials()}</span>
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{getEmail()}</p>
              </div>
              <button 
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
