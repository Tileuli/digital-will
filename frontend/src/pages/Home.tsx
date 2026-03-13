import { Link } from 'react-router-dom'
import { Shield, Clock, Lock, Users, ArrowRight, CheckCircle } from 'lucide-react'
import authService from '../services/auth'

const Home = () => {
  const isAuthenticated = authService.isAuthenticated()

  const features = [
    {
      icon: <Lock className="w-12 h-12" />,
      title: 'End-to-End Encryption',
      description: 'Your data is encrypted on your device. We never see your sensitive information.'
    },
    {
      icon: <Clock className="w-12 h-12" />,
      title: 'Automatic Release',
      description: 'Access is automatically granted to trusted contacts after missed check-ins.'
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: 'Multiple Recipients',
      description: 'Add multiple trusted contacts with different access levels.'
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: 'Zero Knowledge',
      description: 'We cannot decrypt your data. Only your trusted contacts can access it.'
    }
  ]

  const steps = [
    'Create your digital vault with encrypted instructions',
    'Add trusted family members or friends as recipients',
    'Set up regular check-in schedule (weekly/monthly)',
    'If you miss check-ins, access is automatically released'
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Secure Your <span className="text-yellow-300">Digital Legacy</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 opacity-90">
              Ensure your important digital assets are safely passed to loved ones when you're no longer able to.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-2xl"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-2xl"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Why Choose Digital Will
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            How It Works
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-lg text-gray-800">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Secure Your Digital Legacy?
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands who trust Digital Will to protect their digital assets for their loved ones.
          </p>
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-2xl text-lg"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start Protecting Now'}
            <ArrowRight className="ml-3 w-6 h-6" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home