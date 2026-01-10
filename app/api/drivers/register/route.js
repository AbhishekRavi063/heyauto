import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const formData = await request.formData()
    
    const name = formData.get('name')
    const phone = formData.get('phone')
    const password = formData.get('password')
    const address = formData.get('address')
    const autoRegistrationNumber = formData.get('auto_registration_number')
    const photo = formData.get('photo')
    const licenseImage = formData.get('license_id_image')

    // Validation
    if (!name || !phone || !password || !address || !autoRegistrationNumber) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Phone validation - just check it's 10 digits
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits' },
        { status: 400 }
      )
    }

    // Check if phone number is already registered
    const adminClient = createAdminClient()
    const { data: existingDrivers } = await adminClient
      .from('drivers')
      .select('phone')
      .eq('phone', phone)
      .limit(1)

    if (existingDrivers && existingDrivers.length > 0) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists. Please login instead.' },
        { status: 409 }
      )
    }

    // Also need regular client for getting public URLs
    const supabase = await createClient()

    // Create user using Admin API - use phone number formatted as email
    // Format: phone@heyauto.local (Supabase requires email format but we use phone)
    const phoneEmail = `${phone}@heyauto.local`
    
    const { data: adminUserData, error: adminUserError } = await adminClient.auth.admin.createUser({
      email: phoneEmail,
      password,
      email_confirm: true, // Auto-confirm immediately
      phone: `+91${phone}`, // Store phone in phone field too
      user_metadata: {
        name: name,
        phone: phone
      }
    })

    if (adminUserError) {
      // Check if user already exists
      if (adminUserError.message?.includes('already registered') || adminUserError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please login instead.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: adminUserError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    if (!adminUserData?.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // User is created and confirmed - no email was sent
    const finalUserId = adminUserData.user.id

    let photoUrl = null
    let licenseImageUrl = null

    // Upload photo if provided
    if (photo && photo.size > 0) {
      console.log('📸 Uploading photo, size:', photo.size, 'bytes, name:', photo.name)
      const photoExt = photo.name.split('.').pop() || 'jpg'
      const photoFileName = `${finalUserId}/photo.${photoExt}`
      
      // Use admin client for upload to bypass RLS
      const { data: photoUploadData, error: photoError } = await adminClient.storage
        .from('driver-photos')
        .upload(photoFileName, photo, {
          cacheControl: '3600',
          upsert: false
        })

      if (photoError) {
        console.error('❌ Photo upload error:', photoError.message)
        console.error('❌ Photo upload error details:', JSON.stringify(photoError, null, 2))
      } else {
        console.log('✅ Photo uploaded successfully:', photoUploadData?.path)
        const { data: photoData } = supabase.storage
          .from('driver-photos')
          .getPublicUrl(photoFileName)
        photoUrl = photoData.publicUrl
        console.log('✅ Photo URL:', photoUrl)
      }
    } else {
      console.log('⚠️  No photo provided or photo size is 0')
    }

    // Upload license image if provided
    if (licenseImage && licenseImage.size > 0) {
      console.log('📄 Uploading license image, size:', licenseImage.size, 'bytes, name:', licenseImage.name)
      
      // Check if it's webp - license bucket doesn't support webp, convert to jpg
      let licenseFileToUpload = licenseImage
      let licenseExt = licenseImage.name.split('.').pop() || 'jpg'
      
      // If webp, we'll skip it and log a warning, or convert it
      if (licenseExt.toLowerCase() === 'webp') {
        console.warn('⚠️  License bucket does not support webp format. Skipping license image upload.')
        licenseImageUrl = null
      } else {
        const licenseFileName = `${finalUserId}/license.${licenseExt}`
        
        // Use admin client for upload to bypass RLS
        const { data: licenseUploadData, error: licenseError } = await adminClient.storage
          .from('license-images')
          .upload(licenseFileName, licenseFileToUpload, {
            cacheControl: '3600',
            upsert: false
          })

        if (licenseError) {
          console.error('❌ License upload error:', licenseError.message)
          console.error('❌ License upload error details:', JSON.stringify(licenseError, null, 2))
          licenseImageUrl = null
        } else {
          console.log('✅ License image uploaded successfully:', licenseUploadData?.path)
          // For private bucket, we store the path, not public URL
          licenseImageUrl = licenseFileName
          console.log('✅ License image path:', licenseImageUrl)
        }
      }
    } else {
      console.log('⚠️  No license image provided or image size is 0')
    }

    // Create driver record using admin client to bypass RLS
    // This is safe because we're in a controlled server-side context
    const { data: driverData, error: driverError } = await adminClient
      .from('drivers')
      .insert({
        user_id: finalUserId,
        name,
        phone,
        address,
        auto_registration_number: autoRegistrationNumber,
        photo_url: photoUrl,
        license_id_image_url: licenseImageUrl,
        is_active: false,
      })
      .select()
      .single()

    if (driverError) {
      // If driver creation fails, try to delete the auth user
      await adminClient.auth.admin.deleteUser(finalUserId)
      return NextResponse.json(
        { error: driverError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      driver: driverData,
      message: 'Registration successful'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/drivers/register:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
