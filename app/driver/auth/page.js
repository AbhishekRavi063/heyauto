import Header from '@/components/Header'
import AuthForm from '@/components/AuthForm'

export default function DriverAuth() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Driver Registration & Login
          </h1>
          <p className="text-gray-600">
            Register your auto or login to your account
          </p>
        </div>
        <AuthForm />
      </main>
    </div>
  )
}
