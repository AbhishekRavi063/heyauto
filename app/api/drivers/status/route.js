import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request) {
  try {
    const supabase = await createClient()

    // Try to get user first
    let { data: { user }, error: userError } = await supabase.auth.getUser()

    // If that fails, try to manually parse the cookie (same as dashboard)
    if (userError || !user) {
      console.log('🔧 API /status: Trying to manually parse auth cookie...')
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
      console.error('❌ API /status: Unauthorized - user:', user ? 'exists' : 'none', 'error:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { is_active } = body
    
    console.log('📝 API /status: Received request body:', body)
    console.log('📝 API /status: is_active value:', is_active, 'type:', typeof is_active)

    if (typeof is_active !== 'boolean') {
      console.error('❌ API /status: Invalid is_active type:', typeof is_active)
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    console.log('🔄 API /status: Updating driver status for user:', user.id, 'to:', is_active)
    
    // Use admin client directly to bypass RLS (safer for updates)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()
    
    // First check if driver exists
    const { data: existingDriver, error: checkError } = await adminClient
      .from('drivers')
      .select('id, is_active')
      .eq('user_id', user.id)
      .single()
    
    if (checkError || !existingDriver) {
      console.error('❌ API /status: Driver not found for user:', user.id)
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ API /status: Driver found, current status:', existingDriver.is_active)
    
    // Update using admin client
    const { data: driver, error: driverError } = await adminClient
      .from('drivers')
      .update({ is_active })
      .eq('user_id', user.id)
      .select()
      .single()

    if (driverError) {
      console.error('❌ API /status: Update error:', driverError.message)
      console.error('❌ API /status: Error code:', driverError.code)
      return NextResponse.json(
        { error: driverError.message || 'Failed to update status' },
        { status: 400 }
      )
    }

    if (!driver) {
      console.error('❌ API /status: No driver returned after update')
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    console.log('✅ API /status: Successfully updated driver:', driver.name, 'is_active:', driver.is_active)
    return NextResponse.json({ driver })

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error in PATCH /api/drivers/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
