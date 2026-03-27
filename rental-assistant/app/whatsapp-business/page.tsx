'use client';

import { useEffect, useState, useRef } from 'react';

interface Conversation {
  jid: string;
  name?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  labels: string[];
  archived: boolean;
  pinned: boolean;
}

interface Contact {
  jid: string;
  name?: string;
  phone?: string;
  pushName?: string;
  labels: string[];
}

interface Label {
  id: string;
  name: string;
  color: number;
}

interface Message {
  id: string;
  jid: string;
  content?: string;
  fromMe: number;
  senderName?: string;
  timestamp: string;
}

interface Stats {
  contacts: number;
  conversations: number;
  unread: number;
  labels: number;
}

const LABEL_COLORS: Record<number, string> = {
  0: '#25D366', 1: '#128C7E', 2: '#075E54',
  3: '#34B7F1', 4: '#ECE5DD', 5: '#DCF8C6',
  6: '#FF6B6B', 7: '#FFD93D', 8: '#6BCB77',
  9: '#4D96FF', 10: '#C77DFF',
};

export default function WhatsAppBusinessPage() {
  const [tab, setTab] = useState<'conversations' | 'contacts' | 'labels'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ phone: '', name: '' });
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: 0 });
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    const [convRes, contactsRes, labelsRes, statsRes] = await Promise.all([
      fetch(`/api/whatsapp-business/conversations?archived=${showArchived}`),
      fetch('/api/whatsapp-business/contacts'),
      fetch('/api/whatsapp-business/labels'),
      fetch('/api/whatsapp-business/conversations?stats=true'),
    ]);
    setConversations(await convRes.json());
    setContacts(await contactsRes.json());
    setLabels(await labelsRes.json());
    setStats(await statsRes.json());
  };

  useEffect(() => { load(); }, [showArchived]);

  useEffect(() => {
    if (!selectedJid) return;
    fetch(`/api/whatsapp-business/messages?jid=${encodeURIComponent(selectedJid)}`)
      .then(r => r.json()).then(setMessages);
  }, [selectedJid]);

  const applyLabel = async (jid: string, labelId: string, current: string[]) => {
    const updated = current.includes(labelId)
      ? current.filter(l => l !== labelId)
      : [...current, labelId];
    await fetch('/api/whatsapp-business/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, labels: updated }),
    });
    load();
  };

  const toggleArchive = async (jid: string, archived: boolean) => {
    await fetch('/api/whatsapp-business/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, archived: !archived }),
    });
    load();
  };

  const addContact = async () => {
    if (!newContact.phone) return;
    const jid = newContact.phone.replace(/\D/g, '') + '@s.whatsapp.net';
    await fetch('/api/whatsapp-business/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, name: newContact.name, phone: newContact.phone }),
    });
    setNewContact({ phone: '', name: '' });
    setShowAddContact(false);
    load();
  };

  const sendViaBot = async () => {
    if (!selectedJid || !replyText.trim()) return;
    setSending(true);
    try {
      const phone = selectedJid.replace('@s.whatsapp.net', '');
      const res = await fetch('/api/whatsapp-business/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: replyText }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyText('');
        // Refresh messages
        const msgs = await fetch(`/api/whatsapp-business/messages?jid=${encodeURIComponent(selectedJid)}`);
        setMessages(await msgs.json());
      } else {
        alert(`Error: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  };

  const addLabel = async () => {
    if (!newLabel.name) return;
    const id = `custom_${Date.now()}`;
    await fetch('/api/whatsapp-business/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...newLabel }),
    });
    setNewLabel({ name: '', color: 0 });
    setShowAddLabel(false);
    load();
  };

  const filtered = conversations.filter(c =>
    (c.name ?? c.jid).toLowerCase().includes(search.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.jid === selectedJid);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💼</span>
          <div>
            <h1 className="text-xl font-bold">WhatsApp Business Observer</h1>
            <p className="text-green-200 text-sm">Solo lectura + organización · Sin envío de mensajes</p>
          </div>
        </div>
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="text-center"><div className="font-bold text-lg">{stats.conversations}</div><div className="text-green-200">Chats</div></div>
            <div className="text-center"><div className="font-bold text-lg text-yellow-300">{stats.unread}</div><div className="text-green-200">No leídos</div></div>
            <div className="text-center"><div className="font-bold text-lg">{stats.contacts}</div><div className="text-green-200">Contactos</div></div>
            <div className="text-center"><div className="font-bold text-lg">{stats.labels}</div><div className="text-green-200">Etiquetas</div></div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex gap-6">
        {(['conversations', 'contacts', 'labels'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
              tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'conversations' ? 'Conversaciones' : t === 'contacts' ? 'Contactos' : 'Etiquetas'}
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100vh-130px)]">
        {/* ── CONVERSATIONS TAB ── */}
        {tab === 'conversations' && (
          <>
            {/* List panel */}
            <div className="w-80 bg-white border-r flex flex-col">
              <div className="p-3 border-b space-y-2">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar conversación..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="arch" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
                  <label htmlFor="arch" className="text-sm text-gray-600">Mostrar archivadas</label>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    Sin conversaciones sincronizadas.<br/>Escanea el QR del observer para conectar.
                  </div>
                )}
                {filtered.map(conv => (
                  <div key={conv.jid}
                    onClick={() => setSelectedJid(conv.jid)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedJid === conv.jid ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm truncate">{conv.name ?? conv.jid}</span>
                          {conv.pinned && <span className="text-xs">📌</span>}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conv.labels.map(lid => {
                            const lbl = labels.find(l => l.id === lid);
                            return lbl ? (
                              <span key={lid} className="text-xs px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: LABEL_COLORS[lbl.color] ?? '#25D366' }}>
                                {lbl.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {conv.unreadCount > 0 && (
                          <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">{conv.unreadCount}</span>
                        )}
                        {conv.lastMessageTime && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(conv.lastMessageTime).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message panel */}
            <div className="flex-1 flex flex-col">
              {selectedConv ? (
                <>
                  {/* Chat header */}
                  <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">{selectedConv.name ?? selectedConv.jid}</h2>
                      <p className="text-xs text-gray-500">{selectedConv.jid}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Label buttons */}
                      <div className="flex gap-1 flex-wrap justify-end">
                        {labels.map(lbl => (
                          <button key={lbl.id}
                            onClick={() => applyLabel(selectedConv.jid, lbl.id, selectedConv.labels)}
                            className={`text-xs px-2 py-1 rounded-full border transition-all ${
                              selectedConv.labels.includes(lbl.id)
                                ? 'text-white border-transparent'
                                : 'text-gray-600 border-gray-300 bg-white'
                            }`}
                            style={selectedConv.labels.includes(lbl.id)
                              ? { backgroundColor: LABEL_COLORS[lbl.color] ?? '#25D366' }
                              : {}}>
                            {lbl.name}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => toggleArchive(selectedConv.jid, selectedConv.archived)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                        {selectedConv.archived ? '📤 Desarchivar' : '📁 Archivar'}
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 text-sm mt-8">Sin mensajes sincronizados aún</div>
                    )}
                    {[...messages].reverse().map(msg => (
                      <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm text-sm ${
                          msg.fromMe ? 'bg-[#DCF8C6] text-gray-800' : 'bg-white text-gray-800'
                        }`}>
                          {!msg.fromMe && msg.senderName && (
                            <p className="text-xs font-semibold text-green-700 mb-1">{msg.senderName}</p>
                          )}
                          <p>{msg.content}</p>
                          <p className="text-xs text-gray-400 text-right mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply via Bot */}
                  <div className="bg-white border-t px-4 py-3">
                    <p className="text-xs text-gray-400 mb-2">📤 Responder desde el número del bot (no desde tu número personal)</p>
                    <div className="flex gap-2">
                      <textarea
                        ref={replyRef}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendViaBot(); } }}
                        placeholder="Escribe un mensaje... (Enter para enviar)"
                        rows={2}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={sendViaBot}
                        disabled={sending || !replyText.trim()}
                        className="bg-green-600 text-white px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                        {sending ? '...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-400">
                    <div className="text-5xl mb-3">💬</div>
                    <p>Selecciona una conversación</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Contactos ({contacts.length})</h2>
              <button onClick={() => setShowAddContact(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                + Agregar contacto
              </button>
            </div>

            {showAddContact && (
              <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3 items-end shadow-sm">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Teléfono (con código de país)</label>
                  <input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                    placeholder="521234567890"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre del contacto"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <button onClick={addContact} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Guardar</button>
                <button onClick={() => setShowAddContact(false)} className="text-gray-400 text-sm px-2">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map(c => (
                <div key={c.jid} className="bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                      {(c.name ?? c.pushName ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name ?? c.pushName ?? 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{c.phone ?? c.jid}</p>
                    </div>
                  </div>
                  {c.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.labels.map(lid => {
                        const lbl = labels.find(l => l.id === lid);
                        return lbl ? (
                          <span key={lid} className="text-xs px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: LABEL_COLORS[lbl.color] ?? '#25D366' }}>
                            {lbl.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  Sin contactos sincronizados. Conecta el observer para sincronizar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LABELS TAB ── */}
        {tab === 'labels' && (
          <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Etiquetas ({labels.length})</h2>
              <button onClick={() => setShowAddLabel(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                + Nueva etiqueta
              </button>
            </div>

            {showAddLabel && (
              <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3 items-end shadow-sm">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={newLabel.name} onChange={e => setNewLabel(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Cliente VIP"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Color</label>
                  <select value={newLabel.color} onChange={e => setNewLabel(p => ({ ...p, color: Number(e.target.value) }))}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {Object.entries(LABEL_COLORS).map(([k, v]) => (
                      <option key={k} value={k} style={{ backgroundColor: v }}>Color {k}</option>
                    ))}
                  </select>
                </div>
                <button onClick={addLabel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Guardar</button>
                <button onClick={() => setShowAddLabel(false)} className="text-gray-400 text-sm px-2">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {labels.map(lbl => {
                const convCount = conversations.filter(c => c.labels.includes(lbl.id)).length;
                return (
                  <div key={lbl.id} className="bg-white border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: LABEL_COLORS[lbl.color] ?? '#25D366' }} />
                    <div className="flex-1">
                      <p className="font-medium">{lbl.name}</p>
                      <p className="text-xs text-gray-500">{convCount} conversación{convCount !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                );
              })}
              {labels.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  Sin etiquetas. Las etiquetas de tu WhatsApp Business se sincronizan automáticamente.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
