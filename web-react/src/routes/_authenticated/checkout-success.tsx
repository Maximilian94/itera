import { Card } from '@/components/Card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@mui/material'

export const Route = createFileRoute('/_authenticated/checkout-success')({
  component: CheckoutSuccessPage,
})

/**
 * Página exibida após o checkout bem-sucedido no Stripe.
 * Confirma a assinatura e redireciona para o dashboard.
 */
function CheckoutSuccessPage() {
  return (
    <div className="flex flex-col gap-6 p-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assinatura confirmada</h1>
        <p className="text-sm text-slate-500 mt-1">
          Obrigado por assinar a plataforma Itera.
        </p>
      </div>

      <Card noElevation className="p-6 max-w-lg">
        <div className="flex flex-col gap-4 items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircleIcon className="w-9 h-9 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sua assinatura está ativa!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Você já pode usar todos os recursos do seu plano. Em até 7 dias
              você pode solicitar reembolso sem justificativa (direito de
              arrependimento — CDC Art. 49).
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="contained" color="primary">
              Ir para o Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
