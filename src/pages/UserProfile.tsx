import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/use-toast'
import { 
  User, 
  Mail, 
  Building, 
  Phone, 
  Shield, 
  Save, 
  Edit3,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Key
} from 'lucide-react'

const UserProfile: React.FC = () => {
  const { user, updateProfile, resetPassword, isLoading } = useAuth()
  const { toast } = useToast()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    role: ''
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
        role: user.role || ''
      })
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    try {
      const result = await updateProfile(formData)
      
      if (result.success) {
        setIsEditing(false)
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        })
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
        role: user.role || ''
      })
    }
    setIsEditing(false)
    setError('')
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return

    try {
      const result = await resetPassword(user.email)
      
      if (result.success) {
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for password reset instructions",
        })
      } else {
        toast({
          title: "Password Reset Failed",
          description: result.error || "Failed to send password reset email",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred while sending password reset email",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <Layout 
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile" }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No user data available</AlertDescription>
          </Alert>
        </div>
      </Layout>
    )
  }

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profile" }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your personal and professional information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your company name"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  disabled={!isEditing}
                  className="w-full p-3 border border-input bg-background rounded-md focus:border-ring focus:outline-none disabled:bg-muted"
                >
                  <option value="Risk Manager">Risk Manager</option>
                  <option value="Treasury Manager">Treasury Manager</option>
                  <option value="Financial Analyst">Financial Analyst</option>
                  <option value="CFO">CFO</option>
                  <option value="Trader">Trader</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">User ID</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {user.id.slice(0, 8)}...
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Member Since</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.loginTime).toLocaleDateString()}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Account Status</span>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Password</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                  >
                    Reset Password
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Security Information</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Your account is secured with Supabase authentication</p>
                  <p>• All data is encrypted in transit and at rest</p>
                  <p>• Password reset emails are sent to your registered email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default UserProfile
