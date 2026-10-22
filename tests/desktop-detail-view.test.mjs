import {test} from 'node:test'
import assert from 'node:assert/strict'
import {COPY,createPluginCard,updatePresentation,validateSnapshot} from '../adapters/desktop/detail-view.js'

const snapshot=(updateStatus='current')=>({version:'0.5.2',source:'bundled',updateStatus})
function mount(t,bridge,{clipboard=async()=>{}}={}){
 const originals=new Map(['window','document','navigator','MutationObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
 const observers=[]
 Object.defineProperties(globalThis,{
  window:{configurable:true,value:{totopCreatorPlugin:bridge}},document:{configurable:true,value:{documentElement:{lang:'zh-CN'}}},
  navigator:{configurable:true,value:{clipboard:{writeText:clipboard}}},
  MutationObserver:{configurable:true,value:class{constructor(callback){this.callback=callback;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}},
 })
 let index=0,tree,dirty=false;const slots=[],effects=[]
 const React={
  createElement(type,props,...children){return typeof type==='function'?type(props||{}):{type,props:props||{},children:children.flat(Infinity)}},
  useRef(value){const i=index++;return slots[i]??=( {current:value} )},
  useState(value){const i=index++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],next=>{const value=typeof next==='function'?next(slots[i]):next;if(!Object.is(value,slots[i])){slots[i]=value;dirty=true}}]},
  useEffect(callback,deps){const i=index++,old=slots[i];if(!old||deps.some((v,n)=>!Object.is(v,old.deps[n]))){old?.cleanup?.();slots[i]={deps};effects.push(()=>slots[i].cleanup=callback())}},
 }
 const Card=createPluginCard(React)
 const render=()=>{index=0;dirty=false;tree=Card({view:'page'});while(effects.length)effects.shift()()}
 const flush=async()=>{for(let i=0;i<12;i++){await Promise.resolve();if(dirty)render()}return tree}
 const nodes=(value=tree)=>value&&typeof value==='object'?[value,...value.children.flatMap(child=>nodes(child))]:[]
 const text=()=>{const visit=value=>typeof value==='string'?value:value&&typeof value==='object'?value.children.map(visit).join(' '):'';return visit(tree)}
 const button=label=>nodes().find(n=>n.type==='button'&&(n.props['aria-label']||n.children.filter(v=>typeof v==='string').join('')).startsWith(label))
 render()
 t.after(()=>{for(const slot of slots)slot?.cleanup?.();for(const [key,value]of originals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key]}})
 return {flush,text,button,locale:lang=>{document.documentElement.lang=lang;observers.forEach(o=>o.callback())}}
}

test('update states describe only plugin updates and reject malformed desktop responses',()=>{
 for(const c of Object.values(COPY)){
  assert.equal(updatePresentation(snapshot('failed'),c).title,c.failed)
  assert.equal(updatePresentation(snapshot('staged'),c).title,c.staged)
  assert.equal(updatePresentation(snapshot(),c,{pending:true}).title,c.checking)
  assert.equal(updatePresentation(null,c,{unavailable:true}).title,c.unavailable)
 }
 for(const value of [null,{ok:false},snapshot('unknown'),{...snapshot(),version:'bad'},{...snapshot(),source:'untrusted'}])assert.throws(()=>validateSnapshot(value))
})

test('checking recovers after a status error; duplicate update clicks share one operation and language changes live',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let reads=0,checks=0,finish
 const view=mount(t,{status:async()=>{if(++reads===1)return snapshot('checking');throw Error('offline')},check:()=>{checks++;return new Promise(resolve=>finish=resolve)}})
 await view.flush();assert.equal(view.button(COPY.zh.checking).props.disabled,true)
 t.mock.timers.tick(1000);await view.flush();assert.match(view.text(),/暂时无法读取状态/)
 const check=view.button(COPY.zh.check);assert.equal(check.props.disabled,false)
 const first=check.props.onClick(),second=check.props.onClick();assert.equal(checks,1)
 finish(snapshot('staged'));await Promise.all([first,second]);await view.flush();assert.match(view.text(),/新版已就绪/)
 view.locale('en-US');await view.flush();assert.match(view.text(),/Update ready/);assert.match(view.text(),/Your game workflow/)
})

test('prompt copying is explicit, shows success, resets after a delay, and reports denied clipboard access',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const copied=[];let denied=false
 const view=mount(t,{status:async()=>snapshot(),check:async()=>snapshot()},{clipboard:async text=>{if(denied)throw Error('denied');copied.push(text)}})
 await view.flush();await view.button('复制:').props.onClick();await view.flush()
 assert.deepEqual(copied,[COPY.zh.prompts[0]]);assert.match(view.text(),/已复制到剪贴板/)
 t.mock.timers.tick(2500);await view.flush();assert.match(view.text(),/复制后，粘贴到对话中开始/)
 denied=true;await view.button('复制:').props.onClick();await view.flush();assert.match(view.text(),/复制未完成/)
})

test('missing desktop bridge is visible and never offers a nonfunctional update action',async t=>{
 const view=mount(t,undefined);await view.flush();assert.match(view.text(),/暂时无法读取状态/)
 assert.equal(view.button(COPY.zh.check).props.disabled,true)
})
