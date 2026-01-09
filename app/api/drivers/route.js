import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const district = searchParams.get('district')
    const sub_location = searchParams.get('sub_location')

    if (!state || !district || !sub_location) {
      return NextResponse.json(
        { error: 'State, district, and sub-location are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, name, phone, auto_registration_number, photo_url')
      .eq('is_active', true)
      .eq('active_state', state)
      .eq('active_district', district)
      .eq('active_location', sub_location)

    if (error) {
      console.error('Error fetching drivers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch drivers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ drivers: drivers || [] })
  } catch (error) {
    console.error('Error in GET /api/drivers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
