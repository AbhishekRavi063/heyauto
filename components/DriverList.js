'use client'

import { useState, useEffect } from 'react'
import DriverCard from './DriverCard'

export default function DriverList({ state, district, sub_location }) {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (state && district && sub_location) {
      fetchDrivers(state, district, sub_location)
    } else {
      setDrivers([])
    }
  }, [state, district, sub_location])

  const fetchDrivers = async (selectedState, selectedDistrict, selectedSubLocation) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/drivers?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}&sub_location=${encodeURIComponent(selectedSubLocation)}`
      )
      const data = await response.json()
      if (data.drivers) {
        setDrivers(data.drivers)
      } else {
        setError('Failed to fetch drivers')
      }
    } catch (err) {
      console.error('Error fetching drivers:', err)
      setError('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }

  if (!state || !district || !sub_location) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Please select a state, district, and sub-location, then click &quot;Search Drivers&quot; to view available drivers</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading drivers...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No active drivers available at this location</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drivers.map((driver) => (
        <DriverCard key={driver.id} driver={driver} />
      ))}
    </div>
  )
}
