import Image from 'next/image'

export default function DriverCard({ driver }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-3 sm:gap-4">
        {driver.photo_url ? (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={driver.photo_url}
              alt={driver.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <span className="text-xl sm:text-2xl text-gray-600">
              {driver.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">{driver.name}</h3>
          <div className="space-y-1 text-xs sm:text-sm text-gray-600">
            <p>
              <span className="font-medium">Phone:</span>{' '}
              <a
                href={`tel:${driver.phone}`}
                className="text-blue-600 hover:underline"
              >
                {driver.phone}
              </a>
            </p>
            <p>
              <span className="font-medium">Auto Number:</span>{' '}
              {driver.auto_registration_number}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
