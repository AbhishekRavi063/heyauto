'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Toast from './Toast'

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedState, setSelectedState] = useState('Kerala')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSubLocation, setSelectedSubLocation] = useState('')
  const [districts, setDistricts] = useState([])
  const [subLocations, setSubLocations] = useState([])
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [localIsActive, setLocalIsActive] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false })
  const router = useRouter()

  const showToast = (message, type = 'success') => {
    setToast({ message, type, isVisible: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  const fetchDistricts = useCallback(async () => {
    try {
      const response = await fetch(`/api/locations?state=${encodeURIComponent(selectedState)}`)
      const data = await response.json()
      if (data.districts) {
        setDistricts(data.districts)
      }
    } catch (error) {
      console.error('Error fetching districts:', error)
    }
  }, [selectedState])

  const fetchSubLocations = useCallback(async () => {
    if (!selectedDistrict) {
      setSubLocations([])
      return
    }
    try {
      const response = await fetch(`/api/locations?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}`)
      const data = await response.json()
      if (data.sub_locations) {
        setSubLocations(data.sub_locations)
      }
    } catch (error) {
      console.error('Error fetching sub-locations:', error)
    }
  }, [selectedState, selectedDistrict])

  const fetchDriverProfile = useCallback(async () => {
    console.log('📡 Fetching driver profile...')
    try {
      const response = await fetch('/api/drivers/me')
      console.log('📡 Profile response status:', response.status)
      
      if (response.status === 401) {
        console.log('❌ Unauthorized, redirecting to auth')
        router.push('/driver/auth')
        return
      }
      
      const data = await response.json()
      console.log('📡 Profile data:', data.driver ? `Found driver: ${data.driver.name}` : 'No driver')
      
      if (data.driver) {
        setDriver(data.driver)
      } else {
        console.error('❌ No driver in response:', data)
      }
    } catch (error) {
      console.error('❌ Error fetching driver profile:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDriverProfile()
    fetchDistricts()
  }, [fetchDriverProfile, fetchDistricts])

  useEffect(() => {
    if (driver) {
      setSelectedState(driver.active_state || 'Kerala')
      setSelectedDistrict(driver.active_district || '')
      setSelectedSubLocation(driver.active_location || '')
      setLocalIsActive(driver.is_active || false)
    }
  }, [driver])

  useEffect(() => {
    if (selectedState) {
      fetchDistricts()
    }
  }, [selectedState, fetchDistricts])

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchSubLocations()
    }
  }, [selectedState, selectedDistrict, fetchSubLocations])

  const handleToggleStatus = () => {
    // Only update local state, don't call API
    setLocalIsActive(!localIsActive)
  }

  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !selectedDistrict) {
      showToast('Please select a district and enter a sub-location name', 'error')
      return
    }

    setAddingLocation(true)
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          state: selectedState,
          district: selectedDistrict,
          sub_location: newLocationName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || 'Failed to add location', 'error')
        return
      }

      // Refresh sub-locations list
      await fetchSubLocations()
      // Select the newly added sub-location
      setSelectedSubLocation(newLocationName.trim())
      setNewLocationName('')
      setShowAddLocation(false)
      showToast('Sub-location added successfully!', 'success')
    } catch (error) {
      console.error('Error adding location:', error)
      showToast('Failed to add location', 'error')
    } finally {
      setAddingLocation(false)
    }
  }

  const handleLocationUpdate = async () => {
    if (!selectedDistrict || !selectedSubLocation) {
      showToast('Please select a district and sub-location', 'error')
      return
    }

    console.log('🔄 Updating location and status:', { 
      state: selectedState, 
      district: selectedDistrict, 
      sub_location: selectedSubLocation,
      is_active: localIsActive
    })
    setUpdating(true)
    try {
      const response = await fetch('/api/drivers/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          state: selectedState,
          district: selectedDistrict,
          sub_location: selectedSubLocation,
          is_active: localIsActive,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('❌ Update failed:', data.error)
        showToast(data.error || 'Failed to update', 'error')
        return
      }
      
      if (data.driver) {
        setDriver(data.driver)
        setLocalIsActive(data.driver.is_active)
        showToast('Status and location updated successfully!', 'success')
      }
    } catch (error) {
      console.error('Error updating:', error)
      showToast('Failed to update: ' + error.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/drivers/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load driver profile</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Driver Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Welcome, {driver.name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {driver.photo_url && (
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 border-2 border-gray-200 mx-auto sm:mx-0">
                <Image
                  src={driver.photo_url}
                  alt={driver.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="space-y-2 text-gray-700 flex-1 w-full text-sm sm:text-base">
              <p><span className="font-semibold">Phone:</span> {driver.phone}</p>
              <p><span className="font-semibold">Address:</span> {driver.address}</p>
              <p><span className="font-semibold">Auto Number:</span> {driver.auto_registration_number}</p>
              {driver.license_id_image_url && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">License ID:</p>
                  <div className="relative w-full sm:w-48 h-32 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <Image
                      src={`/api/drivers/license-image?path=${encodeURIComponent(driver.license_id_image_url)}`}
                      alt="License ID"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4 sm:pt-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">Availability Status</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {localIsActive ? 'You will be active after update' : 'You will be inactive after update'}
              </p>
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                localIsActive ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localIsActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Active Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="Kerala">Kerala</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value)
                    setSelectedSubLocation('')
                    setShowAddLocation(false)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select district</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Location
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubLocation}
                    onChange={(e) => {
                      setSelectedSubLocation(e.target.value)
                      setShowAddLocation(false)
                    }}
                    disabled={!selectedDistrict || subLocations.length === 0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
                  >
                    <option value="">Select sub-location</option>
                    {subLocations.map((subLocation) => (
                      <option key={subLocation} value={subLocation}>
                        {subLocation}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedDistrict) {
                        showToast('Please select a district first', 'error')
                        return
                      }
                      setShowAddLocation(!showAddLocation)
                      setNewLocationName('')
                    }}
                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm sm:text-base"
                    title="Add new sub-location"
                    disabled={!selectedDistrict}
                  >
                    + Add
                  </button>
                </div>
                {showAddLocation && (
                  <div className="mt-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      New Sub-Location Name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="Enter sub-location name"
                        className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm sm:text-base"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddLocation()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddLocation}
                          disabled={addingLocation || !newLocationName.trim()}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          {addingLocation ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddLocation(false)
                            setNewLocationName('')
                          }}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm sm:text-base"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLocationUpdate}
              disabled={updating || !selectedDistrict || !selectedSubLocation}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {updating ? 'Updating...' : 'Update Status & Location'}
            </button>
            {driver.active_location && (
              <p className="mt-2 text-xs sm:text-sm text-gray-600 break-words">
                Current active location: {driver.active_state} - {driver.active_district} - {driver.active_location}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
