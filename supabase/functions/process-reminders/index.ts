import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Reminder {
  id: string
  task_id: string
  reminder_type: 'due_date' | 'two_days_before'
  scheduled_for: string
  task: {
    title: string
    description: string
    due_date: string
    assignee: string
  }
  assignee_profile: {
    email: string
    full_name: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get due reminders that haven't been sent yet
    const { data: reminders, error: fetchError } = await supabaseClient
      .from('task_reminders')
      .select(`
        id,
        task_id,
        reminder_type,
        scheduled_for,
        task:tasks (
          title,
          description,
          due_date,
          assignee
        ),
        assignee_profile:profiles (
          email,
          full_name
        )
      `)
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for')

    if (fetchError) throw fetchError

    const processedReminders: string[] = []
    
    for (const reminder of (reminders as Reminder[])) {
      try {
        // Send email using your email service
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Task Manager <notifications@yourdomain.com>',
            to: reminder.assignee_profile.email,
            subject: reminder.reminder_type === 'due_date'
              ? `Task Due Today: ${reminder.task.title}`
              : `Task Due in 2 Days: ${reminder.task.title}`,
            html: `
              <h2>Task Reminder</h2>
              <p>Hello ${reminder.assignee_profile.full_name},</p>
              <p>This is a reminder about your task:</p>
              <h3>${reminder.task.title}</h3>
              ${reminder.task.description ? `<p>${reminder.task.description}</p>` : ''}
              <p><strong>Due Date:</strong> ${new Date(reminder.task.due_date).toLocaleDateString()}</p>
              <p>Please make sure to complete this task on time.</p>
            `,
          }),
        })

        if (!emailResponse.ok) {
          throw new Error(`Failed to send email: ${emailResponse.statusText}`)
        }

        // Mark reminder as sent
        const { error: updateError } = await supabaseClient
          .from('task_reminders')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', reminder.id)

        if (updateError) throw updateError

        processedReminders.push(reminder.id)
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        processedReminders,
        message: `Successfully processed ${processedReminders.length} reminders`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})