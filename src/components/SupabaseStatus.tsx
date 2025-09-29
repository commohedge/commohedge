import React, { useState, useEffect } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Cloud, CloudOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

interface SupabaseStatusProps {
  showDetails?: boolean
  className?: string
}

export const SupabaseStatus: React.FC<SupabaseStatusProps> = ({ 
  showDetails = false, 
  className = "" 
}) => {
  const { isConnected, loading, error } = useSupabase()
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    if (isConnected !== null) {
      setLastCheck(new Date())
    }
  }, [isConnected])

  if (loading) {
    return (
      <Badge variant="outline" className={`text-gray-500 ${className}`}>
        <Cloud className="h-3 w-3 mr-1 animate-pulse" />
        Vérification...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Erreur
      </Badge>
    )
  }

  if (isConnected) {
    return (
      <Badge variant="outline" className={`text-green-600 border-green-200 ${className}`}>
        <CheckCircle className="h-3 w-3 mr-1" />
        <Cloud className="h-3 w-3 mr-1" />
        Supabase
        {showDetails && lastCheck && (
          <span className="ml-1 text-xs">
            ({lastCheck.toLocaleTimeString()})
          </span>
        )}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`text-red-600 border-red-200 ${className}`}>
      <CloudOff className="h-3 w-3 mr-1" />
      Hors ligne
    </Badge>
  )
}
