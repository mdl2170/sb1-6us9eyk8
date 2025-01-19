import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .order('full_name');

  if (error) {
    throw error;
  }

  return data || [];
} 