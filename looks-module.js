const LOOKS_STORAGE_KEY='seoul-looks-local-v1';
let baseLooks=[],looksFeedReady=false,looksFeedError='',activeLookAccount='全部';
const lookProviders=new Map();

function readLocalLooks(){
  try{return JSON.parse(localStorage.getItem(LOOKS_STORAGE_KEY)||'{"records":[],"deleted":[]}')}
  catch{return {records:[],deleted:[]}}
}
function writeLocalLooks(value){
  try{localStorage.setItem(LOOKS_STORAGE_KEY,JSON.stringify(value));return true}
  catch{toast('保存失败：浏览器本地空间不足，请先导出备份');return false}
}
function canonicalPostUrl(value=''){
  if(!value)return '';
  try{const u=new URL(value);if(!/(^|\.)instagram\.com$/i.test(u.hostname))return '';const m=u.pathname.match(/^\/(p|reel|tv)\/([^/]+)/i);return m?`https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/`:''}catch{return ''}
}
function cleanAccount(value=''){return value.trim().replace(/^@/,'')}
function normalizeLook(item,index=0){
  const instagramUrl=canonicalPostUrl(item.instagramUrl||item.permalink||'');
  const shortcode=instagramUrl.match(/\/(?:p|reel|tv)\/([^/]+)/)?.[1];
  const publishedAt=item.publishedAt&&Number.isFinite(Date.parse(item.publishedAt))?new Date(item.publishedAt).toISOString():null;
  return {
    id:String(item.id||(shortcode&&`instagram-${shortcode}`)||`import-${Date.now()}-${index}`),
    provider:String(item.provider||'manual-import'),account:cleanAccount(item.account||''),instagramUrl,
    publishedAt,displayDate:String(item.displayDate||''),image:String(item.image||''),
    description:String(item.description||item.label||'穿搭参考'),brands:Array.isArray(item.brands)?item.brands.map(String).map(x=>x.trim()).filter(Boolean):String(item.brands||'').split(',').map(x=>x.trim()).filter(Boolean),
    sourceUrl:String(item.sourceUrl||item.source||instagramUrl||''),sourceLabel:String(item.sourceLabel||item.status||'手动导入'),
    updatedAt:item.updatedAt&&Number.isFinite(Date.parse(item.updatedAt))?new Date(item.updatedAt).toISOString():new Date().toISOString()
  };
}
function allLooks(){
  const local=readLocalLooks(),map=new Map(baseLooks.map(x=>[x.id,x]));
  local.records.map(normalizeLook).forEach(x=>map.set(x.id,x));
  local.deleted.forEach(id=>map.delete(id));
  return [...map.values()].sort((a,b)=>{
    const ta=a.publishedAt?Date.parse(a.publishedAt):-Infinity,tb=b.publishedAt?Date.parse(b.publishedAt):-Infinity;
    return tb-ta||String(a.id).localeCompare(String(b.id));
  });
}
function lookDate(item){
  if(item.publishedAt)return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.publishedAt));
  return item.displayDate||'发布时间待补充';
}
function lookUpdated(item){return new Date(item.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function providerName(value){return ({'manual-archive':'历史资料','manual-entry':'浏览器手动添加','json-import':'JSON 导入','instagram-api':'Instagram 官方 API'})[value]||value}

lookProviders.set('static-json',async()=>{
  const response=await fetch('looks-feed.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const payload=await response.json();return Array.isArray(payload)?payload:payload.records||[];
});
async function refreshLooksData(){
  looksFeedError='';
  try{const batches=await Promise.all([...lookProviders.values()].map(load=>load()));baseLooks=batches.flat().map(normalizeLook);looksFeedReady=true}
  catch(error){looksFeedError='基础穿搭数据读取失败，请通过本地预览链接打开页面。';looksFeedReady=true;console.error(error)}
  const page=(location.hash.slice(1)||'home').split('/')[0];if(page==='looks'||page==='look')render();
}

function lookFilters(items){
  const accounts=[...new Set(items.map(x=>x.account).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(activeLookAccount!=='全部'&&!accounts.includes(activeLookAccount))activeLookAccount='全部';
  return ['全部',...accounts].map(account=>`<button class="${activeLookAccount===account?'active':''}" onclick="filterLooks('${esc(account)}')">${account==='全部'?'全部':'@'+esc(account)}</button>`).join('');
}
function lookCard(item){
  const id=encodeURIComponent(item.id),post=item.instagramUrl||item.sourceUrl;
  return `<article class="look-tile" data-account="${esc(item.account)}"><a href="#look/${id}"><img src="${esc(item.image)}" alt="@${esc(item.account)} ${esc(item.description)}" loading="lazy" referrerpolicy="no-referrer"></a><h3>@${esc(item.account)}</h3><small>${esc(lookDate(item))} · ${esc(providerName(item.provider))}</small><p>${esc(item.description)}</p>${item.brands.length?`<div class="look-tags">${item.brands.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<div class="look-actions"><a href="#look/${id}">查看详情 ↗</a><button onclick="editLook('${esc(item.id)}')">编辑</button><button onclick="deleteLook('${esc(item.id)}')">删除</button>${post?`<a href="${esc(post)}" target="_blank" rel="noopener">来源 ↗</a>`:''}</div></article>`;
}
function drawLookCards(){
  const target=$('#look-grid');if(!target)return;const items=allLooks().filter(x=>activeLookAccount==='全部'||x.account===activeLookAccount);
  target.innerHTML=items.map(lookCard).join('')||'<div class="empty">该账号暂无穿搭记录。</div>';
  const count=$('#look-count');if(count)count.textContent=`${items.length} 条记录 · 按发布时间从新到旧`;
}
function renderLooksPage(){
  const items=allLooks();
  $('#app').innerHTML=`<div class="eyebrow">REAL PEOPLE / REAL OUTFITS</div><div class="row look-heading"><div><h1>从你关注的人，找到穿衣灵感。</h1><p class="muted">真实创作者穿搭参考 · 来源、更新时间与品牌标签逐条保留</p></div><button class="btn pink" onclick="toggleLookEditor()">＋ 导入 Instagram 帖子</button></div>${looksFeedError?`<div class="notice">${esc(looksFeedError)}</div>`:''}<div class="notice">页面新增、编辑和删除只保存在当前浏览器，不会修改服务器上的 looks-feed.json。请使用 JSON 导出备份，或在另一浏览器中通过 JSON 导入恢复。</div><div class="chips" id="look-filters">${lookFilters(items)}</div><p class="muted" id="look-count"></p><div class="rail look-rail" id="look-grid"></div>${lookEditor()}<div class="panel look-data-panel"><h3>数据管理</h3><p>基础资料来自 looks-feed.json；手动修改来自当前浏览器的 localStorage。</p><div class="row"><div><button class="btn light" onclick="exportLooksJson()">导出全部 JSON</button> <button class="btn light" onclick="document.querySelector('#look-import-file').click()">导入 JSON</button><input id="look-import-file" type="file" accept="application/json,.json" hidden onchange="importLooksJson(this.files[0]);this.value='' "></div><small>为 Instagram 官方 API 预留 provider 接口</small></div></div>`;
  drawLookCards();
}
function lookEditor(item={}){
  const dateValue=item.publishedAt?new Date(new Date(item.publishedAt).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  return `<section class="panel look-editor" id="look-editor" hidden><div class="row"><div><div class="eyebrow">MANUAL IMPORT</div><h2 id="look-editor-title">${item.id?'编辑穿搭记录':'添加 Instagram 帖子'}</h2></div><button class="btn light" onclick="toggleLookEditor(false)">关闭</button></div><form id="look-form" onsubmit="saveLookForm(event)"><input type="hidden" name="id" value="${esc(item.id||'')}"><div class="look-form-grid"><label>Instagram 帖子链接<input name="instagramUrl" type="url" required placeholder="https://www.instagram.com/p/.../" value="${esc(item.instagramUrl||'')}"></label><label>账号<input name="account" required placeholder="例如 here.somewear" value="${esc(item.account||'')}"></label><label>发布时间<input name="publishedAt" type="datetime-local" required value="${esc(dateValue)}"></label><label>品牌标签<input name="brands" placeholder="用逗号分隔，例如 ASON, AEAE" value="${esc((item.brands||[]).join(', '))}"></label><label class="wide">图片地址<input name="image" type="url" placeholder="https://...jpg" value="${esc(item.image?.startsWith('data:')?'':item.image||'')}"></label><label class="wide">或上传本地图片<input name="imageFile" type="file" accept="image/*"><small>上传图片会以 Data URL 保存在当前浏览器，受本地存储容量限制。</small></label><label class="wide">穿搭描述<textarea name="description" required rows="3" placeholder="描述造型、单品和搭配重点">${esc(item.description||'')}</textarea></label><label class="wide">数据来源说明<input name="sourceLabel" value="${esc(item.sourceLabel||'手动添加；待核验')}"></label></div><button class="btn pink">${item.id?'保存修改':'添加到穿搭'}</button></form></section>`;
}
function toggleLookEditor(show=true){const editor=$('#look-editor');if(!editor)return;editor.hidden=!show;if(show)editor.scrollIntoView({behavior:'smooth',block:'start'})}
function filterLooks(account){activeLookAccount=account;$('#look-filters').innerHTML=lookFilters(allLooks());drawLookCards()}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
async function saveLookForm(event){
  event.preventDefault();const form=event.currentTarget,fd=new FormData(form),editingId=fd.get('id'),url=canonicalPostUrl(fd.get('instagramUrl'));
  if(!url){toast('请输入有效的 Instagram 帖子或 Reel 链接');return}
  const current=allLooks(),duplicate=current.find(x=>x.instagramUrl===url&&x.id!==editingId);if(duplicate){toast(`重复帖子：已存在于 @${duplicate.account}`);return}
  const existing=current.find(x=>x.id===editingId);let image=fd.get('image')||existing?.image||'';const file=fd.get('imageFile');if(file&&file.size)image=await fileToDataUrl(file);
  if(!image){toast('请填写图片地址或上传图片');return}
  const shortcode=url.match(/\/(?:p|reel|tv)\/([^/]+)/)[1],now=new Date().toISOString();
  const item=normalizeLook({id:editingId||`instagram-${shortcode}`,provider:'manual-entry',account:fd.get('account'),instagramUrl:url,publishedAt:new Date(fd.get('publishedAt')).toISOString(),image,description:fd.get('description'),brands:fd.get('brands'),sourceUrl:url,sourceLabel:fd.get('sourceLabel'),updatedAt:now});
  const local=readLocalLooks(),index=local.records.findIndex(x=>x.id===item.id);if(index>=0)local.records[index]=item;else local.records.push(item);
  local.deleted=local.deleted.filter(id=>id!==item.id);if(!writeLocalLooks(local))return;activeLookAccount='全部';renderLooksPage();toast(editingId?'穿搭记录已更新':'新帖子已添加到当前浏览器')
}
function editLook(id){const item=allLooks().find(x=>x.id===id);if(!item)return;const old=$('#look-editor');old.outerHTML=lookEditor(item);toggleLookEditor(true)}
function deleteLook(id){
  const item=allLooks().find(x=>x.id===id);if(!item||!confirm(`删除 @${item.account} 的这条穿搭记录？`))return;
  const local=readLocalLooks();local.records=local.records.filter(x=>x.id!==id);if(!local.deleted.includes(id))local.deleted.push(id);if(writeLocalLooks(local)){renderLooksPage();toast('记录已从当前浏览器删除')}
}
function renderLookDetail(id){
  const items=allLooks(),decoded=decodeURIComponent(id||''),item=items.find(x=>x.id===decoded)||items[Number(decoded)]||items[0];if(!item){$('#app').innerHTML='<div class="empty">没有找到这条穿搭记录。<a href="#looks">返回 INS 穿搭</a></div>';return}
  const index=items.indexOf(item),source=item.instagramUrl||item.sourceUrl;
  $('#app').innerHTML=`<a class="back" href="#looks">← 博主穿搭</a><div class="split"><img class="look-full" src="${esc(item.image)}" alt="@${esc(item.account)} ${esc(item.description)}"><div><div class="eyebrow">OUTFIT ARCHIVE</div><h1>@${esc(item.account)}</h1><p>${esc(lookDate(item))}</p><div class="look-tags">${item.brands.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="panel"><h3>${esc(item.description)}</h3><p>${esc(item.sourceLabel)}</p><p>数据来源：${esc(providerName(item.provider))}<br>最近更新：${esc(lookUpdated(item))}</p><p>此照片仅作搭配参考，未确认任何商品为照片同款。</p>${source?`<a class="btn light" href="${esc(source)}" target="_blank" rel="noopener">查看原始来源 ↗</a>`:''}</div><div class="chips"><button onclick="location.hash='looks';setTimeout(()=>editLook('${esc(item.id)}'),0)">编辑记录</button><a class="pill" href="#look/${encodeURIComponent(items[(index+items.length-1)%items.length].id)}">← 上一张</a><a class="pill" href="#look/${encodeURIComponent(items[(index+1)%items.length].id)}">下一张 →</a></div><a class="btn pink" href="https://www.instagram.com/${esc(item.account)}/" target="_blank" rel="noopener">访问博主 Instagram ↗</a></div></div>`;
}
function exportLooksJson(){
  const data=JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),records:allLooks()},null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`seoul-edit-looks-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('已导出当前全部穿搭数据')
}
async function importLooksJson(file){
  if(!file)return;try{const payload=JSON.parse(await file.text()),incoming=(Array.isArray(payload)?payload:payload.records||[]).map((x,i)=>normalizeLook({...x,provider:x.provider||'json-import'},i));const local=readLocalLooks(),existing=allLooks(),ids=new Set(existing.map(x=>x.id)),urls=new Set(existing.map(x=>x.instagramUrl).filter(Boolean));let added=0,skipped=0;
    for(const item of incoming){if(ids.has(item.id)||(item.instagramUrl&&urls.has(item.instagramUrl))){skipped++;continue}local.records.push(item);ids.add(item.id);if(item.instagramUrl)urls.add(item.instagramUrl);added++}
    if(writeLocalLooks(local)){renderLooksPage();toast(`JSON 导入完成：新增 ${added} 条，跳过重复 ${skipped} 条`)}
  }catch{toast('JSON 文件格式不正确')}
}

window.SeoulLooksData={
  registerProvider(name,loader){if(typeof loader!=='function')throw new TypeError('provider loader 必须是函数');lookProviders.set(name,loader)},
  refresh:refreshLooksData,getRecords:()=>allLooks().map(x=>({...x}))
};

const renderBeforeLooksModule=render;
render=function(){renderBeforeLooksModule();const [page,arg]=(location.hash.slice(1)||'home').split('/');if(page==='looks'){if(!looksFeedReady)$('#app').innerHTML='<div class="empty">正在读取穿搭资料…</div>';else renderLooksPage()}if(page==='look'){if(!looksFeedReady)$('#app').innerHTML='<div class="empty">正在读取穿搭资料…</div>';else renderLookDetail(arg)}};
window.removeEventListener('hashchange',renderBeforeLooksModule);window.addEventListener('hashchange',render);refreshLooksData();render();
