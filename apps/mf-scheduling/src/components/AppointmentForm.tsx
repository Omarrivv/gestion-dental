import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { X } from 'lucide-react';

const API = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

const TREATMENT_TYPES = [
  'Consulta general', 'Limpieza dental', 'Extracción', 'Endodoncia',
  'Corona', 'Puente', 'Implante', 'Ortodoncia', 'Blanqueamiento', 'Radiografía',
];

interface Props {
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentForm({ branchId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    treatmentType: '',
    scheduledAt: '',
    durationMins: 30,
    reason: '',
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'search'],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/patients`, { params: { limit: 100 } });
      return res.data.items ?? [];
    },
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', branchId],
    queryFn: async () => {
      const res = await axios.get(`${API}/api/v1/users`, {
        params: { role: 'DOCTOR', branchId },
      });
      return res.data.items ?? [];
    },
  });

  // Available slots
  const { data: slots = [] } = useQuery({
    queryKey: ['slots', branchId, form.doctorId, form.scheduledAt?.split('T')[0], form.durationMins],
    queryFn: async () => {
      const date = form.scheduledAt?.split('T')[0];
      if (!date || !form.doctorId) return [];
      const res = await axios.get(`${API}/api/v1/appointments/slots`, {
        params: { branchId, doctorId: form.doctorId, date, duration: form.durationMins },
      });
      return res.data as Array<{ startAt: string; endAt: string; available: boolean }>;
    },
    enabled: !!form.doctorId && !!form.scheduledAt?.split('T')[0],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      axios.post(`${API}/api/v1/appointments`, {
        branchId,
        patientId: form.patientId,
        doctorId: form.doctorId,
        treatmentType: form.treatmentType,
        scheduledAt: form.scheduledAt,
        durationMins: form.durationMins,
        reason: form.reason || undefined,
      }),
    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nueva cita</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              required
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar paciente...</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.phone}</option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <select
              required
              value={form.doctorId}
              onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar doctor...</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>

          {/* Treatment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de tratamiento</label>
            <select
              required
              value={form.treatmentType}
              onChange={(e) => setForm((f) => ({ ...f, treatmentType: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {TREATMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={form.scheduledAt.split('T')[0] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value + 'T' + (f.scheduledAt.split('T')[1] ?? '08:00') }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <select
                value={form.durationMins}
                onChange={(e) => setForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Available slots */}
          {slots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horarios disponibles</label>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {slots.map((slot) => {
                  const time = new Date(slot.startAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
                  const selected = form.scheduledAt === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => slot.available && setForm((f) => ({ ...f, scheduledAt: slot.startAt }))}
                      className={`text-xs py-1.5 rounded-lg border font-medium transition-colors ${
                        !slot.available ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' :
                        selected ? 'bg-blue-600 text-white border-blue-600' :
                        'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ej: Dolor molar..."
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.patientId || !form.doctorId || !form.scheduledAt || !form.treatmentType}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? 'Guardando...' : 'Crear cita'}
          </button>
        </div>
      </div>
    </div>
  );
}
