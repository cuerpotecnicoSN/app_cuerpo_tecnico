export type FieldType = 
  | 'text' 
  | 'longtext' 
  | 'number' 
  | 'date' 
  | 'time' 
  | 'select' 
  | 'multiselect' 
  | 'boolean' 
  | 'scale' 
  | 'rating' 
  | 'image' 
  | 'video' 
  | 'file' 
  | 'coordinates' 
  | 'drawing';

export type EntityType = 
  | 'Jugador'
  | 'Entrenador'
  | 'Reunion'
  | 'Entrenamiento'
  | 'Tarea'
  | 'Partido'
  | 'Evaluacion';

export interface CustomFieldDefinition {
  id: string;
  entityType: EntityType;
  name: string;
  type: FieldType;
  options?: string[]; // Para select, multiselect
  required: boolean;
  order: number;
  roleAccess?: string[]; // Array de roles que pueden ver/editar. Vacio = todos
}

export interface CustomTemplate {
  id: string;
  name: string;
  entityType: EntityType;
  fieldIds: string[];
}
