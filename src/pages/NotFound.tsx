
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/40">
      <div className="text-center max-w-md px-4">
        <div className="mb-8 relative">
          <div className="text-9xl font-bold text-primary opacity-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            404
          </div>
          <div className="relative z-10">
            <svg 
              className="w-40 h-40 mx-auto text-muted-foreground opacity-70" 
              fill="none" 
              height="24" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              width="24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">Page not found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to={location.pathname.includes('/orders') || location.pathname.includes('/products') ? location.pathname.substring(0, location.pathname.lastIndexOf('/')) : '/'}>
              <ArrowLeft className="mr-1 h-5 w-5" />
              Go Back
            </Link>
          </Button>
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="mr-1 h-5 w-5" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
