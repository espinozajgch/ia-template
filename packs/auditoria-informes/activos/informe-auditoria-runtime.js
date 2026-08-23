
(function(){
 var ALLF=[].slice.call(document.querySelectorAll('.finding'));
 var fEst='todos', fSev='todas', fCats=[];
 function matchEst(f){ if(fEst==='todos')return true;
   return fEst==='nuevos' ? f.dataset.new==='1' : f.dataset.new==='0'; }
 function matchSev(f){ return fSev==='todas'||f.dataset.sev===fSev; }
 function matchCat(f){ return !fCats.length||fCats.indexOf(f.dataset.cat)>=0; }
 function visibles(){ return ALLF.filter(function(f){return matchEst(f)&&matchSev(f)&&matchCat(f);}); }

 function recount(){
  document.querySelectorAll('.fbtn[data-est]').forEach(function(b){
   var v=b.dataset.est, n=ALLF.filter(function(f){
    var ok = v==='todos'?true:(v==='nuevos'?f.dataset.new==='1':f.dataset.new==='0');
    return ok&&matchSev(f)&&matchCat(f);}).length;
   b.querySelector('.n').textContent=n; });
  document.querySelectorAll('.fbtn[data-sev]').forEach(function(b){
   var v=b.dataset.sev, n=ALLF.filter(function(f){
    return matchEst(f)&&(v==='todas'||f.dataset.sev===v)&&matchCat(f);}).length;
   b.querySelector('.n').textContent=n; });
 }
 function recountMatrix(){
  var sevs=['critico','alto','medio','bajo','obs'];
  var base=ALLF.filter(function(f){return matchEst(f)&&matchSev(f);});
  var tot=[0,0,0,0,0];
  document.querySelectorAll('tr.catrow').forEach(function(tr){
   var c=tr.dataset.catrow, suma=0;
   sevs.forEach(function(s,i){
    var n=base.filter(function(f){return f.dataset.cat===c&&f.dataset.sev===s;}).length;
    tr.cells[i+1].textContent=n||'—'; tot[i]+=n; suma+=n; });
   tr.cells[6].innerHTML='<b>'+suma+'</b>';
   tr.classList.toggle('hidden', suma===0 && fCats.indexOf(c)<0); });
  var t=document.querySelector('tr.cattot');
  tot.forEach(function(n,i){ t.cells[i+1].textContent=n; });
  t.cells[6].textContent=tot.reduce(function(a,b){return a+b;},0);
 }
 function rebuildFile(){
  var vis=visibles(), mapa={};
  vis.forEach(function(f){ (mapa[f.dataset.file]=mapa[f.dataset.file]||[]).push(f); });
  document.querySelectorAll('#filetab tbody tr').forEach(function(tr){
   var k=tr.dataset.filerow, hs=mapa[k];
   tr.classList.toggle('hidden', !hs);
   if(hs) tr.cells[1].textContent=hs.length; });
 }
 function bar(){
  var chips=[];
  if(fEst!=='todos')chips.push('Estado: '+fEst);
  if(fSev!=='todas')chips.push('Severidad: '+fSev);
  fCats.forEach(function(c){chips.push('Categoría: '+c);});
  var b=document.getElementById('fbar');
  document.getElementById('fbartxt').textContent=chips.join('   ·   ');
  b.classList.toggle('on', chips.length>0);
 }
 function render(){
  ALLF.forEach(function(f){
   f.style.display=(matchEst(f)&&matchSev(f)&&matchCat(f))?'':'none'; });
  document.getElementById('lcount').textContent='('+visibles().length+')';
  recount(); recountMatrix(); rebuildFile(); bar();
 }
 document.querySelectorAll('.fbtn[data-est]').forEach(function(b){
  b.addEventListener('click',function(){
   fEst=b.dataset.est;
   document.querySelectorAll('.fbtn[data-est]').forEach(function(x){x.classList.remove('on');});
   b.classList.add('on'); render(); }); });
 document.querySelectorAll('.fbtn[data-sev]').forEach(function(b){
  b.addEventListener('click',function(){
   fSev=b.dataset.sev;
   document.querySelectorAll('.fbtn[data-sev]').forEach(function(x){x.classList.remove('on');});
   b.classList.add('on'); render(); }); });
 document.querySelectorAll('tr.catrow').forEach(function(tr){
  tr.addEventListener('click',function(){
   var c=tr.dataset.catrow, i=fCats.indexOf(c);
   if(i>=0){fCats.splice(i,1); tr.classList.remove('on');}
   else {fCats.push(c); tr.classList.add('on');}
   render(); }); });
 document.getElementById('fclear').addEventListener('click',function(){
  fEst='todos'; fSev='todas'; fCats=[];
  document.querySelectorAll('.fbtn').forEach(function(x){x.classList.remove('on');});
  document.querySelector('[data-est="todos"]').classList.add('on');
  document.querySelector('[data-sev="todas"]').classList.add('on');
  document.querySelectorAll('tr.catrow').forEach(function(x){x.classList.remove('on');});
  render(); });
 document.querySelectorAll('h2').forEach(function(h){
  h.addEventListener('click',function(){
   h.classList.toggle('collapsed');
   var n=h.nextElementSibling;
   while(n){ n.style.display=h.classList.contains('collapsed')?'none':''; n=n.nextElementSibling; }
  }); });
 window.addEventListener('beforeprint',function(){
  document.querySelectorAll('h2.collapsed').forEach(function(h){
   h.classList.remove('collapsed');
   var n=h.nextElementSibling;
   while(n){ n.style.display=''; n=n.nextElementSibling; } });
  ALLF.forEach(function(f){f.style.display='';});
  document.querySelectorAll('tr.hidden').forEach(function(t){t.classList.remove('hidden');});
 });
 render();
})();
