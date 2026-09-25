import { 
  X, 
  BookOpen, 
  HelpCircle, 
  Layers
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaniniMethodologyNotesModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-wide">
                  Guía Metodológica y Glosario Oficial Panini
                </h3>
                <span className="text-[10px] uppercase font-black tracking-widest bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Pág. 20 (Note e Approfondimenti)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Criterios de lectura, fórmulas de cálculo y directrices técnicas de Panini Digital Match Analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-gray-700 dark:text-gray-300">
          
          {/* 1. Código de Colores y Portada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-400 text-xs uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow-sm"></span>
                Equipo Local (Home)
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                El color <strong className="text-red-600 dark:text-red-400">rojo</strong> identifica toda la información, gráficos, remates y métricas del equipo que juega en casa.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-blue-700 dark:text-blue-400 text-xs uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-blue-700 inline-block shadow-sm"></span>
                Equipo Visitante (Away)
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                El color <strong className="text-blue-700 dark:text-blue-400">azul oscuro</strong> identifica las informaciones y datos del equipo visitante.
              </p>
            </div>
          </div>

          {/* 2. Definiciones Clave del SCORE (Pág. 3) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-b border-gray-100 dark:border-neutral-800 pb-2">
              <HelpCircle size={16} /> Glosario Oficial de Métricas Panini (Score - Pág. 3)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  ⚽ Balones Jugados (Palle Giocate)
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Cuenta cada vez que un jugador entra en posesión del balón. Si un jugador realiza varios toques en una misma acción individual, se contabiliza como <strong>un único balón jugado</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  🎯 % Pases Acertados (Passaggi Riusciti)
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Es la relación porcentual directa entre el <strong>total de pases acertados</strong> y el <strong>total de balones jugados</strong> del equipo o jugador.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  ⚡ Jugadas / Acciones Útiles (Giocate Utili)
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Identifican cualquier gesto técnico (regate, pase filtrado, cambio de orientación) que haya determinado la <strong>eliminación de un adversario</strong> de la fase defensiva rival.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  📍 Baricentro (Altura Media)
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Es el <strong>punto medio (en metros)</strong> entre todas las zonas del campo donde el equipo ha tocado el balón a lo largo del periodo analizado.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  🗺️ Supremacía Territorial
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Tiempo total y porcentaje de posesión de balón acumulado por un equipo en la <strong>mitad de campo adversaria</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  🥊 Pressing (Punto de Recuperación)
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Punto medio (en metros) en el cual el equipo ha <strong>recuperado la posesión del balón</strong> tras presión o duelo defensivo.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  🛡️ % Protección de Área
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Índice sintético Panini que evalúa la capacidad y solidez de un equipo para <strong>defender su propia portería</strong> y neutralizar incursiones en el área.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-white/5 space-y-1">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  🏹 % Ataque a Portería
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Índice sintético Panini que cuantifica la eficacia y agresividad de un equipo para <strong>atacar y amenazar la portería rival</strong>.
                </p>
              </div>

            </div>
          </div>

          {/* 3. Estructura de Secciones (Páginas 2 a 19) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-b border-gray-100 dark:border-neutral-800 pb-2">
              <Layers size={16} /> Estructura de Secciones e Interpretación Gráfica
            </div>

            <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
              
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Pág. 2 - Formaciones y Disposición Táctica:</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  En el campo gráfico, cada jugador se ubica en el <strong>punto medio calculado</strong> entre todas las posiciones en las que recibió el balón.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Págs. 4-5 - Disposición Táctica y Densidad de Juego (1T / 2T):</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Muestra la longitud media (eje X) y amplitud media (eje Y) del bloque sin contar al portero, junto a las densidades por 3 zonas exteriores y la <strong>cuadrícula 9x7 en verde</strong> que resalta las zonas de mayor concentración de balones jugados.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Págs. 6-7 - Cobertura Territorial (Regates y Centros):</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Representación de izquierda a derecha (hacia ataque) con las coordenadas de regates útiles/fallidos y centros al área, complementada con los porcentajes por tercios longitudinales y carriles.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Págs. 8-9 - Estudio de Finalizaciones y ABP:</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Línea temporal de tiros en intervalos de 15 minutos, modalidades de remate, eficacia en balón parado (ABP) y mapa de remates con simbología: <strong>Círculo</strong> (1ª Parte), <strong>Cuadrado</strong> (2ª Parte) y <strong>color claro</strong> para acciones a balón parado. La portería resalta la secuencia y zona de entrada del gol.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Págs. 10-11 - Flujos de Juego (Red de Pases):</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Campograma con flechas de flujo y matriz cruzada (DA \ A) detallando el número de combinaciones entre cada pareja de jugadores y el porcentaje individual de acierto en el pase.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/40 border border-gray-100 dark:border-white/5">
                <span className="font-bold text-gray-900 dark:text-white">Págs. 12-19 - Zoom Individual de Jugadores y Rankings Top 5:</span>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Ficha con estadísticas de rol para cada jugador (titulares y suplentes) con 2 campogramas verticales (1T y 2T) orientados hacia arriba (ataque ↑) y tono claro para balón parado. Concluye con el <strong>Top 5 de jugadores</strong> por equipo en las 9 categorías oficiales de rendimiento.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-800/60 border-t border-gray-100 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
