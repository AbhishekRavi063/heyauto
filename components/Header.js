import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center gap-4">
        <Link href="/" className="text-xl sm:text-2xl font-bold">
          HeyAuto
        </Link>
        <Link
          href="/driver/auth"
          className="bg-white text-blue-600 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base whitespace-nowrap"
        >
          Register your auto
        </Link>
      </div>
    </header>
  )
}
