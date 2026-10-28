(function(){
  'use strict';
  const provider=new SeoulTracking.MockTrackingProvider();
  const fmt=t=>t?new Date(t).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'尚未同步';
  const orderById=id=>state.orders.find(o=>o.id===id);
  const sellerOf=o=>sellers[o.seller]||sellers[0];
  const methodOf=o=>sellerOf(o).routeType==='traveler'?'return_home_shipping':'international_shipping';
  const methodLabel=m=>m==='return_home_shipping'?'回国后国内寄送':'韩国直邮';
  const ensureOrder=o=>{o.shipments=Array.isArray(o.shipments)?o.shipments:[];o.logisticsNotifications=Array.isArray(o.logisticsNotifications)?o.logisticsNotifications:[];return o};
  function syncOrder(o,now=Date.now()){
    ensureOrder(o);let changed=false;
    o.shipments.forEach(sh=>{
      const known=new Set(sh.events.map(e=>e.event_id)),before=sh.current_status;
      provider.sync(sh,now);
      sh.events.filter(e=>!known.has(e.event_id)).forEach(e=>{o.logisticsNotifications.push({id:e.event_id,shipment_id:sh.shipment_id,status_code:e.status_code,message:e.status_code==='EXCEPTION'?'物流出现延迟，预计时效已发生变化，请等待代购核实。':`物流更新：${SeoulTracking.statusInfo(e.status_code).label}`,created_at:e.occurred_at,simulated:true});changed=true});
      if(before!==sh.current_status)changed=true;
    });
    const events=o.shipments.flatMap(s=>s.events.map(e=>({...e,shipment_id:s.shipment_id}))).sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at));
    const activeException=o.shipments.some(s=>s.exception_state?.status==='active');
    const latest=[...events].reverse().find(e=>e.status_code!=='EXCEPTION_RESOLVED');
    if(activeException)o.status='物流异常';else if(latest){const mapped=SeoulTracking.statusInfo(latest.status_code).platform;o.status=mapped==='已签收'?'已完成':mapped;}
    o.logistics_last_checked_at=o.shipments.length?new Date(now).toISOString():null;
    return changed;
  }
  function syncAll(now=Date.now()){let changed=false;state.orders.forEach(o=>{if(syncOrder(o,now))changed=true});if(changed)save();return changed}
  function eventRows(o){
    const all=o.shipments.flatMap(s=>s.events.map(e=>({...e,carrier:s.carrier,tracking_number:s.tracking_number}))).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
    return all.map(e=>`<li class="${e.status_code==='EXCEPTION'?'tracking-exception':''}"><b>${esc(SeoulTracking.statusInfo(e.status_code).label)}</b><p>${esc(e.description)}</p><small>${fmt(e.occurred_at)} · ${esc(e.carrier)} ${esc(e.tracking_number)} · 模拟事件</small></li>`).join('')||'<li><p>绑定运单后，Agent 将按模拟时间自动生成事件。</p></li>';
  }
  function latestStatus(o){
    if(!o.shipments.length)return {code:'UNBOUND',label:'等待绑定物流单号',time:null};
    const ex=o.shipments.find(s=>s.exception_state?.status==='active');if(ex)return {code:'EXCEPTION',label:'物流异常 · 等待人工核实',time:ex.last_checked_at};
    const latest=o.shipments.flatMap(s=>s.events).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at))[0];
    return latest?{code:latest.status_code,label:SeoulTracking.statusInfo(latest.status_code).label,time:o.logistics_last_checked_at}:{code:'BOUND',label:'运单已绑定，等待首个事件',time:o.logistics_last_checked_at};
  }
  window.bindTracking=function(id,form){
    const o=orderById(id);if(!o)return;
    ensureOrder(o);const number=form.tracking_number.value.trim();
    if(o.shipments.some(s=>s.tracking_number===number)){toast('该运单号已经绑定');return}
    const sh=provider.createShipment({order_id:o.id,shipping_method:methodOf(o),carrier:form.carrier.value,tracking_number:number,tracking_stage:form.tracking_stage.value,demo_speed:form.demo_speed.value,scenario:form.scenario.value});
    o.shipments.push(sh);syncOrder(o);save();render();toast('模拟运单已绑定，Agent 开始自动追踪');
  };
  window.resolveTrackingException=function(orderId,shipmentId){
    const o=orderById(orderId),sh=o?.shipments?.find(s=>s.shipment_id===shipmentId);if(!sh)return;
    if(provider.resolveException(sh)){o.logisticsNotifications.push({id:sh.shipment_id+':resolved',shipment_id:sh.shipment_id,status_code:'EXCEPTION_RESOLVED',message:'代购已确认异常解除，模拟运输继续。',created_at:new Date().toISOString(),simulated:true});syncOrder(o);save();render();toast('异常已标记解除，自动追踪已恢复')}
  };
  function shipmentCards(o){return o.shipments.map(s=>`<div class="tracking-waybill"><div><small>${esc(s.shipment_id)} · ${esc(s.tracking_stage==='full'?'全流程主单':s.tracking_stage==='domestic'?'中国国内段':'韩国/国际段')}</small><h3>${esc(s.carrier)} · ${esc(s.tracking_number)}</h3><p>${esc(SeoulTracking.statusInfo(s.current_status).label)} · 最近同步 ${fmt(s.last_checked_at)}</p></div><span class="mock-badge">MOCK · 模拟追踪</span>${s.exception_state?.status==='active'?`<div class="tracking-alert"><b>待处理：${esc(s.exception_state.reason)}</b><p>自动推进已暂停。请核实后再确认解除，系统不会自行宣称异常已解决。</p><button class="btn pink" onclick="resolveTrackingException('${esc(o.id)}','${esc(s.shipment_id)}')">确认异常已解除</button></div>`:''}</div>`).join('')}
  function sellerTracking(){
    return `<div class="section-head"><div><div class="eyebrow">SMART LOGISTICS AGENT</div><h2>智能物流追踪</h2></div><p class="muted">纯前端模拟 · 不向真实快递公司发送请求</p></div>${state.orders.length?state.orders.map(o=>{ensureOrder(o);const s=sellerOf(o),method=methodOf(o),current=latestStatus(o);return `<section class="panel tracking-order"><div class="row"><div><small>${esc(o.id)} · ${esc(s.id)} ${esc(s.name)}</small><h3>${esc(products[o.product].name)}</h3><p>${esc(o.color||'颜色待确认')} · ${esc(o.size)} · 数量 ${o.quantity||1}${o.sizeVerified===false?' · 尺码待确认':''}</p><p><b>${esc(current.label)}</b> · ${methodLabel(method)}</p><small>最近同步：${fmt(current.time)}</small></div><a class="btn light" href="#tracking/${esc(o.id)}">查看买家端</a></div>${shipmentCards(o)}<details class="tracking-bind" ${o.shipments.length?'':'open'}><summary>＋ 绑定${o.shipments.length?'另一张':'物流'}单号</summary><form onsubmit="event.preventDefault();bindTracking('${esc(o.id)}',this)"><div class="tracking-form-grid"><label>快递公司<select name="carrier" required>${(method==='international_shipping'?['CJ Logistics','EMS Korea','SF Express','中国邮政']:['顺丰速运','中通快递','圆通速递','申通快递']).map(x=>`<option>${x}</option>`).join('')}</select></label><label>快递单号<input name="tracking_number" required maxlength="40" pattern="[A-Za-z0-9-]{6,40}" placeholder="输入 6—40 位模拟单号"></label><label>物流阶段<select name="tracking_stage"><option value="full">全流程主单</option>${method==='international_shipping'?'<option value="international">韩国／国际运输段</option>':''}<option value="domestic">中国国内运输段</option></select></label><label>演示速度<select name="demo_speed"><option value="fast">加速演示 · 3 秒 = 1 模拟日</option><option value="normal">正常演示 · 30 秒 = 1 模拟日</option></select></label><label>演示场景<select name="scenario"><option value="normal">正常配送</option><option value="delay">异常演示 · 包裹运输延迟</option></select></label><label>物流模式<input value="${method}" readonly></label></div><button class="btn pink">绑定物流单号</button></form></details><details><summary>模拟物流事件记录</summary><ol class="tracking-events">${eventRows(o)}</ol></details></section>`}).join(''):'<div class="empty">暂无订单。买家提交订单后，可在这里绑定模拟运单。</div>'}`;
  }
  function buyerOrders(){
    return `<div class="eyebrow">YOUR LITTLE FINDS</div><h1>我的订单</h1><div class="notice">智能物流 Agent 使用浏览器本地保存的模拟数据，不代表真实快递公司查询结果。</div>${state.orders.length?state.orders.map(o=>{ensureOrder(o);const current=latestStatus(o),s=sellerOf(o);return `<div class="panel row tracking-summary"><div><small>${esc(o.id)} · ${esc(s.name)} · ${methodLabel(methodOf(o))}</small><h3>${esc(products[o.product].name)}</h3><p>${esc(o.color||'颜色待确认')} · ${esc(o.size)} · 数量 ${o.quantity||1}${o.sizeVerified===false?' · 尺码待确认':''}</p><p><b>${esc(current.label)}</b></p><small>最近更新：${fmt(current.time)} · ${o.shipments.length} 张运单</small></div><a class="btn pink" href="#tracking/${esc(o.id)}">查看智能物流 →</a></div>`}).join(''):'<div class="empty">还没有订单，先发现一件喜欢的单品吧。<p><a class="btn" href="#brands">查看品牌新品</a></p></div>'}`;
  }
  function buyerTracking(id){
    const o=orderById(id);if(!o)return '<div class="empty">未找到订单。<a href="#orders">返回订单</a></div>';
    ensureOrder(o);const s=sellerOf(o),current=latestStatus(o),notices=[...o.logisticsNotifications].reverse();
    return `<a class="back" href="#orders">← 我的订单</a><div class="row tracking-title"><div><div class="eyebrow">SMART LOGISTICS AGENT</div><h1>心动正在向你靠近。</h1></div><span class="mock-badge">模拟物流数据</span></div><div class="notice">这些状态由课程 Demo 的时间模型生成，并非来自 ${o.shipments.map(x=>x.carrier).join('、')||'真实快递公司'}。</div><div class="split"><div><div class="panel"><small>订单 ${esc(o.id)} · ${methodLabel(methodOf(o))}</small><h2>${esc(current.label)}</h2><p>${methodOf(o)==='return_home_shipping'?'韩国采购后由代购随行带回，完成必要入境手续后从 '+esc(s.origin)+' 国内寄送。':'韩国承运商揽收后，经国际运输及入境清关转入中国国内配送。'}</p><p>最近更新时间：${fmt(current.time)}</p></div>${shipmentCards(o)}<div class="panel"><h3>${esc(products[o.product].name)}</h3><p>${esc(o.color||'颜色待确认')} · ${esc(o.size)} · 数量 ${o.quantity||1} · ${esc(s.name)}</p></div></div><div><div class="panel"><h2>物流时间线</h2><ol class="tracking-events">${eventRows(o)}</ol></div><div class="panel"><h3>状态更新通知</h3>${notices.length?notices.map(n=>`<div class="tracking-notice ${n.status_code==='EXCEPTION'?'is-alert':''}"><b>${esc(n.message)}</b><small>${fmt(n.created_at)} · 模拟通知</small></div>`).join(''):'<p class="muted">有新状态时，Agent 会在这里记录通知。</p>'}</div></div></div>`;
  }
  const renderBeforeAgent=render;
  render=function(){syncAll();renderBeforeAgent();const [page,id]=location.hash.slice(1).split('/');if(page==='seller')$('#app').insertAdjacentHTML('beforeend',sellerTracking());if(page==='orders')$('#app').innerHTML=buyerOrders();if(page==='tracking')$('#app').innerHTML=buyerTracking(id)};
  window.removeEventListener('hashchange',renderBeforeAgent);window.addEventListener('hashchange',render);render();
  setInterval(()=>{const page=(location.hash.slice(1)||'home').split('/')[0];if((page==='orders'||page==='tracking')&&syncAll())render()},1000);
  window.SeoulTrackingAgent={provider,syncOrder,syncAll,methodOf,ensureOrder};
})();
