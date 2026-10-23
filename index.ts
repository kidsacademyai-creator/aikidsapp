import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return J({ error: 'unauthorized' }, 401)
  const { prompt } = await req.json()
  if (typeof prompt !== 'string' || prompt.length > 6000) return J({ error: 'bad prompt' }, 400)
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('CLAUDE_MODEL') ?? 'claude-haiku-5-5', max_tokens: 1500,
      system: '你服務 5-12 歲兒童。所有內容必須適合兒童，拒絕暴力、色情或不當內容，並引導到正面主題。嚴格按指示輸出。',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const j = await r.json()
  return J({ text: (j.content ?? []).map((c: { text?: string }) => c.text ?? '').join('') })
})
