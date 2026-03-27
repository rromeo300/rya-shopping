import Anthropic from '@anthropic-ai/sdk';
import {
  getProperties,
  createProperty,
  getTenants,
  createTenant,
  updateTenant,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getPayments,
  createPayment,
  updatePayment,
  getReminders,
  createReminder,
  updateReminder,
  getFinancialSummary,
  getDashboardStats,
  getExpenses,
  createExpense,
  updateExpense,
  getExpenseSummary,
  getIncomeRecords,
  createIncomeRecord,
  getIncomeSummary,
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  getAllMemory,
  saveMemory,
  deleteMemory,
} from './db';

export const propertyTools: Anthropic.Tool[] = [
  {
    name: 'list_properties',
    description: 'Lista todas las propiedades con sus inquilinos activos. Útil para tener un resumen general del portafolio.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_property',
    description: 'Crea una nueva propiedad en el sistema.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la propiedad',
        },
        address: {
          type: 'string',
          description: 'Dirección completa de la propiedad',
        },
        type: {
          type: 'string',
          enum: ['airbnb', 'direct', 'both'],
          description: 'Tipo de renta: airbnb, directa o ambas',
        },
        units: {
          type: 'number',
          description: 'Número de unidades/cuartos en la propiedad',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales sobre la propiedad',
        },
      },
      required: ['name', 'address', 'type', 'units'],
    },
  },
  {
    name: 'list_tenants',
    description: 'Lista inquilinos, con opción de filtrar por propiedad o estado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad para filtrar inquilinos (opcional)',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Estado del inquilino para filtrar (opcional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_tenant',
    description: 'Crea un nuevo inquilino en el sistema con todos sus datos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nombre completo del inquilino',
        },
        email: {
          type: 'string',
          description: 'Correo electrónico del inquilino',
        },
        phone: {
          type: 'string',
          description: 'Teléfono del inquilino',
        },
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad asignada',
        },
        unit: {
          type: 'string',
          description: 'Número o nombre de la unidad/cuarto',
        },
        rentAmount: {
          type: 'number',
          description: 'Monto mensual de renta',
        },
        leaseStart: {
          type: 'string',
          description: 'Fecha de inicio del contrato (ISO 8601)',
        },
        leaseEnd: {
          type: 'string',
          description: 'Fecha de fin del contrato (ISO 8601)',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Estado del inquilino',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales sobre el inquilino',
        },
      },
      required: ['name', 'propertyId', 'status'],
    },
  },
  {
    name: 'update_tenant',
    description: 'Actualiza la información de un inquilino existente (estado, renta, contrato, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID del inquilino a actualizar',
        },
        name: {
          type: 'string',
          description: 'Nombre del inquilino',
        },
        email: {
          type: 'string',
          description: 'Correo electrónico',
        },
        phone: {
          type: 'string',
          description: 'Teléfono',
        },
        unit: {
          type: 'string',
          description: 'Unidad asignada',
        },
        rentAmount: {
          type: 'number',
          description: 'Monto de renta',
        },
        leaseStart: {
          type: 'string',
          description: 'Inicio del contrato',
        },
        leaseEnd: {
          type: 'string',
          description: 'Fin del contrato',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Estado del inquilino',
        },
        notes: {
          type: 'string',
          description: 'Notas',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_maintenance',
    description: 'Lista solicitudes de mantenimiento con filtros opcionales por estado, prioridad o propiedad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Estado de la solicitud',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Prioridad de la solicitud',
        },
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_maintenance',
    description: 'Crea una nueva solicitud de mantenimiento para una propiedad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad que requiere mantenimiento',
        },
        title: {
          type: 'string',
          description: 'Título o resumen del problema',
        },
        description: {
          type: 'string',
          description: 'Descripción detallada del problema',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Prioridad de atención',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Estado inicial (por defecto: pending)',
        },
        assignedTo: {
          type: 'string',
          description: 'Persona o empresa asignada para el mantenimiento',
        },
        cost: {
          type: 'number',
          description: 'Costo estimado o real',
        },
        notes: {
          type: 'string',
          description: 'Notas adicionales',
        },
      },
      required: ['propertyId', 'title', 'priority'],
    },
  },
  {
    name: 'update_maintenance',
    description: 'Actualiza el estado, costo o notas de una solicitud de mantenimiento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID de la solicitud de mantenimiento',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Nuevo estado',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Nueva prioridad',
        },
        assignedTo: {
          type: 'string',
          description: 'Persona asignada',
        },
        cost: {
          type: 'number',
          description: 'Costo actualizado',
        },
        notes: {
          type: 'string',
          description: 'Notas actualizadas',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_payments',
    description: 'Lista pagos con filtros opcionales por estado, tipo, inquilino o propiedad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'overdue'],
          description: 'Estado del pago',
        },
        type: {
          type: 'string',
          enum: ['rent', 'deposit', 'maintenance', 'other'],
          description: 'Tipo de pago',
        },
        tenantId: {
          type: 'string',
          description: 'ID del inquilino',
        },
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_payment',
    description: 'Registra un nuevo pago (renta, depósito, mantenimiento u otro).',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantId: {
          type: 'string',
          description: 'ID del inquilino',
        },
        propertyId: {
          type: 'string',
          description: 'ID de la propiedad',
        },
        amount: {
          type: 'number',
          description: 'Monto del pago',
        },
        type: {
          type: 'string',
          enum: ['rent', 'deposit', 'maintenance', 'other'],
          description: 'Tipo de pago',
        },
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'overdue'],
          description: 'Estado del pago',
        },
        dueDate: {
          type: 'string',
          description: 'Fecha de vencimiento (ISO 8601)',
        },
        paidDate: {
          type: 'string',
          description: 'Fecha en que se realizó el pago (ISO 8601)',
        },
        notes: {
          type: 'string',
          description: 'Notas del pago',
        },
      },
      required: ['tenantId', 'propertyId', 'amount', 'type', 'status'],
    },
  },
  {
    name: 'update_payment',
    description: 'Actualiza un pago, por ejemplo para marcarlo como pagado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID del pago a actualizar',
        },
        status: {
          type: 'string',
          enum: ['pending', 'paid', 'overdue'],
          description: 'Nuevo estado del pago',
        },
        paidDate: {
          type: 'string',
          description: 'Fecha de pago (ISO 8601)',
        },
        amount: {
          type: 'number',
          description: 'Monto actualizado',
        },
        notes: {
          type: 'string',
          description: 'Notas actualizadas',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_reminders',
    description: 'Lista recordatorios, con opción de filtrar por estado (pending, done, cancelled).',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'done', 'cancelled'],
          description: 'Estado del recordatorio (por defecto muestra todos)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_reminder',
    description: 'Crea un nuevo recordatorio para el negocio (renta, mantenimiento, contrato, check-in, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Título del recordatorio',
        },
        description: {
          type: 'string',
          description: 'Descripción detallada',
        },
        dueDate: {
          type: 'string',
          description: 'Fecha y hora del recordatorio (ISO 8601)',
        },
        category: {
          type: 'string',
          enum: ['rent', 'maintenance', 'contract', 'general', 'checkin', 'checkout'],
          description: 'Categoría del recordatorio',
        },
        relatedId: {
          type: 'string',
          description: 'ID relacionado (inquilino, propiedad, etc.)',
        },
      },
      required: ['title', 'dueDate', 'category'],
    },
  },
  {
    name: 'update_reminder',
    description: 'Actualiza un recordatorio, por ejemplo para marcarlo como completado o cancelado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID del recordatorio',
        },
        status: {
          type: 'string',
          enum: ['pending', 'done', 'cancelled'],
          description: 'Nuevo estado del recordatorio',
        },
        title: {
          type: 'string',
          description: 'Título actualizado',
        },
        description: {
          type: 'string',
          description: 'Descripción actualizada',
        },
        dueDate: {
          type: 'string',
          description: 'Nueva fecha del recordatorio',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Obtiene un resumen financiero general: ingresos totales, gastos, pagos pendientes y pagos vencidos.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Obtiene estadísticas generales del negocio: número de propiedades, inquilinos activos, mantenimientos activos y recordatorios pendientes.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },

  // ── Expenses ──────────────────────────────────────────────
  {
    name: 'list_expenses',
    description: 'Lista los gastos registrados. Puede filtrar por propiedad o categoría (reparación, servicios, limpieza, administración, impuestos, otros).',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: { type: 'string', description: 'Filtrar por propiedad (opcional)' },
        category:   { type: 'string', description: 'Filtrar por categoría de gasto (opcional)' },
      },
      required: [],
    },
  },
  {
    name: 'create_expense',
    description: 'Registra un nuevo gasto (reparación, servicio, limpieza, administración, impuesto, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:         { type: 'string',  description: 'Descripción del gasto' },
        amount:        { type: 'number',  description: 'Monto del gasto' },
        category:      { type: 'string',  description: 'Categoría: reparacion, servicios, limpieza, administracion, impuestos, otros' },
        propertyId:    { type: 'string',  description: 'ID de la propiedad relacionada (opcional)' },
        vendor:        { type: 'string',  description: 'Proveedor o persona que cobró' },
        date:          { type: 'string',  description: 'Fecha del gasto (ISO 8601)' },
        paymentMethod: { type: 'string',  description: 'Método de pago: efectivo, transferencia, tarjeta' },
        notes:         { type: 'string',  description: 'Notas adicionales' },
      },
      required: ['title', 'amount', 'category', 'date'],
    },
  },
  {
    name: 'get_expense_summary',
    description: 'Obtiene un resumen de gastos agrupados por categoría, opcionalmente por propiedad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: { type: 'string', description: 'Filtrar por propiedad (opcional)' },
      },
      required: [],
    },
  },

  // ── Income Records ─────────────────────────────────────────
  {
    name: 'list_income',
    description: 'Lista los ingresos registrados. Puede filtrar por propiedad o fuente (airbnb, direct, other).',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: { type: 'string', description: 'Filtrar por propiedad (opcional)' },
        source:     { type: 'string', enum: ['airbnb', 'direct', 'other'], description: 'Fuente del ingreso' },
      },
      required: [],
    },
  },
  {
    name: 'create_income',
    description: 'Registra un nuevo ingreso (renta de Airbnb, renta directa, depósito, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:      { type: 'string', description: 'Descripción del ingreso' },
        amount:     { type: 'number', description: 'Monto del ingreso' },
        source:     { type: 'string', enum: ['airbnb', 'direct', 'other'], description: 'Fuente del ingreso' },
        date:       { type: 'string', description: 'Fecha del ingreso (ISO 8601)' },
        propertyId: { type: 'string', description: 'ID de la propiedad (opcional)' },
        tenantId:   { type: 'string', description: 'ID del inquilino (opcional)' },
        notes:      { type: 'string', description: 'Notas adicionales' },
      },
      required: ['title', 'amount', 'source', 'date'],
    },
  },
  {
    name: 'get_income_summary',
    description: 'Obtiene un resumen de ingresos totales y desglosados por fuente (Airbnb vs renta directa).',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: { type: 'string', description: 'Filtrar por propiedad (opcional)' },
      },
      required: [],
    },
  },

  // ── Inventory ──────────────────────────────────────────────
  {
    name: 'list_inventory',
    description: 'Lista el inventario de una propiedad: muebles, electrodomésticos, utensilios, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId: { type: 'string', description: 'ID de la propiedad (opcional para ver todo)' },
        category:   { type: 'string', description: 'Filtrar por categoría (opcional)' },
      },
      required: [],
    },
  },
  {
    name: 'create_inventory_item',
    description: 'Agrega un artículo al inventario de una propiedad.',
    input_schema: {
      type: 'object' as const,
      properties: {
        propertyId:    { type: 'string', description: 'ID de la propiedad' },
        name:          { type: 'string', description: 'Nombre del artículo' },
        category:      { type: 'string', description: 'Categoría: muebles, electrodomesticos, cocina, baño, cama, decoracion, otros' },
        quantity:      { type: 'number', description: 'Cantidad' },
        unit:          { type: 'string', description: 'Unidad: pieza, juego, par, etc.' },
        condition:     { type: 'string', enum: ['new', 'good', 'fair', 'poor', 'damaged'], description: 'Condición del artículo' },
        purchaseValue: { type: 'number', description: 'Valor de compra (opcional)' },
        location:      { type: 'string', description: 'Ubicación dentro de la propiedad (recámara, sala, etc.)' },
        notes:         { type: 'string', description: 'Notas adicionales' },
      },
      required: ['propertyId', 'name', 'category', 'quantity'],
    },
  },
  {
    name: 'update_inventory_item',
    description: 'Actualiza un artículo del inventario (cantidad, condición, notas).',
    input_schema: {
      type: 'object' as const,
      properties: {
        id:        { type: 'string', description: 'ID del artículo' },
        quantity:  { type: 'number', description: 'Nueva cantidad' },
        condition: { type: 'string', enum: ['new', 'good', 'fair', 'poor', 'damaged'] },
        notes:     { type: 'string', description: 'Notas actualizadas' },
      },
      required: ['id'],
    },
  },

  // ── Self-Learning Memory ───────────────────────────────────
  {
    name: 'save_memory',
    description: 'Guarda algo que aprendiste sobre el usuario o su negocio para recordarlo en futuras conversaciones. Úsalo cuando el usuario te diga algo importante sobre sus preferencias, reglas de negocio, o datos clave.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key:      { type: 'string', description: 'Clave descriptiva única, ej: "moneda_preferida", "dia_cobro_renta", "nombre_plomero"' },
        value:    { type: 'string', description: 'Valor a recordar' },
        category: { type: 'string', enum: ['preference', 'business_rule', 'pattern', 'contact', 'fact'], description: 'Tipo de memoria' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'list_memory',
    description: 'Lista todo lo que el asistente ha aprendido y memorizado sobre el usuario y su negocio.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'delete_memory',
    description: 'Elimina algo memorizado que ya no es válido o es incorrecto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'Clave de la memoria a eliminar' },
      },
      required: ['key'],
    },
  },
];

export function executeToolCall(toolName: string, toolInput: Record<string, unknown>): string {
  try {
    switch (toolName) {
      case 'list_properties': {
        const properties = getProperties();
        const result = properties.map((p) => {
          const tenants = getTenants(p.id).filter((t) => t.status === 'active');
          return { ...p, activeTenants: tenants };
        });
        return JSON.stringify({ properties: result, count: result.length });
      }

      case 'create_property': {
        const { name, address, type, units, notes } = toolInput as {
          name: string;
          address: string;
          type: 'airbnb' | 'direct' | 'both';
          units: number;
          notes?: string;
        };
        const property = createProperty({ name, address, type, units: Number(units), notes });
        return JSON.stringify({ success: true, property });
      }

      case 'list_tenants': {
        const { propertyId, status } = toolInput as { propertyId?: string; status?: string };
        let tenants = getTenants(propertyId);
        if (status) {
          tenants = tenants.filter((t) => t.status === status);
        }
        return JSON.stringify({ tenants, count: tenants.length });
      }

      case 'create_tenant': {
        const data = toolInput as {
          name: string;
          email?: string;
          phone?: string;
          propertyId: string;
          unit?: string;
          rentAmount?: number;
          leaseStart?: string;
          leaseEnd?: string;
          status: 'active' | 'inactive';
          notes?: string;
        };
        const tenant = createTenant({
          ...data,
          status: data.status ?? 'active',
        });
        return JSON.stringify({ success: true, tenant });
      }

      case 'update_tenant': {
        const { id, ...data } = toolInput as { id: string; [key: string]: unknown };
        const tenant = updateTenant(id, data);
        if (!tenant) return JSON.stringify({ success: false, error: 'Inquilino no encontrado' });
        return JSON.stringify({ success: true, tenant });
      }

      case 'list_maintenance': {
        const filters = toolInput as { status?: string; priority?: string; propertyId?: string };
        const requests = getMaintenanceRequests(filters);
        return JSON.stringify({ requests, count: requests.length });
      }

      case 'create_maintenance': {
        const data = toolInput as {
          propertyId: string;
          title: string;
          description?: string;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          assignedTo?: string;
          cost?: number;
          notes?: string;
        };
        const request = createMaintenanceRequest({
          ...data,
          status: data.status ?? 'pending',
        });
        return JSON.stringify({ success: true, request });
      }

      case 'update_maintenance': {
        const { id, ...data } = toolInput as { id: string; [key: string]: unknown };
        const request = updateMaintenanceRequest(id, data);
        if (!request) return JSON.stringify({ success: false, error: 'Solicitud de mantenimiento no encontrada' });
        return JSON.stringify({ success: true, request });
      }

      case 'list_payments': {
        const filters = toolInput as { status?: string; type?: string; tenantId?: string; propertyId?: string };
        const payments = getPayments(filters);
        return JSON.stringify({ payments, count: payments.length });
      }

      case 'create_payment': {
        const data = toolInput as {
          tenantId: string;
          propertyId: string;
          amount: number;
          type: 'rent' | 'deposit' | 'maintenance' | 'other';
          status: 'pending' | 'paid' | 'overdue';
          dueDate?: string;
          paidDate?: string;
          notes?: string;
        };
        const payment = createPayment({ ...data, amount: Number(data.amount) });
        return JSON.stringify({ success: true, payment });
      }

      case 'update_payment': {
        const { id, ...data } = toolInput as { id: string; [key: string]: unknown };
        const payment = updatePayment(id, data);
        if (!payment) return JSON.stringify({ success: false, error: 'Pago no encontrado' });
        return JSON.stringify({ success: true, payment });
      }

      case 'list_reminders': {
        const { status } = toolInput as { status?: string };
        const reminders = getReminders(status);
        return JSON.stringify({ reminders, count: reminders.length });
      }

      case 'create_reminder': {
        const data = toolInput as {
          title: string;
          description?: string;
          dueDate: string;
          category: 'rent' | 'maintenance' | 'contract' | 'general' | 'checkin' | 'checkout';
          relatedId?: string;
        };
        const reminder = createReminder({ ...data, status: 'pending' });
        return JSON.stringify({ success: true, reminder });
      }

      case 'update_reminder': {
        const { id, ...data } = toolInput as { id: string; [key: string]: unknown };
        const reminder = updateReminder(id, data);
        if (!reminder) return JSON.stringify({ success: false, error: 'Recordatorio no encontrado' });
        return JSON.stringify({ success: true, reminder });
      }

      case 'get_financial_summary': {
        const summary = getFinancialSummary();
        return JSON.stringify(summary);
      }

      case 'get_dashboard_stats': {
        const stats = getDashboardStats();
        return JSON.stringify(stats);
      }

      case 'list_expenses': {
        const { propertyId, category } = toolInput as { propertyId?: string; category?: string };
        const expenses = getExpenses(propertyId, category);
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        return JSON.stringify({ expenses, count: expenses.length, total });
      }

      case 'create_expense': {
        const data = toolInput as {
          title: string; amount: number; category: string; date: string;
          propertyId?: string; vendor?: string; paymentMethod?: string; notes?: string;
        };
        const expense = createExpense({ ...data, amount: Number(data.amount), paymentMethod: data.paymentMethod ?? 'efectivo' });
        return JSON.stringify({ success: true, expense });
      }

      case 'get_expense_summary': {
        const { propertyId } = toolInput as { propertyId?: string };
        const summary = getExpenseSummary(propertyId);
        const total = Object.values(summary).reduce((s, v) => s + v, 0);
        return JSON.stringify({ summary, total });
      }

      case 'list_income': {
        const { propertyId, source } = toolInput as { propertyId?: string; source?: string };
        const records = getIncomeRecords(propertyId, source);
        const total = records.reduce((s, r) => s + r.amount, 0);
        return JSON.stringify({ records, count: records.length, total });
      }

      case 'create_income': {
        const data = toolInput as {
          title: string; amount: number; source: 'airbnb' | 'direct' | 'other'; date: string;
          propertyId?: string; tenantId?: string; notes?: string;
        };
        const record = createIncomeRecord({ ...data, amount: Number(data.amount) });
        return JSON.stringify({ success: true, record });
      }

      case 'get_income_summary': {
        const { propertyId } = toolInput as { propertyId?: string };
        const summary = getIncomeSummary(propertyId);
        return JSON.stringify(summary);
      }

      case 'list_inventory': {
        const { propertyId, category } = toolInput as { propertyId?: string; category?: string };
        const items = getInventory(propertyId, category);
        return JSON.stringify({ items, count: items.length });
      }

      case 'create_inventory_item': {
        const data = toolInput as {
          propertyId: string; name: string; category: string; quantity: number;
          unit?: string; condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
          purchaseValue?: number; location?: string; notes?: string;
        };
        const item = createInventoryItem({
          ...data,
          quantity: Number(data.quantity),
          unit: data.unit ?? 'pieza',
          condition: data.condition ?? 'good',
        });
        return JSON.stringify({ success: true, item });
      }

      case 'update_inventory_item': {
        const { id, ...data } = toolInput as { id: string; [key: string]: unknown };
        const item = updateInventoryItem(id, data);
        if (!item) return JSON.stringify({ success: false, error: 'Artículo no encontrado' });
        return JSON.stringify({ success: true, item });
      }

      case 'save_memory': {
        const { key, value, category } = toolInput as {
          key: string; value: string; category?: 'preference' | 'business_rule' | 'pattern' | 'contact' | 'fact';
        };
        const memory = saveMemory(key, value, category ?? 'preference');
        return JSON.stringify({ success: true, memory });
      }

      case 'list_memory': {
        const memories = getAllMemory();
        return JSON.stringify({ memories, count: memories.length });
      }

      case 'delete_memory': {
        const { key } = toolInput as { key: string };
        const deleted = deleteMemory(key);
        return JSON.stringify({ success: deleted });
      }

      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: `Error ejecutando ${toolName}: ${message}` });
  }
}
