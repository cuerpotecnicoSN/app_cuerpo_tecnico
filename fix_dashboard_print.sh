sed -i '' 's/import { AreaChart, Area/import { usePrint } from "..\/components\/reports\/PrintContext";\
import InterventionReport from "..\/components\/reports\/InterventionReport";\
import PlayerSlideReport from "..\/components\/reports\/PlayerSlideReport";\
import StaffSlideReport from "..\/components\/reports\/StaffSlideReport";\
import { AreaChart, Area/g' src/pages/Dashboard.tsx

sed -i '' 's/const { t } = useTranslation();/const { t } = useTranslation();\
  const { printReport } = usePrint();/g' src/pages/Dashboard.tsx

sed -i '' '/<div className="flex flex-col sm:flex-row justify-between items-start/i\
        <div className="flex gap-2 mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">\
          <span className="text-slate-400 font-bold self-center">Probar Informes:</span>\
          <button onClick={() => printReport(<InterventionReport player={{name: "Sergio Navarro", birthDate: "01/01/2000", position: "Mediocentro"}} interventions={[]} />)} className="btn btn-sm btn-outline text-red-500 border-red-500 hover:bg-red-500 hover:text-white">Imprimir Tabla Excel</button>\
          <button onClick={() => printReport(<PlayerSlideReport player={{name: "SERGIO NAVARRO", position: "Mediocentro", info: "Información General"}} data={{personalInfo: "Jugador de la cantera...", sportsAssessment: "Buen rendimiento físico", implementation: "A mejorar", sportsInfo: "Partidos jugados: 10", development: "Progresión rápida", future: "Potencial alto"}} />)} className="btn btn-sm btn-outline text-white border-white hover:bg-white hover:text-black">Imprimir Diapositiva Jugador</button>\
          <button onClick={() => printReport(<StaffSlideReport staff={{name: "VALERIO BRANDI", role: "Technical Assistant", periodFrom: "Enero", periodTo: "Junio"}} data={{selfOrganization: "Buena gestión del tiempo", matchPlan: "Táctico", prePostTraining: "Siempre preparado", interventionFeedback: "Claro y directo", trainingExercises: "Innovadores", rolesResponsibilities: "Cumplidas", coachStaffRelationships: "Excelente compañerismo", keyPoints: "Liderazgo"}} />)} className="btn btn-sm btn-outline text-white border-white hover:bg-white hover:text-black">Imprimir Diapositiva Staff</button>\
        </div>\
' src/pages/Dashboard.tsx
