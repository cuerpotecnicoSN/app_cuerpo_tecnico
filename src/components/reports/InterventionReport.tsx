


interface InterventionReportProps {
  player: {
    name: string;
    birthDate: string;
    position: string;
  };
  interventions: {
    date: string;
    location: string;
    development: string;
    topics: string;
    nextSteps: string;
    coach: string;
  }[];
}

export default function InterventionReport({ player, interventions }: InterventionReportProps) {
  return (
    <div className="w-full h-screen bg-white text-black p-8 font-sans">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-xl font-bold border-b border-black pb-1 mb-2">Datos del Jugador</h2>
        <div className="bg-red-50 border border-slate-300 w-1/3 mb-8">
          <div className="flex border-b border-slate-300">
            <span className="font-bold w-40 p-2 text-sm bg-red-100/50">Nombre Completo:</span>
            <span className="p-2 text-sm flex-1">{player.name}</span>
          </div>
          <div className="flex border-b border-slate-300">
            <span className="font-bold w-40 p-2 text-sm bg-red-100/50">Fecha de Nacimiento:</span>
            <span className="p-2 text-sm flex-1">{player.birthDate}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-40 p-2 text-sm bg-red-100/50">Posicion:</span>
            <span className="p-2 text-sm flex-1">{player.position}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">Historial de Intervenciones y Seguimiento</h2>
        <table className="w-full border-collapse border border-slate-300 text-sm">
          <thead>
            <tr className="bg-red-100/70 border-b-2 border-slate-400">
              <th className="p-3 text-center border-r border-slate-300">Fecha</th>
              <th className="p-3 text-center border-r border-slate-300">Lugar de la reunión</th>
              <th className="p-3 text-center border-r border-slate-300">Desarrollo de la intervención</th>
              <th className="p-3 text-center border-r border-slate-300">Temas tratados</th>
              <th className="p-3 text-center border-r border-slate-300">Siguientes pasos</th>
              <th className="p-3 text-center">Entrenador</th>
            </tr>
          </thead>
          <tbody>
            {interventions.length > 0 ? (
              interventions.map((int, i) => (
                <tr key={i} className="border-b border-slate-300 hover:bg-slate-50">
                  <td className="p-3 border-r border-slate-300 text-center">{int.date}</td>
                  <td className="p-3 border-r border-slate-300">{int.location}</td>
                  <td className="p-3 border-r border-slate-300">{int.development}</td>
                  <td className="p-3 border-r border-slate-300">{int.topics}</td>
                  <td className="p-3 border-r border-slate-300">{int.nextSteps}</td>
                  <td className="p-3 text-center">{int.coach}</td>
                </tr>
              ))
            ) : (
              // Filas vacías por defecto si no hay datos para rellenar el excel
              Array(10).fill(null).map((_, i) => (
                <tr key={i} className="border-b border-slate-300 h-10">
                  <td className="border-r border-slate-300"></td>
                  <td className="border-r border-slate-300"></td>
                  <td className="border-r border-slate-300"></td>
                  <td className="border-r border-slate-300"></td>
                  <td className="border-r border-slate-300"></td>
                  <td></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
