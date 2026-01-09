import './globals.css'

export const metadata = {
  title: 'HeyAuto - Find Auto Drivers in Kerala',
  description: 'Connect with auto drivers in Kerala',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
