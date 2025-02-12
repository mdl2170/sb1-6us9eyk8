import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
}

interface RequestBody {
  jobId: string;
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          error: 'Invalid content type',
          message: 'Content-Type must be application/json'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const { jobId, url } = await req.json() as RequestBody;

    if (!jobId || !url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'Job ID and URL are required'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Extract company name and position from URL first
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const searchParams = new URLSearchParams(urlObj.search);

    // Initialize job data with defaults
    const jobData = {
      company_name: '',
      position_title: '',
      location: '',
      job_description: 'Please copy the job description from LinkedIn',
      company_url: '',
      work_type: 'onsite',
      company_size: 'enterprise',
      application_url: url
    };

    // Try to extract position and company from the URL path
    const jobSlug = pathParts.find(part => part.includes('-at-'));
    if (jobSlug) {
      const [title, company] = jobSlug.split('-at-').map(part => 
        part.replace(/-/g, ' ')
           .split(' ')
           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
           .join(' ')
      );
      
      if (title) jobData.position_title = title;
      if (company) jobData.company_name = company;
    }

    // Try to get data from search params
    const currentJobId = searchParams.get('currentJobId');
    if (currentJobId) {
      const title = searchParams.get('title');
      const company = searchParams.get('company');
      const location = searchParams.get('location');

      if (title) jobData.position_title = decodeURIComponent(title);
      if (company) jobData.company_name = decodeURIComponent(company);
      if (location) jobData.location = decodeURIComponent(location);
    }

    // Try to extract location from refId
    const refId = searchParams.get('refId');
    if (refId) {
      const decodedRef = decodeURIComponent(refId);
      const locationMatch = decodedRef.match(/location-(.*?)(?:-|$)/);
      if (locationMatch) {
        const location = locationMatch[1].replace(/-/g, ' ');
        if (!jobData.location) {
          jobData.location = location
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
    }

    // Determine work type from various sources
    const urlLower = url.toLowerCase();
    const titleLower = jobData.position_title.toLowerCase();
    const locationLower = jobData.location.toLowerCase();

    if (urlLower.includes('remote') || titleLower.includes('remote') || locationLower.includes('remote')) {
      jobData.work_type = 'remote';
    } else if (urlLower.includes('hybrid') || titleLower.includes('hybrid') || locationLower.includes('hybrid')) {
      jobData.work_type = 'hybrid';
    }

    // Determine company size
    const enterpriseCompanies = [
      'Microsoft', 'Google', 'Amazon', 'Apple', 'Meta', 'LinkedIn',
      'Oracle', 'Salesforce', 'IBM', 'Intel', 'Cisco', 'Adobe',
      'VMware', 'SAP', 'Intuit', 'ServiceNow'
    ];
    
    const companyLower = jobData.company_name.toLowerCase();
    if (enterpriseCompanies.some(company => companyLower.includes(company.toLowerCase()))) {
      jobData.company_size = 'enterprise';
    } else if (companyLower.includes('startup')) {
      jobData.company_size = 'startup';
    }

    return new Response(
      JSON.stringify(jobData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error parsing job URL:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Please enter the job details manually. LinkedIn job parsing is currently limited.'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
})