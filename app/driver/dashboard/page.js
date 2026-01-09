import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import DriverDashboard from '@/components/DriverDashboard'

export default async function DriverDashboardPage() {
  console.log('📄 Dashboard page loading...')
  const supabase = await createClient()
  
  // Check cookies first
  const cookies = await import('next/headers').then(m => m.cookies())
  const allCookies = cookies.getAll()
  console.log('🍪 Dashboard: Found', allCookies.length, 'cookies')
  allCookies.forEach(cookie => {
    if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      console.log('  - Auth cookie:', cookie.name, 'length:', cookie.value.length)
      // Try to parse the cookie value
      try {
        const parsed = JSON.parse(cookie.value)
        console.log('    ✓ Cookie is valid JSON, has access_token:', !!parsed.access_token)
      } catch (e) {
        console.log('    ✗ Cookie is not valid JSON:', e.message)
      }
    }
  })
  
  // Try to manually parse the cookie if Supabase can't read it
  let session = null
  let user = null
  
  // First, try Supabase's built-in method
  const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
  console.log('🔍 Dashboard: Session check:', supabaseSession ? `Session exists (user: ${supabaseSession.user.id})` : 'No session')
  if (sessionError) {
    console.error('❌ Dashboard: Session error:', sessionError.message)
  }
  
  session = supabaseSession
  
  // If no session, try to manually parse the cookie
  if (!session) {
    console.log('🔧 Attempting to manually parse auth cookie...')
    const authCookie = allCookies.find(c => c.name.includes('auth-token'))
    if (authCookie) {
      try {
        const cookieData = JSON.parse(authCookie.value)
        if (cookieData.access_token) {
          console.log('  ✓ Found access_token in cookie, trying to set session...')
          // Try to set the session manually using setSession
          const { data: { session: manualSession }, error: manualError } = await supabase.auth.setSession({
            access_token: cookieData.access_token,
            refresh_token: cookieData.refresh_token,
          })
          if (manualSession) {
            console.log('  ✅ Successfully created session from cookie!')
            session = manualSession
          } else if (manualError) {
            console.error('  ❌ Error setting session:', manualError.message)
          }
        }
      } catch (e) {
        console.error('  ❌ Error parsing cookie:', e.message)
      }
    }
  }
  
  // Use session user if available, otherwise try getUser
  user = session?.user || (await supabase.auth.getUser()).data?.user
  
  if (!user) {
    const { error: userError } = await supabase.auth.getUser()
    console.log('👤 User check: No user found')
    if (userError) {
      console.error('❌ Auth error:', userError.message)
      console.error('❌ Auth error code:', userError.status)
    }
    console.log('🔄 Redirecting to /driver/auth (no user)')
    redirect('/driver/auth')
  }
  
  console.log('✅ User authenticated:', user.id)

  console.log('✅ User authenticated, showing dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <DriverDashboard />
      </main>
    </div>
  )
}
