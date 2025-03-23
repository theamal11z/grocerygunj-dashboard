// Follow this setup guide to integrate the Deno standard library
// https://github.com/denoland/deno_std/tree/main/http

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

// This Edge Function allows admins to bypass RLS and update settings directly
serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers });
    }

    // Verify this is a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers }
      );
    }

    // Get request body
    const body = await req.json();
    const { settings } = body;

    // Verify settings are provided
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'No settings provided' }),
        { status: 400, headers }
      );
    }

    // Create supabase admin client to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing settings record
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Error fetching settings: ${fetchError.message}` }),
        { status: 500, headers }
      );
    }

    let result;
    
    if (data && data.length > 0) {
      // Update existing settings
      const { data: updateData, error } = await supabase
        .from('settings')
        .update({
          settings_data: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', data[0].id)
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: `Error updating settings: ${error.message}` }),
          { status: 500, headers }
        );
      }
      
      result = { message: 'Settings updated successfully', data: updateData };
    } else {
      // Create new settings
      const { data: insertData, error } = await supabase
        .from('settings')
        .insert({
          settings_data: settings,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: `Error creating settings: ${error.message}` }),
          { status: 500, headers }
        );
      }
      
      result = { message: 'Settings created successfully', data: insertData };
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { status: 500 }
    );
  }
}); 