import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  TrendingUp, Users, Calendar, AlertTriangle,
  DollarSign, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const API = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

function KPICard({ title, value, subtitle, icon: Icon, trend, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; trend?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
      {trend && <div className="text-xs text-green-600 mt-1 font-medium">{trend}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState(30); // days

  const from = format(subDays(new Date(), range), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'dashboard', range],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/reports/dashboard`, {
        params: { from, to },
      });
      return res.data;
    },
  });

  const { data: branchRevenue = [] } = useQuery({
    queryKey: ['reports', 'revenue-by-branch', range],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/reports/revenue/by-branch`, {
        params: { from, to },
      });
      return res.data as Array<{
        branch_id: string;
        branch_name: string;
        total_invoiced: string;
        total_paid: string;
        invoice_count: string;
      }>;
    },
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const appts = data?.appointments ?? {};
  const revenue = data?.revenue ?? {};

  const noShowRate = parseFloat(appts.noShowRate ?? '0');
  const completionRate = parseFloat(appts.completionRate ?? '0');

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d === 7 ? '7 días' : d === 30 ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total citas"
          value={appts.total ?? 0}
          subtitle={`${completionRate}% completadas`}
          icon={Calendar}
          color="bg-blue-50 text-blue-600"
        />
        <KPICard
          title="Facturado"
          value={formatCurrency(revenue.totalInvoicedCents ?? 0)}
          subtitle={`${formatCurrency(revenue.totalOutstandingCents ?? 0)} pendiente`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <KPICard
          title="Tasa de inasistencia"
          value={`${noShowRate}%`}
          subtitle="No asistieron"
          icon={AlertTriangle}
          color={noShowRate > 20 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}
        />
        <KPICard
          title="Nuevos pacientes"
          value={data?.patients?.newInPeriod ?? 0}
          subtitle="en el período"
          icon={Users}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Appointment status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Estado de citas</h2>
        <div className="space-y-2">
          {Object.entries(appts.byStatus ?? {}).map(([status, count]) => {
            const total = appts.total ?? 1;
            const pct = Math.round(((count as number) / total) * 100);
            const colors: Record<string, string> = {
              COMPLETED: 'bg-green-500',
              CONFIRMED: 'bg-blue-500',
              PENDING:   'bg-yellow-500',
              CANCELLED: 'bg-gray-400',
              NO_SHOW:   'bg-red-500',
              IN_PROGRESS: 'bg-purple-500',
            };
            const labels: Record<string, string> = {
              COMPLETED: 'Completadas', CONFIRMED: 'Confirmadas',
              PENDING: 'Pendientes', CANCELLED: 'Canceladas',
              NO_SHOW: 'No asistieron', IN_PROGRESS: 'En curso',
            };
            return (
              <div key={status}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{labels[status] ?? status}</span>
                  <span className="font-medium">{count as number} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${colors[status] ?? 'bg-gray-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by branch */}
      {branchRevenue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos por sucursal</h2>
          <div className="space-y-3">
            {branchRevenue.map((b) => {
              const invoiced = Number(b.total_invoiced ?? 0);
              const paid = Number(b.total_paid ?? 0);
              const pct = invoiced > 0 ? Math.round((paid / invoiced) * 100) : 0;
              return (
                <div key={b.branch_id}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium">{b.branch_name}</span>
                    <span>{formatCurrency(paid)} / {formatCurrency(invoiced)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
