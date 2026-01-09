'use client'

import { useState, useRef } from 'react'
import Header from '@/components/Header'
import LocationSelector from '@/components/LocationSelector'
import DriverList from '@/components/DriverList'

export default function Home() {
  const [searchState, setSearchState] = useState(null)
  const [searchDistrict, setSearchDistrict] = useState(null)
  const [searchSubLocation, setSearchSubLocation] = useState(null)
  const locationSelectorRef = useRef(null)

  const handleSearch = () => {
    if (locationSelectorRef.current) {
      const values = locationSelectorRef.current.getSelectedValues()
      if (values.state && values.district && values.subLocation) {
        setSearchState(values.state)
        setSearchDistrict(values.district)
        setSearchSubLocation(values.subLocation)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            Find Auto Drivers in Kerala
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg px-2">
            Select your location and click search to see available auto drivers
          </p>
        </div>

        <LocationSelector ref={locationSelectorRef} />
        
        <div className="mb-4 sm:mb-6 flex justify-center">
          <button
            onClick={handleSearch}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base sm:text-lg shadow-md hover:shadow-lg"
          >
            Search Drivers
          </button>
        </div>

        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
            Available Drivers
          </h2>
          <DriverList state={searchState} district={searchDistrict} sub_location={searchSubLocation} />
        </div>
      </main>
    </div>
  )
}
