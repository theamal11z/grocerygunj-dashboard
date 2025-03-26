import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, adminSupabase } from './supabase';
import { useAuth } from './AuthContext';
import { Database } from './database.types';
import { Session, RealtimeChannel } from '@supabase/supabase-js';

// Define types for our data
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type Offer = Database['public']['Tables']['offers']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row']; 
type Wishlist = Database['public']['Tables']['wishlists']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Address = Database['public']['Tables']['addresses']['Row'];
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];
type CartItem = Database['public']['Tables']['cart_items']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];

// Define context type with authentication state
interface DataContextType {
  products: Product[];
  categories: Category[];
  orders: Order[];
  offers: Offer[];
  profiles: Profile[];
  wishlists: Wishlist[];
  orderItems: OrderItem[];
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  notifications: Notification[];
  cartItems: CartItem[];
  settings: Settings[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  isAuthenticated: boolean;
  updateOrderStatus: (orderId: string, status: string) => Promise<{ success: boolean, error?: string }>;
  deleteOrder: (orderId: string) => Promise<{ success: boolean, error?: string }>;
  addToWishlist: (productId: string) => Promise<{ success: boolean, error?: string, wishlistId?: string }>;
  removeFromWishlist: (wishlistId: string) => Promise<{ success: boolean, error?: string }>;
  addToCart: (productId: string, quantity: number) => Promise<{ success: boolean, error?: string }>;
  markNotificationAsRead: (notificationId: string) => Promise<{ success: boolean, error?: string }>;
  markAllNotificationsAsRead: () => Promise<{ success: boolean, error?: string }>;
  deleteNotification: (notificationId: string) => Promise<{ success: boolean, error?: string }>;
}

// Create context with default values
const DataContext = createContext<DataContextType>({
  products: [],
  categories: [],
  orders: [],
  offers: [],
  profiles: [],
  wishlists: [],
  orderItems: [],
  addresses: [],
  paymentMethods: [],
  notifications: [],
  cartItems: [],
  settings: [],
  loading: true,
  error: null,
  refreshData: async () => {},
  isAuthenticated: false,
  updateOrderStatus: async () => ({ success: false }),
  deleteOrder: async () => ({ success: false }),
  addToWishlist: async () => ({ success: false }),
  removeFromWishlist: async () => ({ success: false }),
  addToCart: async () => ({ success: false }),
  markNotificationAsRead: async () => ({ success: false }),
  markAllNotificationsAsRead: async () => ({ success: false }),
  deleteNotification: async () => ({ success: false }),
});

// Custom hook for using the data context
export const useData = () => useContext(DataContext);

// Provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State variables for different data types
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<Settings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<{
    [key: string]: RealtimeChannel;
  }>({});
  
  // Local storage key for read notifications
  const READ_NOTIFICATIONS_KEY = 'admin_suite_read_notifications';
  
  // Function to get read notification IDs from localStorage
  const getReadNotificationIds = (): string[] => {
    try {
      const storedIds = localStorage.getItem(READ_NOTIFICATIONS_KEY);
      
      if (!storedIds) return [];
      
      // Attempt to parse and validate the stored data
      const parsedIds = JSON.parse(storedIds);
      
      // Ensure the parsed data is an array of strings
      if (!Array.isArray(parsedIds)) {
        console.error('Invalid format for read notifications in localStorage, resetting');
        localStorage.removeItem(READ_NOTIFICATIONS_KEY);
        return [];
      }
      
      // Filter out any non-string or invalid UUIDs
      const validIds = parsedIds.filter(id => {
        if (typeof id !== 'string') return false;
        // Basic UUID format validation (not comprehensive but catches most issues)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });
      
      // If we filtered out items, update the storage with clean data
      if (validIds.length !== parsedIds.length) {
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(validIds));
        console.warn('Sanitized read notifications in localStorage');
      }
      
      return validIds;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      // Clear potentially corrupted data
      localStorage.removeItem(READ_NOTIFICATIONS_KEY);
      return [];
    }
  };
  
  // Function to save read notification IDs to localStorage
  const saveReadNotificationId = (notificationId: string): void => {
    try {
      // Validate the notification ID format before saving
      if (typeof notificationId !== 'string' || notificationId.trim() === '') {
        console.error('Invalid notification ID, not saving to localStorage');
        return;
      }
      
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(notificationId)) {
        console.error('Notification ID does not match UUID format, not saving');
        return;
      }
      
      const currentIds = getReadNotificationIds();
      if (!currentIds.includes(notificationId)) {
        const updatedIds = [...currentIds, notificationId];
        // Limit the number of stored IDs to prevent localStorage overflow
        const limitedIds = updatedIds.slice(-500); // Keep only the most recent 500 IDs
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(limitedIds));
        console.log(`Saved notification ${notificationId} as read in localStorage`);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };
  
  // Function to apply read status from localStorage
  const applyLocalReadStatus = (notificationsData: Notification[]): Notification[] => {
    const readIds = getReadNotificationIds();
    if (readIds.length === 0) return notificationsData;
    
    return notificationsData.map(notification => {
      // If we've previously marked this as read in localStorage, ensure it stays read
      if (readIds.includes(notification.id)) {
        return { ...notification, read: true };
      }
      return notification;
    });
  };
  
  // Get authentication status from AuthContext
  const { isAdmin: authIsAdmin, session: authSession } = useAuth();
  
  // Function to ensure we're authenticated for data access
  const authenticate = async () => {
    console.log('Authenticating for data access...');
    
    // Check if we already have a session through AuthContext
    if (authSession && authIsAdmin) {
      console.log('Already authenticated through main auth context');
      setIsAdmin(true);
      setSession(authSession);
      return true;
    }
    
    // Try to get the current session directly
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log('Found existing session:', sessionData.session.user.email);
      setIsAdmin(true);
      setSession(sessionData.session);
      return true;
    }
    
    console.log('Not authenticated');
    setIsAdmin(false);
    setSession(null);
    return false;
  };

  // Function to fetch data from Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Starting data fetch with isAdmin:', isAdmin);
    
    // Ensure we're authenticated
    const authenticated = await authenticate();
    if (!authenticated) {
      console.log('Not authenticated, cannot fetch data');
      setLoading(false);
      setError('Not authenticated');
      return;
    }
    
    try {
      // Choose client based on admin status
      // If adminSupabase is available and user is admin, use it to bypass RLS
      // Otherwise, fall back to regular client
      const client = (isAdmin && adminSupabase) ? adminSupabase : supabase;
      console.log(`Using ${isAdmin && adminSupabase ? 'admin' : 'regular'} Supabase client`);
      
      // Fetch products
      console.log('Fetching products...');
      const { data: productsData, error: productsError } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Products response:', { 
        data: productsData ? `${productsData.length} items` : 'No data', 
        error: productsError 
      });
      
      if (productsError) {
        console.error('Products error:', productsError);
        setError(`Error fetching products: ${productsError.message}`);
        // Continue with other data fetching even if products fail
      } else {
        setProducts(productsData || []);
      }
      
      // Fetch categories
      console.log('Fetching categories...');
      const { data: categoriesData, error: categoriesError } = await client
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      console.log('Categories response:', { 
        data: categoriesData ? `${categoriesData.length} items` : 'No data', 
        error: categoriesError 
      });
      
      if (categoriesError) {
        console.error('Categories error:', categoriesError);
        // If it's a permission error and we have admin client, try to fix policies
        if (
          categoriesError.message.includes('permission') && 
          isAdmin && 
          adminSupabase
        ) {
          console.log('Attempting to fix category policies...');
          try {
            // Try to enable category admin policies 
            const { data: fixResult, error: fixError } = await client.rpc('enable_category_admin_policies');
            if (fixError) {
              console.error('Failed to fix category policies:', fixError);
              setError(`Error with categories: ${categoriesError.message}. Failed to fix: ${fixError.message}`);
            } else {
              console.log('Category policies fixed:', fixResult);
              // Retry fetching categories
              const { data: retryData, error: retryError } = await client
                .from('categories')
                .select('*')
                .order('name', { ascending: true });
              
              if (retryError) {
                console.error('Categories retry error:', retryError);
                setError(`Error fetching categories after policy fix: ${retryError.message}`);
              } else {
                console.log('Categories retry successful:', retryData ? `${retryData.length} items` : 'No data');
                setCategories(retryData || []);
              }
            }
          } catch (fixAttemptError) {
            console.error('Exception trying to fix policies:', fixAttemptError);
            setError(`Error with categories: ${categoriesError.message}. Fix attempt failed.`);
          }
        } else {
          // Not a permission error or no admin client
          setError(`Error fetching categories: ${categoriesError.message}`);
        }
      } else {
        console.log('Categories fetch successful');
        setCategories(categoriesData || []);
      }
      
      // Fetch orders
      console.log('Fetching orders...');
      const { data: ordersData, error: ordersError } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent orders
      
      console.log('Orders response:', { 
        data: ordersData ? `${ordersData.length} items` : 'No data', 
        error: ordersError 
      });
      
      if (ordersError) {
        console.error('Orders error:', ordersError);
        throw new Error(`Orders error: ${ordersError.message}`);
      }
      setOrders(ordersData || []);
      
      // Fetch offers
      console.log('Fetching offers...');
      try {
        const { data: offersData, error: offersError } = await client
          .from('offers')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('Offers response:', { 
          data: offersData ? `${offersData.length} items` : 'No data', 
          error: offersError 
        });
        
        if (offersError) {
          console.error('Offers error:', offersError);
          
          // Check if it's a recursion error
          if (offersError.message && offersError.message.includes('infinite recursion')) {
            console.log('Detected infinite recursion error, attempting to fix policies...');
            
            // Try to apply the policy fix
            try {
              const { data: fixResult, error: fixError } = await client
                .rpc('enable_offer_admin_policies');
                
              if (fixError) {
                console.error('Error fixing policies:', fixError);
                throw new Error(`Offers error: ${offersError.message}`);
              }
              
              console.log('Applied policy fix, retrying offer fetch...');
              
              // Retry the fetch after fix
              const { data: retryData, error: retryError } = await client
                .from('offers')
                .select('*')
                .order('created_at', { ascending: false });
                
              if (retryError) {
                console.error('Offers retry error:', retryError);
                throw new Error(`Offers error: ${retryError.message}`);
              }
              
              // Filter out offers with missing required data
              const validOffers = (retryData || []).filter(
                offer => offer && offer.title && offer.code && offer.discount
              );
              setOffers(validOffers);
            } catch (fixAttemptError) {
              console.error('Error in fix attempt:', fixAttemptError);
              throw new Error(`Offers error: Unable to fix recursion issue. ${offersError.message}`);
            }
          } else {
            // Not a recursion error, just throw the original error
            throw new Error(`Offers error: ${offersError.message}`);
          }
        } else {
          // Filter out offers with missing required data
          const validOffers = (offersData || []).filter(
            offer => offer && offer.title && offer.code && offer.discount
          );
          setOffers(validOffers);
        }
      } catch (offerCatchError) {
        // If we get here, both the original fetch and fix attempt failed
        console.error('Unhandled offers error:', offerCatchError);
        throw offerCatchError;
      }
      
      // Fetch profiles
      console.log('Fetching profiles...');
      try {
        const { data: profilesData, error: profilesError } = await client
          .from('profiles')
          .select('*')
          .limit(1000);
        
        console.log('Profiles response:', { 
          data: profilesData ? `${profilesData.length} items` : 'No data', 
          error: profilesError 
        });
        
        if (profilesError) {
          console.error('Profiles error:', profilesError);
          
          // Check if it's a recursion error
          if (profilesError.message && profilesError.message.includes('infinite recursion')) {
            console.log('Detected infinite recursion in profiles, attempting to fix...');
            
            // Apply the migration manually
            try {
              // Attempt to run the migration through RPC
              await client.rpc('is_admin_direct');
              
              console.log('Applied profiles policy fix, retrying profiles fetch...');
              
              // Retry the fetch after fix
              const { data: retryData, error: retryError } = await client
                .from('profiles')
                .select('*')
                .limit(1000);
                
              if (retryError) {
                console.error('Profiles retry error:', retryError);
                throw new Error(`Profiles error: ${retryError.message}`);
              }
              
              // Filter out profiles with missing required data
              const validProfiles = (retryData || []).filter(
                profile => profile && profile.id
              );
              setProfiles(validProfiles);
            } catch (fixAttemptError) {
              console.error('Error in profiles fix attempt:', fixAttemptError);
              throw new Error(`Profiles error: Unable to fix recursion issue. ${profilesError.message}`);
            }
          } else {
            // Not a recursion error, just throw the original error
            throw new Error(`Profiles error: ${profilesError.message}`);
          }
        } else {
          // Filter out profiles with missing required data
          const validProfiles = (profilesData || []).filter(
            profile => profile && profile.id
          );
          setProfiles(validProfiles);
        }
      } catch (profileCatchError) {
        // If we get here, both the original fetch and fix attempt failed
        console.error('Unhandled profiles error:', profileCatchError);
        throw profileCatchError;
      }
      
      // Fetch wishlists
      console.log('Fetching wishlists...');
      const { data: wishlistsData, error: wishlistsError } = await client
        .from('wishlists')
        .select('*');
      
      console.log('Wishlists response:', { 
        data: wishlistsData ? `${wishlistsData.length} items` : 'No data', 
        error: wishlistsError 
      });
      
      if (wishlistsError) {
        console.error('Wishlists error:', wishlistsError);
        throw new Error(`Wishlists error: ${wishlistsError.message}`);
      }
      setWishlists(wishlistsData || []);
      
      // Fetch order items
      console.log('Fetching order items...');
      const { data: orderItemsData, error: orderItemsError } = await client
        .from('order_items')
        .select('*');
      
      console.log('Order items response:', { 
        data: orderItemsData ? `${orderItemsData.length} items` : 'No data', 
        error: orderItemsError 
      });
      
      if (orderItemsError) {
        console.error('Order items error:', orderItemsError);
        throw new Error(`Order items error: ${orderItemsError.message}`);
      }
      setOrderItems(orderItemsData || []);
      
      // Fetch addresses
      console.log('Fetching addresses...');
      const { data: addressesData, error: addressesError } = await client
        .from('addresses')
        .select('*');
      
      console.log('Addresses response:', { 
        data: addressesData ? `${addressesData.length} items` : 'No data', 
        error: addressesError 
      });
      
      if (addressesError) {
        console.error('Addresses error:', addressesError);
        throw new Error(`Addresses error: ${addressesError.message}`);
      }
      setAddresses(addressesData || []);
      
      // Fetch payment methods
      console.log('Fetching payment methods...');
      const { data: paymentMethodsData, error: paymentMethodsError } = await client
        .from('payment_methods')
        .select('*');
      
      console.log('Payment methods response:', { 
        data: paymentMethodsData ? `${paymentMethodsData.length} items` : 'No data', 
        error: paymentMethodsError 
      });
      
      if (paymentMethodsError) {
        console.error('Payment methods error:', paymentMethodsError);
        throw new Error(`Payment methods error: ${paymentMethodsError.message}`);
      }
      setPaymentMethods(paymentMethodsData || []);
      
      // Fetch notifications
      console.log('Fetching notifications...');
      const { data: notificationsData, error: notificationsError } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent notifications
      
      console.log('Notifications response:', { 
        data: notificationsData ? `${notificationsData.length} items` : 'No data', 
        error: notificationsError 
      });
      
      if (notificationsError) {
        console.error('Notifications error:', notificationsError);
        throw new Error(`Notifications error: ${notificationsError.message}`);
      }

      // Process notifications with multiple layers of preservation:
      // 1. Apply localStorage read status to ensure client-side persistence
      // 2. Also preserve read status for notifications that were already marked as read in current session
      let processedNotifications: Notification[] = [];
      
      if (notificationsData) {
        // First apply localStorage read status
        const localStorageProcessed = applyLocalReadStatus(notificationsData);
        
        // Then preserve read status from current session if applicable
        if (notifications.length > 0) {
          processedNotifications = localStorageProcessed.map(newNotification => {
            // Check if this notification exists in current state and was already read
            const existingNotification = notifications.find(n => n.id === newNotification.id);
            if (existingNotification && existingNotification.read) {
              // If it was read in this session, ensure it stays read
              return { ...newNotification, read: true };
            }
            return newNotification;
          });
        } else {
          processedNotifications = localStorageProcessed;
        }
        
        setNotifications(processedNotifications);
      } else {
        setNotifications([]);
      }
      
      // Fetch cart items
      console.log('Fetching cart items...');
      const { data: cartItemsData, error: cartItemsError } = await client
        .from('cart_items')
        .select('*');
      
      console.log('Cart items response:', { 
        data: cartItemsData ? `${cartItemsData.length} items` : 'No data', 
        error: cartItemsError 
      });
      
      if (cartItemsError) {
        console.error('Cart items error:', cartItemsError);
        throw new Error(`Cart items error: ${cartItemsError.message}`);
      }
      setCartItems(cartItemsData || []);
      
      // Fetch settings
      console.log('Fetching settings...');
      const { data: settingsData, error: settingsError } = await client
        .from('settings')
        .select('*');
      
      console.log('Settings response:', { 
        data: settingsData ? `${settingsData.length} items` : 'No data', 
        error: settingsError 
      });
      
      if (settingsError) {
        console.error('Settings error:', settingsError);
        throw new Error(`Settings error: ${settingsError.message}`);
      }
      setSettings(settingsData || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time notification updates
  useEffect(() => {
    if (!session) return;
    
    // Only set up subscription if we're authenticated
    const setupNotificationSubscription = async () => {
      try {
        // Clean up any existing subscription
        if (activeSubscriptions.notifications) {
          activeSubscriptions.notifications.unsubscribe();
        }
        
        console.log('Setting up notification subscription');
        
        // Set up the new subscription
        const subscription = supabase
          .channel('notifications-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications'
            },
            async (payload) => {
              console.log('Notification change received:', payload);
              
              // Get the current notifications
              let updatedNotifications = [...notifications];
              
              // Get read notification IDs from localStorage
              const readIds = getReadNotificationIds();
              
              // Handle different events
              if (payload.eventType === 'INSERT') {
                // Check if this notification is already marked as read in localStorage
                const newNotification = payload.new as Notification;
                if (readIds.includes(newNotification.id)) {
                  // Already marked as read in localStorage
                  newNotification.read = true;
                }
                
                // Add the new notification to the list
                updatedNotifications = [newNotification, ...updatedNotifications];
              } else if (payload.eventType === 'UPDATE') {
                // Update the notification in the list, ensuring we never revert from read to unread
                updatedNotifications = updatedNotifications.map((notification) => {
                  if (notification.id === payload.new.id) {
                    const newNotification = payload.new as Notification;
                    
                    // If notification was previously read in state or in localStorage, 
                    // ensure it stays read
                    if ((notification.read && !newNotification.read) || 
                        readIds.includes(notification.id)) {
                      // Track the attempted status change
                      trackNotificationReadStatus(
                        'realtime-update-prevented',
                        notification.id,
                        notification.read,
                        newNotification.read
                      );
                      console.log('Preserving read status for notification:', notification.id);
                      return { ...newNotification, read: true };
                    }
                    
                    // If this update is marking the notification as read, save to localStorage
                    if (!notification.read && newNotification.read) {
                      saveReadNotificationId(notification.id);
                    }
                    
                    // Track normal status change
                    trackNotificationReadStatus(
                      'realtime-update',
                      notification.id,
                      notification.read,
                      newNotification.read
                    );
                    return newNotification;
                  }
                  return notification;
                });
              } else if (payload.eventType === 'DELETE') {
                // Remove the notification from the list
                updatedNotifications = updatedNotifications.filter(
                  (notification) => notification.id !== payload.old.id
                );
              }
              
              // Update the state
              setNotifications(updatedNotifications);
            }
          )
          .subscribe();
        
        // Store the subscription
        setActiveSubscriptions((prev) => ({
          ...prev,
          notifications: subscription
        }));
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };
    
    setupNotificationSubscription();
    
    // Clean up subscription on unmount
    return () => {
      if (activeSubscriptions.notifications) {
        console.log('Cleaning up notification subscription');
        activeSubscriptions.notifications.unsubscribe();
      }
    };
  }, [session]);

  // Function to mark a notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Find the current notification to get its read status before updating
      const currentNotification = notifications.find(n => n.id === notificationId);
      const previousReadStatus = currentNotification?.read || false;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Save to localStorage for persistent storage
      saveReadNotificationId(notificationId);
      
      // Update the local state to avoid having to refetch
      setNotifications(prev => 
        prev.map(notification => {
          if (notification.id === notificationId) {
            // Track the status change for debugging
            trackNotificationReadStatus(
              'markNotificationAsRead',
              notificationId,
              previousReadStatus,
              true
            );
            return { ...notification, read: true };
          }
          return notification;
        })
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      // Get the IDs of all unread notifications before updating
      const unreadNotifications = notifications.filter(n => !n.read);
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);
        
      if (error) throw error;
      
      // Save all notification IDs to localStorage
      unreadNotifications.forEach(notification => {
        saveReadNotificationId(notification.id);
      });
      
      // Update the local state to avoid having to refetch
      setNotifications(prev => 
        prev.map(notification => {
          // Track status changes for all unread notifications
          if (!notification.read) {
            trackNotificationReadStatus(
              'markAllNotificationsAsRead',
              notification.id,
              false,
              true
            );
            return { ...notification, read: true };
          }
          return notification;
        })
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Function to delete a notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update the local state to avoid having to refetch
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Fetch data on component mount and when authentication changes
  useEffect(() => {
    fetchData();
  }, [isAdmin, session]);

  // Apply localStorage read status to notifications on initial load
  useEffect(() => {
    // If there are notifications and we're not currently loading data
    if (notifications.length > 0 && !loading) {
      const processedNotifications = applyLocalReadStatus(notifications);
      // Only update state if there are changes
      const hasChanges = processedNotifications.some(
        (processed, index) => processed.read !== notifications[index].read
      );
      
      if (hasChanges) {
        console.log('Applying localStorage read status to notifications');
        setNotifications(processedNotifications);
      }
    }
  }, [notifications.length, loading]);

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      // Get the order details first to access the user_id
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single();
      
      if (orderError) throw orderError;
      
      // First try with the admin client if available (bypasses RLS)
      if (adminSupabase && isAdmin) {
        const { error } = await adminSupabase
          .from('orders')
          .update({ 
            status,
            updated_at: new Date().toISOString() 
          })
          .eq('id', orderId);
        
        if (error) throw error;
      } else {
        // Regular update with user permissions
        const { error } = await supabase
          .from('orders')
          .update({ 
            status,
            updated_at: new Date().toISOString() 
          })
          .eq('id', orderId);
        
        if (error) throw error;
      }
      
      // Create a notification for the user about the status change
      if (orderData?.user_id) {
        // Prepare notification title and message based on the status
        let title = '';
        let message = '';
        
        switch (status) {
          case 'processing':
            title = 'Order Processing';
            message = `Your order #${orderId.substring(0, 8)} is now being processed.`;
            break;
          case 'shipping':
            title = 'Order Shipped';
            message = `Your order #${orderId.substring(0, 8)} has been shipped and is on its way.`;
            break;
          case 'delivered':
            title = 'Order Delivered';
            message = `Your order #${orderId.substring(0, 8)} has been delivered. Thank you for your purchase!`;
            break;
          case 'cancelled':
            title = 'Order Cancelled';
            message = `Your order #${orderId.substring(0, 8)} has been cancelled.`;
            break;
          default:
            title = 'Order Update';
            message = `Your order #${orderId.substring(0, 8)} status has been updated to ${status}.`;
        }
        
        // Create the notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: orderData.user_id,
            title,
            message,
            type: 'order',
            read: false,
            created_at: new Date().toISOString()
          });
        
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't throw the error to avoid failing the status update
          // just log it
        }
      }
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  // Delete order and its items
  const deleteOrder = async (orderId: string) => {
    try {
      // First try with the admin client if available (bypasses RLS)
      if (adminSupabase && isAdmin) {
        // First delete order items
        const { error: itemsError } = await adminSupabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
        
        if (itemsError) throw itemsError;
        
        // Then delete the order
        const { error } = await adminSupabase
          .from('orders')
          .delete()
          .eq('id', orderId);
        
        if (error) throw error;
      } else {
        // Regular delete with user permissions
        // First delete order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
        
        if (itemsError) throw itemsError;
        
        // Then delete the order
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);
        
        if (error) throw error;
      }
      
      // Update local state
      setOrderItems(prevItems => prevItems.filter(item => item.order_id !== orderId));
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  // Add to wishlist
  const addToWishlist = async (productId: string) => {
    try {
      // First check if the user is authenticated
      if (!session?.user?.id) {
        return { success: false, error: 'You must be logged in to add items to your wishlist' };
      }

      // Check if the product already exists in the wishlist
      const existingItem = wishlists.find(item => 
        item.product_id === productId && item.user_id === session.user.id
      );

      if (existingItem) {
        return { 
          success: true, 
          wishlistId: existingItem.id, 
          error: 'Product is already in your wishlist' 
        };
      }

      // Add the item to wishlist
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: session.user.id,
          product_id: productId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setWishlists(prev => [...prev, data]);
      
      return { success: true, wishlistId: data.id };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  // Remove from wishlist
  const removeFromWishlist = async (wishlistId: string) => {
    try {
      // Delete the wishlist item
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);
      
      if (error) throw error;
      
      // Update local state
      setWishlists(prev => prev.filter(item => item.id !== wishlistId));
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  // Add to cart
  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      // First check if the user is authenticated
      if (!session?.user?.id) {
        return { success: false, error: 'You must be logged in to add items to cart' };
      }

      // Check if product exists
      const product = products.find(p => p.id === productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Check if the product already exists in the cart
      const existingCartItem = cartItems.find(item => 
        item.product_id === productId && item.user_id === session.user.id
      );

      if (existingCartItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingCartItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCartItem.id);
        
        if (error) throw error;
        
        // Update local state
        setCartItems(prev => prev.map(item => 
          item.id === existingCartItem.id 
            ? { ...item, quantity: item.quantity + quantity, updated_at: new Date().toISOString() } 
            : item
        ));
      } else {
        // Add new cart item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: session.user.id,
            product_id: productId,
            quantity,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Update local state
        setCartItems(prev => [...prev, data]);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  // Utility function to track notification read status changes
  const trackNotificationReadStatus = (
    operation: string, 
    notificationId: string, 
    previousStatus: boolean | null, 
    newStatus: boolean | null
  ) => {
    // Only log when there's a state change
    if (previousStatus !== newStatus) {
      console.log(
        `[Notification Status Change] Operation: ${operation}, ID: ${notificationId}, ` +
        `Previous status: ${previousStatus ? 'read' : 'unread'}, ` +
        `New status: ${newStatus ? 'read' : 'unread'}`
      );
      
      // Validate that we're not improperly reverting from read to unread
      if (previousStatus === true && newStatus === false) {
        console.warn(
          `[Warning] Notification ${notificationId} was reverted from read to unread. ` +
          `This should not happen and indicates an issue with the data flow.`
        );
      }
    }
  };

  // Provide context value
  const value = {
    products,
    categories,
    orders,
    offers,
    profiles,
    wishlists,
    orderItems,
    addresses,
    paymentMethods,
    notifications,
    cartItems,
    settings,
    loading,
    error,
    refreshData: fetchData,
    isAuthenticated: isAdmin,
    updateOrderStatus,
    deleteOrder,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}; 