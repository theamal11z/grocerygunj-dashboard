import { Database } from '../lib/database.types';
import { SettingsState } from '@/types/settings';
import { supabase } from '@/lib/supabaseClient';

export interface SettingsState {
  storeInfo: {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    description: string;
  };
  regionalSettings: {
    currency: string;
    timezone: string;
  };
  appearance: {
    darkMode: boolean;
    condensedView: boolean;
    animations: boolean;
    accentColor: string;
  };
  notifications: {
    newOrders: boolean;
    orderUpdates: boolean;
    lowStock: boolean;
    customerReviews: boolean;
    promotions: boolean;
    security: boolean;
  };
  integrations: {
    analyticsEnabled: boolean;
    analyticsKey: string;
    paymentsEnabled: boolean;
    paymentsKey: string;
    socialEnabled: boolean;
    socialAccounts: {
      facebook: string;
      twitter: string;
      instagram: string;
      linkedin: string;
    };
  };
}

// Default settings to use before loading from database
export const defaultSettings: SettingsState = {
  storeInfo: {
    name: 'Admin Dashboard Store',
    email: 'contact@example.com',
    phone: '+1 (555) 123-4567',
    website: 'https://example.com',
    address: '123 Commerce St, Suite 100, Cityville, State 12345',
    description: 'A premier online destination for quality products. We offer a wide selection of items to meet all your shopping needs.'
  },
  regionalSettings: {
    currency: 'usd',
    timezone: 'et'
  },
  appearance: {
    darkMode: false,
    condensedView: false,
    animations: true,
    accentColor: 'primary'
  },
  notifications: {
    newOrders: true,
    orderUpdates: true,
    lowStock: true,
    customerReviews: false,
    promotions: true,
    security: true
  },
  integrations: {
    analyticsEnabled: true,
    analyticsKey: 'UA-XXXXXXXXX-X',
    paymentsEnabled: true,
    paymentsKey: 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX',
    socialEnabled: true,
    socialAccounts: {
      facebook: 'https://facebook.com/adminstore',
      twitter: 'https://twitter.com/adminstore',
      instagram: 'https://instagram.com/adminstore',
      linkedin: 'https://linkedin.com/company/adminstore'
    }
  }
};

export type DBSettings = Database['public']['Tables']['settings']['Row'];

// Function to save settings using direct RPC call to bypass RLS
export async function saveSettingsDirect(settings: SettingsState, supabase: any) {
  try {
    console.log('Saving settings via direct method to bypass RLS');
    
    // Convert settings to a simple object for the RPC call
    const settingsData = { ...settings };
    
    // Call a stored procedure or use a direct SQL statement via RPC
    const { data, error } = await supabase.rpc('update_settings', {
      settings_json: settingsData
    });
    
    if (error) {
      console.error('Error in RPC call to update settings:', error);
      throw error;
    }
    
    console.log('Settings updated via RPC:', data);
    return { success: true, message: 'Settings updated successfully' };
  } catch (error) {
    console.error('Error in direct settings update:', error);
    
    // Fall back to the regular method if RPC fails
    console.log('Falling back to standard update method');
    return saveSettings(settings);
  }
}

// Function to save settings to the database
export async function saveSettings(settings: SettingsState) {
  try {
    // Make a copy of the settings
    const settingsJSON = JSON.parse(JSON.stringify(settings));

    // Check if settings already exist
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (fetchError) {
      throw new Error(`Error fetching settings: ${fetchError.message}`);
    }

    if (data && data.length > 0) {
      // Update existing settings
      const { error } = await supabase
        .from('settings')
        .update({ 
          settings_data: settingsJSON,
          updated_at: new Date().toISOString()
        })
        .eq('id', data[0].id);

      if (error) throw error;

      return { success: true, message: 'Settings updated successfully' };
    } else {
      // Create new settings
      const { error } = await supabase
        .from('settings')
        .insert({ 
          settings_data: settingsJSON,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true, message: 'Settings created successfully' };
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Function to load settings from the database
export async function loadSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('settings_data')
      .limit(1);

    if (error) throw error;

    return data?.[0]?.settings_data || {};
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

// Deep merge utility to ensure all required settings exist
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Function to save settings via Edge Function
export async function saveSettingsViaEdgeFunction(settings: SettingsState, supabase: any) {
  try {
    console.log('Saving settings via Edge Function');
    
    // Get the URL for the Edge Function
    const EDGE_FUNCTION_URL = 
      import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
      'https://hgddybhgcawokycncvgn.supabase.co/functions/v1/settings';
    
    // Get the current user's session for auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw new Error('Authentication error');
    }
    
    if (!session) {
      console.error('No active session found');
      throw new Error('User is not authenticated');
    }
    
    // Make the request to the Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ settings })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Edge Function error:', result);
      throw new Error(result.error || 'Unknown error in Edge Function');
    }
    
    console.log('Settings saved via Edge Function:', result);
    return { success: true, message: 'Settings saved successfully via Edge Function' };
  } catch (error) {
    console.error('Error in Edge Function call:', error);
    
    // Fall back to RPC method
    console.log('Edge Function failed, trying RPC method');
    return saveSettingsDirect(settings, supabase);
  }
}