import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hwdbyauurovfmwqvlivi.supabase.co/';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZGJ5YXV1cm92Zm13cXZsaXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTMyMzUsImV4cCI6MjEwMDc4OTIzNX0.OQ9vPw_zZwky6F1sXyp8_OzK9q7avHQNgEcvqDoD5LM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: seasons } = await supabase.from('seasons').select('*');
  console.log('Seasons:', seasons);
  
  if (seasons && seasons.length > 0) {
    const seasonId = seasons[0].id;
    const { data: matches } = await supabase.from('matches').select('*').eq('season_id', seasonId);
    console.log('Matches count:', matches?.length);
    if (matches?.length) console.log('Sample match:', matches[0]);

    const { data: meetings } = await supabase.from('meetings').select('*').eq('season_id', seasonId);
    console.log('Meetings count:', meetings?.length);
    if (meetings?.length) console.log('Sample meeting:', meetings[0]);
  }
}
run();
