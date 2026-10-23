import { createClient } from '@supabase/supabase-js'
const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const $ = s => document.querySelector(s)
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e }
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
let user = null, isAdmin = false, ST = { ideas: [], iv: [] }, QS = []

async function ai(prompt) {
  const { data, error } = await sb.functions.invoke('ai', { body: { prompt } })
  if (error || !data || !data.text) throw error || new Error('empty')
  return JSON.parse(data.text.replace(/```json|```/g, '').trim())
}
const fail = box => box.appendChild(el('div', 'tip', '呢次唔成功，再試一次啦。'))
const busy = (b, on, t) => { if (!b) return; b.disabled = on; if (t) b.textContent = t }
const rec = (kind, data) => { (kind === 'idea' ? ST.ideas : ST.iv).push(data); sb.from('progress').insert({ kind, data }).then(() => {}) }

/* 登入 */
$('#li').onclick = async () => { const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }); $('#am').textContent = error ? '登入失敗：' + error.message : '' }
$('#su').onclick = async () => { const { data, error } = await sb.auth.signUp({ email: $('#em').value.trim(), password: $('#pw').value }); $('#am').textContent = error ? error.message : (data.session ? '' : '已寄出確認電郵，確認後再登入。') }
$('#lo').onclick = () => sb.auth.signOut()
async function setUser(u) {
  user = u || null
  $('#auth').classList.toggle('hide', !!user); $('#app').classList.toggle('hide', !user)
  if (!user) return
  $('#who').textContent = user.email
  const [p, a] = await Promise.all([sb.from('progress').select('kind,data').order('created_at'), sb.from('admins').select('user_id').maybeSingle()])
  ST = { ideas: [], iv: [] }; (p.data || []).forEach(r => (r.kind === 'idea' ? ST.ideas : ST.iv).push(r.data))
  isAdmin = !!a.data; $('#adm').classList.toggle('hide', !isAdmin); loadQs()
}
sb.auth.getSession().then(({ data }) => setUser(data.session && data.session.user))
sb.auth.onAuthStateChange((_e, s) => { if ((s && s.user && s.user.id) !== (user && user.id)) setUser(s && s.user) })

const show = t => { ['idea', 'book', 'talk', 'rep'].forEach(i => $('#' + i).classList.toggle('hide', i !== t)); document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); if (t === 'rep') report() }
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => show(b.dataset.t))

/* 描述圖片 */
const DN = { who: '主角／物件', where: '場景地點', detail: '外形細節', mood: '感覺同風格' }
const IP = '你係香港小朋友嘅 AI 導師，用親切廣東話口語同 5-12 歲小朋友講嘢。小朋友想叫 AI 生成一張圖片，並寫咗佢嘅想法。目標係訓練佢寫出清楚、具體、精準嘅指令。唔好用『角色』『任務』『風格』等術語。回覆：praise（一句真心讚佢嘅地方）；questions（2-3 條好奇式問題，引佢諗畫面入面嘅人物、地點、外形、顏色、感覺，每條 20 字內）；improved（保留原意並整合所有補充，寫成完整具體、可直接俾 AI 畫圖用嘅指令，廣東話，80 字內）；added（陣列，2-4 句短句，講你幫佢寫得更清楚嘅地方）；dims（只評小朋友自己寫嘅字，唔係你嘅改寫；who/where/detail/mood 各 1-5 分）。只回覆 JSON：{"praise":"","questions":[],"improved":"","added":[],"dims":{"who":1,"where":1,"detail":1,"mood":1}}'
let lastFirst = null
async function runIdea(extra) {
  const t = $('#t1').value.trim(); if (!t) return
  const box = $('#r1'); box.innerHTML = ''; busy(extra ? $('#b2') : $('#b1'), true, 'AI 諗緊…')
  try {
    const d = await ai(IP + '\n\n小朋友嘅想法：' + t + (extra ? '\n小朋友補充：' + extra : ''))
    const sc = Math.round(avg([d.dims.who, d.dims.where, d.dims.detail, d.dims.mood]) * 5)
    rec('idea', { d: Date.now(), first: !extra, score: sc, dims: d.dims }); if (!extra) lastFirst = sc
    const c = el('div', 'card'); c.appendChild(el('div', 'lbl', '🌟 ' + d.praise))
    c.appendChild(el('div', 'lbl', '🎯 你嘅描述清晰度：' + sc + '%' + (extra && lastFirst != null ? '（第一次：' + lastFirst + '%）' : '')))
    const m = el('div', 'm'), i = el('i'); i.style.width = sc + '%'; m.appendChild(i); c.appendChild(m)
    c.appendChild(el('div', 'lbl', 'AI 有啲好奇：')); d.questions.forEach(q => c.appendChild(el('div', '', '❓ ' + q)))
    const ta = el('textarea'); ta.placeholder = '答下呢啲問題，補充多啲！'; ta.value = extra || ''; c.appendChild(ta)
    const b2 = el('button', 'go', '🔁 補充後再整理'); b2.id = 'b2'; b2.onclick = () => { if (ta.value.trim()) runIdea(ta.value.trim()) }; c.appendChild(b2); box.appendChild(c)
    const c2 = el('div', 'card'); c2.appendChild(el('div', 'lbl', '✨ 更精準嘅圖片指令')); c2.appendChild(el('div', 'new', d.improved))
    c2.appendChild(el('div', 'lbl', '我幫你寫得更清楚嘅地方：')); d.added.forEach(a => c2.appendChild(el('span', 'tag', '＋ ' + a))); box.appendChild(c2)
  } catch (e) { fail(box) } finally { busy($('#b1'), false, '🔍 俾 AI 睇下'); busy($('#b2'), false) }
}
$('#b1').onclick = () => runIdea('')

/* 繪本 */
function addChar() { const n = document.querySelectorAll('.ch').length; if (n >= 3) return; const d = el('div', 'ch'), a = el('input'), b = el('input'); a.placeholder = '角色名稱（例如：小豆）'; b.placeholder = '佢嘅性格同特色（例如：好貪食、怕黑、識飛）'; d.append(a, b); $('#chs').appendChild(d); if (n >= 2) $('#addc').classList.add('hide') }
addChar(); $('#addc').onclick = addChar
$('#mk').onclick = async () => {
  const chars = [].map.call(document.querySelectorAll('.ch'), d => { const i = d.querySelectorAll('input'); return i[0].value.trim() ? i[0].value.trim() + '：' + i[1].value.trim() : '' }).filter(Boolean)
  const bg = $('#bgd').value.trim(), o = [$('#o1').value, $('#o2').value, $('#o3').value].map(x => x.trim()), box = $('#bk'); box.innerHTML = ''
  if (!chars.length || !bg || !o[0]) { box.appendChild(el('div', 'tip', '最少要有一個角色、一個地方，同埋故事開頭呀！')); return }
  box.appendChild(el('div', 'card', '📖 繪本製作中…')); busy($('#mk'), true)
  try {
    const d = await ai('根據小朋友設計嘅內容寫一本 4 頁繪本，廣東話書面口語，每頁 text 50 字內。嚴格保留角色性格同特色，令角色行為反映佢哋嘅性格，並跟隨大綱（空白部分可自行補足）。每頁 emoji 用 2-3 個代表畫面，bg 為柔和淺色 hex。只回覆 JSON：{"title":"","pages":[{"text":"","emoji":"","bg":"#ffe8c2"}]}\n角色：' + chars.join('；') + '\n背景：' + bg + '\n大綱：開頭：' + o[0] + '；困難：' + o[1] + '；結局：' + o[2])
    box.innerHTML = ''; let i = 0; const pg = d.pages, card = el('div', 'card'); card.appendChild(el('div', 'lbl', '📚 ' + d.title))
    const pv = el('div', 'page'), bar = el('div', 'pager'), pr = el('button', 'ghost', '◀'), nx = el('button', 'ghost', '▶'), lab = el('span', 'note')
    const draw = () => { pv.innerHTML = ''; pv.style.background = /^#[0-9a-f]{3,8}$/i.test(pg[i].bg) ? pg[i].bg : '#ffe8c2'; pv.appendChild(el('div', 'e', pg[i].emoji)); pv.appendChild(el('p', '', pg[i].text)); lab.textContent = (i + 1) + ' / ' + pg.length }
    pr.onclick = () => { if (i > 0) { i--; draw() } }; nx.onclick = () => { if (i < pg.length - 1) { i++; draw() } }
    bar.append(pr, lab, nx); card.append(pv, bar); box.appendChild(card); draw()
  } catch (e) { box.innerHTML = ''; fail(box) } finally { busy($('#mk'), false) }
}

/* 題庫 */
async function loadQs() { const { data } = await sb.from('questions').select('id,level,text').order('created_at'); QS = data || []; renderQs() }
function renderQs() {
  const box = $('#ql'); box.innerHTML = ''
  QS.forEach(q => { const r = el('div', 'row'), a = el('span', '', q.level === 'all' ? '通用' : q.level === 'p1' ? '升小' : '升中'), b = el('span', '', q.text), d = el('button', 'ghost', '✕'); a.style.width = '44px'; b.style.flex = '1'; d.onclick = async () => { await sb.from('questions').delete().eq('id', q.id); loadQs() }; r.append(a, b, d); box.appendChild(r) })
}
$('#sq').onclick = async () => {
  const rows = $('#qs').value.split('\n').map(x => x.trim()).filter(Boolean).map(text => ({ text, level: $('#ql2').value })); if (!rows.length) return
  const { error } = await sb.from('questions').insert(rows); $('#sqm').textContent = error ? error.message : '已新增 ✓'; if (!error) { $('#qs').value = ''; loadQs() }
}

/* 面試 */
let hist = [], asked = 0, rc = null
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
$('#lg').onchange = () => $('#acw').classList.toggle('hide', $('#lg').value !== 'en')
const vl = () => { const l = $('#lg').value; return l === 'yue' ? 'zh-HK' : l === 'cmn' ? 'zh-CN' : $('#ac').value }
function say(t) {
  if (!window.speechSynthesis) return
  const u = new SpeechSynthesisUtterance(t), L = vl(), g = $('#gd').value, all = speechSynthesis.getVoices()
  let vs = all.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(L.toLowerCase())); if (!vs.length) vs = all.filter(v => v.lang.slice(0, 2) === L.slice(0, 2))
  const F = /female|woman|samantha|karen|tessa|moira|fiona|sin-ji|mei-jia|ting-ting|zira|hazel|susan|serena|victoria/i
  const p = vs.filter(v => g === 'f' ? F.test(v.name) : !F.test(v.name) && /male|daniel|alex|fred|oliver|david|mark|george|aaron|danny|kangkang/i.test(v.name))[0] || vs[0]
  if (p) u.voice = p; u.lang = L; u.rate = parseFloat($('#sp').value); u.pitch = g === 'f' ? 1.15 : .8
  speechSynthesis.cancel(); speechSynthesis.speak(u)
}
function bubble(who, t) { const b = el('div', 'b ' + who); b.appendChild(el('span', '', t)); if (who === 'ai') { const s = el('button', 'ghost', '🔊'); s.style.cssText = 'margin-left:8px;padding:2px 8px'; s.onclick = () => say(t); b.appendChild(s) } $('#ch').appendChild(b); $('#ch').scrollTop = 1e5 }
async function turn() {
  const lv = $('#lv').value, qs = QS.filter(q => q.level === 'all' || q.level === lv).map(q => q.text).slice(0, 8), total = qs.length || 5
  const LN = { yue: 'Cantonese (spoken Hong Kong Cantonese, traditional Chinese)', en: 'English (' + ($('#ac').value === 'en-GB' ? 'British' : 'American') + ')', cmn: 'Mandarin (simplified Chinese)' }[$('#lg').value]
  const P = 'You are a friendly interviewer for a Hong Kong ' + (lv === 'p1' ? 'Primary 1' : 'Secondary 1') + ' admissions interview with a young child. Speak only in ' + LN + ', simple and warm, 1-2 short sentences, ONE question at a time. ' + (qs.length ? 'Ask exactly these questions in order, lightly rephrased for a child: ' + JSON.stringify(qs) + '. ' : 'Cover: self-introduction, family or hobbies, describing a scene in words, a simple what-would-you-do question, closing. ') + 'Total questions: ' + total + '. Questions asked so far: ' + asked + '. Transcript:\n' + hist.map(m => (m.r === 'ai' ? 'Interviewer: ' : 'Child: ') + m.t).join('\n') + '\n\nIf the child has just answered, evaluate that answer. Return ONLY JSON: {"reply":"next interviewer line in the interview language (a warm goodbye if finished)","tip":"Cantonese, 1-2 sentences: a concrete way to make that answer more detailed or earn bonus marks; empty if no answer yet","better":"a stronger model answer to the same question in the interview language, 2-3 child-level sentences built on what the child said; empty if no answer yet","scores":{"content":1,"expression":1,"language":1},"need":"short Cantonese tag of the main thing to improve, e.g. 答案太短; empty if none","done":false}. Set done true only after the child answered question number ' + total + '.'
  busy($('#sd'), true)
  try {
    const d = await ai(P)
    if (hist.length && d.scores) rec('iv', { d: Date.now(), s: [d.scores.content, d.scores.expression, d.scores.language], need: d.need || '' })
    if (d.tip) { const t = el('div', 'tip', '💡 ' + d.tip); if (d.better) { t.appendChild(el('div', '', '⭐ 加分示範：' + d.better)); const s = el('button', 'ghost', '🔊 聽示範'); s.style.marginTop = '6px'; s.onclick = () => say(d.better); t.appendChild(s) } $('#ch').appendChild(t) }
    hist.push({ r: 'ai', t: d.reply }); if (!d.done) asked++; bubble('ai', d.reply); say(d.reply)
    if (d.done) { $('#ib').classList.add('hide'); $('#fin').appendChild(el('div', 'tip', '面試完成！去「家長」睇報告啦。')) }
  } catch (e) { fail($('#fin')) } finally { busy($('#sd'), false) }
}
$('#st').onclick = () => { hist = []; asked = 0; $('#ch').innerHTML = ''; $('#fin').innerHTML = ''; $('#mm').textContent = ''; $('#ib').classList.remove('hide'); turn() }
const send = () => { const v = $('#ans').value.trim(); if (!v) return; $('#ans').value = ''; hist.push({ r: 'me', t: v }); bubble('me', v); turn() }
$('#sd').onclick = send; $('#ans').onkeydown = e => { if (e.key === 'Enter') send() }
const MIC = { 'not-allowed': '請喺瀏覽器網址欄允許使用麥克風（網址要係 https）。', 'service-not-allowed': '呢個瀏覽器或預覽視窗唔允許語音辨識，請用 Chrome／Safari 直接開部署後嘅網址。', network: '語音辨識需要網絡，請稍後再試。', 'no-speech': '聽唔到聲音，再試一次啦。', 'audio-capture': '搵唔到麥克風。' }
$('#mic').onclick = async () => {
  const mm = $('#mm'); mm.textContent = ''
  if (!SR) { mm.textContent = '呢個瀏覽器唔支援語音輸入，請用 Chrome／Safari，或者直接打字。'; return }
  if (rc) { rc.stop(); return }
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()) } catch (e) { mm.textContent = MIC['not-allowed']; return }
  rc = new SR(); rc.lang = vl(); $('#mic').textContent = '⏹ 講緊…'
  rc.onresult = e => { $('#ans').value = e.results[0][0].transcript }
  rc.onerror = e => { mm.textContent = MIC[e.error] || '語音輸入出錯：' + e.error }
  rc.onend = () => { rc = null; $('#mic').textContent = '🎙️ 開口答' }
  try { rc.start() } catch (e) { rc = null; mm.textContent = MIC['service-not-allowed'] }
}

/* 家長報告 */
function bars(box, items) { items.forEach(x => { const r = el('div', 'row'); r.appendChild(el('span', '', x[0])); const m = el('div', 'm'), i = el('i'); i.style.width = x[1] + '%'; m.appendChild(i); r.append(m, el('em', '', x[2])); box.appendChild(r) }) }
function report() {
  const box = $('#rp'); box.innerHTML = ''
  const c = el('div', 'card'); c.appendChild(el('div', 'lbl', '🖼️ 圖片描述進度')); const f = ST.ideas.filter(x => x.first)
  if (!f.length) c.appendChild(el('p', 'note', '仲未有紀錄。'))
  else {
    bars(c, f.slice(-8).map((x, i) => ['第 ' + (f.length - Math.min(8, f.length) + i + 1) + ' 次', x.score, x.score + '%']))
    const s0 = Math.round(avg(f.slice(0, 3).map(x => x.score))), s1 = Math.round(avg(f.slice(-3).map(x => x.score)))
    if (f.length >= 2) c.appendChild(el('div', 'tip', '由最初 ' + s0 + '% → 最近 ' + s1 + '%（' + (s1 >= s0 ? '+' : '') + (s1 - s0) + '%）。'))
    const z = f.slice(-3), ks = Object.keys(DN), low = ks.map(k => [k, avg(z.map(x => x.dims[k]))]).sort((p, q) => p[1] - q[1])[0]
    c.appendChild(el('div', 'lbl', '最近三次各項（滿分 5）')); bars(c, ks.map(k => { const v = avg(z.map(x => x.dims[k])); return [DN[k], v * 20, v.toFixed(1)] }))
    c.appendChild(el('div', 'tip', '可以改善：「' + DN[low[0]] + '」。'))
  }
  box.appendChild(c)
  const c2 = el('div', 'card'); c2.appendChild(el('div', 'lbl', '🎤 面試表現'))
  if (!ST.iv.length) c2.appendChild(el('p', 'note', '仲未有面試紀錄。'))
  else {
    c2.appendChild(el('p', 'note', '累積 ' + ST.iv.length + ' 個回答')); bars(c2, ['內容', '表達', '語言'].map((n, i) => { const v = avg(ST.iv.map(x => x.s[i])); return [n, v * 20, v.toFixed(1)] }))
    const cnt = {}; ST.iv.forEach(x => { if (x.need) cnt[x.need] = (cnt[x.need] || 0) + 1 }); const ns = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 4)
    if (ns.length) { c2.appendChild(el('div', 'lbl', '最常需要改善：')); ns.forEach(n => c2.appendChild(el('span', 'tag', n + ' ×' + cnt[n]))) }
  }
  box.appendChild(c2)
  const c3 = el('div', 'card'); c3.appendChild(el('div', 'lbl', '📝 AI 家長總結')); const out = el('div'), g = el('button', 'go', '✨ 整理總結同建議')
  g.onclick = async () => {
    if (!f.length && !ST.iv.length) { out.textContent = '先有啲練習紀錄先整到總結。'; return }
    busy(g, true, '整理緊…'); out.textContent = ''
    const data = { ideaFirstScores: f.map(x => x.score), latestDims: f.slice(-3).map(x => x.dims), interviewAvg: [0, 1, 2].map(i => +avg(ST.iv.map(x => x.s[i])).toFixed(1)), needs: ST.iv.map(x => x.need).filter(Boolean) }
    try {
      const d = await ai('你係香港兒童 AI 教育 app 嘅顧問，用廣東話向家長寫簡短總結。根據以下數據（評分 1-5，ideaFirstScores 為 0-100）講：有咩進步、邊度需要改善、家長喺屋企可以點幫手（2-3 項具體做法）。正面真誠，唔好誇大，數據唔多要講明。只回覆 JSON：{"summary":"","improve":[],"home":[]}\n' + JSON.stringify(data))
      out.innerHTML = ''; out.appendChild(el('p', '', d.summary)); out.appendChild(el('div', 'lbl', '需要改善')); d.improve.forEach(x => out.appendChild(el('div', '', '• ' + x))); out.appendChild(el('div', 'lbl', '喺屋企可以咁做')); d.home.forEach(x => out.appendChild(el('div', '', '• ' + x)))
    } catch (e) { fail(out) } finally { busy(g, false, '✨ 整理總結同建議') }
  }
  c3.append(g, out); box.appendChild(c3)
}
