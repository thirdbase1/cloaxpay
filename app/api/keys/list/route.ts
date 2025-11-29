import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys } = await supabase
      .from('api_keys')
      .select('*')
      .eq('merchant_id', user.id)
      .is('revoked_at', null);

    const secretKey = keys?.find(k => k.key_type === 'secret')?.key_value;

    return NextResponse.json({ 
      secretKey,
      keys: keys || []
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  }
}
