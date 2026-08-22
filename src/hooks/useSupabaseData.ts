import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';

export function useSupabaseData<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any;

    async function fetchData() {
      try {
        setLoading(true);
        const seasonId = await ensureContext();
        
        // Asumimos que la mayoría de tablas tienen season_id
        // Si no la tienen, habría que adaptar esto.
        const { data: result, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .eq(tableName === 'players' ? 'season_id' : '', seasonId); // FIXME: filter by season_id selectively if needed

        if (fetchError) throw fetchError;
        
        setData(result as T[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const channelName = `${tableName}_changes_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, ( _payload ) => {
        // En una app real haríamos un manejo fino de inserciones, actualizaciones y borrados
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tableName]);

  return { data, loading, error };
}
