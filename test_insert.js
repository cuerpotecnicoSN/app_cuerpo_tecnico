import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInsert() {
  const { data: seasons } = await supabase.table('seasons').select('id').eq('is_active', true).limit(1)
  const season_id = seasons?.[0]?.id

  if (!season_id) {
    console.log("No active season")
    return
  }

  const { error } = await supabase.table('matches').insert({
    season_id,
    date: '2026-08-01',
    time: '17:30',
    opponent: 'Pro Vercelli (ITA)',
    is_home: false,
    home_logo: 'https://static.flashscore.com/res/image/data/APvp4VxS-AyUdrJUN.png',
    away_logo: 'https://static.flashscore.com/res/image/data/YDopIqGG-OfdWAxxb.png',
    status: 'Scheduled'
  })

  if (error) console.error("Error inserting:", error.message)
  else console.log("Insert success! Check the app.")
}
testInsert()
