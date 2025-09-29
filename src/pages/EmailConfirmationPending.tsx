import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { 
  Mail, 
  ArrowLeft,
  RefreshCw,
  Shield,
  Clock
} from "lucide-react"
import { Link } from "react-router-dom"

interface EmailConfirmationPendingProps {
  email: string
}

const EmailConfirmationPending: React.FC<EmailConfirmationPendingProps> = ({ email }) => {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const { resendConfirmationEmail } = useAuth()

  const handleResendEmail = async () => {
    setIsLoading(true)

    try {
      const result = await resendConfirmationEmail(email)
      
      if (result.success) {
        toast({
          title: "Confirmation Email Sent",
          description: "Please check your email and click the confirmation link",
        })
      } else {
        toast({
          title: "Failed to Resend Email",
          description: result.error || "An error occurred while resending the email",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Failed to Resend Email",
        description: error.message || "An error occurred while resending the email",
        variant: "destructive",
      })
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

        {/* Confirmation Pending Card */}
        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-slate-300">
              We've sent a confirmation link to your email address
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-blue-300">
                <strong>Email sent to:</strong> {email}
                <br />
                Please check your inbox and click the confirmation link to activate your account.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Didn't receive the email? Check your spam folder or click the button below to resend.
                </p>
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

            <div className="text-center">
              <p className="text-slate-500 text-xs">
                After confirming your email, you can log in to access the application.
              </p>
            </div>
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

export default EmailConfirmationPending
