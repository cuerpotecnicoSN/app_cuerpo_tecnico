import type { CustomFieldDefinition, CustomTemplate } from '../types/customFields';

export const mockCustomFields: CustomFieldDefinition[] = [
  {
    id: 'cf_1',
    entityType: 'Jugador',
    name: 'Percepción de Fatiga (RPE)',
    type: 'scale',
    required: false,
    order: 1,
    roleAccess: ['admin', 'preparador_fisico']
  },
  {
    id: 'cf_2',
    entityType: 'Jugador',
    name: 'Pierna Buena',
    type: 'select',
    options: ['Diestro', 'Zurdo', 'Ambidiestro'],
    required: true,
    order: 2,
  },
  {
    id: 'cf_3',
    entityType: 'Reunion',
    name: 'Nivel de Atención',
    type: 'rating',
    required: false,
    order: 1,
  },
  {
    id: 'cf_4',
    entityType: 'Partido',
    name: 'Esquema Táctico Base',
    type: 'drawing',
    required: false,
    order: 1,
  }
];

export const mockTemplates: CustomTemplate[] = [
  {
    id: 'tpl_1',
    name: 'Informe Físico Semanal',
    entityType: 'Jugador',
    fieldIds: ['cf_1']
  }
];
