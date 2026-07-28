import { useState } from 'react';
import { mockCustomFields } from '../../data/mockCustomFields';
import type { EntityType, FieldType, CustomFieldDefinition } from '../../types/customFields';
import { Plus, GripVertical, Settings2, Trash2 } from 'lucide-react';

const ENTITIES: EntityType[] = ['Jugador', 'Entrenador', 'Reunion', 'Entrenamiento', 'Tarea', 'Partido', 'Evaluacion'];

const FormBuilder = () => {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('Jugador');
  const [fields] = useState<CustomFieldDefinition[]>(mockCustomFields);

  const entityFields = fields.filter(f => f.entityType === selectedEntity).sort((a, b) => a.order - b.order);

  const getTypeLabel = (type: FieldType) => {
    const labels: Record<FieldType, string> = {
      text: 'Texto Corto',
      longtext: 'Texto Largo',
      number: 'Número',
      date: 'Fecha',
      time: 'Hora',
      select: 'Desplegable',
      multiselect: 'Selección Múltiple',
      boolean: 'Sí/No',
      scale: 'Escala Numérica',
      rating: 'Valoración (Estrellas)',
      image: 'Imagen',
      video: 'Vídeo',
      file: 'Archivo',
      coordinates: 'Coordenadas (Campograma)',
      drawing: 'Dibujo Táctico'
    };
    return labels[type];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      
      {/* Sidebar - Select Entity */}
      <div className="card md:col-span-1">
        <h3 className="font-bold mb-4">Entidad a configurar</h3>
        <div className="flex flex-col gap-2">
          {ENTITIES.map(entity => (
            <button
              key={entity}
              className={`text-left px-4 py-2 rounded font-medium transition-colors ${
                selectedEntity === entity 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedEntity(entity)}
            >
              {entity}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area - Field List */}
      <div className="card md:col-span-3 min-h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="h3">Campos de {selectedEntity}</h3>
            <p className="text-sm text-muted">Estos campos aparecerán dinámicamente en los formularios de {selectedEntity.toLowerCase()}.</p>
          </div>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus size={18} />
            Nuevo Campo
          </button>
        </div>

        {entityFields.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <div className="text-center text-muted">
              <p>No hay campos personalizados configurados.</p>
              <button className="btn btn-outline mt-4">Crear el primer campo</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            {entityFields.map((field) => (
              <div 
                key={field.id} 
                className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:border-primary transition-colors group"
              >
                <div className="cursor-grab text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg">{field.name}</h4>
                    {field.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">Req</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Tipo: {getTypeLabel(field.type)}
                    </span>
                    {field.roleAccess && field.roleAccess.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Settings2 size={14} />
                        Solo: {field.roleAccess.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <Settings2 size={20} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default FormBuilder;
