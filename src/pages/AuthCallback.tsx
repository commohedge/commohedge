import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Vérifier si nous sommes dans une popup
        if (window.opener) {
          // Nous sommes dans une popup, fermer la popup et notifier le parent
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin)
          window.close()
        } else {
          // Nous sommes dans la fenêtre principale, traiter l'authentification normalement
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Erreur lors de la récupération de la session:', error)
            navigate('/login?error=auth_error')
            return
          }

          if (data.session) {
            // Authentification réussie, rediriger vers le dashboard
            navigate('/dashboard')
          } else {
            // Pas de session, rediriger vers la page de connexion
            navigate('/login')
          }
        }
      } catch (error) {
        console.error('Erreur dans le callback d\'authentification:', error)
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: error.message }, window.location.origin)
          window.close()
        } else {
          navigate('/login?error=auth_error')
        }
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Finalisation de la connexion...
        </h2>
        <p className="text-white/70">
          Veuillez patienter pendant que nous vous connectons.
        </p>
      </div>
    </div>
  )
}

export default AuthCallback
