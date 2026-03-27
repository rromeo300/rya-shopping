'use client';

import { useEffect, useState } from 'react';

interface Checkin {
  id: string;
  propertyId: string;
  guestName: string;
  guestPhone?: string;
  guestWhatsapp?: string;
  checkInDate: string;
  checkOutDate?: string;
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled';
  keyCode?: string;
  wifiName?: string;
  wifiPassword?: string;
  parkingInfo?: string;
  specialInstructions?: string;
  notes?: string;
  rating?: number;
}

interface Property { id: string; name: string; address: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled:   { label: 'Programado', color: 'bg-blue-100 text-blue-700' },
  checked_in:  { label: 'En casa',    color: 'bg-green-100 text-green-700' },
  checked_out: { label: 'Salió',      color: 'bg-gray-100 text-gray-600' },
  cancelled:   { label: 'Cancelado',  color: 'bg-red-100 text-red-600' },
};

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<Checkin | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'active' | 'history'>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({
    propertyId: '', guestName: '', guestPhone: '', guestWhatsapp: '',
    checkInDate: '', checkOutDate: '', keyCode: '', wifiName: '',
    wifiPassword: '', parkingInfo: '', specialInstructions: '', notes: '',
  });

  const load = async () => {
    const [ciRes, propRes] = await Promise.all([
      fetch('/api/checkins'),
      fetch('/api/stats'),
    ]);
    const ciData = await ciRes.json();
    setCheckins(Array.isArray(ciData) ? ciData : []);
    const stats = await propRes.json();
    if (stats.properties) setProperties(stats.properties);
  };

  useEffect(() => { load(); }, []);

  const filtered = checkins.filter(c => {
    if (tab === 'upcoming') return c.status === 'scheduled';
    if (tab === 'active')   return c.status === 'checked_in';
    return ['checked_out', 'cancelled'].includes(c.status);
  });

  const updateStatus = async (id: string, status: Checkin['status']) => {
    await fetch('/api/checkins', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  };

  const sendWhatsApp = async (checkinId: string, type: 'checkin' | 'checkout') => {
    const c = checkins.find(ch => ch.id === checkinId);
    if (!c?.guestWhatsapp) {
      alert('Este check-in no tiene número de WhatsApp configurado.');
      return;
    }
    setSending(checkinId + type);
    try {
      // Get message from AI tool via chat
      const msgRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Genera el mensaje de ${type === 'checkin' ? 'check-in' : 'check-out'} para el checkin con id ${checkinId} usando la herramienta get_${type}_message y devuélveme solo el mensaje final.` }],
          conversationId: 'dashboard',
        }),
      });
      const text = await msgRes.text();

      // Send via bot
      const sendRes = await fetch('/api/whatsapp-business/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: c.guestWhatsapp, message: text }),
      });
      const result = await sendRes.json();
      if (result.ok) {
        alert(`✅ Mensaje enviado a ${c.guestName} (${c.guestWhatsapp})`);
        // Mark instructions as sent
        await fetch('/api/checkins', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: checkinId,
            [type === 'checkin' ? 'instructionsSentAt' : 'checkoutSentAt']: new Date().toISOString(),
          }),
        });
        load();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (e) {
      alert('Error enviando el mensaje');
    } finally {
      setSending(null);
    }
  };

  const saveCheckin = async () => {
    if (!form.propertyId || !form.guestName || !form.checkInDate) {
      alert('Completa los campos requeridos: propiedad, nombre del huésped y fecha de llegada.');
      return;
    }
    await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ propertyId: '', guestName: '', guestPhone: '', guestWhatsapp: '', checkInDate: '', checkOutDate: '', keyCode: '', wifiName: '', wifiPassword: '', parkingInfo: '', specialInstructions: '', notes: '' });
    load();
  };

  const propName = (id: string) => properties.find(p => p.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Check-in / Check-out</h1>
          <p className="text-sm text-gray-500">Gestiona llegadas, salidas e instrucciones para huéspedes</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo check-in
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4">
        {[
          { label: 'Programados', count: checkins.filter(c => c.status === 'scheduled').length, color: 'blue' },
          { label: 'En casa ahora', count: checkins.filter(c => c.status === 'checked_in').length, color: 'green' },
          { label: 'Historial', count: checkins.filter(c => ['checked_out','cancelled'].includes(c.status)).length, color: 'gray' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
            <div className={`text-2xl font-bold text-${s.color}-600`}>{s.count}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* New checkin form */}
      {showForm && (
        <div className="mx-6 mb-4 bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Nuevo Check-in</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Propiedad *</label>
              <select value={form.propertyId} onChange={e => setForm(p => ({ ...p, propertyId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Selecciona propiedad...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {[
              { key: 'guestName', label: 'Nombre del huésped *', placeholder: 'Juan García' },
              { key: 'guestPhone', label: 'Teléfono', placeholder: '6141234567' },
              { key: 'guestWhatsapp', label: 'WhatsApp (con código país)', placeholder: '526141234567' },
              { key: 'checkInDate', label: 'Fecha llegada *', placeholder: '', type: 'datetime-local' },
              { key: 'checkOutDate', label: 'Fecha salida', placeholder: '', type: 'datetime-local' },
              { key: 'keyCode', label: 'Código / llave de acceso', placeholder: '1234#' },
              { key: 'wifiName', label: 'Red WiFi', placeholder: 'MiCasa_2.4G' },
              { key: 'wifiPassword', label: 'Contraseña WiFi', placeholder: 'clave123' },
              { key: 'parkingInfo', label: 'Estacionamiento', placeholder: 'Cajón 5, entrada lateral' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500">{f.label}</label>
                <input
                  type={(f as { type?: string }).type ?? 'text'}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Instrucciones especiales</label>
              <textarea value={form.specialInstructions}
                onChange={e => setForm(p => ({ ...p, specialInstructions: e.target.value }))}
                placeholder="Ej: Llegar después de las 3pm, tocar el timbre 2 veces..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveCheckin} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabs + list */}
      <div className="px-6">
        <div className="flex gap-4 border-b bg-white rounded-t-xl px-4">
          {(['upcoming', 'active', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'
              }`}>
              {t === 'upcoming' ? 'Próximas llegadas' : t === 'active' ? 'En casa ahora' : 'Historial'}
            </button>
          ))}
        </div>

        <div className="bg-white border border-t-0 rounded-b-xl divide-y">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Sin registros en esta categoría</div>
          )}
          {filtered.map(c => (
            <div key={c.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-blue-50' : ''}`}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.guestName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[c.status]?.color}`}>
                      {STATUS_LABELS[c.status]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{propName(c.propertyId)}</p>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>📅 Entrada: {new Date(c.checkInDate).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {c.checkOutDate && <span>📅 Salida: {new Date(c.checkOutDate).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.status === 'scheduled' && (
                    <>
                      <button onClick={e => { e.stopPropagation(); sendWhatsApp(c.id, 'checkin'); }}
                        disabled={sending === c.id + 'checkin'}
                        className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50">
                        {sending === c.id + 'checkin' ? '...' : '📲 Enviar instrucciones'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateStatus(c.id, 'checked_in'); }}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        ✅ Confirmar llegada
                      </button>
                    </>
                  )}
                  {c.status === 'checked_in' && (
                    <>
                      <button onClick={e => { e.stopPropagation(); sendWhatsApp(c.id, 'checkout'); }}
                        disabled={sending === c.id + 'checkout'}
                        className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-100 disabled:opacity-50">
                        {sending === c.id + 'checkout' ? '...' : '📲 Enviar instruc. salida'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateStatus(c.id, 'checked_out'); }}
                        className="text-xs bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                        🚪 Registrar salida
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {selected?.id === c.id && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                  {c.guestPhone    && <div><span className="text-gray-400">Teléfono:</span> {c.guestPhone}</div>}
                  {c.guestWhatsapp && <div><span className="text-gray-400">WhatsApp:</span> {c.guestWhatsapp}</div>}
                  {c.keyCode       && <div><span className="text-gray-400">Acceso:</span> <strong>{c.keyCode}</strong></div>}
                  {c.wifiName      && <div><span className="text-gray-400">WiFi:</span> {c.wifiName} — <strong>{c.wifiPassword}</strong></div>}
                  {c.parkingInfo   && <div className="col-span-2"><span className="text-gray-400">Estacionamiento:</span> {c.parkingInfo}</div>}
                  {c.specialInstructions && (
                    <div className="col-span-2 bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 font-medium mb-1">Instrucciones especiales</p>
                      <p className="text-gray-700 text-sm">{c.specialInstructions}</p>
                    </div>
                  )}
                  {c.rating && (
                    <div><span className="text-gray-400">Calificación:</span> {'⭐'.repeat(c.rating)}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
