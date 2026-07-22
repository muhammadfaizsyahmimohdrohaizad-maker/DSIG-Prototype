import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization token');

    const { apiKey } = await req.json();
    if (!apiKey) throw new Error('API key is required.');

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user making the request
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) throw new Error('Unauthorized.');

    // Grab the encryption secret
    const secretPassphrase = Deno.env.get('DB_ENCRYPTION_SECRET');
    if (!secretPassphrase) throw new Error('Encryption secret is missing on server.');

    // Call the SQL RPC to encrypt and save
    const { error: rpcError } = await supabaseAdmin.rpc('save_user_api_key', {
      api_key: apiKey,
      secret_passphrase: secretPassphrase
    });

    if (rpcError) throw new Error(rpcError.message);

    return new Response(JSON.stringify({ success: true, message: 'Key encrypted and saved successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});