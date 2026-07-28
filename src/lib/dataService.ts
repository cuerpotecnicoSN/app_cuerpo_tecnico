import { supabase } from './supabase';
import { mockPlayers } from '../data/mockPlayers';

// Inicializar la base de datos para pruebas locales
export async function ensureContext() {
  // 1. Obtener el club
  const { data: clubs, error: clubError } = await supabase
    .from('clubs')
    .select('*')
    .limit(1);

  if (clubError) throw clubError;

  let activeClubId = clubs?.[0]?.id;

  // Si no hay clubes, fallar
  if (!activeClubId) {
    throw new Error('No hay clubes configurados en Supabase.');
  }

  // 2. Obtener o crear la temporada 'Temp. 26/27'
  const { data: seasons, error: seasonError } = await supabase
    .from('seasons')
    .select('*')
    .eq('club_id', activeClubId)
    .eq('name', 'Temp. 26/27')
    .limit(1);
    
  if (seasonError) throw seasonError;

  if (!seasons || seasons.length === 0) {
    const { data: newSeason, error: createError } = await supabase
      .from('seasons')
      .insert({ club_id: activeClubId, name: 'Temp. 26/27' })
      .select()
      .single();
      
    if (createError) throw createError;
    return newSeason.id;
  }

  return seasons[0].id;
}

// Funciones para Jugadores
export async function getPlayers(seasonId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('season_id', seasonId);
    
  if (error) throw error;
  return data;
}

export async function createPlayer(playerData: any) {
  const { data, error } = await supabase
    .from('players')
    .insert(playerData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function seedDatabase(seasonId: string) {
  for (const p of mockPlayers) {
    const pData = {
      season_id: seasonId,
      first_name: p.firstName,
      last_name: p.lastName,
      kit_number: p.kitNumber,
      main_position: p.mainPosition,
      category: p.category,
      birth_date: p.birthDate,
      nationality: p.nationality,
      height_cm: p.height,
      weight_kg: p.weight,
      dominant_foot: p.dominantFoot,
      photo_url: p.photoUrl,
      medical_status: 'Alta'
    };
    await supabase.from('players').insert(pData);
  }
}
