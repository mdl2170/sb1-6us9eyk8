import { supabase } from './supabase';

const SUPPORTED_JOB_BOARDS = [
  'linkedin.com',
  'joinhandshake.com',
  'indeed.com',
  'builtinnyc.com',
  'themuse.com',
  'untapped.io',
  'wayup.com',
  'ripplematch.com',
  'simplify.jobs'
];

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
    // Check if URL is from a supported job board
    const isSupported = SUPPORTED_JOB_BOARDS.some(board => url.includes(board));
    if (!isSupported) {
      throw new Error('Unsupported job board. Currently supported job boards: ' + 
        SUPPORTED_JOB_BOARDS.map(board => board.replace('.com', '')).join(', '));
    }

    // Call Edge Function to parse job posting
    const { data, error } = await supabase.functions.invoke('parse-job-posting', {
      body: { url }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error parsing job posting:', error);
    throw error;
  }
}