#!/bin/bash

# Fix EditProfileModal.tsx
sed -i '' 's/\.catch(\(.*\));//g' src/components/auth/EditProfileModal.tsx

# Fix WeeklyCalendar.tsx
sed -i '' 's/const { t } = useTranslation();//g' src/components/dashboard/WeeklyCalendar.tsx
sed -i '' 's/import { useTranslation } from '"'react-i18next'"';//g' src/components/dashboard/WeeklyCalendar.tsx

# Fix AIAnalysisView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/AIAnalysisView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/AIAnalysisView.tsx

# Fix AnalysisHubView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/AnalysisHubView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/AnalysisHubView.tsx

# Fix BodyMap.tsx
sed -i '' 's/const severityColor =/const _severityColor =/g' src/components/pro/BodyMap.tsx

# Fix ChatView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/ChatView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/ChatView.tsx

# Fix CompetitionVideoHistoryView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/CompetitionVideoHistoryView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/CompetitionVideoHistoryView.tsx

# Fix DevPlanView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/DevPlanView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/DevPlanView.tsx

# Fix DocView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/DocView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/DocView.tsx

# Fix MedicalView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/MedicalView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/MedicalView.tsx

# Fix MultimediaView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/MultimediaView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/MultimediaView.tsx

# Fix PhysicalView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/PhysicalView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/PhysicalView.tsx

# Fix PlayerImportModal.tsx
sed -i '' 's/import React, { useState/import { useState/g' src/components/pro/PlayerImportModal.tsx

# Fix PlayerInjuriesTab.tsx
sed -i '' 's/import { supabase } from '"'"'..\/..\/..\/lib\/supabase'"'"';//g' src/components/pro/PlayerInjuriesTab.tsx

# Fix PlayersManagementView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/PlayersManagementView.tsx

# Fix PlayerWeightTab.tsx
sed -i '' 's/Weight, Plus, Calendar, AlertTriangle, TrendingUp, TrendingDown, Minus/Weight, Plus, AlertTriangle, TrendingUp, TrendingDown, Minus, Scale, Trash2/g' src/components/pro/PlayerWeightTab.tsx
sed -i '' 's/onSubmit={handleSave}/onSubmit={handleAdd}/g' src/components/pro/PlayerWeightTab.tsx
sed -i '' 's/value={weight}/value={newWeight}/g' src/components/pro/PlayerWeightTab.tsx
sed -i '' 's/onChange={(e) => setWeight(e.target.value)}/onChange={(e) => setNewWeight(e.target.value)}/g' src/components/pro/PlayerWeightTab.tsx
cat << 'INNER_EOF' >> src/services/playerHealth.ts
export const deletePlayerWeight = async (id: string): Promise<void> => {
  const { error } = await supabase.from('player_weights').delete().eq('id', id);
  if (error) throw error;
};
INNER_EOF
sed -i '' 's/import { getPlayerWeights, createPlayerWeight }/import { getPlayerWeights, createPlayerWeight, deletePlayerWeight }/g' src/components/pro/PlayerWeightTab.tsx

# Fix StatsView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/StatsView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/StatsView.tsx

# Fix WorkoutLogView.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/pro/WorkoutLogView.tsx
sed -i '' 's/(props: any)/()/g' src/components/pro/WorkoutLogView.tsx

# Fix InterventionReport.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/reports/InterventionReport.tsx
sed -i '' 's/import { useTranslation } from '"'react-i18next'"';//g' src/components/reports/InterventionReport.tsx
sed -i '' 's/const { t } = useTranslation();//g' src/components/reports/InterventionReport.tsx

# Fix PlayerSlideReport.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/reports/PlayerSlideReport.tsx

# Fix PrintContext.tsx
sed -i '' 's/import React, { createContext/import { createContext/g' src/components/reports/PrintContext.tsx

# Fix StaffSlideReport.tsx
sed -i '' 's/import React from '"'react'"';//g' src/components/reports/StaffSlideReport.tsx

# Fix Dashboard.tsx
sed -i '' 's/import type { EventType }/import type { Event }/g' src/pages/Dashboard.tsx
sed -i '' 's/const matches =/const _matches =/g' src/pages/Dashboard.tsx

# Fix PlayerProfilePage.tsx
sed -i '' 's/import { supabase } from '"'"'..\/..\/lib\/supabase'"'"';//g' src/pages/pro/PlayerProfilePage.tsx

# Fix PlayersPage.tsx
sed -i '' 's/import React, { useState/import { useState/g' src/pages/pro/PlayersPage.tsx
sed -i '' 's/import { useTranslation } from '"'react-i18next'"';//g' src/pages/pro/PlayersPage.tsx
sed -i '' 's/const { t } = useTranslation();//g' src/pages/pro/PlayersPage.tsx
sed -i '' 's/const navigate = useNavigate();//g' src/pages/pro/PlayersPage.tsx
sed -i '' 's/import { useNavigate } from '"'react-router-dom'"';//g' src/pages/pro/PlayersPage.tsx

chmod +x fix_build.sh
./fix_build.sh
