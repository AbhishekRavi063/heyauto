'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from './FileUpload'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isLogin) {
        // Login using client-side Supabase (sets cookies in browser automatically)
        const formData = new FormData(e.target)
        const email = formData.get('email')
        const password = formData.get('password')

        console.log('🔐 Attempting login for:', email)

        const supabase = createClient()
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          console.error('❌ Login error:', authError.message)
          setError(authError.message || 'Login failed')
          return
        }

        console.log('✅ Auth successful, user ID:', authData.user?.id)

        // Verify driver exists
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', authData.user.id)
          .single()

        if (driverError || !driver) {
          console.error('❌ Driver profile error:', driverError?.message)
          setError('Driver profile not found')
          return
        }

        console.log('✅ Driver profile found:', driver.name)
        
        // Verify session is set
        const { data: { session } } = await supabase.auth.getSession()
        console.log('🔍 Session check:', session ? 'Session exists' : 'No session')
        
        if (!session) {
          console.error('❌ No session after login, waiting...')
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          console.log('🔍 Retry session check:', retrySession ? 'Session exists' : 'No session')
        }

        setSuccess('Login successful! Redirecting...')
        console.log('🔄 Redirecting to dashboard...')
        
        // Use window.location for full page reload
        setTimeout(() => {
          console.log('📍 Navigating to /driver/dashboard')
          window.location.href = '/driver/dashboard'
        }, 1000)
      } else {
        // Register
        const formData = new FormData(e.target)
        
        const response = await fetch('/api/drivers/register', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Registration failed')
          return
        }

        setSuccess('Registration successful! Redirecting...')
        // Use window.location for hard redirect to ensure cookies are sent
        setTimeout(() => {
          window.location.href = '/driver/dashboard'
        }, 1000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex gap-4 mb-6 border-b">
        <button
          type="button"
          onClick={() => {
            setIsLogin(true)
            setError('')
            setSuccess('')
          }}
          className={`flex-1 py-2 font-semibold ${
            isLogin
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setIsLogin(false)
            setError('')
            setSuccess('')
          }}
          className={`flex-1 py-2 font-semibold ${
            !isLogin
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {!isLogin && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                required
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                maxLength="10"
                placeholder="10 digit mobile number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="auto_registration_number"
                required
                placeholder="KL-XX-XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <FileUpload
              label="Driver Photo (Optional)"
              name="photo"
              accept="image/*"
            />

            <FileUpload
              label="License ID Image (Optional)"
              name="license_id_image"
              accept="image/*,.pdf"
            />
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              minLength="8"
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  )
}
