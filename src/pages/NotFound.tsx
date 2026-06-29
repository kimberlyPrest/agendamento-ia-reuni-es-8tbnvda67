/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { EliteBrand, ElitePanel } from '@/components/elite/ElitePrimitives'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="elite-grid flex min-h-screen items-center justify-center px-6">
      <ElitePanel className="w-full max-w-lg p-8 text-center">
        <div className="mb-8 flex justify-center">
          <EliteBrand />
        </div>
        <p className="font-mono text-sm text-primary">404</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold">Página não encontrada</h1>
        <p className="mt-4 text-muted-foreground">
          O endereço acessado não corresponde a nenhuma rota ativa do sistema.
        </p>
        <Button asChild className="mt-8">
          <a href="/">Voltar ao início</a>
        </Button>
      </ElitePanel>
    </div>
  )
}

export default NotFound
