require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPlayers() {
  console.log('Starting BeSoccer sync...');
  
  // Obtener jugadores con URL
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .not('besoccer_url', 'is', null);

  if (error) {
    console.error('Error fetching players:', error);
    process.exit(1);
  }

  console.log(`Found ${players.length} players with BeSoccer URLs.`);

  for (const player of players) {
    console.log(`Syncing ${player.first_name} ${player.last_name} (${player.besoccer_url})...`);
    
    try {
      const response = await fetch(player.besoccer_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch from BeSoccer: ${response.status}`);
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      let photoUrl = '';
      const possibleImages = Array.from(doc.querySelectorAll('img')).filter(img => img.src && (img.src.includes('img_data/players/') || img.src.includes('jugadores/') || img.src.includes('player_images')));
      if (possibleImages.length > 0) {
        photoUrl = possibleImages[0].src;
      }

      const statsBlocks = Array.from(doc.querySelectorAll('.stat-list .stat'));
      
      let weight = player.weight_kg;
      let height = player.height_cm;
      let age = null;
      
      statsBlocks.forEach(stat => {
        const bigRow = stat.querySelector('.big-row')?.textContent?.trim() || '';
        const smallRows = Array.from(stat.querySelectorAll('.small-row')).map(el => el.textContent?.trim().toLowerCase());
        
        if (smallRows.includes('kgs')) weight = parseInt(bigRow) || weight;
        if (smallRows.includes('cms')) height = parseInt(bigRow) || height;
        if (smallRows.includes('años')) age = parseInt(bigRow) || null;
      });

      const updates = { weight_kg: weight, height_cm: height };
      
      // Actualizar edad si existe, asumiendo que la fecha de nacimiento se calcula desde el año actual
      if (age) {
        updates.birth_date = new Date(new Date().setFullYear(new Date().getFullYear() - age)).toISOString().split('T')[0];
      }

      const { error: updateError } = await supabase
        .from('players')
        .update(updates)
        .eq('id', player.id);

      if (updateError) {
        console.error(`Failed to update ${player.first_name}:`, updateError);
      } else {
        console.log(`Successfully updated ${player.first_name}. Weight: ${weight}kg, Height: ${height}cm`);
      }

    } catch (err) {
      console.error(`Error processing ${player.first_name}:`, err.message);
    }
  }
  
  console.log('Sync complete.');
}

syncPlayers();
