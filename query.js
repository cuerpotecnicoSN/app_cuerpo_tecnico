const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://hwdbyauurovfmwqvlivi.supabase.co/';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZGJ5YXV1cm92Zm13cXZsaXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTMyMzUsImV4cCI6MjEwMDc4OTIzNX0.OQ9vPw_zZwky6F1sXyp8_OzK9q7avHQNgEcvqDoD5LM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('matches').select('*');
  console.log('Matches:', data ? data.length : error);
}
run();
