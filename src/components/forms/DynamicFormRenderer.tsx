import React from 'react';
import type { CustomFieldDefinition } from '../../types/customFields';
import { Star } from 'lucide-react';

interface DynamicFormRendererProps {
  fields: CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  userRole?: string;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ fields, values, onChange, userRole }) => {
  // Filter fields by role
  const visibleFields = fields.filter(field => {
    if (!field.roleAccess || field.roleAccess.length === 0) return true;
    if (!userRole) return false;
    return field.roleAccess.includes(userRole);
  });

  if (visibleFields.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
      <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        Campos Personalizados del Club
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFields.map(field => {
          const val = values[field.id] || '';

          return (
            <div key={field.id} className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {field.name} {field.required && <span className="text-red-500">*</span>}
              </label>

              {/* TEXT */}
              {field.type === 'text' && (
                <input 
                  type="text" 
                  className="input p-2 border rounded" 
                  value={val} 
                  onChange={(e) => onChange(field.id, e.target.value)} 
                  required={field.required}
                />
              )}

              {/* LONG TEXT */}
              {field.type === 'longtext' && (
                <textarea 
                  className="input p-2 border rounded" 
                  rows={3} 
                  value={val} 
                  onChange={(e) => onChange(field.id, e.target.value)} 
                  required={field.required}
                />
              )}

              {/* NUMBER / SCALE */}
              {(field.type === 'number' || field.type === 'scale') && (
                <input 
                  type="number" 
                  className="input p-2 border rounded" 
                  value={val} 
                  onChange={(e) => onChange(field.id, Number(e.target.value))} 
                  required={field.required}
                />
              )}

              {/* BOOLEAN */}
              {field.type === 'boolean' && (
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name={field.id} checked={val === true} onChange={() => onChange(field.id, true)} />
                    Sí
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name={field.id} checked={val === false} onChange={() => onChange(field.id, false)} />
                    No
                  </label>
                </div>
              )}

              {/* SELECT */}
              {field.type === 'select' && (
                <select 
                  className="input p-2 border rounded" 
                  value={val} 
                  onChange={(e) => onChange(field.id, e.target.value)}
                  required={field.required}
                >
                  <option value="">Selecciona...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {/* RATING */}
              {field.type === 'rating' && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className="transition-colors"
                      onClick={() => onChange(field.id, star)}
                    >
                      <Star 
                        size={24} 
                        className={star <= (val as number || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* DRAWING / COORDINATES (Mocked for now) */}
              {(field.type === 'drawing' || field.type === 'coordinates') && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-4 text-center text-sm text-muted bg-white dark:bg-gray-800">
                  Hacer clic para abrir herramienta interactiva (Campograma/Pizarra)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DynamicFormRenderer;
