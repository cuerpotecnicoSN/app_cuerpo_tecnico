import React from 'react';

interface StaffSlideReportProps {
  staff: {
    name: string;
    role: string;
    periodFrom: string;
    periodTo: string;
  };
  data: {
    selfOrganization: string;
    matchPlan: string;
    prePostTraining: string;
    interventionFeedback: string;
    trainingExercises: string;
    rolesResponsibilities: string;
    coachStaffRelationships: string;
    keyPoints: string;
  };
}

export default function StaffSlideReport({ staff, data }: StaffSlideReportProps) {
  return (
    <div className="w-full h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header - Black area */}
      <div className="bg-black text-white h-1/4 min-h-[220px] flex items-center justify-between px-16 relative">
        <div className="flex items-center">
          <img src="/escudo.png" alt="Logo" className="w-24 h-24 object-contain" />
        </div>
        
        <div className="text-right">
          <h1 className="text-4xl font-serif mb-2 uppercase">{staff.name}</h1>
          <h2 className="text-2xl text-slate-400 font-light mb-4">{staff.role}</h2>
          <div className="text-lg text-slate-300 font-light border-b border-red-600 pb-2 inline-block">
            Observation period from <span className="font-semibold">{staff.periodFrom}</span> to <span className="font-semibold">{staff.periodTo}</span>
          </div>
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="flex-1 bg-white mx-4 mb-4 shadow-xl grid grid-cols-4 content-start">
        {/* Column 1 */}
        <div className="border-r border-slate-200 p-8 space-y-16">
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Self-organization</h3>
            <p className="text-slate-500 text-sm">{data.selfOrganization || ''}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Match plan</h3>
            <p className="text-slate-500 text-sm">{data.matchPlan || ''}</p>
          </div>
        </div>

        {/* Column 2 */}
        <div className="border-r border-slate-200 p-8 space-y-16">
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Pre and post-training</h3>
            <p className="text-slate-500 text-sm">{data.prePostTraining || ''}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Intervention, feedback, positioning</h3>
            <p className="text-slate-500 text-sm">{data.interventionFeedback || ''}</p>
          </div>
        </div>

        {/* Column 3 */}
        <div className="border-r border-slate-200 p-8 space-y-16">
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Training and exercises</h3>
            <p className="text-slate-500 text-sm">{data.trainingExercises || ''}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Roles and responsibilities</h3>
            <p className="text-slate-500 text-sm">{data.rolesResponsibilities || ''}</p>
          </div>
        </div>

        {/* Column 4 */}
        <div className="p-8 space-y-16">
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Coach - staff and coach - player(s) relationships</h3>
            <p className="text-slate-500 text-sm">{data.coachStaffRelationships || ''}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-center text-sm">Key points</h3>
            <p className="text-slate-500 text-sm">{data.keyPoints || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
