import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Get auth token from header or cookie
    let token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // Try to find the Supabase auth token from cookies
      const cookies = req.cookies;
      for (const [name, cookie] of cookies.getAll().map(c => [c.name, c.value])) {
        if (name.includes('auth-token') || name.includes('sb-') && name.includes('auth')) {
          try {
            const parsed = JSON.parse(cookie as string);
            if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          } catch {
            // Not JSON, might be the token directly
            if ((cookie as string).startsWith('ey')) {
              token = cookie as string;
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'No auth token found' }, { status: 401 });
    }

    // Verify the token
    const authClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    // Validate
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large (max ${isVideo ? '20MB' : '10MB'})` }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    // Upload with service role (bypasses RLS)
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    
    const admin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from('photos').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('photos').getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
