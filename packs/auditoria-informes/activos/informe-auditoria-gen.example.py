import re, html

SRC='knowledge/informe-auditoria-forense-2026-06-24.html'
DST='knowledge/informe-auditoria-forense-2026-06-25.html'
s=open(SRC).read()

CATNAME={'perf':'Rendimiento','uxui':'UX/UI &amp; Accesibilidad','testing':'Testing / QA','devops':'DevOps / CI-CD','calidad':'Calidad de Código','seguridad':'Seguridad','backend':'Backend / Arquitectura','database':'Base de Datos','deps':'Dependencias','i18n':'Internacionalización','cloud':'Cloud / Escalabilidad','frontend':'Frontend / Arquitectura'}
SEVRANK={'CRÍTICO':0,'ALTO':1,'MEDIO':2,'BAJO':3,'OBSERVACIÓN':4}
SEVB={'CRÍTICO':'color:#7f1d1d;background:#fef2f2;border-color:#fecaca','ALTO':'color:#b91c1c;background:#fff1f2;border-color:#fecdd3','MEDIO':'color:#b45309;background:#fffbeb;border-color:#fde68a','BAJO':'color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe','OBSERVACIÓN':'color:#475569;background:#f8fafc;border-color:#e2e8f0'}
ESTB={'NEW':'color:#1d4ed8;background:#eff6ff','KNOWN':'color:#6d28d9;background:#f5f3ff'}
ESTLBL={'NEW':'NUEVO','KNOWN':'CONOCIDO'}
FIXED={0,1,16,17,18,19,20,21,22,24,25,29,30,31,32,33,34}

def spans(seg, pat):
    sp=[]
    for m in re.finditer(pat, seg):
        st=m.start();d=0
        for t in re.finditer(r'<div\b|</div>', seg[st:]):
            if t.group()=='</div>':
                d-=1
                if d==0: sp.append((st,st+t.end()));break
            else:d+=1
    return sp

i9=s.find('id="s9"'); i10=s.find('id="s10"'); i11=s.find('id="s11"')
seg9=s[i9:i10]; seg10=s[i10:i11]

def grab(t, pat):
    m=re.search(pat,t,re.S); return m.group(1) if m else ''

# ---- parse §9 NEW ----
new_spans=spans(seg9, r'<div class="fcard" ')
assert len(new_spans)==37, len(new_spans)
new_cards=[]; fixed_local=[]
for idx,(a,b) in enumerate(new_spans):
    t=seg9[a:b]
    c={'sev':grab(t,r'data-sev="([^"]*)"'),'cat':grab(t,r'data-cat="([^"]*)"'),
       'est':'NEW','file':grab(t,r'class="floc"><code>([^<]*)</code>'),
       'title':grab(t,r'class="ftitle">(.*?)</div>'),
       'esf':grab(t,r'Esfuerzo: ([^<]+)</span>').strip()}
    if idx in FIXED: fixed_local.append((a,b))
    else: new_cards.append(c)

# remove fixed cards from seg9
ns=seg9
for a,b in sorted(fixed_local, reverse=True):
    ns=ns[:a]+ns[b:]
s=s[:i9]+ns+s[i10:]
# refresh offsets
i10=s.find('id="s10"'); i11=s.find('id="s11"'); seg10=s[i10:i11]

# ---- parse §10 KNOWN ----
known_cards=[]
for a,b in spans(seg10, r'<div class="fcard kc" '):
    t=seg10[a:b]
    known_cards.append({'sev':grab(t,r'data-sev="([^"]*)"'),'cat':grab(t,r'data-cat="([^"]*)"'),
       'est':'KNOWN','file':grab(t,r'class="kc-file"><code>([^<]*)</code>'),
       'title':grab(t,r'class="kc-title">(.*?)</div>'),
       'esf':grab(t,r'Esfuerzo: ([^<]+)</span>').strip()})
assert len(known_cards)==36, len(known_cards)

remaining=new_cards+known_cards
assert len(remaining)==56, len(remaining)

# ---- dashboard counts ----
from collections import Counter
sevc=Counter(c['sev'] for c in remaining)
DB={'CRÍTICO':sevc.get('CRÍTICO',0),'ALTO':sevc['ALTO'],'MEDIO':sevc['MEDIO'],'BAJO':sevc['BAJO'],'OBSERVACIÓN':sevc['OBSERVACIÓN']}
assert DB=={'CRÍTICO':0,'ALTO':1,'MEDIO':11,'BAJO':20,'OBSERVACIÓN':24}, DB

def sevbadge(sev,label=None):
    return '<span class="sevb" style="%s">%s</span>'%(SEVB[sev], label or sev)

# ================= §4 by file =================
files={}
for c in remaining:
    f=c['file'] or '—'
    d=files.setdefault(f,{'n':0,'mx':99})
    d['n']+=1; d['mx']=min(d['mx'],SEVRANK[c['sev']])
RSEV={v:k for k,v in SEVRANK.items()}
rows4=sorted(files.items(), key=lambda kv:(-kv[1]['n'], kv[1]['mx'], kv[0]))
tb4=''.join('<tr><td><code>%s</code></td><td>%d</td><td>%s</td></tr>'%(f,d['n'],sevbadge(RSEV[d['mx']])) for f,d in rows4)
i4=s.find('id="s4"'); i5=s.find('id="s5"')
seg4=s[i4:i5]
seg4=re.sub(r'<tbody>.*?</tbody>', '<tbody>'+tb4+'</tbody>', seg4, count=1, flags=re.S)
s=s[:i4]+seg4+s[i5:]

# ================= §5 Top 20 =================
order=sorted(remaining, key=lambda c:(SEVRANK[c['sev']], 0 if c['est']=='NEW' else 1, c['title']))[:20]
tb5=''
for n,c in enumerate(order,1):
    tb5+='<tr><td>%d</td><td>%s</td><td><span class="estb" style="%s">%s</span></td><td>%s</td><td>%s</td><td><code>%s</code></td></tr>'%(
        n, sevbadge(c['sev']), ESTB[c['est']], ESTLBL[c['est']], c['title'], CATNAME[c['cat']], c['file'])
i5=s.find('id="s5"'); i6=s.find('id="s6"'); seg5=s[i5:i6]
seg5=re.sub(r'<tbody>.*?</tbody>', '<tbody>'+tb5+'</tbody>', seg5, count=1, flags=re.S)
s=s[:i5]+seg5+s[i6:]

# ================= §6 Quick Wins =================
qw=[c for c in new_cards if c['esf'].lower()=='bajo']
qw=sorted(qw, key=lambda c:(SEVRANK[c['sev']], c['title']))
tb6=''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td><code>%s</code></td></tr>'%(
    sevbadge(c['sev']), c['title'], CATNAME[c['cat']], c['file']) for c in qw)
i6=s.find('id="s6"'); i7=s.find('id="s7"'); seg6=s[i6:i7]
seg6=re.sub(r'<tbody>.*?</tbody>', '<tbody>'+tb6+'</tbody>', seg6, count=1, flags=re.S)
s=s[:i6]+seg6+s[i7:]

# ================= §7 Roadmap =================
def phase_items(cards):
    if not cards: return '<li>—</li>'
    return ''.join('<li>%s — <code>%s</code></li>'%(c['title'],c['file']) for c in cards)
crit=[c for c in new_cards if c['sev']=='CRÍTICO']
alto=[c for c in new_cards if c['sev']=='ALTO']
medio=[c for c in new_cards if c['sev']=='MEDIO']
bajo=[c for c in new_cards if c['sev'] in ('BAJO','OBSERVACIÓN')]
bajo=sorted(bajo, key=lambda c:(SEVRANK[c['sev']],c['title']))
roadmap=('<div class="sect">'
 '<div class="rmphase"><div class="rmh" style="border-color:#7f1d1d"><b>Fase 1 — Crítico</b> <span class="note" style="margin:0">(%d nuevos)</span></div><ul>%s</ul></div>'%(len(crit),phase_items(crit))+
 '<div class="rmphase"><div class="rmh" style="border-color:#b91c1c"><b>Fase 2 — Alto</b> <span class="note" style="margin:0">(%d nuevos)</span></div><ul>%s</ul></div>'%(len(alto),phase_items(alto))+
 '<div class="rmphase"><div class="rmh" style="border-color:#b45309"><b>Fase 3 — Medio</b> <span class="note" style="margin:0">(%d nuevos)</span></div><ul>%s</ul></div>'%(len(medio),phase_items(medio))+
 '<div class="rmphase"><div class="rmh" style="border-color:#1d4ed8"><b>Fase 4 — Bajo / Optimizaciones</b> <span class="note" style="margin:0">(%d nuevos)</span></div><ul>%s</ul></div>'%(len(bajo),phase_items(bajo))+
 '<p class="note">La deuda CONOCIDA (§10) ya tiene plan propio en architectural-debt.md (triggers AD-x); no se re-prioriza aquí.</p></div>')
i7=s.find('id="s7"'); i8=s.find('id="s8"'); seg7=s[i7:i8]
head7=seg7[:seg7.find('</h2>')+5]
# CRÍTICO: `find('id="s8"')` cae DESPUÉS del `<h2 ` que abre §8 (ese prefijo vivía
# dentro de seg7). Al reconectar hay que reponerlo o §8 pierde su <h2> y renderiza
# como texto plano. Mismo cuidado para cualquier reemplazo por slicing entre secciones.
s=s[:i7]+head7+roadmap+'<h2 '+s[i8:]

# ================= scalar replacements =================
reps=[
 ('<title>Auditoría Forense Integral — PP Sport Management — 2026-06-24</title>',
  '<title>Auditoría Forense Integral — PP Sport Management — 2026-06-25</title>'),
 ('<span><b>Fecha:</b> 2026-06-24</span>','<span><b>Fecha:</b> 2026-06-25</span>'),
 ('<span><b>Alcance:</b> 12 dominios · 73 hallazgos</span>','<span><b>Alcance:</b> 12 dominios · 56 hallazgos</span>'),
 ('<div class="glob"><div><div class="num">88</div>','<div class="glob"><div><div class="num">91</div>'),
 # dashboard KPIs
 ('<div class="kpi-n" style="color:#0f172a">73</div><div class="kpi-l">Total hallazgos</div>',
  '<div class="kpi-n" style="color:#0f172a">56</div><div class="kpi-l">Total hallazgos</div>'),
 ('<div class="kpi-n" style="color:#b91c1c">5</div><div class="kpi-l">Altos</div>',
  '<div class="kpi-n" style="color:#b91c1c">1</div><div class="kpi-l">Altos</div>'),
 ('<div class="kpi-n" style="color:#b45309">18</div><div class="kpi-l">Medios</div>',
  '<div class="kpi-n" style="color:#b45309">11</div><div class="kpi-l">Medios</div>'),
 ('<div class="kpi-n" style="color:#1d4ed8">22</div><div class="kpi-l">Bajos</div>',
  '<div class="kpi-n" style="color:#1d4ed8">20</div><div class="kpi-l">Bajos</div>'),
 ('<div class="kpi-n" style="color:#475569">28</div><div class="kpi-l">Observaciones</div>',
  '<div class="kpi-n" style="color:#475569">24</div><div class="kpi-l">Observaciones</div>'),
 # estbar
 ('<button class="estbtn active" data-est="">Todos (73)</button>','<button class="estbtn active" data-est="">Todos (56)</button>'),
 ('<button class="estbtn" data-est="NEW">Nuevos (37)</button>','<button class="estbtn" data-est="NEW">Nuevos (20)</button>'),
 # §9 heading
 ('9 · Hallazgos Nuevos — Detallados (37)','9 · Hallazgos Nuevos — Detallados (20)'),
 # scorecard
 ('<div class="scl">Seguridad</div><div class="scbar"><div class="scfill" style="width:84%;background:#b45309"></div></div><div class="scv" style="color:#b45309">84</div>',
  '<div class="scl">Seguridad</div><div class="scbar"><div class="scfill" style="width:90%;background:#15803d"></div></div><div class="scv" style="color:#15803d">90</div>'),
 ('<div class="scl">UX/UI &amp; Accesibilidad</div><div class="scbar"><div class="scfill" style="width:58%;background:#b91c1c"></div></div><div class="scv" style="color:#b91c1c">58</div>',
  '<div class="scl">UX/UI &amp; Accesibilidad</div><div class="scbar"><div class="scfill" style="width:85%;background:#15803d"></div></div><div class="scv" style="color:#15803d">85</div>'),
 ('<b>GLOBAL</b></div><div class="scbar"><div class="scfill" style="width:88%;background:#15803d"></div></div><div class="scv" style="color:#15803d">88</div>',
  '<b>GLOBAL</b></div><div class="scbar"><div class="scfill" style="width:91%;background:#15803d"></div></div><div class="scv" style="color:#15803d">91</div>'),
]
for a,b in reps:
    assert a in s, 'MISSING: '+a[:80]
    s=s.replace(a,b)

# ================= §1 resumen + crit block =================
old_res=('<b>Estado general.</b> Re-auditoría forense del 2026-06-24 sobre PP Sport Management / AgentePro tras los merges de dependencias de hoy (dependabot: react-router-dom 7.18.0, pg 8.22.0, aws-sdk-s3, vite 8.1, vitest 4.1.9). De <b>73</b> hallazgos verificados (excluidos los ya remediados), <b>0</b> son CRÍTICOS y <b>5</b> ALTOS. La plataforma mantiene su madurez: <b>36</b> hallazgos corresponden a deuda ya catalogada y gobernada por ratchets (AD-1..AD-24 / AP-01..AP-68) — en este informe solo se <i>marcan</i> (§10), no se re-explican. El foco accionable son los <b>37 hallazgos NUEVOS</b> desglosados por categoría y archivo en §9.')
new_res=('<b>Estado general.</b> Re-auditoría del <b>2026-06-25</b> sobre PP Sport Management / AgentePro, tras la <b>remediación de 17 hallazgos nuevos</b> del informe del 2026-06-24 — incluidos los <b>4 de severidad ALTA</b>: la lectura sin permiso/ownership (BOLA) de los GET de informes de scouting de partido y detallados, y la operabilidad por teclado de <code>DatePicker</code>, del combobox <code>CatalogSingleFilter</code> y del toggle de <code>TabNotas</code>. Cada remediación se verificó contra el código actual (archivo:línea). De <b>56</b> hallazgos restantes, <b>0</b> son CRÍTICOS y <b>1</b> ALTO (deuda ya catalogada, §10). <b>36</b> corresponden a deuda gobernada por ratchets (AD-1..AD-24 / AP-01..AP-68) — solo se <i>marcan</i> (§10). El foco accionable son los <b>20 hallazgos NUEVOS</b> restantes (esfuerzo Bajo/Medio), desglosados por categoría y archivo en §9.')
assert old_res in s
s=s.replace(old_res,new_res)

# crit block (the ALTO list) -> remediated note + top MEDIO
i=s.find('<p style="margin-top:12px"><b>Hallazgos nuevos de mayor severidad (ALTO):</b>')
j=s.find('</ul>', i)+5
medio_items=''.join('<li><b>%s</b> — <code>%s</code> (%s, esfuerzo %s)</li>'%(c['title'],c['file'],CATNAME[c['cat']],c['esf']) for c in medio)
crit_new=('<p style="margin-top:12px"><b>Los 4 hallazgos ALTO del informe del 2026-06-24 fueron remediados y verificados</b> '
 '(BOLA de scouting · accesibilidad de DatePicker, CatalogSingleFilter y TabNotas) — ya no figuran en este informe.</p>'
 '<p style="margin-top:12px"><b>Mayor severidad nueva restante (MEDIO):</b></p><ul class="crit">'+medio_items+'</ul>')
s=s[:i]+crit_new+s[j:]

open(DST,'w').write(s)
print('WROTE', DST)
print('dashboard', DB, 'NEW kept', len(new_cards), 'KNOWN', len(known_cards))
print('§4 rows', len(rows4), 'sum', sum(d['n'] for _,d in rows4))
print('quick wins', len(qw), 'medio', len(medio), 'bajo+obs', len(bajo))
