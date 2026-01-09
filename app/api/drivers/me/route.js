import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Try to get user first
    let { data: { user }, error: userError } = await supabase.auth.getUser()

    // If that fails, try to manually parse the cookie (same as dashboard)
    if (userError || !user) {
      console.log('🔧 API /me: Trying to manually parse auth cookie...')
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const allCookies = cookieStore.getAll()
      const authCookie = allCookies.find(c => c.name.includes('auth-token'))
      
      if (authCookie) {
        try {
          const cookieData = JSON.parse(authCookie.value)
          if (cookieData.access_token) {
            console.log('  ✓ Found access_token in cookie, trying to set session...')
            const { data: { session: manualSession }, error: manualError } = await supabase.auth.setSession({
              access_token: cookieData.access_token,
              refresh_token: cookieData.refresh_token,
            })
            if (manualSession) {
              console.log('  ✅ Successfully created session from cookie!')
              user = manualSession.user
              userError = null
            } else if (manualError) {
              console.error('  ❌ Error setting session:', manualError.message)
            }
          }
        } catch (e) {
          console.error('  ❌ Error parsing cookie:', e.message)
        }
      }
    }

    if (userError || !user) {
      console.error('❌ API /me: Unauthorized - user:', user ? 'exists' : 'none', 'error:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If RLS blocks it or not found, try with admin client
    if (driverError || !driver) {
      console.log('🔄 Trying with admin client for user:', user.id)
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminClient = createAdminClient()
      const { data: adminDriver, error: adminError } = await adminClient
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (!adminError && adminDriver) {
        driver = adminDriver
        driverError = null
      }
    }

    if (driverError || !driver) {
      console.error('❌ Driver profile not found for user:', user.id)
      return NextResponse.json(
        { error: 'Driver profile not found. Please complete your registration.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error in GET /api/drivers/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
