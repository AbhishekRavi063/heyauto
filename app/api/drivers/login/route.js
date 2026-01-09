import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create response that will hold cookies - following middleware pattern
    let supabaseResponse = NextResponse.next({
      request,
    })
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSetArray) {
            console.log('🍪 Supabase setAll called with', cookiesToSetArray.length, 'cookies')
            cookiesToSetArray.forEach(({ name, value, options }) => {
              console.log('  - Setting cookie:', name, 'value length:', value?.length)
              // Update request cookies
              request.cookies.set(name, value)
              // Recreate response and set cookies on it (middleware pattern)
              supabaseResponse = NextResponse.next({
                request,
              })
              supabaseResponse.cookies.set(name, value, options || {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
              console.log('    ✓ Cookie set in response:', name)
            })
          },
        },
      }
    )
    
    console.log('🔐 API Login: Attempting sign in for:', email)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('❌ API Login error:', authError.message)
      // Provide more detailed error message
      let errorMessage = 'Invalid email or password'
      if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email before logging in'
      } else if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else {
        errorMessage = authError.message
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }

    console.log('✅ API Login: Auth successful, user ID:', authData.user?.id)
    console.log('🔍 Session from signIn:', authData.session ? 'exists' : 'none')
    
    // Force Supabase to set cookies by calling getSession
    // This should trigger the setAll callback
    const { data: { session: finalSession }, error: sessionError } = await supabase.auth.getSession()
    console.log('🔍 Session from getSession:', finalSession ? 'exists' : 'none')
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message)
    }
    
    // Also call getUser to ensure cookies are set
    await supabase.auth.getUser()
    
    // Check cookies in supabaseResponse
    const cookiesAfterAuth = supabaseResponse.cookies.getAll()
    console.log('🍪 After auth calls: Response has', cookiesAfterAuth.length, 'cookies')
    cookiesAfterAuth.forEach(c => {
      console.log('  - Cookie in response:', c.name)
    })

    // After sign in, the session should be available
    // Get driver profile - try with regular client first, then admin client
    let { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    console.log('🔍 Driver query result:', driver ? `Found: ${driver.name}` : 'Not found')
    if (driverError) {
      console.log('🔍 Driver query error:', driverError.code, driverError.message)
    }

    // If not found or RLS blocks it, try with admin client
    if ((driverError || !driver) && driverError?.code !== 'PGRST116') {
      console.log('🔄 Trying with admin client...')
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminClient = createAdminClient()
      const { data: adminDriver, error: adminError } = await adminClient
        .from('drivers')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()
      
      if (!adminError && adminDriver) {
        console.log('✅ Found driver with admin client:', adminDriver.name)
        driver = adminDriver
        driverError = null
      } else if (adminError) {
        console.error('❌ Admin client error:', adminError.code, adminError.message)
      }
    }

    if (driverError || !driver) {
      console.error('❌ API Login: Driver profile error:', driverError?.message || 'No driver found')
      console.error('❌ User ID:', authData.user.id)
      console.error('❌ Error code:', driverError?.code)
      
      // Provide more helpful error message
      let errorMessage = 'Driver profile not found. Please register your auto first.'
      if (driverError?.code === 'PGRST116') {
        errorMessage = 'Driver profile not found. Please complete your registration.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }

    console.log('✅ API Login: Driver found:', driver.name)

    // Use the session we already have from signIn
    if (!finalSession) {
      console.error('❌ No session available!')
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }
    
    console.log('🔍 Using session with access token length:', finalSession.access_token?.length)
    
    // Extract project ref from URL for cookie name
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set!')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    let projectRef
    try {
      const url = new URL(supabaseUrl)
      projectRef = url.hostname.split('.')[0]
    } catch (error) {
      console.error('❌ Error parsing Supabase URL:', error)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const authCookieName = `sb-${projectRef}-auth-token`
    const authCookieValue = JSON.stringify({
      access_token: finalSession.access_token,
      refresh_token: finalSession.refresh_token,
      expires_at: finalSession.expires_at,
      expires_in: finalSession.expires_in,
      token_type: finalSession.token_type,
      user: finalSession.user,
    })
    
    console.log('🔧 Setting cookie:', authCookieName, 'value length:', authCookieValue.length)
    
    // Create JSON response
    const jsonResponse = NextResponse.json({
      driver,
      message: 'Login successful'
    })
    
    // Copy ALL cookies from supabaseResponse (Supabase SSR sets these correctly)
    const supabaseCookies = supabaseResponse.cookies.getAll()
    console.log('📤 API Login: Found', supabaseCookies.length, 'cookies in supabaseResponse')
    supabaseCookies.forEach(cookie => {
      // Get the cookie options from supabaseResponse
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
      console.log('  ✓ Set cookie:', cookie.name)
    })
    
    // If Supabase didn't set cookies (shouldn't happen), fallback to manual setting
    if (supabaseCookies.length === 0 && finalSession) {
      console.warn('⚠️  No cookies from Supabase, setting manually')
      jsonResponse.cookies.set(authCookieName, authCookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
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
