import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { DollarSign, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

const STATUS_BADGE: Record<string, string> = {
  OPEN:      'bg-yellow-100 text-yellow-800',
  PAID:      'bg-green-100 text-green-800',
  OVERDUE:   'bg-red-100 text-red-700',
  DRAFT:     'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta', PAID: 'Pagada', OVERDUE: 'Vencida',
  DRAFT: 'Borrador', CANCELLED: 'Cancelada',
};

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amountCents: 0, method: 'CASH', reference: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/invoices`, {
        params: { status: statusFilter || undefined, limit: 50 },
      });
      return res.data as { items: any[] };
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      axios.post(`${API}/api/v1/invoices/${payingInvoice.id}/payments`, {
        amountCents: paymentForm.amountCents,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPayingInvoice(null);
    },
  });

  const invoices = data?.items ?? [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Pagos y Cobros</h1>
        <div className="flex gap-2">
          {['', 'OPEN', 'PAID', 'OVERDUE'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'Todas' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv: any) => {
                const paid = inv.payments?.reduce((s: number, p: any) => s + p.amountCents, 0) ?? 0;
                const balance = inv.totalCents - paid;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {inv.patient?.firstName} {inv.patient?.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{formatCents(inv.totalCents)}</td>
                    <td className="px-6 py-4 text-green-600">{formatCents(paid)}</td>
                    <td className={`px-6 py-4 font-medium ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {formatCents(balance)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] ?? ''}`}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(inv.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      {balance > 0 && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setPayingInvoice(inv);
                            setPaymentForm({ amountCents: balance, method: 'CASH', reference: '' });
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Registrar pago</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amountCents / 100}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amountCents: Math.round(parseFloat(e.target.value) * 100) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentForm((f) => ({ ...f, method: m }))}
                      className={`py-2 rounded-lg text-sm border font-medium transition-colors ${
                        paymentForm.method === m
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (opcional)</label>
                <input
                  type="text"
                  placeholder="N° recibo o transacción"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPayingInvoice(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending || paymentForm.amountCents <= 0}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {payMutation.isPending ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
