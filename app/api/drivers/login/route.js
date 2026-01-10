import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Validate phone format
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits' },
        { status: 400 }
      )
    }

    // First, find driver by phone to get user_id
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()
    
    const { data: driverByPhone, error: driverByPhoneError } = await adminClient
      .from('drivers')
      .select('user_id, phone')
      .eq('phone', phone)
      .single()

    if (driverByPhoneError || !driverByPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    // Get user email from auth using user_id
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(driverByPhone.user_id)
    
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 401 }
      )
    }

    const userEmail = userData.user.email // This will be phone@heyauto.local

    // Use admin client to sign in via admin API (more reliable for cookie handling)
    // First try regular auth, then handle session manually
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Will be handled manually below
          },
        },
      }
    )
    
    console.log('🔐 API Login: Attempting sign in for phone:', phone)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    })

    if (authError) {
      console.error('❌ API Login error:', authError.message)
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    if (!authData.session) {
      console.error('❌ No session from signIn!')
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    console.log('✅ API Login: Auth successful, user ID:', authData.user?.id)
    const finalSession = authData.session

    // Get driver profile using admin client directly (RLS might block regular client)
    console.log('🔍 Looking up driver with user_id:', authData.user.id)
    const { data: driverProfile, error: driverProfileError } = await adminClient
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle() // Use maybeSingle() instead of single() to avoid PGRST116 error

    console.log('🔍 Driver query result:', driverProfile ? `Found: ${driverProfile.name}` : 'Not found')
    if (driverProfileError) {
      console.error('🔍 Driver query error:', driverProfileError.code, driverProfileError.message)
    }

    if (driverProfileError || !driverProfile) {
      console.error('❌ API Login: Driver profile error:', driverProfileError?.message || 'No driver found')
      console.error('❌ User ID:', authData.user.id)
      console.error('❌ Error code:', driverProfileError?.code)
      
      return NextResponse.json(
        { error: 'Driver profile not found. Please register your auto first.' },
        { status: 404 }
      )
    }

    console.log('✅ API Login: Driver found:', driverProfile.name)
    
    // Create JSON response and manually set cookies
    const jsonResponse = NextResponse.json({
      driver: driverProfile,
      message: 'Login successful'
    })
    
    // Extract project ref from URL for cookie name
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set!')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    try {
      const url = new URL(supabaseUrl)
      const projectRef = url.hostname.split('.')[0]
      const authCookieName = `sb-${projectRef}-auth-token`
      
      // Set the auth cookie manually
      jsonResponse.cookies.set(authCookieName, JSON.stringify({
        access_token: finalSession.access_token,
        refresh_token: finalSession.refresh_token,
        expires_at: finalSession.expires_at,
        expires_in: finalSession.expires_in,
        token_type: finalSession.token_type,
        user: finalSession.user,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      console.log('✅ Set auth cookie:', authCookieName)
    } catch (error) {
      console.error('❌ Error setting cookies:', error)
    }
    
    const finalCookies = jsonResponse.cookies.getAll()
    console.log('📤 API Login: Response sent with', finalCookies.length, 'cookies')
    finalCookies.forEach(c => {
      console.log('  - Cookie:', c.name)
    })
    
    return jsonResponse
  } catch (error) {
    console.error('Error in POST /api/drivers/login:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
