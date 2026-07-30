import os
import re

def fix_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        # Also try regex if needed
    
    with open(filepath, 'w') as f:
        f.write(content)

# Fix EditProfileModal
fix_file('src/components/auth/EditProfileModal.tsx', [
    ('.catch(console.error);', ';'),
    ('.catch((err) => console.error(err));', ';')
])

# Fix WeeklyCalendar
fix_file('src/components/dashboard/WeeklyCalendar.tsx', [
    ('const { t } = useTranslation();', ''),
    ("import { useTranslation } from 'react-i18next';", '')
])

# Fix AIAnalysisView, AnalysisHubView, ChatView, CompetitionVideoHistoryView, DevPlanView, DocView, MedicalView, MultimediaView, PhysicalView, StatsView, WorkoutLogView
components = [
    'AIAnalysisView.tsx', 'AnalysisHubView.tsx', 'ChatView.tsx', 
    'CompetitionVideoHistoryView.tsx', 'DevPlanView.tsx', 'DocView.tsx', 
    'MedicalView.tsx', 'MultimediaView.tsx', 'PhysicalView.tsx', 
    'StatsView.tsx', 'WorkoutLogView.tsx', 'PlayersManagementView.tsx'
]
for comp in components:
    fix_file(f'src/components/pro/{comp}', [
        ("import React from 'react';", ""),
        ("(props: any)", "()")
    ])

# BodyMap
fix_file('src/components/pro/BodyMap.tsx', [
    ('const severityColor =', 'const _severityColor =')
])

# PlayerImportModal
fix_file('src/components/pro/PlayerImportModal.tsx', [
    ("import React, { useState", "import { useState")
])

# PlayerInjuriesTab
fix_file('src/components/pro/PlayerInjuriesTab.tsx', [
    ("import { supabase } from '../../../lib/supabase';", "")
])

# PlayerWeightTab
fix_file('src/components/pro/PlayerWeightTab.tsx', [
    ("import { Weight, Plus, Calendar, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';", 
     "import { Weight, Plus, AlertTriangle, TrendingUp, TrendingDown, Minus, Scale, Trash2 } from 'lucide-react';"),
    ("onSubmit={handleSave}", "onSubmit={handleAdd}"),
    ("value={weight}", "value={newWeight}"),
    ("onChange={(e) => setWeight(e.target.value)}", "onChange={(e) => setNewWeight(e.target.value)}"),
    ("import { getPlayerWeights, createPlayerWeight } from '../../services/playerHealth';",
     "import { getPlayerWeights, createPlayerWeight, deletePlayerWeight } from '../../services/playerHealth';")
])

# Add deletePlayerWeight
with open('src/services/playerHealth.ts', 'a') as f:
    f.write("\nexport const deletePlayerWeight = async (id: string): Promise<void> => {\n  const { error } = await supabase.from('player_weights').delete().eq('id', id);\n  if (error) throw error;\n};\n")

# Reports
fix_file('src/components/reports/InterventionReport.tsx', [
    ("import React from 'react';", ""),
    ("import { useTranslation } from 'react-i18next';", ""),
    ("const { t } = useTranslation();", "")
])
fix_file('src/components/reports/PlayerSlideReport.tsx', [
    ("import React from 'react';", "")
])
fix_file('src/components/reports/StaffSlideReport.tsx', [
    ("import React from 'react';", "")
])
fix_file('src/components/reports/PrintContext.tsx', [
    ("import React, { createContext", "import { createContext")
])

# Dashboard
fix_file('src/pages/Dashboard.tsx', [
    ("import type { EventType }", "import type { Event }"),
    ("const matches =", "const _matches =")
])

# PlayerProfilePage
fix_file('src/pages/pro/PlayerProfilePage.tsx', [
    ("import { supabase } from '../../lib/supabase';", "")
])

# PlayersPage
fix_file('src/pages/pro/PlayersPage.tsx', [
    ("import React, { useState", "import { useState"),
    ("import { useTranslation } from 'react-i18next';", ""),
    ("const { t } = useTranslation();", ""),
    ("const navigate = useNavigate();", ""),
    ("import { useNavigate } from 'react-router-dom';", "")
])

# AuthContext
fix_file('src/context/AuthContext.tsx', [
    ("avatar_url: any;", "avatar_url: any; birth_date?: string;")
])
