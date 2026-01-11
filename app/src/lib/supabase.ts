import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  document_id: string;
  user_id: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  summary: string;
  flagged_clauses: FlaggedClause[];
  route_used: 'FAST_LANE' | 'DEEP_DIVE';
  created_at: string;
}

export interface FlaggedClause {
  id: string;
  type: string;
  original_text: string;
  risk_rating: 'Low' | 'Medium' | 'High';
  explanation: string;
  suggested_edit: string;
}

// Lazy initialization for build compatibility
let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export const supabase = {
  get auth() {
    if (!supabaseClient) {
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseClient.auth;
  },
  get storage() {
    if (!supabaseClient) {
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseClient.storage;
  },
  from(table: string) {
    if (!supabaseClient) {
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseClient.from(table);
  }
};

export function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabaseAdminClient;
}

// Auth helpers
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Storage helpers
export async function uploadDocument(file: File, userId: string) {
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('legal-docs')
    .upload(fileName, file);
  return { data, error, fileName };
}

// Document helpers
export async function saveDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();
  return { data, error };
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*, analyses(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

// Analysis helpers
export async function saveAnalysis(analysis: Omit<Analysis, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('analyses')
    .insert(analysis)
    .select()
    .single();
  return { data, error };
}

export async function getAnalysis(documentId: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('document_id', documentId)
    .single();
  return { data, error };
}
