'use client'

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'

const LocationSelector = forwardRef(function LocationSelector({ onSelectionChange }, ref) {
  const [selectedState, setSelectedState] = useState('Kerala')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSubLocation, setSelectedSubLocation] = useState('')
  const [districts, setDistricts] = useState([])
  const [subLocations, setSubLocations] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingSubLocations, setLoadingSubLocations] = useState(false)

  // Expose getSelectedValues to parent via ref
  useImperativeHandle(ref, () => ({
    getSelectedValues: () => ({
      state: selectedState,
      district: selectedDistrict,
      subLocation: selectedSubLocation
    })
  }))

  const fetchDistricts = useCallback(async (state) => {
    setLoadingDistricts(true)
    try {
      const response = await fetch(`/api/locations?state=${encodeURIComponent(state)}`)
      const data = await response.json()
      if (data.districts) {
        setDistricts(data.districts)
        setSelectedDistrict('')
        setSelectedSubLocation('')
        setSubLocations([])
      }
    } catch (error) {
      console.error('Error fetching districts:', error)
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  const fetchSubLocations = useCallback(async (state, district) => {
    if (!district) {
      setSubLocations([])
      setSelectedSubLocation('')
      return
    }
    setLoadingSubLocations(true)
    try {
      const response = await fetch(`/api/locations?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`)
      const data = await response.json()
      if (data.sub_locations) {
        setSubLocations(data.sub_locations)
        setSelectedSubLocation('')
      }
    } catch (error) {
      console.error('Error fetching sub-locations:', error)
    } finally {
      setLoadingSubLocations(false)
    }
  }, [])

  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState)
    }
  }, [selectedState, fetchDistricts])

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchSubLocations(selectedState, selectedDistrict)
    }
  }, [selectedState, selectedDistrict, fetchSubLocations])

  // Notify parent of selection changes (but don't trigger search)
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedState, selectedDistrict, selectedSubLocation)
    }
  }, [selectedState, selectedDistrict, selectedSubLocation, onSelectionChange])

  const handleStateChange = (e) => {
    setSelectedState(e.target.value)
  }

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value)
  }

  const handleSubLocationChange = (e) => {
    setSelectedSubLocation(e.target.value)
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Select Location</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <select
            value={selectedState}
            onChange={handleStateChange}
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
            onChange={handleDistrictChange}
            disabled={loadingDistricts || districts.length === 0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
          >
            <option value="">Select a district</option>
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
          <select
            value={selectedSubLocation}
            onChange={handleSubLocationChange}
            disabled={loadingSubLocations || !selectedDistrict || subLocations.length === 0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
          >
            <option value="">Select a sub-location</option>
            {subLocations.map((subLocation) => (
              <option key={subLocation} value={subLocation}>
                {subLocation}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
})

export default LocationSelector
