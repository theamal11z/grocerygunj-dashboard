import { useState, useEffect, useCallback } from "react";
import { 
  Check, 
  Save,
  Store,
  Globe,
  Mail,
  MapPin,
  Phone,
  AtSign,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Loader2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { defaultSettings, SettingsState, loadSettings, saveSettings, saveSettingsDirect, saveSettingsViaEdgeFunction } from "./SettingsData";

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  // Function to fetch settings from the database
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('Fetching settings...');
      const loadedSettings = await loadSettings(supabase);
      console.log('Settings loaded successfully:', loadedSettings);
      setSettings(loadedSettings);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load settings');
      toast({
        title: "Error",
        description: "Failed to load settings. Using defaults.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Validate URL format
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Validate settings before saving
  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate store info
    if (!settings.storeInfo.name.trim()) {
      errors['name'] = 'Store name is required';
    }
    
    if (!validateEmail(settings.storeInfo.email)) {
      errors['email'] = 'Valid email address is required';
    }
    
    if (settings.storeInfo.website && !validateUrl(settings.storeInfo.website)) {
      errors['website'] = 'Valid website URL is required';
    }
    
    // Validate social accounts if enabled
    if (settings.integrations.socialEnabled) {
      if (settings.integrations.socialAccounts.facebook && 
          !validateUrl(settings.integrations.socialAccounts.facebook)) {
        errors['facebook'] = 'Valid Facebook URL is required';
      }
      
      if (settings.integrations.socialAccounts.twitter && 
          !validateUrl(settings.integrations.socialAccounts.twitter)) {
        errors['twitter'] = 'Valid Twitter URL is required';
      }
      
      if (settings.integrations.socialAccounts.instagram && 
          !validateUrl(settings.integrations.socialAccounts.instagram)) {
        errors['instagram'] = 'Valid Instagram URL is required';
      }
      
      if (settings.integrations.socialAccounts.linkedin && 
          !validateUrl(settings.integrations.socialAccounts.linkedin)) {
        errors['linkedin'] = 'Valid LinkedIn URL is required';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Update store info
  const updateStoreInfo = (field: keyof SettingsState['storeInfo'], value: string) => {
    setSettings(prev => ({
      ...prev,
      storeInfo: {
        ...prev.storeInfo,
        [field]: value
      }
    }));
    setIsDirty(true);
    
    // Clear validation error when field is updated
    if (validationErrors[field as string]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field as string];
        return updated;
      });
    }
  };
  
  // Update regional settings
  const updateRegionalSettings = (field: keyof SettingsState['regionalSettings'], value: string) => {
    setSettings(prev => ({
      ...prev,
      regionalSettings: {
        ...prev.regionalSettings,
        [field]: value
      }
    }));
    setIsDirty(true);
  };
  
  // Update appearance settings
  const updateAppearance = (field: keyof SettingsState['appearance'], value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [field]: value
      }
    }));
    setIsDirty(true);
  };
  
  // Update notification settings
  const updateNotifications = (field: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
    setIsDirty(true);
  };
  
  // Update integration settings
  const updateIntegrations = (field: keyof SettingsState['integrations'], value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [field]: value
      }
    }));
    setIsDirty(true);
    
    // Clear validation errors for social accounts when socialEnabled is set to false
    if (field === 'socialEnabled' && value === false) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated['facebook'];
        delete updated['twitter'];
        delete updated['instagram'];
        delete updated['linkedin'];
        return updated;
      });
    }
  };
  
  // Update social account settings
  const updateSocialAccount = (platform: keyof SettingsState['integrations']['socialAccounts'], value: string) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        socialAccounts: {
          ...prev.integrations.socialAccounts,
          [platform]: value
        }
      }
    }));
    setIsDirty(true);
    
    // Clear validation error when field is updated
    if (validationErrors[platform as string]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[platform as string];
        return updated;
      });
    }
  };
  
  // Handle settings save
  const handleSave = async () => {
    // Validate settings before saving
    if (!validateSettings()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('Saving settings...', settings);
      
      let result;
      
      // Try each method in order of preference until one succeeds
      try {
        // First try Edge Function which has the highest privileges
        console.log('Attempting to save via Edge Function');
        result = await saveSettingsViaEdgeFunction(settings, supabase);
      } catch (edgeFunctionError) {
        console.error('Edge Function method failed:', edgeFunctionError);
        
        try {
          // Then try direct RPC method
          console.log('Attempting to save via RPC');
          result = await saveSettingsDirect(settings, supabase);
        } catch (rpcError) {
          console.error('RPC method failed:', rpcError);
          
          // Finally fall back to standard method
          console.log('Attempting to save via standard method');
          result = await saveSettings(settings, supabase);
        }
      }
      
      if (result.success) {
        console.log('Settings saved successfully');
        // Reload settings from the database to ensure we have the latest data
        try {
          const refreshedSettings = await loadSettings(supabase);
          setSettings(refreshedSettings);
          console.log('Settings reloaded after save:', refreshedSettings);
        } catch (reloadError) {
          console.error('Error reloading settings after save:', reloadError);
          // Continue with success toast even if reload fails
        }
        
        setIsDirty(false);
        toast({
          title: "Success",
          description: "Settings saved successfully",
          variant: "default"
        });
      } else {
        console.error('Failed to save settings:', result.message);
        toast({
          title: "Error",
          description: result.message || "Failed to save settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset settings to last saved state
  const handleReset = () => {
    fetchSettings();
    toast({
      title: "Reset",
      description: "Settings have been reset to last saved state",
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (loadError) {
    return (
      <div className="space-y-8 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your store preferences and configurations</p>
        </div>
        
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {loadError}
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={fetchSettings} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Loading Settings
        </Button>
      </div>
    );
  }
  
  // Render validation error for a specific field
  const renderFieldError = (field: string) => {
    if (validationErrors[field]) {
      return <p className="text-sm text-destructive mt-1">{validationErrors[field]}</p>;
    }
    return null;
  };
  
  return (
    <div className="space-y-8 animate-blur-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your store preferences and configurations</p>
        </div>
        
        {isDirty && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isSaving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Changes
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
              <CardDescription>
                Update your store details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Store Name</Label>
                  <Input 
                    id="store-name" 
                    value={settings.storeInfo.name}
                    onChange={(e) => updateStoreInfo('name', e.target.value)}
                    className={validationErrors['name'] ? 'border-destructive' : ''}
                  />
                  {renderFieldError('name')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-email">Email Address</Label>
                  <Input 
                    id="store-email" 
                    value={settings.storeInfo.email}
                    onChange={(e) => updateStoreInfo('email', e.target.value)}
                    type="email"
                    className={validationErrors['email'] ? 'border-destructive' : ''}
                  />
                  {renderFieldError('email')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-phone">Phone Number</Label>
                  <Input 
                    id="store-phone" 
                    value={settings.storeInfo.phone}
                    onChange={(e) => updateStoreInfo('phone', e.target.value)}
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-website">Website</Label>
                  <Input 
                    id="store-website" 
                    value={settings.storeInfo.website}
                    onChange={(e) => updateStoreInfo('website', e.target.value)}
                    type="url"
                    className={validationErrors['website'] ? 'border-destructive' : ''}
                  />
                  {renderFieldError('website')}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="store-address">Address</Label>
                <Textarea 
                  id="store-address" 
                  value={settings.storeInfo.address}
                  onChange={(e) => updateStoreInfo('address', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="store-description">Description</Label>
                <Textarea 
                  id="store-description"
                  value={settings.storeInfo.description}
                  onChange={(e) => updateStoreInfo('description', e.target.value)}
                  placeholder="Describe your store..."
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
              </CardTitle>
              <CardDescription>
                Configure your region-specific settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select 
                    id="currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.regionalSettings.currency}
                    onChange={(e) => updateRegionalSettings('currency', e.target.value)}
                  >
                    <option value="usd">USD - US Dollar</option>
                    <option value="eur">EUR - Euro</option>
                    <option value="gbp">GBP - British Pound</option>
                    <option value="jpy">JPY - Japanese Yen</option>
                    <option value="cad">CAD - Canadian Dollar</option>
                    <option value="aud">AUD - Australian Dollar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select 
                    id="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.regionalSettings.timezone}
                    onChange={(e) => updateRegionalSettings('timezone', e.target.value)}
                  >
                    <option value="et">Eastern Time (ET)</option>
                    <option value="ct">Central Time (CT)</option>
                    <option value="mt">Mountain Time (MT)</option>
                    <option value="pt">Pacific Time (PT)</option>
                    <option value="utc">Coordinated Universal Time (UTC)</option>
                    <option value="gmt">Greenwich Mean Time (GMT)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preferences</CardTitle>
              <CardDescription>
                Customize the appearance of your admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dark mode for the dashboard
                    </p>
                  </div>
                  <Switch 
                    checked={settings.appearance.darkMode}
                    onCheckedChange={(checked) => updateAppearance('darkMode', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Condensed View</Label>
                    <p className="text-sm text-muted-foreground">
                      Show more content with reduced spacing
                    </p>
                  </div>
                  <Switch 
                    checked={settings.appearance.condensedView}
                    onCheckedChange={(checked) => updateAppearance('condensedView', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable interface animations
                    </p>
                  </div>
                  <Switch 
                    checked={settings.appearance.animations}
                    onCheckedChange={(checked) => updateAppearance('animations', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className={`h-8 w-8 rounded-full bg-primary cursor-pointer ${settings.appearance.accentColor === 'primary' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'primary')}
                    ></div>
                    <div 
                      className={`h-8 w-8 rounded-full bg-purple-500 cursor-pointer ${settings.appearance.accentColor === 'purple' ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'purple')}
                    ></div>
                    <div 
                      className={`h-8 w-8 rounded-full bg-blue-500 cursor-pointer ${settings.appearance.accentColor === 'blue' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'blue')}
                    ></div>
                    <div 
                      className={`h-8 w-8 rounded-full bg-green-500 cursor-pointer ${settings.appearance.accentColor === 'green' ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'green')}
                    ></div>
                    <div 
                      className={`h-8 w-8 rounded-full bg-red-500 cursor-pointer ${settings.appearance.accentColor === 'red' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'red')}
                    ></div>
                    <div 
                      className={`h-8 w-8 rounded-full bg-orange-500 cursor-pointer ${settings.appearance.accentColor === 'orange' ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
                      onClick={() => updateAppearance('accentColor', 'orange')}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure what notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Orders</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me when new orders are placed
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.newOrders}
                    onCheckedChange={(checked) => updateNotifications('newOrders', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Order Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me about changes to existing orders
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.orderUpdates}
                    onCheckedChange={(checked) => updateNotifications('orderUpdates', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me when products are running low on inventory
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.lowStock}
                    onCheckedChange={(checked) => updateNotifications('lowStock', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Customer Reviews</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me when customers leave new reviews
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.customerReviews}
                    onCheckedChange={(checked) => updateNotifications('customerReviews', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Promotions & Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about promotional opportunities
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.promotions}
                    onCheckedChange={(checked) => updateNotifications('promotions', checked)}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important security notifications
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.security}
                    onCheckedChange={(checked) => updateNotifications('security', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Integration</CardTitle>
              <CardDescription>
                Connect your analytics services to track user behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Track user interactions and page views
                  </p>
                </div>
                <Switch 
                  checked={settings.integrations.analyticsEnabled}
                  onCheckedChange={(checked) => updateIntegrations('analyticsEnabled', checked)}
                />
              </div>
              {settings.integrations.analyticsEnabled && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="analytics-key">Analytics API Key</Label>
                  <Input 
                    id="analytics-key" 
                    value={settings.integrations.analyticsKey}
                    onChange={(e) => updateIntegrations('analyticsKey', e.target.value)}
                    placeholder="UA-XXXXXXXXX-X"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing</CardTitle>
              <CardDescription>
                Configure your payment gateway integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Payments</Label>
                  <p className="text-sm text-muted-foreground">
                    Process payments through your integrated payment gateway
                  </p>
                </div>
                <Switch 
                  checked={settings.integrations.paymentsEnabled}
                  onCheckedChange={(checked) => updateIntegrations('paymentsEnabled', checked)}
                />
              </div>
              {settings.integrations.paymentsEnabled && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="payments-key">Payment API Key</Label>
                  <Input 
                    id="payments-key" 
                    value={settings.integrations.paymentsKey}
                    onChange={(e) => updateIntegrations('paymentsKey', e.target.value)}
                    placeholder="pk_test_XXXXXXXXXXXXXXXXXXXXXXXX"
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This is your publishable key, not your secret key
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Social Media Integration</CardTitle>
              <CardDescription>
                Connect your social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Social Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Connect and manage your social media accounts
                  </p>
                </div>
                <Switch 
                  checked={settings.integrations.socialEnabled}
                  onCheckedChange={(checked) => updateIntegrations('socialEnabled', checked)}
                />
              </div>
              
              {settings.integrations.socialEnabled && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <Input 
                          placeholder="Facebook Page URL" 
                          value={settings.integrations.socialAccounts.facebook}
                          onChange={(e) => updateSocialAccount('facebook', e.target.value)}
                          className={validationErrors['facebook'] ? 'border-destructive' : ''}
                        />
                        {renderFieldError('facebook')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Twitter className="h-5 w-5 text-blue-400" />
                      <div className="flex-1">
                        <Input 
                          placeholder="Twitter Profile URL" 
                          value={settings.integrations.socialAccounts.twitter}
                          onChange={(e) => updateSocialAccount('twitter', e.target.value)}
                          className={validationErrors['twitter'] ? 'border-destructive' : ''}
                        />
                        {renderFieldError('twitter')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <div className="flex-1">
                        <Input 
                          placeholder="Instagram Profile URL" 
                          value={settings.integrations.socialAccounts.instagram}
                          onChange={(e) => updateSocialAccount('instagram', e.target.value)}
                          className={validationErrors['instagram'] ? 'border-destructive' : ''}
                        />
                        {renderFieldError('instagram')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-5 w-5 text-blue-700" />
                      <div className="flex-1">
                        <Input 
                          placeholder="LinkedIn Profile URL" 
                          value={settings.integrations.socialAccounts.linkedin}
                          onChange={(e) => updateSocialAccount('linkedin', e.target.value)}
                          className={validationErrors['linkedin'] ? 'border-destructive' : ''}
                        />
                        {renderFieldError('linkedin')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
