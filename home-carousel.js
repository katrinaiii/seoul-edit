(function(){
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let active=null;
  function mount(root){
    if(!root||root.dataset.ready==='true')return;
    root.dataset.ready='true';
    const cards=[...root.querySelectorAll('.hero-carousel-card')];
    if(!cards.length)return;
    let position=0,dragStart=0,startPosition=0,dragging=false,moved=false,lastTime=performance.now();
    const wrap=n=>((n%cards.length)+cards.length)%cards.length;
    const signedDistance=(index,center)=>{let d=index-wrap(center);if(d>cards.length/2)d-=cards.length;if(d<-cards.length/2)d+=cards.length;return d};
    function paint(){
      cards.forEach((card,index)=>{
        const d=signedDistance(index,position),abs=Math.abs(d);
        card.style.setProperty('--x',`${d*42}%`);
        card.style.setProperty('--z',`${220-abs*145}px`);
        card.style.setProperty('--rotate',`${d*-8}deg`);
        card.style.setProperty('--scale',Math.max(.62,1-abs*.17));
        card.style.setProperty('--shade',Math.min(.7,abs*.28));
        card.style.zIndex=String(20-Math.round(abs*3));
        card.classList.toggle('is-focus',abs<.5);
        card.setAttribute('aria-hidden',abs>2.6?'true':'false');
        card.tabIndex=abs<.5?0:-1;
      });
    }
    function tick(now){
      if(!dragging&&!reduceMotion.matches){position=wrap(position+(now-lastTime)/14000);paint()}
      lastTime=now;active.raf=requestAnimationFrame(tick);
    }
    function endDrag(e){if(!dragging)return;dragging=false;root.classList.remove('is-dragging');position=wrap(Math.round(position));paint();try{root.releasePointerCapture(e.pointerId)}catch(_){}}
    root.addEventListener('dragstart',e=>e.preventDefault());
    root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-carousel-step]'))return;dragging=true;moved=false;dragStart=e.clientX;startPosition=position;root.classList.add('is-dragging');root.setPointerCapture(e.pointerId)});
    root.addEventListener('pointermove',e=>{if(!dragging)return;const delta=e.clientX-dragStart;if(Math.abs(delta)>6)moved=true;position=wrap(startPosition-delta/180);paint()});
    root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);
    root.addEventListener('click',e=>{const card=e.target.closest('.hero-carousel-card');if(!card)return;const index=Number(card.dataset.carouselIndex);if(moved||!card.classList.contains('is-focus')){e.preventDefault();position=index;moved=false;paint()}});
    root.querySelectorAll('[data-carousel-step]').forEach(button=>button.addEventListener('click',()=>{position=wrap(Math.round(position)+Number(button.dataset.carouselStep));paint()}));
    root.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();position=wrap(Math.round(position)+(e.key==='ArrowRight'?1:-1));paint()});
    active={root,raf:0};paint();active.raf=requestAnimationFrame(tick);
  }
  function refresh(){const root=document.querySelector('.hero-carousel');if(active&&active.root!==root){cancelAnimationFrame(active.raf);active=null}if(root&&!active)mount(root)}
  new MutationObserver(refresh).observe(document.getElementById('app'),{childList:true,subtree:true});refresh();
})();
