'use client'

import { useState } from 'react'

export default function FileUpload({ label, name, accept, required = false, onFileChange }) {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFileName(file.name)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
      }

      if (onFileChange) {
        onFileChange(file)
      }
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 flex items-center gap-4">
        <label className="cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700">Choose File</span>
          <input
            type="file"
            name={name}
            accept={accept}
            required={required}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {fileName && (
          <span className="text-sm text-gray-600">{fileName}</span>
        )}
      </div>
      {preview && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-48 rounded-lg border border-gray-300"
          />
        </div>
      )}
    </div>
  )
}
