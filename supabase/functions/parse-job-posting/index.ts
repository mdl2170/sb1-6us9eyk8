import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

interface RequestBody {
  jobId: string;
  url: string;
}

interface JobData {
  company_name?: string;
  position_title?: string;
  company_size?: string;
  location?: string;
  job_description?: string;
  company_url?: string;
  work_type?: string;
}

async function scrapeLinkedInJob(url: string): Promise<JobData> {
  try {
    // Fetch the job page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job page: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    // Extract job details
    const jobData: JobData = {};

    // Position title
    const titleElement = doc.querySelector('h1');
    if (titleElement) {
      jobData.position_title = titleElement.textContent.trim();
    }

    // Company name and URL
    const companyElement = doc.querySelector('[data-tracking-control-name="public_jobs_topcard-org-name"]');
    if (companyElement) {
      jobData.company_name = companyElement.textContent.trim();
      
      // Get company URL from href attribute
      const href = companyElement.getAttribute('href');
      if (href) {
        jobData.company_url = href;
        
        // Try to fetch company size from company page
        try {
          const companyResponse = await fetch(href);
          if (companyResponse.ok) {
            const companyHtml = await companyResponse.text();
            const companyDoc = parser.parseFromString(companyHtml, 'text/html');
            
            if (companyDoc) {
              const employeeCountElement = companyDoc.querySelector('.org-about-company-module__company-staff-count-range');
              if (employeeCountElement) {
                const employeeCount = employeeCountElement.textContent.trim().toLowerCase();
                
                // Map employee count ranges to company sizes
                if (employeeCount.includes('1-50') || employeeCount.includes('51-200')) {
                  jobData.company_size = 'startup';
                } else if (employeeCount.includes('201-500')) {
                  jobData.company_size = 'small';
                } else if (employeeCount.includes('501-1000') || employeeCount.includes('1001-5000')) {
                  jobData.company_size = 'midsize';
                } else if (employeeCount.includes('5001-10000')) {
                  jobData.company_size = 'large';
                } else {
                  jobData.company_size = 'enterprise';
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching company details:', error);
        }
      }
    }

    // Location
    const locationElement = doc.querySelector('.job-details-jobs-unified-top-card__bullet');
    if (locationElement) {
      jobData.location = locationElement.textContent.trim();
    }

    // Job description
    const descriptionElement = doc.querySelector('.show-more-less-html__markup');
    if (descriptionElement) {
      jobData.job_description = descriptionElement.textContent.trim();
    }

    // Work type (look for keywords in description)
    const description = jobData.job_description?.toLowerCase() || '';
    if (description.includes('remote')) {
      jobData.work_type = 'remote';
    } else if (description.includes('hybrid')) {
      jobData.work_type = 'hybrid';
    } else {
      jobData.work_type = 'onsite';
    }

    // If we couldn't determine company size from the company page,
    // try to determine from company name or description
    if (!jobData.company_size) {
      const enterpriseCompanies = [
        'microsoft', 'google', 'amazon', 'apple', 'meta', 'facebook',
        'oracle', 'salesforce', 'ibm', 'intel', 'cisco', 'adobe',
        'vmware', 'sap', 'intuit', 'servicenow'
      ];
      
      const companyNameLower = jobData.company_name?.toLowerCase() || '';
      const isEnterprise = enterpriseCompanies.some(company => 
        companyNameLower.includes(company)
      );
      
      if (isEnterprise) {
        jobData.company_size = 'enterprise';
      } else if (description.includes('startup')) {
        jobData.company_size = 'startup';
      } else {
        jobData.company_size = 'midsize'; // Default to midsize
      }
    }

    return jobData;
  } catch (error) {
    console.error('Error scraping LinkedIn job:', error);
    throw error;
  }
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

    const { url } = await req.json() as RequestBody;

    if (!url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'URL is required'
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

    // Scrape job details
    const jobData = await scrapeLinkedInJob(url);

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
        message: 'Failed to parse LinkedIn job details. Please enter the details manually.'
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