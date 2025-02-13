import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface EmailRecord {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  retry_count: number;
}

async function getResendApiKey(supabaseClient: any): Promise<string> {
  const { data, error } = await supabaseClient
    .from('app_config')
    .select('key, value')
    .eq('key', 'resend_api_key')
    .single();

  if (error) throw error;
  return data.value;
}

// Helper function to add delay between requests
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let processedCount = 0;
    let successCount = 0;

    // Get Resend API key
    const resendApiKey = await getResendApiKey(supabaseClient);

    // Get pending emails
    const { data: emails, error: emailsError } = await supabaseClient
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .is('next_retry_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (emailsError) throw emailsError;

    if (emails && emails.length > 0) {
      // Process emails
      for (const email of emails) {
        // Add delay between requests (500ms = 2 requests per second)
        await sleep(500);

        try {
          processedCount++;

          // Update status to processing
          await supabaseClient
            .from('email_queue')
            .update({ status: 'processing' })
            .eq('id', email.id);

          // Send email using Resend
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'CPI SMS <notifications@careerpassinstitute.com>',
              to: email.to_email,
              subject: email.subject,
              html: email.body
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Resend API error: ${error.message}`);
          }

          // Mark as sent
          const { error: updateError } = await supabaseClient
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', email.id);
          
          successCount++;

          if (updateError) {
            throw new Error(`Failed to update email status: ${updateError.message}`);
          }

        } catch (error) {
          console.error(`Failed to send email ${email.id}:`, error);

          // Update email status
          await supabaseClient
            .from('email_queue')
            .update({
              status: email.retry_count >= 3 ? 'failed' : 'pending',
              error_message: error.message,
              retry_count: email.retry_count + 1,
              next_retry_at: email.retry_count < 3 
                ? new Date(Date.now() + Math.pow(2, email.retry_count) * 3600000).toISOString()
                : null
            })
            .eq('id', email.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email queue processed successfully',
        processed: processedCount || 0,
        successful: successCount || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing email queue:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})