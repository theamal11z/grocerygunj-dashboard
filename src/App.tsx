
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect } from "react";
import { DataProvider } from "@/lib/DataContext";
import { AuthProvider } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/lib/AuthContext";

// Pages
import Index from "@/pages/Index";
import Orders from "@/pages/Orders";
import Products from "@/pages/Products";
import Categories from "@/pages/Categories";
import Offers from "@/pages/Offers";
import Users from "@/pages/Users";
import Wishlists from "@/pages/Wishlists";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import CreateAdmin from "@/pages/CreateAdmin";
import Notifications from "@/pages/Notifications";

// Create the query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10000,
      refetchOnWindowFocus: false
    }
  }
});

// ScrollToTop component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// App Router with AuthProvider
const AppRouter = () => {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Development Route - only works in dev mode */}
        <Route path="/create-admin" element={<CreateAdmin />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Index />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Orders />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Products />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/categories" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Categories />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/offers" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Offers />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Users />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/wishlists" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Wishlists />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Notifications Route */}
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <DataProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppRouter />
              </TooltipProvider>
            </DataProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
