import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

// Job board parsers
const PARSERS = {
  'linkedin.com': parseLinkedIn,
  'joinhandshake.com': parseHandshake,
  'indeed.com': parseIndeed,
  'builtinnyc.com': parseBuiltInNYC,
  'themuse.com': parseTheMuse,
  'untapped.io': parseUntapped,
  'wayup.com': parseWayUp,
  'ripplematch.com': parseRippleMatch,
  'simplify.jobs': parseSimplify
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

interface RequestBody {
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

function getJobBoardParser(url: string): Function {
  for (const [domain, parser] of Object.entries(PARSERS)) {
    if (url.includes(domain)) {
      return parser;
    }
  }
  throw new Error('Unsupported job board');
}

async function parseHandshake(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.style__employer___1CCz0')?.textContent?.trim(),
      position_title: doc.querySelector('.style__title___FQ3JT')?.textContent?.trim(),
      location: doc.querySelector('.style__location___1_3eB')?.textContent?.trim(),
      job_description: doc.querySelector('.style__description___2u-E8')?.textContent?.trim(),
      company_url: doc.querySelector('.style__employer-url___2qkv9')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.style__workplace___2W_DE')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing Handshake job:', error);
    throw error;
  }
}

async function parseIndeed(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.indeed.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    // Extract job title
    const jobTitle = doc.querySelector('h2[data-testid="simpler-jobTitle"]')?.textContent?.trim();

    // Extract company name
    const companyName = doc.querySelector('.jobsearch-JobInfoHeader-companyNameLink')?.textContent?.trim();

    // Extract location and work type
    const locationContainer = doc.querySelector('.css-xb6x8x');
    let location = '';
    let workType = 'onsite';

    if (locationContainer) {
      const locationText = locationContainer.textContent || '';
      const parts = locationText.split('•').map(part => part.trim());
      location = parts[0];
      
      // Check for remote/hybrid indicators
      const lowerText = locationText.toLowerCase();
      if (lowerText.includes('remote')) {
        workType = 'remote';
      } else if (lowerText.includes('hybrid')) {
        workType = 'hybrid';
      }
    }

    // Extract job description
    const description = doc.querySelector('#jobDescriptionText')?.textContent?.trim();

    // Determine company size from description
    const companySize = determineCompanySize(description || '');

    // Get company URL if available
    const companyUrl = doc.querySelector('.jobsearch-JobInfoHeader-companyNameLink')?.getAttribute('href');

    return {
      company_name: companyName,
      position_title: jobTitle,
      location: location,
      job_description: description,
      company_size: companySize,
      company_url: companyUrl,
      work_type: workType
    };
  } catch (error) {
    console.error('Error parsing Indeed job:', error);
    throw error;
  }
}

async function parseBuiltInNYC(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.company-title')?.textContent?.trim(),
      position_title: doc.querySelector('.job-title')?.textContent?.trim(),
      location: doc.querySelector('.job-location')?.textContent?.trim(),
      job_description: doc.querySelector('.job-description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-info')?.textContent || ''),
      company_url: doc.querySelector('.company-link')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.job-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing BuiltInNYC job:', error);
    throw error;
  }
}

async function parseTheMuse(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.company-info h2')?.textContent?.trim(),
      position_title: doc.querySelector('.job-header h1')?.textContent?.trim(),
      location: doc.querySelector('.location-wrapper')?.textContent?.trim(),
      job_description: doc.querySelector('.job-description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-info')?.textContent || ''),
      company_url: doc.querySelector('.company-link')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.job-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing The Muse job:', error);
    throw error;
  }
}

async function parseUntapped(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.company-name')?.textContent?.trim(),
      position_title: doc.querySelector('.job-title')?.textContent?.trim(),
      location: doc.querySelector('.job-location')?.textContent?.trim(),
      job_description: doc.querySelector('.job-description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-details')?.textContent || ''),
      company_url: doc.querySelector('.company-website')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.job-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing Untapped job:', error);
    throw error;
  }
}

async function parseWayUp(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.employer-name')?.textContent?.trim(),
      position_title: doc.querySelector('.job-title')?.textContent?.trim(),
      location: doc.querySelector('.location')?.textContent?.trim(),
      job_description: doc.querySelector('.description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-info')?.textContent || ''),
      company_url: doc.querySelector('.company-website')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.job-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing WayUp job:', error);
    throw error;
  }
}

async function parseRippleMatch(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.company-name')?.textContent?.trim(),
      position_title: doc.querySelector('.position-title')?.textContent?.trim(),
      location: doc.querySelector('.location')?.textContent?.trim(),
      job_description: doc.querySelector('.job-description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-info')?.textContent || ''),
      company_url: doc.querySelector('.company-link')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.work-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing RippleMatch job:', error);
    throw error;
  }
}

async function parseSimplify(url: string): Promise<JobData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    return {
      company_name: doc.querySelector('.company-name')?.textContent?.trim(),
      position_title: doc.querySelector('.job-title')?.textContent?.trim(),
      location: doc.querySelector('.location')?.textContent?.trim(),
      job_description: doc.querySelector('.description')?.textContent?.trim(),
      company_size: determineCompanySize(doc.querySelector('.company-details')?.textContent || ''),
      company_url: doc.querySelector('.company-link')?.getAttribute('href'),
      work_type: determineWorkType(doc.querySelector('.job-type')?.textContent || '')
    };
  } catch (error) {
    console.error('Error parsing Simplify job:', error);
    throw error;
  }
}

async function parseLinkedIn(url: string): Promise<JobData> {
  return scrapeLinkedInJob(url);
}

function determineWorkType(text: string): string {
  text = text.toLowerCase();
  if (text.includes('remote')) return 'remote';
  if (text.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function determineCompanySize(text: string): string {
  text = text.toLowerCase();
  if (text.includes('1-50') || text.includes('51-200')) return 'startup';
  if (text.includes('201-500')) return 'small';
  if (text.includes('501-1000') || text.includes('1001-5000')) return 'midsize';
  if (text.includes('5001-10000')) return 'large';
  return 'enterprise';
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
      throw new Error('URL is required');
    }

    const parser = getJobBoardParser(url);
    const jobData = await parser(url);

    // Return parsed job data
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
        message: 'Failed to parse job details. Please enter the details manually.'
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