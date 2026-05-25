import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, UserPlus, ChevronRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/patients`, {
        params: { search, page, limit: 20 },
      });
      return res.data as { items: any[]; total: number };
    },
    placeholderData: (prev) => prev,
  });

  const patients = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Pacientes</h1>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            {search ? `Sin resultados para "${search}"` : 'No hay pacientes registrados'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de sangre</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Alergias</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold uppercase">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                        {p.email && <div className="text-xs text-gray-400">{p.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.phone}</td>
                  <td className="px-6 py-4">
                    {p.bloodType ? (
                      <span className="inline-block bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-medium">
                        {p.bloodType}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.allergies?.length > 0 ? (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">{p.allergies.join(', ')}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">Sin alergias</span>}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/patients/${p.id}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Ver expediente <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 text-sm">
          <span className="text-gray-500">{total} pacientes totales</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              Anterior
            </button>
            <span className="px-3 py-1 text-gray-600">Página {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={patients.length < 20}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
