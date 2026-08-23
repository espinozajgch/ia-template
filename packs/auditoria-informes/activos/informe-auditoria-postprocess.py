#!/usr/bin/env python3
"""
Post-procesador / NORMALIZADOR de los informes informe-auditoria-forense-*.html.

Fuerza el formato definido en knowledge/wiki/informe-auditoria-formato.md (R1..R10)
sobre CUALQUIER informe generado (incluso por otro agente que no siga las reglas).
Es IDEMPOTENTE: correrlo N veces produce el mismo resultado.

Reglas que impone:
  R3  — elimina hallazgos CORREGIDO (data-rem="CORREGIDO") por completo.
  R13 — hallazgos MITIGADOS (data-rem="MITIGADO"): se LISTAN como tarjeta informativa
        pero NO cuentan en NINGÚN agregado (portada, KPIs §2, matriz+Total §3, §4/§5/§6/§7
        y los conteos del runtime). Estado intermedio entre "abierto" y "corregido".
  R7  — secciones <h2> colapsables (CSS + JS).
  R8  — tema CLARO (no dark mode).
  R9  — §1 sin subsección "Conclusiones clave".
  R10 — filtros en §3, dos ejes Estado×Severidad + filas de categoría clicables;
        "Documentado"==Deuda técnica (data-new=0); sin botones Corregidos/Documentados.
  R6  — recomputa dashboard, §3 matriz, §4 por-archivo desde las tarjetas vivas.

Uso:  python3 informe-auditoria-postprocess.py <archivo.html>
      (sin argumento usa el informe-auditoria-forense más reciente en knowledge/)
"""
import re, sys, glob, os

MARK = '<!--NORMALIZED-->'

# Hallazgos ya REMEDIADOS y verificados en código que NO deben reaparecer en el informe
# (R3: lo resuelto se elimina). El generador los re-emite cada corrida; el post-procesador
# los suprime por substring de título (case-insensitive). Añadir SOLO tras remediar de verdad.
SUPPRESS_TITLE_SUBSTR = [
    'literales i18n hardcodeados congelados',   # I18N-06: 5 literales React migrados a t() (2026-06-26); residual = export HTML/PDF exento
    'i18n.md desactualizada',                   # doc i18n actualizada: conteos 2058/0-drift, lazy-load, baseline export-only (2026-06-26)
    'parsea ssm con --output text',             # H-147: fetch-secrets robusto a \n/\t (get-parameter por-secreto + $()) (2026-07-19)
    '--recursive + nombre por hoja',            # H-148: fetch-secrets con guard de colisión de leaf (fail-secure) (2026-07-19)
]
SEV_ORDER = ['CRITICO','ALTO','MEDIO','BAJO','OBSERVACION']
SEV_RANK = {k:i for i,k in enumerate(SEV_ORDER)}
SEV_DISP = {'CRITICO':'Crítico','ALTO':'Alto','MEDIO':'Medio','BAJO':'Bajo','OBSERVACION':'Observación'}
CHIP = {'CRITICO':'#dc2626','ALTO':'#ea580c','MEDIO':'#d97706','BAJO':'#2563eb','OBSERVACION':'#64748b'}
CAT_ORDER = ['Seguridad','Infraestructura','BaseDatos','Testing','Accesibilidad','UX/UI','Backend',
             'DevOps','Internacionalizacion','Arquitectura','Frontend','Rendimiento','Cumplimiento',
             'Dependencias','Observabilidad','Cloud','Observabilidad']

# ───────────────────────── helpers ─────────────────────────
def find_section(s, sid):
    return s.find('id="%s"' % sid)

def parse_findings(s):
    a = s.find('<div id="findings">')
    if a < 0: return None
    # findings region ends at the next <h2 ...> after the findings container
    b = s.find('<h2 ', a)
    region = s[a:b]
    inner_start = region.find('>')+1
    inner = region[inner_start:]
    starts = [m.start() for m in re.finditer(r'<div class="finding"', inner)]
    if not starts: return None
    starts.append(len(inner))
    out=[]
    for i in range(len(starts)-1):
        blk = inner[starts[i]:starts[i+1]]
        def g(p,d=''):
            m=re.search(p,blk,re.S); return m.group(1) if m else d
        arch = g(r'<div><b>Archivo</b><code>([^<]*)</code>','—')
        out.append({
            'blk':blk,
            'sev':g(r'data-sev="([^"]*)"','OBSERVACION'),
            'cat':g(r'data-cat="([^"]*)"','Otros'),
            'new':g(r'data-new="([^"]*)"','0'),
            'rem':g(r'data-rem="([^"]*)"',''),
            'title':g(r'class="ftitle">(.*?)</span>'),
            'esf':g(r'<div><b>Esfuerzo</b>([^<]*)</div>').strip(),
            'riesgo':g(r'<div class="fsec"><b>Riesgo</b><p>(.*?)</p>'),
            'impacto':g(r'<div><b>Impacto</b>(.*?)</div>'),
            'file':re.split(r'\s+:', arch, maxsplit=1)[0].strip(),
        })
    return (a, b, inner_start, out)

# ───────────────────────── transforms ─────────────────────────
def clean_badge(blk, rem, new):
    """R3/R10: normaliza el badge de estado a UNA etiqueta coherente. El estado NUEVO se
    RESPETA (un hallazgo nuevo no se degrada a deuda técnica automáticamente; solo pasa a
    deuda cuando se marca DOCUMENTADO manualmente):
      - DOCUMENTADO        -> '▣ Documentado · <ref>'  (ámbar, rflag rdoc) · deuda técnica
      - new==1 (sin rem)   -> 'NUEVO · <ref|—>'          (azul, nflag new) · hallazgo nuevo
      - resto (catalogado) -> 'Catalogado · <ref>'      (gris, nflag cat) · deuda técnica
      - sin ref real / control positivo -> 'Observación de control'.
    """
    def extract_ref(t):
        m=re.search(r'·\s*(.+)$', t or '')
        if not m: return None
        rest=re.split(r'\s*[(;]', m.group(1))[0].split(',')[0].strip()
        if not rest or rest.upper() in ('NUEVO','NEW'): return None
        return rest
    cat=re.search(r'<span class="nflag cat">([^<]*)</span>', blk)
    newb=re.search(r'<span class="nflag new">([^<]*)</span>', blk)
    doc=re.search(r'<span class="rflag rdoc">([^<]*)</span>', blk)
    mit=re.search(r'<span class="rflag rmit"[^>]*>([^<]*)</span>', blk)
    if rem=='MITIGADO':
        # R13: hallazgo cuyo vector principal ya está cubierto (p. ej. SRI para el
        # tampering de un tarball CDN). Se LISTA para completitud pero NO cuenta en
        # ningún agregado (ver recompute_derived / ALLF del runtime). Badge neutro,
        # distinto del ámbar "Documentado" y del verde (prohibido) "Corregido".
        # fallback de ref: rmit ya-normalizado → documentado → NUEVO (H-xxx) → catalogado.
        # Incluye newb para preservar el H-xxx cuando un hallazgo NUEVO pasa a MITIGADO.
        ref=(extract_ref(mit.group(1)) if mit else None) or (extract_ref(doc.group(1)) if doc else None) \
            or (extract_ref(newb.group(1)) if newb else None) or (extract_ref(cat.group(1)) if cat else None)
        # Estilo inline (además del CSS .rflag.rmit): la base .rflag no define
        # background/border, y el bloque CSS solo se inyecta en la 1ª normalización
        # (marcador NORMALIZE-LIGHT) → el inline garantiza el render aun re-normalizando.
        _mit='style="background:#eef2f7;color:#475569;border:1px solid #cbd5e1"'
        badge=('<span class="rflag rmit" %s>◑ Mitigado · %s</span>'%(_mit,ref)) if ref else ('<span class="rflag rmit" %s>◑ Mitigado</span>'%_mit)
    elif rem=='DOCUMENTADO':
        # Taxonomía 2026-07-20: "Documentado" NO es un estado propio. Si un hallazgo está en
        # el catálogo (AD-x), es DEUDA TÉCNICA — punto. Se colapsa en el badge único gris de
        # deuda técnica (sin el ámbar "Documentado"). Estados de un hallazgo ABIERTO: NUEVO o
        # DEUDA TÉCNICA. Y, aparte y fuera del conteo: MITIGADO (R13).
        ref=(extract_ref(doc.group(1)) if doc else None) or (extract_ref(cat.group(1)) if cat else None)
        badge='<span class="nflag cat">Deuda técnica · %s</span>'%ref if ref else '<span class="nflag cat">Deuda técnica</span>'
    elif new=='1':
        ref=extract_ref(newb.group(1)) if newb else (extract_ref(cat.group(1)) if cat else None)
        badge='<span class="nflag new">NUEVO · %s</span>'%ref if ref else '<span class="nflag new">NUEVO</span>'
    else:
        # Catalogado (deuda vieja) y Documentado (deuda anotada esta sesión) se muestran IGUAL:
        # "Deuda técnica · AD-x". No hay distinción ámbar/gris que confunda con un tercer estado.
        ref=extract_ref(cat.group(1)) if cat else None
        badge='<span class="nflag cat">Deuda técnica · %s</span>'%ref if ref else '<span class="nflag cat">Observación de control</span>'
    # quitar TODOS los badges de estado existentes (nflag/rflag) y poner el limpio antes del chevron
    blk=re.sub(r'\s*<span class="(?:nflag|rflag)[^"]*"[^>]*>[^<]*</span>', '', blk)
    blk=blk.replace('<span class="fchev">', badge+'\n    <span class="fchev">', 1)
    return blk

def strip_corrected_and_reclass(s):
    """R3 + R10: quita CORREGIDO; DOCUMENTADO => deuda técnica (data-new=0); badge limpio.
    El estado NUEVO (data-new=1, sin data-rem) se RESPETA: un hallazgo nuevo permanece nuevo
    hasta que se marque DOCUMENTADO manualmente. No se degrada a deuda técnica de oficio."""
    p = parse_findings(s)
    if not p: return s, []
    a,b,inner_start,fs = p
    keep=[]
    for f in fs:
        if f['rem']=='CORREGIDO':
            continue
        tl=(f['title'] or '').lower()
        if any(p.lower() in tl for p in SUPPRESS_TITLE_SUBSTR):
            continue  # remediado en código — no debe reaparecer
        if f['rem'] in ('DOCUMENTADO','MITIGADO'):
            # documentado => deuda técnica; mitigado => se lista pero no cuenta (R13).
            # Ambos dejan de ser "nuevo" (data-new=0).
            blk=f['blk'].replace('data-new="1"','data-new="0"')
            f['new']='0'
        else:
            blk=f['blk']  # catalogado (data-new=0) o nuevo (data-new=1): se respeta tal cual
        blk=clean_badge(blk, f['rem'], f['new'])
        f['blk']=blk
        keep.append(f)
    new_region = '<div id="findings">'+''.join(f['blk'] for f in keep)
    s = s[:a] + new_region + s[b:]
    return s, keep

def recompute_derived(s, keep):
    """R6: dashboard, §3 matriz, §4 por-archivo, §5/§6/§7, header — desde 'keep'.
    R13: los hallazgos MITIGADOS se LISTAN (siguen como tarjeta) pero NO suman a ningún
    agregado (conteo general de portada, KPIs de §2, matriz+Total de §3, §4/§5/§6/§7).
    Se excluyen acá para que el 'conteo general' refleje solo deuda/riesgo abierto."""
    from collections import Counter, defaultdict
    mitigado = sum(1 for f in keep if f.get('rem') == 'MITIGADO')  # R13: cuenta para el filtro
    keep = [f for f in keep if f.get('rem') != 'MITIGADO']
    sev = Counter(f['sev'] for f in keep)
    total=len(keep)
    nuevos=sum(1 for f in keep if f['new']=='1')
    deuda=total-nuevos

    # header tags
    s = re.sub(r'<span class="tag">\d+ hallazgos</span>',
               '<span class="tag">%d hallazgos</span>'%total, s, count=1)
    s = re.sub(r'<span class="tag">\d+ (?:deuda técnica|nuevos)[^<]*</span>',
               '<span class="tag">%d deuda técnica · %d nuevos abiertos</span>'%(deuda,nuevos), s, count=1)

    # dashboard KPIs (by label)
    def kpi(label, n, color):
        nonlocal s
        s = re.sub(r'(<div class="kpi[^"]*"><div class="n"[^>]*>)\d+(</div><div class="l">%s</div>)'%re.escape(label),
                   lambda m: m.group(1)+str(n)+m.group(2), s, count=1)
    s = re.sub(r'(<div class="kpi big"><div class="n">)\d+(</div><div class="l">Total</div>)',
               lambda m:m.group(1)+str(total)+m.group(2), s, count=1)
    kpi('Críticos', sev.get('CRITICO',0), '#dc2626')
    kpi('Altos', sev.get('ALTO',0), '#ea580c')
    kpi('Medios', sev.get('MEDIO',0), '#d97706')
    kpi('Bajos', sev.get('BAJO',0), '#2563eb')
    kpi('Observ.', sev.get('OBSERVACION',0), '#64748b')

    # §3 matrix
    mat=defaultdict(lambda: defaultdict(int))
    for f in keep: mat[f['cat']][f['sev']]+=1
    seen=set(); cats=[]
    for c in CAT_ORDER:
        if c in mat and c not in seen: cats.append(c); seen.add(c)
    for c in mat:
        if c not in seen: cats.append(c); seen.add(c)
    def cell(n): return '<td>%d</td>'%n if n else '<td></td>'
    rows=[]; tot={k:0 for k in SEV_ORDER}; grand=0
    for c in cats:
        m=mat[c]; vals=[m.get(sv,0) for sv in SEV_ORDER]; rt=sum(vals)
        if rt==0: continue
        for sv in SEV_ORDER: tot[sv]+=m.get(sv,0)
        grand+=rt
        rows.append('<tr class="catrow" data-catrow="%s">\n          <td class="cn">%s</td>\n          %s%s%s\n          %s%s\n          <td class="tot">%d</td>\n        </tr>'%(
            c,c,cell(vals[0]),cell(vals[1]),cell(vals[2]),cell(vals[3]),cell(vals[4]),rt))
    totrow='<tr class="totrow">\n      <td>TOTAL</td>\n      <td>%d</td><td>%d</td><td>%d</td>\n      <td>%d</td><td>%d</td><td class="tot">%d</td>\n    </tr>'%(
        tot['CRITICO'],tot['ALTO'],tot['MEDIO'],tot['BAJO'],tot['OBSERVACION'],grand)
    body='<tbody>'+''.join(rows)+totrow+'</tbody>'
    i3=s.find('<h2 id="s3">'); inext=s.find('<h2 ', i3+5)
    seg=s[i3:inext]
    seg2=re.sub(r'<tbody>.*?</tbody>', body, seg, count=1, flags=re.S)
    s=s[:i3]+seg2+s[inext:]

    # §4 by-file
    order=[]; data={}
    for f in keep:
        k=f['file'] or '—'
        if k not in data: data[k]={'n':0,'w':99}; order.append(k)
        data[k]['n']+=1; data[k]['w']=min(data[k]['w'],SEV_RANK[f['sev']])
    pos={k:i for i,k in enumerate(order)}
    order.sort(key=lambda k:(data[k]['w'],pos[k]))
    rows4=''.join('<tr><td><code>%s</code></td><td>%d</td><td><span class="chip" style="--c:%s">%s</span></td></tr>'%(
        k,data[k]['n'],CHIP[SEV_ORDER[data[k]['w']]],SEV_DISP[SEV_ORDER[data[k]['w']]]) for k in order)
    i4=s.find('<h2 id="s4">'); i4n=s.find('<h2 ', i4+5)
    if i4>=0 and i4n>i4:
        seg4=s[i4:i4n]
        seg4=re.sub(r'(<table class="ftab")( id="filetab")?', r'<table class="ftab" id="filetab"', seg4, count=1)
        seg4=re.sub(r'<tbody>.*?</tbody>', '<tbody>'+rows4+'</tbody>', seg4, count=1, flags=re.S)
        s=s[:i4]+seg4+s[i4n:]

    # §5 Top Riesgos — recomputado desde 'keep'
    rank=sorted(keep, key=lambda f:(SEV_RANK[f['sev']], 0 if f['new']=='1' else 1, f['title']))[:20]
    tr5=''
    for n,f in enumerate(rank,1):
        rat=f['riesgo'] or f['impacto'] or ''
        tr5+='<tr><td class="rk">%d</td><td><span class="chip" style="--c:%s">%s</span></td><td><b>%s</b><div class="rat">%s</div></td></tr>'%(
            n,CHIP[f['sev']],SEV_DISP[f['sev']],f['title'],rat)
    i5=s.find('<h2 id="s5">'); i5n=s.find('<h2 ', i5+5)
    if i5>=0 and i5n>i5:
        seg5=s[i5:i5n]
        seg5=seg5.replace('5 · Top 20 Riesgos','5 · Top Riesgos')
        seg5=re.sub(r'<tbody>.*?</tbody>', '<tbody>'+tr5+'</tbody>', seg5, count=1, flags=re.S)
        s=s[:i5]+seg5+s[i5n:]
    s=s.replace('<a href="#s5">5 · Top 20 Riesgos</a>','<a href="#s5">5 · Top Riesgos</a>')

    # §6 Quick Wins — hallazgos de esfuerzo Bajo
    qw=[f for f in keep if f['esf'].lower()=='bajo']
    qw.sort(key=lambda f:(SEV_RANK[f['sev']],f['title']))
    li6=''.join('<li><span class="ef ef-bajo">Bajo</span> %s</li>'%f['title'] for f in qw) or '<li class="dim">—</li>'
    i6=s.find('<h2 id="s6">'); i6n=s.find('<h2 ', i6+5)
    if i6>=0 and i6n>i6:
        seg6=s[i6:i6n]
        seg6=re.sub(r'<ul class="qw">.*?</ul>', '<ul class="qw">'+li6+'</ul>', seg6, count=1, flags=re.S)
        s=s[:i6]+seg6+s[i6n:]

    # §7 Roadmap — por severidad
    def items(sevs):
        xs=[f for f in keep if f['sev'] in sevs]
        xs.sort(key=lambda f:(SEV_RANK[f['sev']],f['title']))
        return ''.join('<li>%s</li>'%f['title'] for f in xs) or '<li class="empty">—</li>'
    i7=s.find('<h2 id="s7">'); i7n=s.find('<h2 ', i7+5)
    if i7>=0 and i7n>i7:
        rm=('<div class="rmgrid">'
            '<div class="rmcol"><h4 style="--c:#dc2626">Fase 1 · Críticos</h4><ul>%s</ul></div>'
            '<div class="rmcol"><h4 style="--c:#ea580c">Fase 2 · Altos</h4><ul>%s</ul></div>'
            '<div class="rmcol"><h4 style="--c:#d97706">Fase 3 · Medios</h4><ul>%s</ul></div>'
            '<div class="rmcol"><h4 style="--c:#2563eb">Fase 4 · Bajos / Obs.</h4><ul>%s</ul></div>'
            '</div>')%(items(['CRITICO']),items(['ALTO']),items(['MEDIO']),items(['BAJO','OBSERVACION']))
        head7=s[i7:s.find('</h2>',i7)+5]
        s=s[:i7]+head7+'\n'+rm+'\n'+s[i7n:]
    return s, (total,nuevos,deuda,dict(sev),mitigado)

def remove_conclusiones(s):
    """R9: elimina <h3>Conclusiones clave</h3> + su panel siguiente."""
    m=re.search(r'<h3>\s*Conclusiones clave\s*</h3>\s*<div class="panel">.*?</div>\s*', s, re.S)
    if m: s=s[:m.start()]+s[m.end():]
    return s

def remove_rembanner(s):
    """R12: elimina el banner de remediación (.rembanner) — no va en el informe."""
    return remove_balanced_div(s, '<div class="rembanner">')

def remove_section9(s):
    """R12: elimina la §9 (Anexos / Inventarios) conservando el footer + su link en el índice."""
    i=s.find('<h2 id="s9">')
    if i>=0:
        foot=s.find('<div class="foot"', i)
        end=foot if foot>0 else s.find('</body>', i)
        if end>0:
            s=s[:i]+s[end:]
    s=re.sub(r'<a href="#s9">[^<]*</a>\s*', '', s)
    return s

def make_light(s):
    """R8: tema claro. Redefine :root y agrega overrides (idempotente por marcador)."""
    s=re.sub(r':root\{--bg:#[0-9a-fA-F]+;[^}]*\}',
        ':root{--bg:#f1f5f9;--panel:#ffffff;--panel2:#f8fafc;--ink:#0f172a;--mut:#64748b;--bd:#e2e8f0;--acc:#1d6fa5;}', s, count=1)
    if '/* NORMALIZE-LIGHT */' not in s:
        css=('\n/* NORMALIZE-LIGHT */\n'
'h3{color:#334155}\ncode{background:#f1f5f9;color:#0369a1}\npre{background:#0f172a;color:#e2e8f0;border-color:#0f172a}\n'
'.head{background:linear-gradient(135deg,#0b3d5c,#1d6fa5);border-color:#0b3d5c;color:#fff}\n.head h1{color:#fff}\n.head .sub{color:rgba(255,255,255,.9)}\n'
'.tag{background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.35)}\n.exec{color:#334155}\n.sclab{color:#334155}\n.scbar{background:#e2e8f0}\n'
'.filters{background:rgba(241,245,249,.92);flex-direction:column;align-items:stretch}\n.fbtn{background:#fff;color:var(--ink)}\n.search{background:#fff;color:var(--ink)}\n'
'.fhead{color:var(--ink)}\n.fhead:hover{background:#f1f5f9}\n.catb{color:#475569}\n'
'.nflag.new{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}\n.nflag.cat{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}\n'
'.rflag.rfix{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}\n.rflag.rdoc{background:#fffbeb;color:#b45309;border-color:#fde68a}\n.rflag.rmit{background:#eef2f7;color:#475569;border-color:#cbd5e1}\n'
'.rembanner{background:#f0fdf4;border-color:#bbf7d0}\n.grid>div{background:#f8fafc}\n.fsec>b{color:#475569}\n.fsec p{color:#334155}\n.fsec.note p{color:#64748b}\n'
'.cattab .totrow td{background:#f1f5f9}\n.ef-bajo{background:#dcfce7;color:#166534}.ef-medio{background:#fef3c7;color:#92400e}.ef-alto{background:#fee2e2;color:#991b1b}\n'
'.rmcol h4{color:#0f172a}\n.rmcol ul{color:#334155}\n.tbl{background:#f1f5f9;color:#0369a1}\n.bigtab .loc{color:#0369a1}\n.toc a{color:#1d6fa5}\n'
'/* colapsable + filtros */\n'
'h2{cursor:pointer;user-select:none;position:relative;padding-left:28px}\n'
"h2::before{content:'\\25BE';position:absolute;left:2px;top:6px;font-size:15px;color:var(--acc);transition:transform .18s}\n"
'h2.collapsed::before{transform:rotate(-90deg)}\n'
'.fgroup{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\n'
'.fglabel{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mut);min-width:66px}\n'
'.catrow{cursor:pointer}\n.catrow:hover td{background:#eef4fb}\n.catrow.on td{background:#dbe9f7}\n.catrow.on td.cn{box-shadow:inset 3px 0 0 var(--acc)}\n'
'#catchip{font-size:12px;color:var(--mut);display:none;align-items:center;gap:6px;flex-wrap:wrap}\n.catx{cursor:pointer;font-weight:700;color:var(--acc)}\n'
'.catpill{display:inline-flex;align-items:center;gap:5px;background:#eef4fb;border:1px solid var(--bd);border-radius:999px;padding:1px 5px 1px 10px}\n'
'@media print{h2{padding-left:0}h2::before{display:none}}\n')
        s=s.replace('</style>', css+'</style>', 1)
    return s

FILTERBAR = ('<div class="filters" id="filters">\n'
'  <input class="search" id="q" placeholder="Buscar en título / archivo…" oninput="applyF()">\n'
'  <div class="fgroup">\n    <span class="fglabel">Estado</span>\n'
'    <button class="fbtn fb-est on" data-f="all" onclick="setEstado(this)">Todos <span class="c">{total}</span></button>\n'
'    <button class="fbtn fb-est" data-f="new" onclick="setEstado(this)">Solo nuevos <span class="c">{nuevos}</span></button>\n'
'    <button class="fbtn fb-est" data-f="debt" onclick="setEstado(this)">Deuda técnica <span class="c">{deuda}</span></button>\n'
'    <button class="fbtn fb-est" data-f="mitigado" onclick="setEstado(this)">Mitigados <span class="c">{mitigado}</span></button>\n'
'  </div>\n  <div class="fgroup">\n    <span class="fglabel">Severidad</span>\n'
'    <button class="fbtn fb-sev on" data-f="all" onclick="setSev(this)">Todas <span class="c">{total}</span></button>\n'
'    <button class="fbtn fb-sev" data-f="CRITICO" onclick="setSev(this)">Críticos <span class="c">{c}</span></button>\n'
'    <button class="fbtn fb-sev" data-f="ALTO" onclick="setSev(this)">Altos <span class="c">{a}</span></button>\n'
'    <button class="fbtn fb-sev" data-f="MEDIO" onclick="setSev(this)">Medios <span class="c">{m}</span></button>\n'
'    <button class="fbtn fb-sev" data-f="BAJO" onclick="setSev(this)">Bajos <span class="c">{b}</span></button>\n'
'    <button class="fbtn fb-sev" data-f="OBSERVACION" onclick="setSev(this)">Obs. <span class="c">{o}</span></button>\n'
'  </div>\n  <span id="catchip"></span>\n</div>\n')

def remove_balanced_div(s, opener):
    """Elimina el <div> (con sus anidados) que empieza en `opener`, repetidamente."""
    while True:
        i=s.find(opener)
        if i<0: break
        depth=0; j=None
        for m in re.finditer(r'<div\b|</div>', s[i:]):
            if m.group()=='</div>':
                depth-=1
                if depth==0: j=i+m.end(); break
            else:
                depth+=1
        if j is None: break
        k=j
        while k<len(s) and s[k] in ' \n\t\r': k+=1
        s=s[:i]+s[k:]
    return s

def restructure_filters(s, stats):
    """R10: quita cualquier barra de filtros existente y la coloca en §3 (dos ejes)."""
    total,nuevos,deuda,sev,mitigado=stats
    # remove every existing filter bar (balanced, soporta divs anidados)
    s=remove_balanced_div(s, '<div class="filters" id="filters">')
    bar=FILTERBAR.format(total=total,nuevos=nuevos,deuda=deuda,mitigado=mitigado,
                         c=sev.get('CRITICO',0),a=sev.get('ALTO',0),m=sev.get('MEDIO',0),
                         b=sev.get('BAJO',0),o=sev.get('OBSERVACION',0))
    # insert right after the §3 heading
    i3=s.find('<h2 id="s3">')
    he=s.find('</h2>', i3)+5
    s=s[:he]+'\n'+bar+s[he:]
    return s

JS = """<script>
// ───── Secciones colapsables ─────
(function(){
  function sibs(h){var e=[],n=h.nextElementSibling;while(n&&n.tagName!=='H2'){e.push(n);n=n.nextElementSibling;}return e;}
  function setColl(h,c){h.classList.toggle('collapsed',c);sibs(h).forEach(function(x){x.style.display=c?'none':'';});}
  [].forEach.call(document.querySelectorAll('h2'),function(h){h.addEventListener('click',function(){setColl(h,!h.classList.contains('collapsed'));});});
  window.addEventListener('beforeprint',function(){[].forEach.call(document.querySelectorAll('h2.collapsed'),function(h){sibs(h).forEach(function(x){x.style.display='';});});});
  window.addEventListener('afterprint',function(){[].forEach.call(document.querySelectorAll('h2.collapsed'),function(h){sibs(h).forEach(function(x){x.style.display='none';});});});
})();
// ───── Filtros multi-eje: Estado (superior) × Severidad × Categoría (fila de §3). Afectan lista + §4. ─────
var fEst='all', fSev='all', fCats=[], q='';
// R13: los MITIGADOS entran a ALLF (para poder filtrarlos), pero están OCULTOS por
// defecto: solo aparecen al elegir el estado "Mitigados". Con cualquier otro estado
// (Todos/Nuevos/Deuda) NO se muestran ni cuentan → el conteo general refleja solo
// deuda/riesgo abierto (coherente con el conteo estático).
var ALLF=[].slice.call(document.querySelectorAll('.finding'));
var SEVS=['CRITICO','ALTO','MEDIO','BAJO','OBSERVACION'];
var SEVCHIP={CRITICO:'#dc2626',ALTO:'#ea580c',MEDIO:'#d97706',BAJO:'#2563eb',OBSERVACION:'#64748b'};
var SEVDISP={CRITICO:'Crítico',ALTO:'Alto',MEDIO:'Medio',BAJO:'Bajo',OBSERVACION:'Observación'};
var SEVRANK={CRITICO:0,ALTO:1,MEDIO:2,BAJO:3,OBSERVACION:4};
function matchEst(el){var mit=el.dataset.rem==='MITIGADO';
  if(fEst==='mitigado')return mit;   // "Mitigados": SOLO los mitigados
  if(mit)return false;                // cualquier otro estado: los mitigados quedan ocultos
  if(fEst==='all')return true;        // Todos = nuevos + deuda (sin mitigados)
  return fEst==='new'?el.dataset.new==='1':el.dataset.new==='0';}
function matchSev(el){return fSev==='all'||el.dataset.sev===fSev;}
function matchCat(el){return fCats.length===0||fCats.indexOf(el.dataset.cat)>=0;}
function setEstado(b){document.querySelectorAll('.fb-est').forEach(function(x){x.classList.remove('on');});b.classList.add('on');fEst=b.dataset.f;recountSev();recountMatrix();rebuildFile();applyF();}
function setSev(b){document.querySelectorAll('.fb-sev').forEach(function(x){x.classList.remove('on');});b.classList.add('on');fSev=b.dataset.f;recountMatrix();rebuildFile();applyF();}
function setCat(cat){var i=fCats.indexOf(cat);if(i>=0)fCats.splice(i,1);else fCats.push(cat);document.querySelectorAll('.catrow').forEach(function(r){r.classList.toggle('on',fCats.indexOf(r.dataset.catrow)>=0);});renderCatChip();rebuildFile();applyF();}
function clearCat(){fCats=[];document.querySelectorAll('.catrow').forEach(function(r){r.classList.remove('on');});renderCatChip();rebuildFile();applyF();}
function renderCatChip(){var el=document.getElementById('catchip');if(!el)return;if(fCats.length===0){el.style.display='none';el.innerHTML='';return;}el.style.display='inline-flex';el.innerHTML='Categorías: '+fCats.map(function(c){return '<span class="catpill" data-c="'+c+'">'+c+' <span class="catx">✕</span></span>';}).join('')+' <span class="catx" id="catclear">limpiar</span>';el.querySelectorAll('.catpill .catx').forEach(function(x){x.addEventListener('click',function(){setCat(x.parentElement.dataset.c);});});var cc=document.getElementById('catclear');if(cc)cc.addEventListener('click',clearCat);}
function recountSev(){var pool=ALLF.filter(matchEst);document.querySelectorAll('.fb-sev').forEach(function(btn){var f=btn.dataset.f;var n=(f==='all')?pool.length:pool.filter(function(el){return el.dataset.sev===f;}).length;var c=btn.querySelector('.c');if(c)c.textContent=n;});}
function recountMatrix(){var pool=ALLF.filter(function(el){return matchEst(el)&&matchSev(el);});document.querySelectorAll('.catrow').forEach(function(row){var cat=row.dataset.catrow;var tds=row.querySelectorAll('td');var cc={CRITICO:0,ALTO:0,MEDIO:0,BAJO:0,OBSERVACION:0},t=0;pool.forEach(function(el){if(el.dataset.cat===cat){cc[el.dataset.sev]++;t++;}});for(var i=0;i<5;i++){tds[i+1].textContent=cc[SEVS[i]]?cc[SEVS[i]]:'';}tds[6].textContent=t;row.style.display=t?'':'none';});var tr=document.querySelector('.cattab .totrow');if(tr){var td=tr.querySelectorAll('td');var c2={CRITICO:0,ALTO:0,MEDIO:0,BAJO:0,OBSERVACION:0},t2=0;pool.forEach(function(el){c2[el.dataset.sev]++;t2++;});td[1].textContent=c2.CRITICO;td[2].textContent=c2.ALTO;td[3].textContent=c2.MEDIO;td[4].textContent=c2.BAJO;td[5].textContent=c2.OBSERVACION;td[6].textContent=t2;}}
function rebuildFile(){var pool=ALLF.filter(function(el){return matchEst(el)&&matchSev(el)&&matchCat(el);});var order=[],data={};pool.forEach(function(el){var k=el.dataset.file||'—';if(!data[k]){data[k]={n:0,w:99};order.push(k);}data[k].n++;data[k].w=Math.min(data[k].w,SEVRANK[el.dataset.sev]);});var pos={};order.forEach(function(k,i){pos[k]=i;});order.sort(function(a,b){return data[a].w-data[b].w||pos[a]-pos[b];});var html='';order.forEach(function(k){var sv=SEVS[data[k].w];html+='<tr><td><code>'+k+'</code></td><td>'+data[k].n+'</td><td><span class="chip" style="--c:'+SEVCHIP[sv]+'">'+SEVDISP[sv]+'</span></td></tr>';});var tb=document.querySelector('#filetab tbody');if(tb)tb.innerHTML=html||'<tr><td colspan="3" class="dim">Sin hallazgos para el filtro actual</td></tr>';}
function applyF(){q=(document.getElementById('q').value||'').toLowerCase();ALLF.forEach(function(el){var ok=matchEst(el)&&matchSev(el)&&matchCat(el);if(ok&&q){ok=el.textContent.toLowerCase().indexOf(q)>=0;}el.style.display=ok?'':'none';});}
document.querySelectorAll('.catrow').forEach(function(r){r.addEventListener('click',function(){setCat(r.dataset.catrow);});});
// Init: aplica el estado por defecto (Todos → sin mitigados) al cargar, para que los
// hallazgos MITIGADOS queden OCULTOS de arranque y la matriz/conteos se rendericen desde
// el set filtrado (sin depender del valor server-rendered).
recountSev();recountMatrix();rebuildFile();applyF();
</script>"""

def replace_js(s):
    # add data-file to each finding for the live §4 rebuild
    def add_file(m):
        blk=m.group(0)
        if 'data-file=' in blk[:200]: return blk
        am=re.search(r'<div><b>Archivo</b><code>([^<]*)</code>', blk)
        fk=re.split(r'\s+:', am.group(1), maxsplit=1)[0].strip() if am else '—'
        fk=fk.replace('"','&quot;')
        return blk.replace('<div class="finding"','<div class="finding" data-file="%s"'%fk,1)
    s=re.sub(r'<div class="finding"[^>]*>', add_file, s)
    # replace the LAST <script>...</script> (the app script) with our JS
    last=s.rfind('<script>')
    end=s.find('</script>', last)+len('</script>')
    s=s[:last]+JS+s[end:]
    return s

def main():
    path = sys.argv[1] if len(sys.argv)>1 else None
    if not path:
        root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cand=sorted(glob.glob(os.path.join(root,'informe-auditoria-forense-*.html')))
        if not cand: print('no report found'); return 1
        path=cand[-1]
    s=open(path,encoding='utf-8').read()

    # ── Puerta de entrada ESTRICTA ──────────────────────────────────────────
    # Antes bastaba con que existiera la subcadena `<div class="finding"`. Ese proxy es
    # insuficiente: `parse_findings` necesita ADEMÁS el contenedor `<div id="findings">`.
    # Si faltaba, parse_findings devolvía None, strip_corrected_and_reclass devolvía
    # `keep=[]`, y el resto del pipeline seguía adelante recomputando TODO a cero e
    # inyectando una segunda barra de filtros y un segundo <script> sobre los ya
    # presentes. Resultado real (2026-07-21): "total=0" y las 60 tarjetas duplicadas a
    # 120 (168 KB → 317 KB). Un normalizador que no entiende su entrada debe ABORTAR,
    # nunca transformarla a ciegas.
    # Se cuentan LAS DOS FORMAS. El contrato que este normalizador sabe reescribir usa
    # `<div class="finding">`, pero desde la corrida del 2026-08-06 los informes se emiten
    # con `<article class="finding">` (R15). Contando solo la primera, un informe entero de
    # 31 hallazgos salia por «SKIP (sin tarjetas)» con codigo 0 — y «SKIP» se lee como
    # «normalizado», que es justo lo contrario. Ahora se distingue: sin tarjetas es SKIP;
    # con tarjetas que no encajan en el contrato, ABORT.
    n_div = s.count('<div class="finding"')
    n_art = s.count('<article class="finding"')
    n_raw = n_div + n_art
    if n_raw == 0:
        print('SKIP (sin tarjetas .finding):', path); return 0
    if n_div == 0:
        sys.stderr.write(
            'ABORT: %s tiene %d tarjeta(s) <article class="finding"> — el contrato DOM\n'
            '       nuevo (R15). Este normalizador solo sabe reescribir el contrato viejo\n'
            '       con <div class="finding"> dentro de <div id="findings">.\n'
            '       NO se escribio nada. Verifica R1..R17 a mano.\n'
            % (os.path.basename(path), n_art))
        return 2
    probe = parse_findings(s)
    if not probe or not probe[3]:
        sys.stderr.write(
            'ABORT: %s tiene %d tarjeta(s) .finding pero no el contrato DOM que este\n'
            '       normalizador sabe reescribir. Falta/!coincide alguno de:\n'
            '         · contenedor  <div id="findings">\n'
            '         · encabezados <h2 id="sN"> sin atributos extra\n'
            '         · campos      class="ftitle" · <div><b>Archivo</b><code>…\n'
            '       NO se escribió nada. Verificá R1..R15 a mano, o adaptá el informe\n'
            '       al contrato antes de normalizar.\n' % (os.path.basename(path), n_raw))
        return 2

    s=make_light(s)
    s=remove_conclusiones(s)
    s=remove_rembanner(s)
    s=remove_section9(s)
    s, keep = strip_corrected_and_reclass(s)
    s, stats = recompute_derived(s, keep)
    s=restructure_filters(s, stats)
    s=replace_js(s)
    if MARK not in s:
        s=s.replace('</body>', MARK+'</body>', 1) if '</body>' in s else s+MARK

    # ── Invariante de salida (R6) antes de tocar el disco ────────────────────
    # "Un número que no cuadre con el conteo real de tarjetas es un bug, no una opción."
    # `keep` ya excluye los CORREGIDO (R3) y conserva los MITIGADO (R13, se listan).
    n_out = s.count('<div class="finding"')
    if n_out != len(keep):
        sys.stderr.write(
            'ABORT: el resultado no cuadra — %d tarjetas en el HTML transformado vs %d\n'
            '       esperadas tras aplicar R3/R13. Se descartó la transformación y NO se\n'
            '       escribió el archivo (el original queda intacto).\n' % (n_out, len(keep)))
        return 3

    open(path,'w',encoding='utf-8').write(s)
    print('NORMALIZED %s — total=%d nuevos=%d deuda=%d mitigado=%d sev=%s'%(os.path.basename(path),stats[0],stats[1],stats[2],stats[4],stats[3]))
    return 0

if __name__=='__main__':
    sys.exit(main())
