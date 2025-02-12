import { supabase } from './supabase';

interface ParsedJobData {
  company_name?: string;
  position_title?: string;
  company_size?: string;
  location?: string;
  job_description?: string;
  company_url?: string;
  work_type?: string;
}

export async function parseJobUrl(url: string): Promise<ParsedJobData> {
  try {
    if (!url.includes('linkedin.com/jobs')) {
      throw new Error('Only LinkedIn job URLs are supported at this time');
    }

    // Extract job ID from LinkedIn URL
    const jobId = extractLinkedInJobId(url);
    if (!jobId) {
      throw new Error('Invalid LinkedIn job URL');
    }

    try {
      // Call LinkedIn API via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('parse-job-posting', {
        body: { 
          jobId,
          url 
        }
      });

      if (error) throw error;
      return data;
    } catch (functionError) {
      // If Edge Function fails, extract what we can from the URL
      return extractJobDataFromUrl(url);
    }
  } catch (error) {
    console.error('Error parsing job URL:', error);
    throw error;
  }
}

function extractJobDataFromUrl(url: string): ParsedJobData {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const searchParams = new URLSearchParams(urlObj.search);
  
  // Initialize job data with defaults
  const jobData: ParsedJobData = {
    company_name: '',
    position_title: '',
    location: '',
    work_type: 'onsite',
    company_size: 'enterprise'
  };

  // Try to extract position title
  const titleFromPath = pathParts.find(part => part.includes('-at-'));
  if (titleFromPath) {
    jobData.position_title = titleFromPath
      .split('-at-')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Try to extract company name
  if (titleFromPath) {
    jobData.company_name = titleFromPath
      .split('-at-')[1]
      ?.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  return jobData;
}

function extractLinkedInJobId(url: string): string | null {
  // Handle various LinkedIn URL formats
  const patterns = [
    /linkedin\.com\/jobs\/view\/(\d+)/,
    /linkedin\.com\/jobs\/search\/.*&currentJobId=(\d+)/,
    /linkedin\.com\/jobs\/collections\/.*&currentJobId=(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}