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
      console.log('🔧 API /location: Trying to manually parse auth cookie...')
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
      console.error('❌ API /location: Unauthorized - user:', user ? 'exists' : 'none', 'error:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📝 API /location: Received request body:', body)
    const { state, district, sub_location, is_active } = body

    if (!state || !district || !sub_location) {
      console.error('❌ API /location: Missing required fields - state:', state, 'district:', district, 'sub_location:', sub_location)
      return NextResponse.json(
        { error: 'State, district, and sub-location are required' },
        { status: 400 }
      )
    }

    // Validate is_active if provided
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      console.error('❌ API /location: Invalid is_active type:', typeof is_active)
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    console.log('🔄 API /location: Updating location for user:', user.id, 'to:', state, district, sub_location, 'is_active:', is_active)
    
    // Use admin client to bypass RLS (same as status update)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()
    
    // Build update object
    const updateData = { 
      active_state: state, 
      active_district: district,
      active_location: sub_location 
    }
    
    // Add is_active to update if provided
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }
    
    const { data: driver, error: driverError } = await adminClient
      .from('drivers')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (driverError) {
      console.error('❌ API /location: Update error:', driverError.message)
      console.error('❌ API /location: Error code:', driverError.code)
      return NextResponse.json(
        { error: driverError.message || 'Failed to update location' },
        { status: 400 }
      )
    }

    if (!driver) {
      console.error('❌ API /location: No driver returned after update')
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    console.log('✅ API /location: Successfully updated location for driver:', driver.name)

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error in PATCH /api/drivers/location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
