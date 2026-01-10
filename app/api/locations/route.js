import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const district = searchParams.get('district')

    if (!state) {
      return NextResponse.json(
        { error: 'State is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // If district is provided, get sub-locations for that district
    if (district) {
      const { data: subLocations, error } = await supabase
        .from('locations')
        .select('sub_location')
        .eq('state', state)
        .eq('district', district)
        .order('sub_location')

      if (error) {
        console.error('Error fetching sub-locations:', error)
        return NextResponse.json(
          { error: 'Failed to fetch sub-locations' },
          { status: 500 }
        )
      }

      const subLocationList = subLocations.map(loc => loc.sub_location)
      return NextResponse.json({ sub_locations: subLocationList })
    }

    // If no district, get all districts for the state
    const { data: districts, error } = await supabase
      .from('locations')
      .select('district')
      .eq('state', state)
      .not('district', 'is', null)
      .order('district')

    if (error) {
      console.error('Error fetching districts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch districts' },
        { status: 500 }
      )
    }

    // Get unique districts
    const uniqueDistricts = [...new Set(districts.map(d => d.district))]

    return NextResponse.json({ districts: uniqueDistricts })
  } catch (error) {
    console.error('Error in GET /api/locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    let { data: { user }, error: userError } = await supabase.auth.getUser()

    // If that fails, try to manually parse the cookie (fallback)
    if (userError || !user) {
      console.log('🔧 API /locations: Trying to manually parse auth cookie...')
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
      console.error('❌ API /locations: Unauthorized - user:', user ? 'exists' : 'none', 'error:', userError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { state, district, sub_location } = await request.json()

    if (!state || !district || !sub_location) {
      return NextResponse.json(
        { error: 'State, district, and sub-location are required' },
        { status: 400 }
      )
    }

    // Trim and validate
    const trimmedState = state.trim()
    const trimmedDistrict = district.trim()
    const trimmedSubLocation = sub_location.trim()

    if (!trimmedState || !trimmedDistrict || !trimmedSubLocation) {
      return NextResponse.json(
        { error: 'State, district, and sub-location cannot be empty' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for inserting locations
    const adminClient = createAdminClient()
    
    // Insert new location (will fail if duplicate due to UNIQUE constraint)
    const { data: newLocation, error } = await adminClient
      .from('locations')
      .insert({
        state: trimmedState,
        district: trimmedDistrict,
        sub_location: trimmedSubLocation,
      })
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This location already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating location:', error)
      return NextResponse.json(
        { error: 'Failed to create location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      location: newLocation,
      message: 'Location added successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
