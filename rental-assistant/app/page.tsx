'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/lib/db';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  category: string;
}

const categoryLabels: Record<string, string> = {
  rent: 'Renta',
  maintenance: 'Mantenimiento',
  contract: 'Contrato',
  general: 'General',
  checkin: 'Check-in',
  checkout: 'Check-out',
};

const categoryColors: Record<string, string> = {
  rent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  contract: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  checkin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  checkout: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoadingStats(false);
      })
      .catch(() => setLoadingStats(false));

    // Fetch pending reminders via chat API isn't ideal here;
    // use a dedicated reminders endpoint instead.
    // For now, we'll show a placeholder.
    setReminders([]);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Asistente de Propiedades
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Panel de control — Gestión de rentas Airbnb y directas
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Propiedades"
          value={loadingStats ? '—' : (stats?.propertiesCount ?? 0)}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          color="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="Inquilinos Activos"
          value={loadingStats ? '—' : (stats?.tenantsCount ?? 0)}
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-green-50 dark:bg-green-950"
        />
        <StatCard
          title="Mantenimiento Activo"
          value={loadingStats ? '—' : (stats?.activeMaintenance ?? 0)}
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-orange-50 dark:bg-orange-950"
        />
        <StatCard
          title="Recordatorios Pendientes"
          value={loadingStats ? '—' : (stats?.pendingReminders ?? 0)}
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
          color="bg-purple-50 dark:bg-purple-950"
        />
      </div>

      {/* Quick actions + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Acceso Rápido</h2>

          <Link
            href="/chat"
            className="flex items-center gap-4 p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Chat con Asistente</p>
              <p className="text-sm text-blue-100">Habla con la IA sobre tus propiedades</p>
            </div>
            <svg className="w-5 h-5 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Telegram setup card */}
          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4l-2.94-.918c-.64-.203-.658-.64.136-.954l11.46-4.42c.537-.194 1.006.131.978.113z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Bot de Telegram</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Integración de mensajería</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Configura el bot de Telegram para gestionar tus propiedades desde la app.
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-700 dark:text-gray-300">
              <p className="text-gray-500 dark:text-gray-500 mb-1"># Webhook URL:</p>
              <p className="break-all">https://tu-dominio.com/api/telegram</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Configura <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">TELEGRAM_BOT_TOKEN</code> en{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.local</code>
            </p>
          </div>
        </div>

        {/* Reminders section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recordatorios Recientes
            </h2>
            <Link
              href="/chat"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos en chat
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {reminders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">No hay recordatorios pendientes</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Usa el chat para crear recordatorios de renta, mantenimiento y más.
                </p>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear recordatorio
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{reminder.title}</p>
                      {reminder.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{reminder.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[reminder.category] ?? categoryColors.general}`}>
                        {categoryLabels[reminder.category] ?? reminder.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(reminder.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-100 dark:border-blue-900">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Comenzar a usar el asistente</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Ve al{' '}
              <Link href="/chat" className="font-medium underline">
                chat
              </Link>{' '}
              y dile al asistente: &quot;Registra una propiedad&quot;, &quot;Lista mis inquilinos&quot;, &quot;¿Qué pagos están pendientes?&quot; o &quot;Crea un recordatorio de cobro de renta&quot;.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
