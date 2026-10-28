(function(global){
  'use strict';
  const DAY_MS={normal:30000,fast:3000};
  const STATUS={
    PURCHASED:{label:'韩国采购完成',platform:'待发货',rank:10},
    PICKED_UP:{label:'已揽收',platform:'已揽收',rank:20},
    KR_IN_TRANSIT:{label:'韩国运输中',platform:'运输中',rank:30},
    WAITING_RETURN:{label:'等待代购回国',platform:'等待回国',rank:30},
    INTERNATIONAL_TRANSIT:{label:'国际运输中',platform:'运输中',rank:40},
    RETURNED_HOME:{label:'代购回国并完成必要入境手续',platform:'已回国',rank:40},
    CUSTOMS:{label:'入境清关',platform:'清关中',rank:50},
    DOMESTIC_PICKED_UP:{label:'国内快递揽收',platform:'已揽收',rank:60},
    DOMESTIC_TRANSIT:{label:'中国国内运输中',platform:'运输中',rank:70},
    OUT_FOR_DELIVERY:{label:'派送中',platform:'派送中',rank:80},
    DELIVERED:{label:'已签收',platform:'已签收',rank:90},
    EXCEPTION:{label:'包裹运输延迟',platform:'物流异常',rank:100}
  };
  const FLOW={
    international_shipping:[
      ['PURCHASED',0,'首尔 · 商品采购和验货完成'],['PICKED_UP',.5,'韩国承运商已揽收'],['KR_IN_TRANSIT',1,'韩国境内运输中'],['INTERNATIONAL_TRANSIT',2,'包裹进入国际运输环节'],['CUSTOMS',3,'包裹进入中国口岸，等待清关'],['DOMESTIC_TRANSIT',4,'清关完成，转入中国国内运输'],['OUT_FOR_DELIVERY',5,'当地配送站正在派送'],['DELIVERED',6,'包裹已送达收件地址']
    ],
    return_home_shipping:[
      ['PURCHASED',0,'韩国 · 商品采购和验货完成'],['WAITING_RETURN',.7,'商品由代购随行保管，等待回国'],['RETURNED_HOME',2,'代购已回国并完成必要入境手续'],['DOMESTIC_PICKED_UP',2.5,'回国城市 · 国内快递已揽收'],['DOMESTIC_TRANSIT',3.5,'包裹进入中国国内运输'],['OUT_FOR_DELIVERY',4.5,'当地配送站正在派送'],['DELIVERED',5.5,'包裹已送达收件地址']
    ]
  };
  function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
  function iso(ms){return new Date(ms).toISOString()}
  function flowFor(method,stage){
    const flow=FLOW[method]||FLOW.international_shipping;
    if(stage==='domestic')return flow.filter(x=>['DOMESTIC_PICKED_UP','DOMESTIC_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'].includes(x[0])).map((x,i)=>[x[0],i*.7,x[2]]);
    if(stage==='international')return flow.filter(x=>!['DOMESTIC_PICKED_UP','DOMESTIC_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'].includes(x[0]));
    return flow;
  }
  class MockTrackingProvider{
    createShipment(input,now=Date.now()){
      return {shipment_id:uid('SHP'),order_id:input.order_id,shipping_method:input.shipping_method,carrier:input.carrier,tracking_number:input.tracking_number,tracking_mode:'mock',tracking_stage:input.tracking_stage||'full',demo_speed:input.demo_speed||'fast',scenario:input.scenario||'normal',tracking_started_at:iso(now),current_status:'PURCHASED',last_checked_at:iso(now),events:[],exception_state:null,simulated:true};
    }
    sync(shipment,now=Date.now()){
      const day=DAY_MS[shipment.demo_speed]||DAY_MS.fast;
      let paused=shipment.pause_total_ms||0;
      if(shipment.exception_state?.status==='active')paused+=Math.max(0,now-Date.parse(shipment.exception_state.paused_at));
      const elapsed=Math.max(0,now-Date.parse(shipment.tracking_started_at)-paused);
      const flow=flowFor(shipment.shipping_method,shipment.tracking_stage);
      const exceptionIndex=Math.min(2,flow.length-2);
      for(let i=0;i<flow.length;i++){
        const [code,days,description]=flow[i],due=days*day;
        if(shipment.scenario==='delay'&&i===exceptionIndex&&!shipment.exception_state&&elapsed>=due){
          const event={event_id:shipment.shipment_id+':EXCEPTION',status_code:'EXCEPTION',platform_status:STATUS.EXCEPTION.platform,description:'演示异常：包裹运输延迟，需人工核实后恢复。',occurred_at:iso(now),simulated:true};
          shipment.events.push(event);shipment.current_status='EXCEPTION';shipment.exception_state={status:'active',reason:'包裹运输延迟',occurred_at:event.occurred_at,paused_at:event.occurred_at,resolved_at:null};break;
        }
        if(shipment.exception_state?.status==='active')break;
        if(elapsed>=due&&!shipment.events.some(e=>e.status_code===code))shipment.events.push({event_id:shipment.shipment_id+':'+code,status_code:code,platform_status:STATUS[code].platform,description,occurred_at:iso(Date.parse(shipment.tracking_started_at)+paused+due),simulated:true});
      }
      shipment.events.sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at));
      const latest=shipment.events.at(-1);if(latest)shipment.current_status=latest.status_code;
      shipment.last_checked_at=iso(now);return shipment;
    }
    resolveException(shipment,now=Date.now()){
      const ex=shipment.exception_state;if(!ex||ex.status!=='active')return false;
      shipment.pause_total_ms=(shipment.pause_total_ms||0)+Math.max(0,now-Date.parse(ex.paused_at));
      ex.status='resolved';ex.resolved_at=iso(now);shipment.scenario='normal';
      shipment.events.push({event_id:shipment.shipment_id+':EXCEPTION_RESOLVED',status_code:'EXCEPTION_RESOLVED',platform_status:'运输恢复',description:'代购已确认异常解除，模拟追踪恢复。',occurred_at:iso(now),simulated:true});
      return true;
    }
  }
  class RealTrackingProvider{
    sync(){throw new Error('真实物流 API 尚未连接；未向任何快递服务发送请求。')}
  }
  function statusInfo(code){return STATUS[code]||{label:code==='EXCEPTION_RESOLVED'?'异常已解除':code,platform:code,rank:0}}
  global.SeoulTracking={MockTrackingProvider,RealTrackingProvider,statusInfo,DAY_MS,FLOW};
})(window);
