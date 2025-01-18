import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  smtp: {
    host: string
    port: number
    username: string
    password: string
    sender_email: string
    sender_name: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, smtp } = await req.json() as EmailRequest

    // Create SMTP client
    const client = new SmtpClient()

    // Connect to SMTP server
    await client.connectTLS({
      hostname: smtp.host,
      port: smtp.port,
      username: smtp.username,
      password: smtp.password,
    })

    // Send email
    await client.send({
      from: `${smtp.sender_name} <${smtp.sender_email}>`,
      to: to,
      subject: subject,
      content: html,
      html: html,
    })

    // Close connection
    await client.close()

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})