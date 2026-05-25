import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, addDays, subDays, startOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import { AppointmentForm } from '../components/AppointmentForm';

const API = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED:   'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPLETED:   'bg-green-100 text-green-800 border-green-200',
  CANCELLED:   'bg-gray-100 text-gray-500 border-gray-200 line-through',
  NO_SHOW:     'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
  NO_SHOW:     'No asistió',
};

interface Appointment {
  id: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  treatmentType: string;
  patient: { firstName: string; lastName: string; phone: string };
  doctor: { firstName: string; lastName: string };
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/branches`);
      return res.data.items ?? [];
    },
  });

  // Fetch appointments for selected date + branch
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'calendar', selectedBranchId, dateStr],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/appointments/calendar`, {
        params: { branchId: selectedBranchId, date: dateStr },
      });
      return res.data as Appointment[];
    },
    enabled: !!selectedBranchId,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      axios.patch(`${API}/api/v1/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppt(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${API}/api/v1/appointments/${id}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 07:00 – 18:00

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Agenda de Citas</h1>

          {/* Branch selector */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar sucursal</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Date navigation */}
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[160px] text-center">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Hoy
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva cita
          </button>
        </div>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      {!selectedBranchId ? (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          Selecciona una sucursal para ver su agenda
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[60px_1fr] min-h-full">
            {/* Hour labels */}
            <div className="border-r border-gray-200">
              {hours.map((h) => (
                <div key={h} className="h-16 border-b border-gray-100 flex items-start pt-1 pr-2 justify-end">
                  <span className="text-xs text-gray-400">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Appointments column */}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} className="h-16 border-b border-gray-100" />
              ))}

              {/* Appointment blocks */}
              {appointments.map((appt) => {
                const apptDate = new Date(appt.scheduledAt);
                const hourOffset = apptDate.getHours() - 7 + apptDate.getMinutes() / 60;
                const heightUnits = appt.durationMins / 60;

                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`absolute left-2 right-2 rounded-lg border px-2 py-1 cursor-pointer hover:shadow-md transition-shadow text-xs ${STATUS_COLORS[appt.status] ?? 'bg-gray-100'}`}
                    style={{
                      top: `${hourOffset * 64}px`,
                      height: `${Math.max(heightUnits * 64 - 4, 28)}px`,
                    }}
                  >
                    <div className="font-medium truncate">
                      {appt.patient.firstName} {appt.patient.lastName}
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-75">
                      <Clock className="w-3 h-3" />
                      {format(apptDate, 'HH:mm')} — {appt.treatmentType}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Appointment detail panel ──────────────────────────────────────── */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setSelectedAppt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 text-lg mb-4">Detalle de cita</h3>

            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Paciente:</span> <span className="font-medium">{selectedAppt.patient.firstName} {selectedAppt.patient.lastName}</span></div>
              <div><span className="text-gray-500">Teléfono:</span> {selectedAppt.patient.phone}</div>
              <div><span className="text-gray-500">Doctor:</span> Dr. {selectedAppt.doctor.firstName} {selectedAppt.doctor.lastName}</div>
              <div><span className="text-gray-500">Tratamiento:</span> {selectedAppt.treatmentType}</div>
              <div><span className="text-gray-500">Hora:</span> {format(new Date(selectedAppt.scheduledAt), 'HH:mm')} ({selectedAppt.durationMins} min)</div>
              <div>
                <span className="text-gray-500">Estado:</span>{' '}
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedAppt.status]}`}>
                  {STATUS_LABELS[selectedAppt.status]}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {selectedAppt.status === 'PENDING' && (
                <button
                  onClick={() => confirmMutation.mutate(selectedAppt.id)}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Confirmar
                </button>
              )}
              {['PENDING', 'CONFIRMED'].includes(selectedAppt.status) && (
                <button
                  onClick={() => cancelMutation.mutate({ id: selectedAppt.id, reason: 'Cancelado por staff' })}
                  className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => setSelectedAppt(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New appointment form ──────────────────────────────────────────── */}
      {showForm && (
        <AppointmentForm
          branchId={selectedBranchId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}
    </div>
  );
}
