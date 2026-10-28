(function(){
  'use strict';
  const VERIFIED_AT='2026-10-26';
  const tested={
    0:{product_id:'4758',available_sizes:null,size_chart:null,measurement_unit:null,material:null,colors:['off white cracked'],detail_images:[
      'https://cafe24.poxo.com/ec01/ccolon/KaOIZoGb2F1F5b/VN+yDTlQhl2F492hBpcmbl59Knc5lBLcqRYR6HzkC7mdli9t63FSmoDZ3oI8wPoyG4ZzSkg==/_/web/product/extra/big/202610/471a8469576cd6f09aad4567d9454fd9.jpg',
      'https://cafe24.poxo.com/ec01/ccolon/KaOIZoGb2F1F5b/VN+yDTlQhl2F492hBpcmbl59Knc5lBLcqRYR6HzkC7mdli9t63FSmoDZ3oI8wPoyG4ZzSkg==/_/web/product/extra/big/202610/e04fa62ebdfb93918ee700074aecb1e8.jpg',
      'https://cafe24.poxo.com/ec01/ccolon/KaOIZoGb2F1F5b/VN+yDTlQhl2F492hBpcmbl59Knc5lBLcqRYR6HzkC7mdli9t63FSmoDZ3oI8wPoyG4ZzSkg==/_/web/product/extra/big/202610/5dd797ff04b6e9b5174591abd93c6bef.jpg'
    ],size_source:'MARGESHERWOOD 商品页结构化数据（未提供尺码表）'},
    15:{product_id:'4820',available_sizes:['1','2'],size_chart:null,measurement_unit:null,material:null,colors:['black'],detail_images:[],size_source:'MARGESHERWOOD 商品页官方规格选项'},
    40:{product_id:'4853',available_sizes:['230','235','240','245','250','255','260'],size_chart:null,measurement_unit:'mm',material:null,colors:['black'],detail_images:[],size_source:'MARGESHERWOOD 商品页官方鞋码选项；不代表实时库存'},
    128:{product_id:'2703',available_sizes:['S','M'],size_chart:null,measurement_unit:null,material:'스웨이드 소재 / 장모 퍼 안감（官网描述，未提供成分比例）',colors:['BLACK'],detail_images:[],size_source:'ASON 商品页官方规格选项'},
    163:{product_id:'4812',available_sizes:null,size_chart:{columns:['项目','尺寸'],rows:[['镜片宽度','56 mm'],['镜片高度','43 mm'],['鼻梁宽度','25 mm'],['镜框正面','150 mm'],['镜腿长度','145 mm'],['重量','32 g']]},measurement_unit:'mm',material:'镜框：TR-90、Alloy；镜片：PC（防蓝光镜片）',colors:['black'],detail_images:[
      'https://cafe24img.poxo.com/bluelephant/web/product/extra/big/20251217/c137b8d19dd7f396c8faf57aac66b144.jpg',
      'https://cafe24img.poxo.com/bluelephant/web/product/extra/big/20251217/e696c73f282dcddeb41a89f73280dd88.jpg',
      'https://cafe24img.poxo.com/bluelephant/web/product/extra/big/20251217/a43f05bac96412417e323ac8bb458396.jpg'
    ],size_source:'BLUE ELEPHANT 商品页官方说明；测量可能有 2–3 mm 误差'},
    198:{product_id:'10713',available_sizes:null,size_chart:null,measurement_unit:null,material:null,colors:['그레이','퍼플'],detail_images:[],size_source:'HERE SOMEWEAR 商品页仅核实颜色选项，未取得尺码表'},
    304:{product_id:'1463',available_sizes:null,size_chart:null,measurement_unit:null,material:'Cotton 60%, Polyester 40%',colors:['BEIGE'],detail_images:[],size_source:'AEAE 商品页官方材质说明；未提供可核实尺码表'},
    359:{product_id:'1076',available_sizes:null,size_chart:null,measurement_unit:null,material:'Shell: Cotton 100%; Contrast: Cotton 70%, Rayon 30%',colors:['Smoky Brown','Khaki'],detail_images:[
      'https://colocynth.kr/web/product/extra/big/202608/635aa97e52d2366359e3b3fc03b73d17.jpg',
      'https://colocynth.kr/web/product/extra/big/202608/3e7c959b0a2444e81d5d4fe74aa5bc71.jpg',
      'https://colocynth.kr/web/product/extra/big/202608/f3a06373a92cc041d412e0f802a4c1df.jpg'
    ],size_source:'COLOCYNTH 商品页官方材质与颜色说明；未提供可核实尺码表'},
    362:{product_id:'4403537',available_sizes:null,size_chart:null,measurement_unit:null,material:null,colors:['Black'],detail_images:[
      'https://image.msscdn.net/images/prd_img/20240904/4403537/detail_4403537_17260209916602_500.jpg',
      'https://image.msscdn.net/images/prd_img/20240904/4403537/detail_4403537_17260209926658_500.jpg',
      'https://image.msscdn.net/images/prd_img/20240904/4403537/detail_4403537_17260209935180_500.jpg'
    ],size_source:'MUSINSA 授权零售商品页；未取得品牌官方尺码表'},
    373:{product_id:'mardi-slub-cotton-relaxed-tshirt-long-sleeve-la-fleur_white-ashblue',available_sizes:null,size_chart:null,measurement_unit:null,material:null,colors:null,detail_images:[],size_source:'SeoulSeoul 商品页本次访问受限，未补录未经核实的信息'}
  };
  products.forEach((p,index)=>Object.assign(p,{
    product_url:p.source||null,
    product_id:null,
    available_sizes:null,
    size_chart:null,
    measurement_unit:null,
    material:null,
    colors:null,
    detail_images:[],
    size_source:null,
    last_verified_at:null
  },tested[index]||{},tested[index]?{last_verified_at:VERIFIED_AT}:{}));
  window.PRODUCT_DETAIL_AUDIT={testedIndexes:Object.keys(tested).map(Number),verifiedAt:VERIFIED_AT};
})();
