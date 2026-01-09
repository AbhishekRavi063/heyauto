import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Try to get user first
    let { data: { user }, error: userError } = await supabase.auth.getUser()

    // If that fails, try to manually parse the cookie
    if (userError || !user) {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const allCookies = cookieStore.getAll()
      const authCookie = allCookies.find(c => c.name.includes('auth-token'))
      
      if (authCookie) {
        try {
          const cookieData = JSON.parse(authCookie.value)
          if (cookieData.access_token) {
            const { data: { session: manualSession } } = await supabase.auth.setSession({
              access_token: cookieData.access_token,
              refresh_token: cookieData.refresh_token,
            })
            if (manualSession) {
              user = manualSession.user
            }
          }
        } catch (e) {
          console.error('Error parsing cookie:', e.message)
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get signed URL for the license image (private bucket)
    const { data, error } = await supabase.storage
      .from('license-images')
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json(
        { error: 'Failed to get license image' },
        { status: 500 }
      )
    }

    // Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    console.error('Error in GET /api/drivers/license-image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
