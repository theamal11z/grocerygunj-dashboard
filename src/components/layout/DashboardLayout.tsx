import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "react-router-dom";
import { useData } from "@/lib/DataContext";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const { loading: dataLoading, error: dataError } = useData();
  const { isAdmin, loading: authLoading } = useAuth();

  // Check if mobile on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 1024);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Determine loading state
  const isLoading = dataLoading || authLoading;
  
  // Determine if there's an access error
  const hasAccessError = !isAdmin && !authLoading;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-secondary/20">
          <div className="mx-auto max-w-7xl">
            {/* Access denied message */}
            {hasAccessError && (
              <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  <p className="font-medium">Access Denied</p>
                </div>
                <p className="text-sm mt-1">You do not have permission to access this dashboard.</p>
              </div>
            )}
            
            {/* Data error message */}
            {dataError && (
              <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive rounded-lg">
                <p className="font-medium">Error Loading Data</p>
                <p className="text-sm mt-1">{dataError}</p>
              </div>
            )}
            
            {/* Loading overlay */}
            {isLoading ? (
              <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium text-muted-foreground">Loading data...</p>
                </div>
              </div>
            ) : (
              /* Animated content container */
              <div key={location.pathname} className="animate-scale-in">
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
