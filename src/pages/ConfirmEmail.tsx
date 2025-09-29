import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  RefreshCw,
  Shield
} from "lucide-react"
import { Link } from "react-router-dom"

const ConfirmEmail: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { checkEmailConfirmation, resendConfirmationEmail, isAuthenticated } = useAuth()

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // Vérifier la confirmation d'email au chargement
  useEffect(() => {
    const checkConfirmation = async () => {
      const { confirmed, error } = await checkEmailConfirmation()
      
      if (error) {
        setError(error)
      } else if (confirmed) {
        setIsConfirmed(true)
        toast({
          title: "Email Confirmed!",
          description: "Your email has been successfully confirmed. You can now access the application.",
        })
        // Rediriger vers le dashboard après 2 secondes
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      }
    }

    checkConfirmation()
  }, [checkEmailConfirmation, navigate, toast])

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await resendConfirmationEmail(email)
      
      if (result.success) {
        toast({
          title: "Confirmation Email Sent",
          description: "Please check your email and click the confirmation link",
        })
      } else {
        setError(result.error || 'Failed to resend confirmation email')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while resending the email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      
      <div className="relative w-full max-w-md">
        {/* Back to Landing Page */}
        <Link to="/" className="inline-flex items-center text-slate-300 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Landing Page
        </Link>

        {/* Confirmation Card */}
        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                {isConfirmed ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <Mail className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {isConfirmed ? 'Email Confirmed!' : 'Confirm Your Email'}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {isConfirmed 
                ? 'Your email has been successfully confirmed'
                : 'Please check your email and click the confirmation link'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isConfirmed ? (
              /* Email Confirmed State */
              <div className="space-y-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-300">
                    Your email has been confirmed successfully! You will be redirected to the dashboard shortly.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              /* Email Not Confirmed State */
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <Mail className="h-4 w-4" />
                  <AlertDescription className="text-blue-300">
                    We've sent a confirmation link to your email address. Please check your inbox and click the link to activate your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-4">
                      Didn't receive the email? Enter your email address below to resend the confirmation link.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 bg-slate-800/50 border border-slate-600 text-white rounded-md focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <Button 
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Confirmation Email
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <Button 
                    variant="outline"
                    onClick={handleGoToLogin}
                    className="border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700/50"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>Secure email confirmation</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmEmail
