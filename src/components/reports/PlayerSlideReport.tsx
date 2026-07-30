

interface PlayerSlideReportProps {
  player: {
    name: string;
    position: string;
    info: string;
  };
  data: {
    personalInfo: string;
    sportsAssessment: string;
    implementation: string;
    sportsInfo: string;
    development: string;
    future: string;
  };
}

export default function PlayerSlideReport({ player, data }: PlayerSlideReportProps) {
  return (
    <div className="w-full h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header - Black area */}
      <div className="bg-black text-white h-1/3 min-h-[300px] flex items-center justify-between px-16 relative">
        <div className="flex items-center">
          <img src="/escudo.png" alt="Logo" className="w-40 h-40 object-contain" />
        </div>
        
        <div className="text-right">
          <h1 className="text-5xl font-serif mb-2">{player.name}</h1>
          <h2 className="text-2xl text-slate-400 font-light italic mb-1">{player.position}</h2>
          <h3 className="text-xl text-slate-500 font-light italic">{player.info}</h3>
        </div>

        {/* Red line separator */}
        <div className="absolute bottom-4 left-1/4 right-0 h-0.5 bg-red-600"></div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 bg-white p-12 mx-4 mb-4 shadow-xl grid grid-cols-3 gap-8 content-start">
        <div className="space-y-2">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Personal information, life history
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.personalInfo || 'Campo a cubrir'}</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Sports self-assessment
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.sportsAssessment || 'Campo a cubrir'}</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Implementation
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.implementation || 'Campo a cubrir'}</p>
        </div>

        <div className="space-y-2 pt-8">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Sports information
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.sportsInfo || 'Campo a cubrir'}</p>
        </div>

        <div className="space-y-2 pt-8">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Development and dynamics
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.development || 'Campo a cubrir'}</p>
        </div>

        <div className="space-y-2 pt-8">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
            Future
          </h3>
          <p className="text-slate-400 text-sm pl-4">{data.future || 'Campo a cubrir'}</p>
        </div>
      </div>
    </div>
  );
}
