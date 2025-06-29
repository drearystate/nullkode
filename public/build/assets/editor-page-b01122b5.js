var Pc=Object.defineProperty;var Vc=(e,A,t)=>A in e?Pc(e,A,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[A]=t;var r=(e,A,t)=>(Vc(e,typeof A!="symbol"?A+"":A,t),t);import{ah as so,r as h,ai as Gc,aj as _c,aa as en,v as io,e as Pe,ak as Je,a as Qt,i as be,al as ut,j as a,D as me,k as se,T as d,l as te,a0 as q,O as Ft,c as X,S as Yt,d as v,am as JA,an as ds,ao as us,ap as gs,p as ne,B as U,h as Te,F as De,a4 as tn,n as Xe,aq as ps,K as k,ar as qc,as as Sn,at as Wc,au as ms,av as Xc,aw as Yc,ax as Jc,ay as An,az as $c,aA as Zc,aB as no,aC as ed,aD as td,aE as hs,aF as bi,aG as Ad,aH as ad,aI as sd,b as We,s as ro,M as $A,I as ee,J as ZA,aJ as id,L as BA,t as K,aK as ea,a7 as Qe,aL as nd,z as ue,X as fs,aM as rd,aN as od,m as ld,aO as cd,aP as oo,aQ as dd,g as an,Y as dA,aR as sn,aS as lo,y as ud,f as co,a5 as xs,aT as Wa,aU as uo,aV as wi,G as bs,A as gd,C as pd,aW as md,a1 as nn,aX as hd,aY as fd,P as xd,aZ as Hn,a_ as go,a$ as bd,b0 as po,b1 as mo,b2 as wd,b3 as ho,b4 as Bd,w as vd,a6 as Cd,$ as yd}from"./main-337de3ae.js";import{u as Qd,i as Ln,C as Fd,I as kd,F as Ud,a as ws,L as zt,T as jd,R as Ed,s as Id,d as Bi,A as vA,b as Fe,c as fo,U as Sd,e as Hd,V as xo,S as mA,f as rn,g as Ld,h as bo,j as wo,k as Nd,l as Td,m as Dd,n as Md,o as Bo,p as zs,q as vo,r as Kd,P as Jt,t as Rd,v as zd,w as Nn,x as Od,y as Pd,z as Vd,B as Co,D as Os,E as Gd}from"./DragIndicator-47871a8b.js";import{r as Bs,e as _d,a as qd,D as vs,A as Ot,u as kt,C as Wd,S as Xd,F as Yd,f as Jd,B as $d,h as Zd,s as eu,K as tu}from"./blank-page-skeleton-8a67bffa.js";import{S as yo,R as Au,V as ta,F as on,T as xA,C as au,a as su,E as Qo,L as Fo,b as ko,c as ln,d as iu,e as Cs,P as nu,f as ru,g as Uo,h as ou,G as lu,i as cu,j as du,B as jo,k as uu,A as gu,l as Eo,m as pu,n as mu,M as hu,o as fu,p as xu,q as bu,r as Io,s as wu,t as bA,u as Bu,v as vu,w as Cu,x as yu,y as So,z as Qu,D as Fu,H as ku,I as Uu,J as Ho,K as ju,N as Eu,O as Aa,Q as cn,U as Iu,W as Lo,X as dn,Y as Su,Z as Hu,_ as Lu,$ as Nu,a0 as Tu,a1 as Du,a2 as Mu,a3 as aa,a4 as Ku,a5 as un,a6 as gn,a7 as Ru,a8 as No,a9 as Ps,aa as zu,ab as Ou,ac as Pu,ad as Vu,ae as Gu,af as To,ag as _u,ah as Kt,ai as qu,aj as Wu,ak as Do,al as Tn,am as vi,an as Xu,ao as Xa,ap as Ci,aq as Yu,ar as Ju,as as $u,at as Zu,au as eg}from"./Refresh-7a4104de.js";import{P as pn,a as mn,D as hn}from"./DesktopMac-2a8faa76.js";import{T as tg}from"./TaskAlt-8ccfae73.js";import{C as Ag,O as Mo}from"./OpenInNew-0dd35369.js";import{E as rt,S as ag}from"./Edit-bf8a5b18.js";import{P as Ko,a as sg}from"./project-settings-dialog-85de00b9.js";import"./info-dialog-trigger-ca240b6e.js";function Dn(e,A){return e.findAll(A.filters).map(t=>A.select?A.select(t):t.state)}function ig(e={},A){const t=so(A).getMutationCache(),s=h.useRef(e),i=h.useRef(null);return i.current||(i.current=Dn(t,e)),h.useEffect(()=>{s.current=e}),h.useSyncExternalStore(h.useCallback(n=>t.subscribe(()=>{const o=Gc(i.current,Dn(t,s.current));i.current!==o&&(i.current=o,_c.schedule(n))}),[t]),()=>i.current,()=>i.current)}function ng(){const{projectId:e}=en();return io({queryKey:["projects",`${e}`,"editor"],queryFn:()=>rg(e),staleTime:1/0})}function rg(e){return Pe.get(`projects/${e}`,{params:{loader:"editor"}}).then(A=>A.data)}function og(e){return e.map(A=>{const t=A;return t.id=t.id??Je(10),t})}function Ro(e){const A=new DOMParser().parseFromString(e==null?void 0:e.trim(),"text/html"),t=A.createTreeWalker(A.documentElement,NodeFilter.SHOW_ELEMENT);let s;for(;s=t.nextNode();)s.dataset.arId=Je(10);return A}var fe=(e=>(e.ELEMENTS="elements",e.STYLE="style",e.SETTINGS="settings",e.LAYOUT="layout",e.PAGES="pages",e.HISTORY="history",e.ACTIONS="actions",e.DATA="data",e))(fe||{});function yi(e,A){const t=e.map(s=>`[data-ar-id="${s}"]`).join(",");return A.querySelectorAll(t)}function Ee(e,A){return yi([e],A)[0]}var ce=(e=>(e.Padding="padding",e.Margin="margin",e.Border="border",e.Text="text",e.Settings="settings",e.Visibility="visibility",e.Shadow="shadow",e.Background="background",e))(ce||{}),Ne=(e=>(e.Select="select",e.Input="input",e))(Ne||{});class ze{constructor(A){r(this,"label","");r(this,"defaultValue","");r(this,"type","input");r(this,"inputType","text");r(this,"showAiTextButton",!1);r(this,"shouldHide",()=>!1);r(this,"options",[]);r(this,"onChange",()=>{});r(this,"min",0);r(this,"max",100);Object.entries(A).forEach(([t,s])=>{this[t]=s})}}class L{constructor(){r(this,"defaultSidebarPanel",fe.STYLE);r(this,"icon");r(this,"category");r(this,"html");r(this,"css");r(this,"hiddenClasses",[]);r(this,"specificity",0);r(this,"editActions",[]);r(this,"canEdit",["settings","visibility","padding","margin","border","shadow","background"]);r(this,"canDrag",!0);r(this,"controls",[]);r(this,"resizable",!0);r(this,"contextMenu",!0);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"allowedEls",[])}}class Ge extends L{constructor(){super(...arguments);r(this,"canEdit",["settings","visibility","padding","margin","border","shadow","background","text"]);r(this,"editActions",[{name:"Edit text",action:t=>{xe(t),He().startSession()}},{name:"Write with AI",action:"aiCreateText"},{name:"Edit with AI",action:"aiEditText"}])}}const da=[];function lg(){if(da.length)return da;const e=cg();if(e)for(const A in e.cssRules){const t=e.cssRules[A];if(t instanceof CSSStyleRule&&"selectorText"in t&&t.selectorText.endsWith("::before")){const s=t.selectorText.replace("::before","").replace("fa-","").replace(".","");da.push({icon:`fa fa-${s}`,name:s})}}return da}function cg(){for(let e=0;e<document.styleSheets.length;e++){const A=document.styleSheets[e];if(A.href&&A.href.includes(window.location.origin)&&A.href.includes("font-awesome"))return A}}function zo(){const{trans:e}=Qt(),{close:A}=be(),[t]=h.useState(()=>lg()),[s,i]=ut.useState(""),{contains:n}=Qd({sensitivity:"base"}),o=t.filter(l=>n(l.name,s));return a.jsxs(me,{size:"2xl",children:[a.jsx(se,{children:a.jsx(d,{message:"Select an icon"})}),a.jsxs(te,{children:[a.jsx(q,{className:"mb-20",value:s,onChange:l=>{i(l.target.value)},placeholder:e({message:"Search icons..."})}),a.jsx("div",{className:Ln.grid,children:o.map(l=>a.jsxs(Ft,{onClick:()=>A(l.icon),className:X(Ln.button,"text-3xl"),children:[a.jsx("span",{className:`fab ${l.icon}`}),a.jsx("span",{className:"mt-16 block whitespace-normal text-xs capitalize",children:l.name})]},l.name))})]})]})}async function dg(){return await Yt(zo)}function ug(e){const A=[];return e.forEach(t=>{const s=Z(t);s&&A.push(s)}),A}function Z(e){var A;return((A=e==null?void 0:e.dataset)==null?void 0:A.arId)||null}class $e{constructor(A){r(this,"uniqueId");r(this,"nodeId");r(this,"pageDoc");r(this,"previewDoc");this.nodeOrId=A,this.nodeId=typeof A=="string"?A:Z(A),this.pageDoc=B().getActivePageDoc(),this.previewDoc=B().getEditorDoc(),this.uniqueId=Je(10)}onBeforeExecute(){}init(){return this.onBeforeExecute(),this}execute(){return!this.nodeId||!this.pageDoc||!this.previewDoc?!1:[this.pageDoc,this.previewDoc].map(A=>this.executeMutation(A)).some(A=>A)}undo(){return!this.nodeId||!this.pageDoc||!this.previewDoc?!1:[this.pageDoc,this.previewDoc].map(A=>this.undoMutation(A)).every(A=>A)}redo(){return!this.nodeId||!this.pageDoc||!this.previewDoc?!1:this.execute()}getNodeId(){return this.nodeId}getInitialValue(){return this.changes.old}overrideInitialValue(A){this.changes.old=A}findEl(A,t){return t=t||this.nodeId,t?Ee(t,A):null}}class ot extends $e{constructor(t,s){super(t);r(this,"displayName",v("Changed element attributes"));r(this,"changes",{new:{},old:{}});this.el=t,this.changes.new=s}onBeforeExecute(){if(this.pageDoc){const t=this.findEl(this.pageDoc);t&&(this.changes.old={},Object.keys(this.changes.new).forEach(s=>{const i=s;this.changes.old[i]=t.getAttribute(i)??void 0}))}}executeMutation(t){return this.modifyAttributes(t,this.changes.new)}undoMutation(t){return this.modifyAttributes(t,this.changes.old)}modifyAttributes(t,s){const i=this.findEl(t);return i?Object.entries(s).map(([n,o])=>{if(o!==i.getAttribute(n))return o==null?i.removeAttribute(n):i.setAttribute(n,o),!0}).some(n=>n):!1}}class Pt extends $e{constructor(t,s,i){super(t);r(this,"displayName",v("Replaced element class"));r(this,"changes",{new:"",old:""});this.el=t,this.changes.new=s,this.changes.old=i}onBeforeExecute(){}executeMutation(t){return this.replaceClass(t,this.changes.new,this.changes.old)}undoMutation(t){return this.replaceClass(t,this.changes.old,this.changes.new)}replaceClass(t,s,i){const n=this.findEl(t);return n&&!n.classList.contains(s)?(i&&n.classList.remove(i),s&&n.classList.add(s),!!(i||s)):!1}}function tA(e){var A;return e!=null&&e.hasAttribute("contenteditable")?!0:((A=e==null?void 0:e.parentElement)==null?void 0:A.hasAttribute("contenteditable"))??!1}function Oo(e){const A=document.createElement("template");return A.innerHTML=e,A.content}function gg(e){return Oo(e).firstChild}class pg extends $e{constructor(t,s){super(t);r(this,"displayName",v("Changed element name"));r(this,"changes",{new:"",old:""});this.el=t,this.changes.new=s.toUpperCase()}canChangeName(t){return this.changes.new!==this.changes.old&&!tA(t)&&!(t.nodeName==="BODY"||t.nodeName==="HTML")}onBeforeExecute(){this.changes.old=this.el.nodeName}executeMutation(t){return this.changeNodeName(t,this.changes.new,this.changes.old)}undoMutation(t){return this.changeNodeName(t,this.changes.old,this.changes.new)}changeNodeName(t,s,i){const n=this.findEl(t);if(!n||!this.canChangeName(n))return!1;let o=n.outerHTML;o=o.replace(RegExp("(^<"+i+")|("+i+">$)","gi"),c=>c.toUpperCase().replace(i,s));const l=Oo(o);return n.replaceWith(l),!0}}class fn extends $e{constructor(t,s){super(t);r(this,"displayName",v("Replace content"));r(this,"changes");this.newContent=s,this.changes={new:s,old:""}}executeMutation(t){return this.replaceContent(t,this.newContent)}undoMutation(t){return this.replaceContent(t,this.changes.old)}replaceContent(t,s){const i=this.findEl(t);return!i||!this.canReplace(i)?!1:(this.changes.old===""&&(this.changes.old=i.innerHTML),i.innerHTML=s,!0)}canReplace(t){return!tA(t)}isGameElement(t){return["game-2048","snake-game","memory-game","tetris-game","breakout-game","tic-tac-toe-game","simon-says-game","minesweeper-game","hangman-game","rock-paper-scissors-game"].some(i=>t.classList.contains(i))}}const St={type:"color",id:"c-custom",label:v("Custom color")},Po=Fd.map((e,A)=>({...St,id:`c${A}`,backgroundColor:e.color,label:e.name,color:e.foreground})),he={type:"gradient",id:"g-custom",label:v("Custom gradient")},xn=[{...he,id:"g1",backgroundImage:"linear-gradient(45deg, #ff9a9e, #fad0c4)",label:v("Worm flame")},{...he,id:"g2",backgroundImage:"linear-gradient(0deg, #a18cd1, #fbc2eb)",label:v("Night fade")},{...he,id:"g3",backgroundImage:"linear-gradient(120deg, #a1c4fd, #c2e9fb)",label:v("Winter nova")},{...he,id:"g4",backgroundImage:"linear-gradient(0deg, #cfd9df, #e2ebf0)",label:v("Heavy rain")},{...he,id:"g5",backgroundImage:"linear-gradient(120deg, #fdfbfb, #ebedee)",label:v("Cloudy knoxville")},{...he,id:"g6",backgroundImage:"linear-gradient(0deg, #a8edea, #fed6e3)",label:v("Rare wind")},{...he,id:"g7",backgroundImage:"linear-gradient(135deg, #f5f7fa, #c3cfe2)",label:v("Saint petersburg")},{...he,id:"g8",backgroundImage:"linear-gradient(135deg, #fdfcfb, #e2d1c3)",label:v("Everlasting sky")},{...he,id:"g9",backgroundImage:"linear-gradient(0deg, #c1dfc4, #deecdd)",label:v("Soft grass")},{...he,id:"g10",backgroundImage:"linear-gradient(90deg, #E9E4F0, #D3CCE3)",label:v("Delicate")},{...he,id:"g11",backgroundImage:"linear-gradient(90deg, #fffcdc, #d9a7c7)",label:v("Broken hearts")},{...he,id:"g12",backgroundImage:"linear-gradient(90deg, #56ab2f, #a8e063)",label:v("Lush"),color:"rgb(255, 255, 255)"},{...he,id:"g13",backgroundImage:"linear-gradient(90deg, #606c88, #3f4c6b)",label:v("Ash"),color:"rgb(255, 255, 255)"},{...he,id:"g14",backgroundImage:"linear-gradient(90deg, #ece9e6, #ffffff)",label:v("Clouds")},{...he,id:"g15",backgroundImage:"linear-gradient(90deg, #f09819, #edde5d)",label:v("Mango pulp")},{...he,id:"g16",backgroundImage:"linear-gradient(90deg, #b79891, #94716b)",label:v("Cooper"),color:"rgb(255, 255, 255)"},{...he,id:"g17",backgroundImage:"linear-gradient(60deg, #29323c, #485563)",label:v("Vicious stance"),color:"rgb(255, 255, 255)"}],mg=""+new URL("Angled-Focus-176ea4bb.svg",import.meta.url).href,hg=""+new URL("Circular-Focus-ca4d12f0.svg",import.meta.url).href,fg=""+new URL("Farseeing-Eyeball-aa4a0249.svg",import.meta.url).href,xg=""+new URL("Canyon-Funnel-b2e2eaf0.svg",import.meta.url).href,bg=""+new URL("Looney-Loops-6f56821b.svg",import.meta.url).href,wg=""+new URL("Hurricane-Aperture-35c89ecf.svg",import.meta.url).href,Bg=""+new URL("Icy-Explosion-988bfd47.svg",import.meta.url).href,vg=""+new URL("Protruding-Squares-b00abf9b.svg",import.meta.url).href,Cg=""+new URL("Alternating-Triangles-d5e42a92.svg",import.meta.url).href,yg=""+new URL("Monstera-Patch-69fc9117.svg",import.meta.url).href,Qg=""+new URL("Confetti-Doodles-d1c20c3c.svg",import.meta.url).href,Fg=""+new URL("Threads-Ahead-28db1646.svg",import.meta.url).href,kg=""+new URL("Launch-Day-f2926785.svg",import.meta.url).href,Ug=""+new URL("Sprinkle-d1a9b59f.svg",import.meta.url).href,jg=""+new URL("Circuit-Board-b3635293.svg",import.meta.url).href,Eg=""+new URL("Nuclear-Focalpoint-166680aa.svg",import.meta.url).href,Ig=""+new URL("Snow-424582cb.svg",import.meta.url).href,pe={type:"image",id:"i-custom",label:v("Custom image")},Vo=[{...pe,id:"img0",backgroundColor:"#ee5522",backgroundImage:`url(${vg})`,backgroundRepeat:"repeat",label:v("Protruding squares"),color:"#fff"},{...pe,id:"img1",backgroundColor:"#00bbff",backgroundImage:`url(${kg})`,label:v("Launch day"),backgroundSize:"contain",backgroundPosition:"bottom",backgroundRepeat:"no-repeat",color:"#fff"},{...pe,id:"img2",backgroundColor:"#fff",backgroundImage:`url(${Cg})`,label:v("Alternating triangles"),color:"#000"},{...pe,id:"img3",backgroundColor:"#002200",backgroundImage:`url(${yg})`,label:v("Monstera patch"),color:"#fff"},{...pe,id:"img4",backgroundColor:"#aa3333",backgroundImage:`url(${Qg})`,label:v("Confetti doodles"),color:"#fff",backgroundRepeat:"repeat",backgroundPosition:"center center",backgroundSize:"contain"},{...pe,id:"img5",backgroundColor:"#070014",backgroundImage:`url(${wg})`,label:v("Hurricane aperture"),backgroundSize:"cover",backgroundRepeat:"no-repeat",backgroundPosition:"center center",color:"#fff"},{...pe,id:"img6",backgroundColor:"#11ddaa",backgroundImage:`url(${bg})`,label:v("Looney loops"),backgroundPosition:"center center",backgroundSize:"cover",color:"#000"},{...pe,id:"img7",backgroundColor:"#ccffff",backgroundImage:`url(${Bg})`,label:v("Icy explosion"),backgroundSize:"cover",backgroundRepeat:"no-repeat",backgroundPosition:"center center",color:"#000"},{...pe,id:"img8",backgroundColor:"#442233",backgroundImage:`url(${Eg})`,label:v("Nuclear point"),backgroundSize:"cover",backgroundRepeat:"no-repeat",backgroundPosition:"center center",color:"#fff"},{...pe,id:"img9",backgroundColor:"#ffdd55",backgroundImage:`url(${mg})`,label:v("Angled focus"),backgroundPosition:"center center",backgroundSize:"cover",color:"#fff"},{...pe,id:"img10",backgroundColor:"#220044",backgroundImage:`url(${hg})`,label:v("Circular focus"),backgroundPosition:"center center",backgroundSize:"cover",color:"#fff"},{...pe,id:"img11",backgroundColor:"#000000",backgroundImage:`url(${fg})`,label:v("Farseeing eyeball"),backgroundPosition:"center center",backgroundSize:"cover",color:"#fff"},{...pe,id:"img12",backgroundColor:"#ff0000",backgroundImage:`url(${xg})`,label:v("Canyon funnel"),backgroundPosition:"center center",backgroundSize:"cover",color:"#fff"},{...pe,id:"img13",backgroundColor:"#ffdd99",backgroundImage:`url(${Fg})`,label:v("Threads ahead"),color:"#000",backgroundRepeat:"no-repeat",backgroundSize:"auto"},{...pe,id:"img14",backgroundImage:`url(${Ug})`,label:v("Sprinkle"),backgroundRepeat:"repeat",backgroundPosition:"center center"},{...pe,id:"img15",backgroundImage:`url(${jg})`,label:v("Circuit board"),backgroundRepeat:"repeat",backgroundPosition:"center center"},{...pe,id:"img16",backgroundImage:`url(${Ig})`,label:v("Snow"),backgroundRepeat:"repeat",backgroundPosition:"center center"}];function Sg(e){var A,t;if((A=e.backgroundImage)!=null&&A.includes("-gradient("))return Hg(e);if((t=e.backgroundImage)!=null&&t.includes("url("))return Lg(e);if(e.backgroundColor&&e.backgroundColor!=="rgba(0, 0, 0, 0)")return Ng(e)}function Hg(e){return{...xn.find(t=>bn(t.backgroundImage,e.backgroundImage))??he,backgroundImage:e.backgroundImage,backgroundColor:e.backgroundColor,color:e.color}}function Lg(e){return{...Vo.find(t=>bn(t.backgroundImage,e.backgroundImage))??pe,backgroundImage:e.backgroundImage,backgroundColor:e.backgroundColor,backgroundAttachment:e.backgroundAttachment,color:e.color}}function Ng(e){return{...Po.find(t=>bn(t.backgroundColor,e.backgroundColor))??St,color:e.color,backgroundColor:e.backgroundColor}}function bn(e,A){return!e||!A?!1:Mn(e)===Mn(A)}function Mn(e){return e.replaceAll(" ","").replaceAll('"',"").replaceAll("'","")}function Go(e){if(e){const A=e.match(/url\(['"]?(.*?)['"]?\)/);return A==null?void 0:A[1]}}function Kn(e){return!e||e==="none"?[]:e.replace(/\s+(?=[^()]*\))/g,"").split(new RegExp("(?<=px|inset),","g")).map(A=>{const t=A.trim().split(" "),s=t.length===4;return{type:s?"text":"box",color:t[0],angle:parseInt(t[1]),distance:parseInt(t[2]),blur:parseInt(t[3]),spread:s?0:parseInt(t[4]),inset:s?!1:t[5]==="inset"}})}function Qi(e){const A=Math.round(e.blur),t=Math.round(e.spread),s=e.angle*(Math.PI/180),i=Math.round(e.distance*Math.cos(s)),n=Math.round(e.distance*Math.sin(s)),o=e.inset&&e.type==="box"?"inset ":"",l=e.color===Ya.color?"rgba(0,0,0,0.5)":e.color;let c=o+i+"px "+n+"px "+A+"px ";return e.type==="box"&&(c+=t+"px "),c+l}class Tg extends $e{constructor(t,s,i){super(t);r(this,"displayName",v("Changed element class"));r(this,"changes",{new:[],old:[]});this.node=t,this.el=s,this.changes.new=i}onBeforeExecute(){this.changes.old=Array.from(this.node.classList)}executeMutation(t){return this.syncClasses(t,this.changes.new)}undoMutation(t){return this.syncClasses(t,this.changes.old)}syncClasses(t,s){const i=this.findEl(t);return i&&s.join(" ")!==i.className?(i.classList.forEach(n=>{_o(n,this.el)||i.classList.remove(n)}),i.classList.add(...s),!0):!1}}function _o(e,A){return e.indexOf("d-")>-1||e.indexOf("col-")>-1?!0:(A.hiddenClasses||[]).includes(e)}const Rn=["sm","md","lg","xl"];function qo(e){return{sm:e.includes("d-none")&&!ua(e,"sm"),md:Vs("md",e)&&!ua(e,"md"),lg:Vs("lg",e)&&!ua(e,"lg"),xl:Vs("xl",e)&&!ua(e,"xl")}}function Vs(e,A){if(A.includes("d-none")||A.includes(`d-${e}-none`))return!0;const t=Rn.indexOf(e);for(let s=0;s<t;s++)if(A.includes(`d-${Rn[s]}-none`))return!0;return!1}function ua(e,A){const t=new RegExp(`^d-${A}-(?!none)[a-z-]+$`);return e.find(s=>t.test(s))!==void 0}function Dg(e,A="block"){if((!A||A==="none")&&(A="block"),Object.values(e).every(s=>!s))return[];if(Object.values(e).every(s=>s))return["d-none"];const t=[];return Object.entries(e).forEach(([s,i])=>{const n=s;n==="sm"?i&&t.push("d-none"):i?t.push(`d-${n}-none`):t.push(`d-${n}-${A}`)}),t}const ga=[[0,"px"],[0,"px"],[0,"px"],[0,"px"]],Ya={id:"",classList:[],fontFamily:{family:""},backgroundColor:"rgb(255, 255, 255)",color:"rgb(0, 0, 0)",fontWeight:"400",fontStyle:"normal",textAlign:"left",textDecorationLine:"none",opacity:"1",responsiveHiddenOn:{sm:!1,md:!1,lg:!1,xl:!1},fontSize:[16,"px"],padding:ga,margin:ga,borderWidth:ga,borderRadius:ga,borderStyle:"none",shadows:[],borderColor:"rgb(255, 255, 255)",backgroundClip:"border-box",backgroundConfig:{...St,backgroundColor:"rgba(0,0,0,0)",backgroundImage:"none",color:"rgb(0,0,0)"}},Mg={normal:"400",bold:"700",bolder:"900",lighter:"100"};function Kg(e){const A=B().getEditorWindow().getComputedStyle(e.node),t=e.node.style,s=Array.from(e.node.classList);return t?{id:e.node.id,classList:s.filter(i=>!_o(i,e.el)),responsiveHiddenOn:qo(s),color:A.color,backgroundColor:A.backgroundColor,backgroundClip:A.backgroundClip,opacity:A.opacity,backgroundConfig:Sg(A)??Rg(A),shadows:[...Kn(A.boxShadow),...Kn(A.textShadow)],fontWeight:Mg[A.fontWeight]??A.fontWeight,fontStyle:A.fontStyle,textAlign:A.textAlign,textDecorationLine:A.textDecorationLine,fontSize:Ie(A.fontSize),fontFamily:{family:A.fontFamily,category:e.node.dataset.fontCategory,google:e.node.dataset.fontType==="google"},padding:[Ie(t.paddingTop),Ie(t.paddingRight),Ie(t.paddingBottom),Ie(t.paddingLeft)],margin:[Ie(t.marginTop),Ie(t.marginRight),Ie(t.marginBottom),Ie(t.marginLeft)],borderWidth:[Ie(t.borderTopWidth),Ie(t.borderRightWidth),Ie(t.borderBottomWidth),Ie(t.borderLeftWidth)],borderRadius:[Ie(A.borderTopLeftRadius),Ie(A.borderTopRightRadius),Ie(A.borderBottomRightRadius),Ie(A.borderBottomLeftRadius)],borderStyle:t.borderStyle==="none"||!t.borderStyle?"solid":t.borderStyle,borderColor:t.borderColor}:Ya}function Ie(e){const A=e.match(/([\d\.]+)(\D+)/);return A?[Wo(A[1]),A[2]]:[0,"px"]}function Wo(e){const A=parseInt(e);return Number.isNaN(A)?"":A}function Rg(e){return{...pe,color:e.color,backgroundAttachment:e.backgroundAttachment,backgroundSize:e.backgroundSize,backgroundRepeat:e.backgroundRepeat,backgroundPosition:e.backgroundPosition,backgroundImage:e.backgroundImage,backgroundColor:e.backgroundColor}}const zn={initialConfig:Ya,currentConfig:Ya},Ce=JA()((e,A)=>({...zn,reset:()=>e(zn),setInitialConfig:t=>{const s=Kg(t);e({initialConfig:s,currentConfig:s})},setValue:(t,s)=>{e({currentConfig:{...A().currentConfig,[t]:s}})},setValues:t=>{e({currentConfig:{...A().currentConfig,...t}})},setShadowValue:(t,s)=>{const i=[...A().currentConfig.shadows];return s!=null?i[s]=t:i.push(t),A().setValue("shadows",i),A().currentConfig.shadows},removeShadowValue:t=>{const s=[...A().currentConfig.shadows];return t==null&&(t=s.length-1),s.splice(t,1),A().setValue("shadows",s),A().currentConfig.shadows}}));function ae(){return Ce.getState()}function wn(e,A=!1){if(e.dataset.arId||(e.dataset.arId=Je(10)),A)for(let t=0;t<e.children.length;t++){const s=e.children[t];wn(s,!0),s.dataset.arId=Je(10)}}function uA(e,A){const t=A.createElement("div");return t.className="col-sm-"+e,wn(t,!0),t}function Ye(e){var s;const A=(s=e==null?void 0:e.parentElement)==null?void 0:s.children,t=Z(e);if(A){for(let i=0;i<=A.length;i++)if(t===Z(A.item(i)))return i}return-1}function Fi(e,A,t,s=!0){if(e=s?e.cloneNode(!0):e,t<0)A.prepend(e);else{if(e.parentElement&&Z(e.parentElement)===Z(A)){const n=Ye(e);n>-1&&n<=t&&t++}const i=A.children.item(t);i?i.before(e):A.append(e)}}class sa extends $e{constructor(t,s,i){super(t);r(this,"displayName",v("Insert element"));r(this,"changes",{new:null,old:null});this.el=t,this.newIndex=s,this.newParent=i}static canInsertInto(t){return t&&!tA(t)&&t.nodeName!=="HTML"}getNodeId(){return this.nodeId}onBeforeExecute(){this.nodeId||wn(this.el,!0),this.nodeId=Z(this.el)}executeMutation(t){const s=this.findEl(t,this.newParent);return!s||!sa.canInsertInto(s)?!1:(Fi(this.el,s,this.newIndex,!0),t===this.previewDoc&&xe(this.nodeId),!0)}undoMutation(t){const s=this.findEl(t);return!s||!s.parentNode?!1:(s.parentNode.removeChild(s),!0)}isGameElement(t){return["game-2048","snake-game","memory-game","tetris-game","breakout-game","tic-tac-toe-game","simon-says-game","minesweeper-game","hangman-game","rock-paper-scissors-game"].some(i=>t.classList.contains(i))}}function ki(e){const A=e.className.match(/col-[a-z]+-([0-9]+)/);return parseInt(A?A[1]:"0")}function Xo(e){return Array.from((e==null?void 0:e.children)||[]).filter(A=>A.className.indexOf("col-")>-1).map(A=>({span:ki(A),id:Z(A)})).filter(A=>A.id)}class zg extends $e{constructor(t,s){super(t);r(this,"displayName",v("Changed row layout"));r(this,"originalRowContent","");r(this,"columns",[]);r(this,"changes",{new:null,old:null});this.rowId=t,this.preset=s}execute(){var t,s;if(this.pageDoc&&this.previewDoc&&this.executeMutation(this.pageDoc)){const i=(t=this.findEl(this.pageDoc,this.rowId))==null?void 0:t.cloneNode(!0);if(i)return(s=this.findEl(this.previewDoc,this.rowId))==null||s.replaceWith(i),xe(this.rowId,{force:!0}),!0}return!1}executeMutation(t){return this.applyPreset(this.preset,t),!0}undoMutation(t){const s=this.findEl(t);return s?(s.innerHTML=this.originalRowContent,t===B().getEditorDoc()&&xe(this.rowId,{force:!0}),!0):!1}applyPreset(t,s){const i=this.findEl(s,this.rowId);if(t=t.map(Number),!!i){if(this.columns=Xo(i),this.originalRowContent=i.innerHTML,this.columns.length>t.length){const n=this.columns.slice(t.length).map(o=>o.id);yi(n,s).forEach(o=>o.remove())}t.forEach((n,o)=>{if(this.columns[o]){const l=Ee(this.columns[o].id,s);this.resizeColumn(l,n)}else if(this.columns[o-1]){const l=Ee(this.columns[o-1].id,s);this.addNewColumn(l,n,s)}else i.appendChild(uA(n,s))})}}resizeColumn(t,s,i){s||(s=1),t.className=t.className.replace(/(col-[a-z]+-)([0-9]+)/,(n,o,l)=>i?i==="+"?o+(parseInt(l)+s):o+(parseInt(l)-s):o+s)}addNewColumn(t,s,i){const n=Ye(t),o=Array.from(t.parentElement.children),l=o.slice(n);if(this.getTotalSpan(this.columns,i)+s<=12)return t.after(uA(s,i));if(this.colWiderThan(1,l[0]))return this.resizeColumn(l[0],1,"-"),t.after(uA(s,i));if(this.colWiderThan(1,t))return this.resizeColumn(t,1,"-"),t.after(uA(s,i));if(this.fitColumn(t,l,s,i))return;const c=o.slice(0,n);this.fitColumn(t,c,s,i)}fitColumn(t,s,i,n){for(const o of s)if(this.colWiderThan(1,o))return this.resizeColumn(o,1,"-"),t.after(uA(i,n)),!0;return!1}colWiderThan(t,s){if(this.isColumn(s))return ki(s)>t}isColumn(t){if(t!=null&&t.className)return t.className.indexOf("col-")>-1}getTotalSpan(t,s){const i=t.map(o=>o.id);let n=0;return yi(i,s).forEach(o=>{n+=ki(o)}),n}}const Ui=".container, .container-fluid",vt=JA()((e,A)=>({allContainers:[],loadContainers(){const t=[];Array.from(B().getEditorDoc().querySelectorAll(Ui)).forEach(s=>{const i=ug(s.querySelectorAll(":scope > .row")),n=Z(s);n&&!t.find(o=>o.id===n)&&t.push({rows:i,id:n})}),e({allContainers:t})},insertNewContainer:Og,insertNewRow:Pg,applyRowPreset:Vg,selectedContainer:null,setSelectedContainer(t){e({selectedContainer:t})},selectedRow:null,setSelectedRow(t){e({selectedRow:t})},selectedColumn:null,setSelectedColumn(t){e({selectedColumn:t})}}));function Ke(){return vt.getState()}function Og(e,A){const t=B().getEditorDoc(),s=Yo(),i=t.createElement("div");i.classList.add("container"),i.appendChild(s),Jo(i,e,A)}function Pg(e,A,t){const s=Yo();Jo(s,A,t,e)}function Yo(){const e=B().getEditorDoc(),A=e.createElement("div");return A.appendChild(uA(12,e)),A.classList.add("row"),A}function Jo(e,A,t,s){const i=B().getEditorDoc();let n=0;if(A){const c=Ee(A,i),g=c==null?void 0:c.parentElement;s||(s=g?Z(g):null),n=Ye(c)}else s||(s=Z(i.body)),n=0;if(!s)return null;const o=t==="before"?n:n+1,l=new sa(e,o,s);return G().executeMutation(l,{lastInSession:!0}),l.getNodeId()}function Vg(e){const A=Ke().selectedRow;if(!A)return;const t=A.columns.map(s=>s.span).join("+");e.join("+")!==t&&G().executeMutation(new zg(A.id,e),{lastInSession:!0})}const Gs=500,On={isDirty:!1,mutationStack:[],canUndo:!1,canRedo:!1,pointer:-1};let sA=[];const Ct=JA()((e,A)=>({...On,setIsDirty:t=>e({isDirty:t}),reset:()=>e(On),executeMutation:(t,s)=>{let i=t.init().execute();const n={executed:i,mutation:t},o=!(s!=null&&s.skipHistory)&&((s==null?void 0:s.lastInSession)||sA.length&&(sA[0].mutation.constructor!==t.constructor||sA[0].mutation.getNodeId()!==t.getNodeId()));if(o){const l=Gg([...sA,n]);i=l.executed,t=l.mutation}if(s!=null&&s.lastInSession&&(sA=[]),s!=null&&s.partOfSession&&sA.push(n),i){if(o){let l=[...A().mutationStack];A().canRedo&&(l=l.slice(0,A().pointer+1)),l.push(t),l.length>Gs&&(l=l.slice(l.length-Gs)),e({mutationStack:l}),A().setPointer(Math.min(Gs-1,A().pointer+1))}pa(!(s!=null&&s.forceSyncEditor)&&(s==null?void 0:s.partOfSession))}return i},undo:()=>{const t=A().mutationStack[A().pointer];t&&(t.undo(),A().setPointer(A().pointer-1),pa())},redo(){const t=A().mutationStack[A().pointer+1];t&&(t.redo(),A().setPointer(A().pointer+1),pa())},goTo(t){if(t!==A().pointer){if(t<A().pointer)for(let s=A().pointer;s>t;s--)A().mutationStack[s].undo();else for(let s=A().pointer+1;s<=t;s++)A().mutationStack[s].redo();A().setPointer(t),pa()}},setPointer(t){e({pointer:t,canUndo:t!==-1,canRedo:t<A().mutationStack.length-1})}}));function G(){return Ct.getState()}function pa(e=!1){const A=B().selectedContext;A&&(e||ae().setInitialConfig(A),B().isResizing||gt.reposition()),e||(Ke().loadContainers(),G().setIsDirty(!0)),B().isResizing||Oe.remove()}function Gg(e){if(e.length<2)return e[0];const A=e[0],t=e[e.length-1];return t.mutation.overrideInitialValue(A.mutation.getInitialValue()),t.executed=e.some(s=>s.executed),t}class _g extends Ge{constructor(){super(...arguments);r(this,"name","paragraph");r(this,"html","<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</p>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["phrasing"]);r(this,"category","typography");r(this,"icon",a.jsx(yo,{}))}matcher(t){return t.nodeName==="P"}}class qg extends L{constructor(){super(...arguments);r(this,"name","divider");r(this,"html","<hr>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"category","layout");r(this,"icon",a.jsx(Au,{}))}matcher(t){return t.nodeName==="HR"}}class Wg extends Ge{constructor(){super(...arguments);r(this,"name","marked text");r(this,"html","<mark>Marked Text</mark>");r(this,"contentCategories",["flow","phrasing"]);r(this,"allowedContent",["phrasing"]);r(this,"category","typography");r(this,"icon",a.jsx(kd,{}))}matcher(t){return t.nodeName==="MARK"}}class Xg extends L{constructor(){super(...arguments);r(this,"name","definition list");r(this,"html",'<dl class="dl-horizontal"><dt>Description lists</dt><dd>A description list is perfect for defining terms.</dd><dt>Euismod</dt><dd>Vestibulum id ligula porta felis euismod semper eget lacinia odio sem nec elit.</dd><dd>Donec id elit non mi porta gravida at eget metus.</dd><dt>Malesuada porta</dt><dd>Etiam porta sem malesuada magna mollis euismod.</dd><dt>Felis euismod semper eget lacinia</dt><dd>Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.</dd></dl>');r(this,"contentCategories",["flow","sectioning root"]);r(this,"allowedContent",["dt","dd"]);r(this,"category","typography");r(this,"icon",a.jsx(ta,{}))}matcher(t){return t.nodeName==="DL"}}class Yg extends Ge{constructor(){super(...arguments);r(this,"name","blockquote");r(this,"html",'<blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p><footer>Someone famous in <cite title="Source Title">Source Title</cite></footer></blockquote>');r(this,"contentCategories",["flow","sectioning root"]);r(this,"allowedContent",["flow"]);r(this,"category","typography");r(this,"icon",a.jsx(on,{}))}matcher(t){return t.nodeName==="BLOCKQUOTE"}}class Jg extends Ge{constructor(){super(...arguments);r(this,"name","list item");r(this,"html","<li>A basic list item</li>");r(this,"contentCategories",["li"]);r(this,"allowedContent",["flow"])}matcher(t){return t.nodeName==="LI"}}class $g extends L{constructor(){super(...arguments);r(this,"name","unordered list");r(this,"html","<ul><li>List item #1</li><li>List item #2</li><li>List item #3</li><ul>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["li"]);r(this,"category","typography");r(this,"icon",a.jsx(Ud,{}))}matcher(t){return t.nodeName==="UL"}}class Zg extends L{constructor(){super(...arguments);r(this,"name","body");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"contextMenu",!1)}matcher(t){return t.nodeName==="HTML"?t.querySelector("body"):t.nodeName==="BODY"}}class ep extends Ge{constructor(){super(...arguments);r(this,"name","button");r(this,"html",'<a class="btn btn-success">Click Me</a>');r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","reassociateable","form-associated"]);r(this,"allowedContent",["phrasing"]);r(this,"category","buttons");r(this,"icon",a.jsx(xA,{}));r(this,"controls",[new ze({label:"Content",type:Ne.Input,defaultValue(t){return t.textContent||""},onChange(t,s,i={lastInSession:!0}){G().executeMutation(new fn(Z(t)||"",s),i)}})])}matcher(t){return t.nodeName==="BUTTON"||t.classList.contains("btn")}}class tp extends Ge{constructor(){super(...arguments);r(this,"name","div container");r(this,"html","<div></div>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","layout");r(this,"icon",a.jsx(au,{}))}matcher(t){return t.nodeName==="DIV"}}class Ap extends L{constructor(){super(...arguments);r(this,"name","section");r(this,"html","<section></section>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"])}matcher(t){return t.nodeName==="SECTION"}}class ap extends L{constructor(){super(...arguments);r(this,"name","footer");r(this,"html","<footer></footer>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"])}matcher(t){return t.nodeName==="FOOTER"}}class sp extends L{constructor(){super(...arguments);r(this,"name","header");r(this,"html","<header>Header Text</header>");r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"])}matcher(t){return t.nodeName==="HEADER"}}class ip extends Ge{constructor(){super(...arguments);r(this,"name","heading");r(this,"html","<h2>Heading</h2>");r(this,"contentCategories",["heading","flow"]);r(this,"allowedContent",["phrasing"]);r(this,"category","typography");r(this,"icon",a.jsx(su,{}));r(this,"controls",[new ze({label:"Type",type:Ne.Select,options:[{key:"H1",value:"h1"},{key:"H2",value:"h2"},{key:"H3",value:"h3"},{key:"H4",value:"h4"},{key:"H5",value:"h5"},{key:"H6",value:"h6"}],defaultValue:t=>t.nodeName.toLowerCase()||"h1",onChange:(t,s)=>{const i=Z(t);G().executeMutation(new pg(t,s),{lastInSession:!0})&&i&&(xe(i),gt.reposition())}})])}matcher(t){return["H1","H2","H3","H4","H5","H6"].includes(t.nodeName)}}class np extends L{constructor(){super(...arguments);r(this,"name","icon");r(this,"html",'<i class="fa fa-star fa-2x"></i>');r(this,"contentCategories",["flow","phrasing"]);r(this,"allowedContent",[]);r(this,"canDrag",!0);r(this,"canEdit",[ce.Settings]);r(this,"icon",a.jsx(Qo,{}));r(this,"category","typography");r(this,"controls",[new ze({label:"Size",type:Ne.Select,shouldHide:t=>!t||!t.classList.contains("fa"),options:[{key:"Default",value:"fa-default"},{key:"Large",value:"fa-lg"},{key:"2x",value:"fa-2x"},{key:"3x",value:"fa-3x"},{key:"4x",value:"fa-4x"},{key:"5x",value:"fa-5x"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})]);r(this,"hiddenClasses",["fa","fa-default","fa-lg","fa-2x","fa-3x","fa-4x","fa-5x"]);r(this,"editActions",[{name:"Change Icon",action:async t=>{const s=await dg();if(s){const n=(t.getAttribute("class")??"").replace(/fa fa.+?($| )/,`${s} `).replace(/glyphicon glyphicon.+?($| )/,`${s} `).replace(/icon-\w+/g,`${s} `);G().executeMutation(new ot(t,{class:n}),{lastInSession:!0})}}}])}matcher(t){var s,i;return t.nodeName==="I"||((s=t.className)==null?void 0:s.includes("icon-"))||((i=t.classList)==null?void 0:i.contains("svg-inline--fa"))}}class rp extends Ge{constructor(){super(...arguments);r(this,"name","generic");r(this,"contentCategories",["flow","phrasing"]);r(this,"allowedContent",[]);r(this,"canDrag",!1);r(this,"canEdit",[ce.Text,ce.Settings])}matcher(t){return["EM","STRONG","U","S","SMALL"].includes(t.nodeName)}}class op extends L{constructor(){super(...arguments);r(this,"name","svg")}matcher(t){return t.closest("svg")}}function D(e,A){return!e||!e.classList?!1:e.classList.contains(A)}const lp=ds(a.jsx("path",{d:"M 5 2 L 5 22 L 8 22 L 8 13 L 16 13 L 16 22 L 19 22 L 19 2 L 16 2 L 16 10 L 8 10 L 8 2 Z "}),"FormElOutlined"),cp=[{value:"none",label:v("Unlink")},{value:"url",label:v("Url")},{value:"page",label:v("Page")},{value:"anchor",label:v("Anchor")},{value:"download",label:v("Download")},{value:"email",label:v("Email")}];function dp({value:e,hideUnlinkPanel:A}){const{close:t,formId:s}=be(),i=J(u=>u.project),[n]=h.useState(()=>e!=null&&e.href?!e.href.startsWith("http")&&e.href.endsWith(".html")?"page":e.href.startsWith("#")?"anchor":e.href.startsWith("mailto:")?"email":e.download?"download":"url":"url"),[o]=h.useState(()=>Array.from(B().getEditorDoc().querySelectorAll("*[id]")).map(u=>u.id)),l=(i==null?void 0:i.pages)??[],[c,g]=h.useState(n);return a.jsxs(me,{size:"lg",children:[a.jsx(se,{children:a.jsx(d,{message:"What do you want to link to?"})}),a.jsx(te,{children:a.jsxs("div",{className:"flex min-h-180 items-stretch",children:[a.jsx(us,{orientation:"vertical",size:"sm",children:cp.map(u=>u.value==="none"&&A?null:a.jsx(gs,{value:u.value,checked:c===u.value,onChange:()=>g(u.value),children:a.jsx(d,{...u.label})},u.value))}),a.jsxs("div",{className:"ml-24 flex-auto border-l pl-24",children:[c==="none"&&a.jsx(up,{}),c==="url"&&a.jsx(gp,{value:e}),c==="page"&&!!l.length&&a.jsx(pp,{value:e,pages:l}),c==="anchor"&&!!o.length&&a.jsx(mp,{value:e,anchors:o}),c==="download"&&a.jsx(hp,{value:e}),c==="email"&&a.jsx(fp,{value:e})]})]})}),a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>t(),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",type:"submit",form:s,children:a.jsx(d,{message:"Done"})})]})]})}function up(){const{close:e,formId:A}=be(),t=Te();return a.jsx(De,{form:t,id:A,onSubmit:()=>e("unlink"),children:a.jsx(tn,{imageMargin:"mb-10",imageHeight:"h-auto",image:a.jsx(Fo,{className:"text-muted",size:"xl"}),title:a.jsx(d,{message:"Unlink"}),description:a.jsx(d,{message:"Remove current link from the selection"})})})}function gp({value:e}){const{trans:A}=Qt(),{close:t,formId:s}=be(),i=Te({defaultValues:{href:e==null?void 0:e.href,target:(e==null?void 0:e.target)??"_self"}});return a.jsxs(De,{form:i,id:s,onSubmit:n=>t(n),children:[a.jsx(Xe,{name:"href",label:a.jsx(d,{message:"What's the web address (URL)?"}),placeholder:A(v("Paste it here…")),type:"url",required:!0,autoFocus:!0}),a.jsx($o,{})]})}function pp({value:e,pages:A}){const{trans:t}=Qt(),{close:s,formId:i}=be(),n=Te({defaultValues:{href:(e==null?void 0:e.href)??`${A==null?void 0:A[0].name}.html`,target:(e==null?void 0:e.target)??"_self"}});return a.jsxs(De,{form:n,id:i,onSubmit:o=>s(o),children:[a.jsx(ps,{name:"href",label:a.jsx(d,{message:"Which page?"}),placeholder:t(v("Select a page...")),selectionMode:"single",required:!0,autoFocus:!0,children:A==null?void 0:A.map(o=>a.jsx(k,{value:`${o.name}.html`,children:o.name},o.id))}),a.jsx($o,{})]})}function mp({value:e,anchors:A}){const{trans:t}=Qt(),{close:s,formId:i}=be(),n=Te({defaultValues:{href:(e==null?void 0:e.href)??`#${A[0]}`}});return a.jsx(De,{form:n,id:i,onSubmit:o=>s(o),children:a.jsx(ps,{name:"href",label:a.jsx(d,{message:"Which anchor on this page?"}),placeholder:t(v("Select an anchor...")),selectionMode:"single",description:a.jsx(d,{message:"Click on this element will scroll to the selected anchor on the page."}),autoFocus:!0,required:!0,children:A.map(o=>a.jsx(k,{value:`#${o}`,children:o},o))})})}function hp({value:e}){const{close:A,formId:t}=be(),s=Te({defaultValues:{href:e==null?void 0:e.href,download:e==null?void 0:e.download}});return a.jsxs(De,{form:s,id:t,onSubmit:i=>A(i),children:[a.jsx(Xe,{name:"download",label:a.jsx(d,{message:"Download file name"}),required:!0,className:"mb-24",autoFocus:!0}),a.jsx(Xe,{name:"href",label:a.jsx(d,{message:"Download url"}),required:!0,type:"url"})]})}function fp({value:e}){const{close:A,formId:t}=be(),s={subject:"",email:""};if(e!=null&&e.href){const n=new URL(e.href);s.subject=n.searchParams.get("subject")??"",s.email=n.pathname.replace("mailto:","")}const i=Te({defaultValues:s});return a.jsxs(De,{form:i,id:t,onSubmit:n=>A({href:`mailto:${n.email}?subject=${n.subject}`}),children:[a.jsx(Xe,{name:"email",label:a.jsx(d,{message:"Email address"}),required:!0,type:"email",className:"mb-24",autoFocus:!0}),a.jsx(Xe,{name:"subject",label:a.jsx(d,{message:"Email subject"}),required:!0})]})}function $o(){return a.jsx("div",{className:"mt-16 border-t pt-16",children:a.jsxs(qc,{name:"target",orientation:"vertical",size:"sm",label:a.jsx(d,{message:"How should it open?"}),children:[a.jsx(Sn,{value:"_blank",children:a.jsx(d,{message:"New window"})}),a.jsx(Sn,{value:"_self",children:a.jsx(d,{message:"Same window"})})]})})}async function Zo(e,A={}){return await Yt(dp,{...A,value:e})}const xp=Wc({settings:ms().settings});function el(){return xp.getState()}class bp extends L{constructor(){super(...arguments);r(this,"name","page header");r(this,"html",'<div class="page-header"><h1>Example page header <small>Header subtext</small></h1></div>');r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","typography");r(this,"icon",a.jsx(lp,{}));r(this,"specificity",1)}matcher(t){return D(t,"page-header")}}class wp extends L{constructor(){super(...arguments);r(this,"name","progress bar");r(this,"html",`<div class="progress">
<div class="progress-bar" role="progressbar" style="width: 50%" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
</div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(ko,{}));r(this,"specificity",1)}matcher(t){return D(t,"progress")?t:t.parentElement&&D(t.parentElement,"progress")?t.parentElement:!1}}class Bp extends L{constructor(){super(...arguments);r(this,"name","list group");r(this,"html",`<ul class="list-group">
<li class="list-group-item">Cras justo odio</li>
<li class="list-group-item">Dapibus ac facilisis in</li>
<li class="list-group-item">Morbi leo risus</li>
<li class="list-group-item">Porta ac consectetur ac</li>
<li class="list-group-item">Vestibulum at eros</li>
</ul>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(ta,{}));r(this,"specificity",1)}matcher(t){return D(t,"list-group")}}class vp extends Ge{constructor(){super(...arguments);r(this,"name","alert");r(this,"html",`<div class="alert alert-primary" role="alert">
A simple primary alert—check it out!
</div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","layout");r(this,"icon",a.jsx(ln,{}));r(this,"specificity",1)}matcher(t){return D(t,"well")}}class Cp extends Ge{constructor(){super(...arguments);r(this,"name","Badge");r(this,"html",'<span class="label label-success">Success</span>');r(this,"contentCategories",["flow","phrasing"]);r(this,"allowedContent",["phrasing"]);r(this,"category","typography");r(this,"hiddenClasses",["label"]);r(this,"icon",a.jsx(ln,{}));r(this,"specificity",1)}matcher(t){return D(t,"label")}}class yp extends L{constructor(){super(...arguments);r(this,"name","button group");r(this,"html",`<div class="btn-group" role="group" aria-label="Basic example">
  <button type="button" class="btn btn-secondary">Left</button>
  <button type="button" class="btn btn-secondary">Middle</button>
  <button type="button" class="btn btn-secondary">Right</button>
</div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["button"]);r(this,"category","buttons");r(this,"icon",a.jsx(iu,{}));r(this,"specificity",1)}matcher(t){return D(t,"btn-group")}}class Qp extends L{constructor(){super(...arguments);r(this,"name","button toolbar");r(this,"html",`<div class="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
  <div class="btn-group mr-2" role="group" aria-label="First group">
    <button type="button" class="btn btn-secondary">1</button>
    <button type="button" class="btn btn-secondary">2</button>
    <button type="button" class="btn btn-secondary">3</button>
    <button type="button" class="btn btn-secondary">4</button>
  </div>
  <div class="btn-group mr-2" role="group" aria-label="Second group">
    <button type="button" class="btn btn-secondary">5</button>
    <button type="button" class="btn btn-secondary">6</button>
    <button type="button" class="btn btn-secondary">7</button>
  </div>
  <div class="btn-group" role="group" aria-label="Third group">
    <button type="button" class="btn btn-secondary">8</button>
  </div>
</div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",[".btn-group"]);r(this,"category","buttons");r(this,"icon",a.jsx(Cs,{}));r(this,"specificity",1)}matcher(t){return D(t,"btn-toolbar")}}class Fp extends L{constructor(){super(...arguments);r(this,"name","input field");r(this,"html",'<input type="text" class="form-control" placeholder="Text input">');r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"hiddenClasses",["form-control"]);r(this,"category","forms");r(this,"icon",a.jsx(nu,{}));r(this,"controls",[new ze({label:"Type",type:Ne.Select,options:[{key:"Text",value:"text"},{key:"Password",value:"password"},{key:"Date",value:"date"},{key:"Email",value:"email"},{key:"Datetime",value:"datetime"},{key:"Datetime Local",value:"datetime-local"},{key:"Month",value:"month"},{key:"Time",value:"time"},{key:"Week",value:"week"},{key:"Number",value:"number"},{key:"Url",value:"url"},{key:"Search",value:"search"},{key:"Tel",value:"tel"},{key:"Color",value:"color"}],defaultValue(t){return t.type||this.options[0].value},onChange(t,s,i={lastInSession:!0}){G().executeMutation(new ot(t,{type:s}),i)}}),new ze({label:"Placeholder",type:Ne.Input,defaultValue(t){return t.placeholder},onChange(t,s,i={lastInSession:!0}){G().executeMutation(new ot(t,{placeholder:s}),i)}})]);r(this,"specificity",1)}matcher(t){const s=["button","checkbox","hidden","image","radio","range","reset","submit"];return t.nodeName==="INPUT"&&!s.includes(t.type)}}class kp extends L{constructor(){super(...arguments);r(this,"name","text area");r(this,"html",'<textarea class="form-control" rows="3"></textarea>');r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"hiddenClasses",["form-control"]);r(this,"category","forms");r(this,"icon",a.jsx(yo,{}));r(this,"controls",[new ze({label:"Text Rows",type:Ne.Input,inputType:"number",min:1,max:10,defaultValue(t){return t.getAttribute("rows")||""},onChange(t,s,i){G().executeMutation(new ot(t,{rows:s}),i)}}),new ze({label:"Placeholder",type:Ne.Input,defaultValue(t){return t.placeholder},onChange(t,s,i){G().executeMutation(new ot(t,{placeholder:s}),i)}})]);r(this,"specificity",1)}matcher(t){return t.nodeName==="TEXTAREA"}}class Up extends L{constructor(){super(...arguments);r(this,"name","checkbox");r(this,"html",`<div class="form-check">
  <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
  <label class="form-check-label" for="flexCheckDefault">
    Default checkbox
  </label>
</div>`);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(ru,{}));r(this,"specificity",1)}matcher(t){return D(t,"form-check")}}class jp extends L{constructor(){super(...arguments);r(this,"name","input group");r(this,"html",`<div class="input-group input-group-md">
        <div class="input-group-prepend">
          <div class="input-group-text">@</div>
        </div>
        <input type="text" class="form-control" placeholder="Username">
      </div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"controls",[new ze({label:"Size",type:Ne.Select,options:[{key:"Medium",value:"input-group-md"},{key:"Large",value:"input-group-lg"},{key:"Small",value:"input-group-sm"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})]);r(this,"category","forms");r(this,"icon",a.jsx(ta,{}));r(this,"hiddenClasses",["input-group","input-group-md","input-group-lg","input-group-sm"]);r(this,"specificity",1)}matcher(t){return D(t,"input-group")}}class Ep extends L{constructor(){super(...arguments);r(this,"name","form group");r(this,"html",'<div class="form-group"><label for="email" class="control-label">Email address</label><input type="email" class="form-control" id="email" placeholder="Enter email"></div>');r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"controls",[new ze({label:"State",type:Ne.Select,options:[{key:"None",value:"state-none"},{key:"Error",value:"has-error"},{key:"Success",value:"has-success"},{key:"Warning",value:"has-warning"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})]);r(this,"category","forms");r(this,"icon",a.jsx(Uo,{}));r(this,"hiddenClasses",["form-group","state-none","has-error","has-success","has-warning"]);r(this,"specificity",1)}matcher(t){return D(t,"form-group")}}class Ip extends Ge{constructor(){super(...arguments);r(this,"name","link");r(this,"html",'<a href="#">A simple hyperlink.</a>');r(this,"contentCategories",["flow","phrasing","interactive"]);r(this,"allowedContent",["phrasing"]);r(this,"category","typography");r(this,"icon",a.jsx(zt,{}));r(this,"specificity",1);r(this,"editActions",[{name:"Change Link",action:async t=>{const s=await Zo({href:t.getAttribute("href")??void 0,target:t.getAttribute("target")??void 0,download:t.getAttribute("download")??void 0},{hideUnlinkPanel:!0});s&&G().executeMutation(new ot(t,s),{lastInSession:!0})}},{name:"Edit Text",action:t=>{xe(t),He().startSession()}}])}matcher(t){return t.nodeName==="A"}}class Sp extends L{constructor(){super(...arguments);r(this,"name","addon");r(this,"canDrag",!1);r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"canEdit",[ce.Text,ce.Settings]);r(this,"hiddenClasses",["input-group-addon"]);r(this,"specificity",1)}matcher(t){return D(t,"input-group-addon")}}class Hp extends L{constructor(){super(...arguments);r(this,"name","select");r(this,"html",`<select class="form-control">
<option>1</option>
<option>2</option>
<option>3</option>
<option>4</option>
<option>5</option>
</select>`);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx($c,{}));r(this,"specificity",1)}matcher(t){return t.nodeName==="SELECT"}}class tl extends L{constructor(){super(...arguments);r(this,"name","image");r(this,"html",'<img src="/images/builder/placeholder.svg" class="img-responsive" alt="">');r(this,"contentCategories",["flow","phrasing","embedded","interactive","form-associated"]);r(this,"allowedContent",[]);r(this,"category","media");r(this,"icon",a.jsx(ws,{}));r(this,"canEdit",[ce.Settings,ce.Padding,ce.Margin,ce.Shadow,ce.Border]);r(this,"controls",[new ze({label:"Shape",type:Ne.Select,options:[{key:"Default",value:"img-default"},{key:"Rounded",value:"img-rounded"},{key:"Thumbnail",value:"img-thumbnail"},{key:"Circle",value:"img-circle"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n,o;const i=(o=(n=this.options)==null?void 0:n.find(l=>t.classList.contains(l.value)))==null?void 0:o.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})]);r(this,"hiddenClasses",["img-default","img-responsive","img-rounded","img-thumbnail","img-circle"]);r(this,"specificity",1);r(this,"editActions",[{name:"Upload image",action:async t=>{const s=await Xc({types:[Yc.image]});s[0]&&el().uploadSingle(s[0],{metadata:{diskPrefix:"project-assets",disk:Jc.public},showToastOnRestrictionFail:!0,onSuccess:i=>{Bs();const n=An(i.url)?i.url:`${ms().settings.base_url}/${i.url}`;G().executeMutation(new ot(t,{src:n}),{lastInSession:!0}),Oe.hide()}})}},{name:"Create AI image",action:"aiCreateImage"}])}matcher(t){return t.nodeName==="IMG"}}class Lp extends L{constructor(){super(...arguments);r(this,"name","responsive video");r(this,"html",'<div class="embed-responsive embed-responsive-16by9"><iframe class="embed-responsive-item" src="//www.youtube.com/embed/sENM2wA_FTg"></iframe></div>');r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"category","media");r(this,"icon",a.jsx(ou,{}));r(this,"canEdit",[ce.Padding,ce.Margin,ce.Shadow,ce.Settings]);r(this,"controls",[new ze({label:"Url",type:Ne.Input,defaultValue(t){var s;return((s=t.querySelector("iframe"))==null?void 0:s.src)??""},onChange(t,s,i={lastInSession:!0}){const n=t.querySelector("iframe");n&&G().executeMutation(new ot(n,{src:s}),i)}})]);r(this,"hiddenClasses",["embed-responsive","embed-responsive-16by9","preview-node","img-responsive"]);r(this,"specificity",1)}matcher(t){return t.closest(".embed-responsive")}}class Np extends L{constructor(){super(...arguments);r(this,"name","image grid");r(this,"html",`<div class="row image-grid">
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
</div>`);r(this,"contentCategories",["flow"]);r(this,"allowedContent",[]);r(this,"category","media");r(this,"icon",a.jsx(lu,{}));r(this,"canEdit",[ce.Padding,ce.Margin,ce.Shadow,ce.Settings]);r(this,"specificity",1)}matcher(t){return D(t,"image-grid")}}function Al(e){var A;for(let t=0;t<e.classList.length;t++)if((A=e.classList.item(t))!=null&&A.match(/col-.*/))return!0;return!1}class ys extends L{constructor(){super(...arguments);r(this,"defaultSidebarPanel",fe.LAYOUT);r(this,"specificity",3);r(this,"editActions",[{name:"Edit layout",action:()=>{B().setActivePanel(fe.LAYOUT)}}])}}class al extends ys{constructor(){super(...arguments);r(this,"name","container");r(this,"html",'<div class="container"></div>');r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","layout");r(this,"icon",a.jsx(du,{}));r(this,"hiddenClasses",["container","container-fluid"]);r(this,"controls",[new ze({label:"Type",type:Ne.Select,options:[{key:"Default",value:"container"},{key:"Wide",value:"container-fluid"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})])}matcher(t){return D(t,"container")}}class Bn extends ys{constructor(){super(...arguments);r(this,"name","row");r(this,"html",'<section class="row"><div class="col-md-4"></div><div class="col-md-3"></div><div class="col-md-5"></div></section>');r(this,"contentCategories",["flow"]);r(this,"allowedEls",[ia]);r(this,"category","layout");r(this,"icon",a.jsx(cu,{}))}matcher(t){return D(t,"row")}}class ia extends ys{constructor(){super(...arguments);r(this,"name","column");r(this,"html",'<div class="col-sm-6"></div>');r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"])}matcher(t){return Al(t)}}const Tp=`<table class="table">
  <thead>
    <tr>
      <th>#</th>
      <th>First Name</th>
      <th>Last Name</th>
      <th>Username</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Jacob</td>
      <td>Thornton</td>
      <td>@fat</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Larry</td>
      <td>the Bird</td>
      <td>@twitter</td>
    </tr>
  </tbody>
</table>`,Dp=`
.jumbotron {
    text-align: center;
}

.jumbotron p {
    margin: 20px 0 30px;
}
`;class Mp extends L{constructor(){super(...arguments);r(this,"name","table");r(this,"contentCategories",["flow"]);r(this,"html",Tp);r(this,"css",Dp);r(this,"allowedContent",["coption","colgroup","thead","tbody","tfoot","tr"]);r(this,"category","typography");r(this,"icon",a.jsx(jo,{}));r(this,"specificity",3);r(this,"hiddenClasses",["table"]);r(this,"controls",[new ze({label:"Type",type:Ne.Select,options:[{key:"Basic",value:"default"},{key:"Striped",value:"table-striped"},{key:"Bordered",value:"table-bordered"},{key:"Hover",value:"table-hover"},{key:"Condensed",value:"table-condensed"},{key:"Responsive",value:"table-responsive"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})])}matcher(t){return t.nodeName==="TABLE"}}class Kp extends Ge{constructor(){super(...arguments);r(this,"name","table head");r(this,"html","<tr>Table row content</tr>");r(this,"contentCategories",["thead"]);r(this,"allowedContent",["tr"])}matcher(t){return t.nodeName==="THEAD"}}class Rp extends Ge{constructor(){super(...arguments);r(this,"name","table body");r(this,"html","<tr>Table row content</tr>");r(this,"contentCategories",["tbody"]);r(this,"allowedContent",["tr"])}matcher(t){return t.nodeName==="TBODY"}}class zp extends Ge{constructor(){super(...arguments);r(this,"name","table row");r(this,"html","<tr>Table row content</tr>");r(this,"contentCategories",["tr","th"]);r(this,"allowedContent",["td"])}matcher(t){return t.nodeName==="TR"||t.nodeName==="TH"}}class Op extends Ge{constructor(){super(...arguments);r(this,"name","table data cell");r(this,"html","<tr>Table data cell content</tr>");r(this,"contentCategories",["td"]);r(this,"allowedContent",["flow"])}matcher(t){return t.nodeName==="TD"}}const Pp=`<div class="card-component">
  <div class="card">
    <img src="/images/builder/placeholder.svg" class="card-img-top" alt="Card image">
    <div class="card-body">
      <h5 class="card-title">Card Title</h5>
      <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
      <a href="#" class="btn btn-primary">Go somewhere</a>
    </div>
  </div>
</div>`,Vp=`.card-component .card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
}

.card-component .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.card-component .card-img-top {
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
  height: 200px;
  object-fit: cover;
}

.card-component .card-body {
  padding: 1.25rem;
}

.card-component .card-title {
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #212529;
}

.card-component .card-text {
  color: #6c757d;
  margin-bottom: 1rem;
}

.card-component .btn {
  text-decoration: none;
  display: inline-block;
  font-weight: 400;
  text-align: center;
  vertical-align: middle;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border-radius: 0.375rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

.card-component .btn-primary {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.card-component .btn-primary:hover {
  color: #fff;
  background-color: #0b5ed7;
  border-color: #0a58ca;
}`;class sl extends L{constructor(){super(...arguments);r(this,"name","Card");r(this,"contentCategories",["flow"]);r(this,"html",Pp);r(this,"css",Vp);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(uu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["card-component"])}matcher(t){return D(t,"card-component")}}const Gp=`<div class="custom-pricing-table">
  <div class="pricing-container">
    <div class="pricing-plan">
      <div class="plan-header">
        <h3 class="plan-name">Basic</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">19</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">Perfect for individuals and small projects</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> 5 Projects</li>
          <li><i class="fa fa-check"></i> 10GB Storage</li>
          <li><i class="fa fa-check"></i> Email Support</li>
          <li><i class="fa fa-check"></i> Basic Analytics</li>
          <li><i class="fa fa-times"></i> Priority Support</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Get Started</button>
      </div>
    </div>
    
    <div class="pricing-plan featured">
      <div class="popular-badge">Most Popular</div>
      <div class="plan-header">
        <h3 class="plan-name">Professional</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">49</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">Ideal for growing businesses and teams</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> 25 Projects</li>
          <li><i class="fa fa-check"></i> 100GB Storage</li>
          <li><i class="fa fa-check"></i> Priority Support</li>
          <li><i class="fa fa-check"></i> Advanced Analytics</li>
          <li><i class="fa fa-check"></i> API Access</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Get Started</button>
      </div>
    </div>
    
    <div class="pricing-plan">
      <div class="plan-header">
        <h3 class="plan-name">Enterprise</h3>
        <div class="plan-price">
          <span class="currency">$</span>
          <span class="amount">99</span>
          <span class="period">/month</span>
        </div>
        <p class="plan-description">For large organizations with advanced needs</p>
      </div>
      <div class="plan-features">
        <ul>
          <li><i class="fa fa-check"></i> Unlimited Projects</li>
          <li><i class="fa fa-check"></i> Unlimited Storage</li>
          <li><i class="fa fa-check"></i> 24/7 Support</li>
          <li><i class="fa fa-check"></i> Custom Analytics</li>
          <li><i class="fa fa-check"></i> White-label Solution</li>
        </ul>
      </div>
      <div class="plan-footer">
        <button class="plan-button">Contact Sales</button>
      </div>
    </div>
  </div>
</div>`,_p=`.custom-pricing-table {
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.custom-pricing-table::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
}

.custom-pricing-table .pricing-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.custom-pricing-table .pricing-plan {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.custom-pricing-table .pricing-plan::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.custom-pricing-table .pricing-plan:hover::before {
  opacity: 1;
}

.custom-pricing-table .pricing-plan:hover {
  transform: translateY(-15px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}

.custom-pricing-table .pricing-plan.featured {
  transform: scale(1.05);
  border: 3px solid #6c5ce7;
  position: relative;
}

.custom-pricing-table .pricing-plan.featured:hover {
  transform: scale(1.05) translateY(-15px);
}

.custom-pricing-table .popular-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #6c5ce7, #a55eea);
  color: white;
  padding: 8px 30px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 5px 15px rgba(108, 92, 231, 0.4);
}

.custom-pricing-table .plan-header {
  margin-bottom: 30px;
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-name {
  font-size: 28px;
  font-weight: 700;
  color: #2d3436;
  margin: 0 0 20px 0;
}

.custom-pricing-table .plan-price {
  margin-bottom: 15px;
  position: relative;
}

.custom-pricing-table .currency {
  font-size: 24px;
  font-weight: 600;
  color: #6c5ce7;
  vertical-align: top;
}

.custom-pricing-table .amount {
  font-size: 60px;
  font-weight: 800;
  color: #2d3436;
  line-height: 1;
}

.custom-pricing-table .period {
  font-size: 18px;
  color: #636e72;
  font-weight: 500;
}

.custom-pricing-table .plan-description {
  color: #636e72;
  font-size: 16px;
  margin: 0;
  line-height: 1.5;
}

.custom-pricing-table .plan-features {
  margin-bottom: 40px;
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.custom-pricing-table .plan-features li {
  padding: 12px 0;
  font-size: 16px;
  color: #2d3436;
  border-bottom: 1px solid #f8f9fa;
  position: relative;
}

.custom-pricing-table .plan-features li:last-child {
  border-bottom: none;
}

.custom-pricing-table .plan-features i {
  margin-right: 15px;
  width: 20px;
  text-align: center;
}

.custom-pricing-table .plan-features .fa-check {
  color: #00b894;
}

.custom-pricing-table .plan-features .fa-times {
  color: #e17055;
}

.custom-pricing-table .plan-footer {
  position: relative;
  z-index: 2;
}

.custom-pricing-table .plan-button {
  width: 100%;
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6c5ce7, #a55eea);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.custom-pricing-table .plan-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.custom-pricing-table .plan-button:hover::before {
  left: 100%;
}

.custom-pricing-table .plan-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(108, 92, 231, 0.4);
}

@media (max-width: 768px) {
  .custom-pricing-table .pricing-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .custom-pricing-table .pricing-plan.featured {
    transform: none;
  }
  
  .custom-pricing-table .pricing-plan.featured:hover {
    transform: translateY(-15px);
  }
  
  .custom-pricing-table .pricing-plan {
    padding: 30px 20px;
  }
  
  .custom-pricing-table .amount {
    font-size: 48px;
  }
}`;class qp extends L{constructor(){super(...arguments);r(this,"name","Custom Pricing Table");r(this,"contentCategories",["flow"]);r(this,"html",Gp);r(this,"css",_p);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(gu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["custom-pricing-table"])}matcher(t){return D(t,"custom-pricing-table")}}const Wp=ds(a.jsx("path",{d:"M 20 2 L 4 2 C 2.894531 2 2 2.894531 2 4 L 2 20 C 2 21.105469 2.894531 22 4 22 L 20 22 C 21.105469 22 22 21.105469 22 20 L 22 4 C 22 2.894531 21.105469 2 20 2 Z M 8 10 L 4 10 L 4 8 L 8 8 Z M 19 10 L 11 10 L 11 8 L 19 8 Z M 20 11 L 10 11 L 10 7 L 20 7 Z M 8 16 L 4 16 L 4 14 L 8 14 Z M 19 16 L 11 16 L 11 14 L 19 14 Z M 20 17 L 10 17 L 10 13 L 20 13 Z "}),"FormElOutlined"),Xp=`<form method="POST" action="default-form-handler">
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Name</label>
        <input
          class="form-control"
          id="name"
          name="name"
          type="text"
          placeholder="Name"
          required="required"
          data-validation-required-message="Please enter your name."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Email Address</label>
        <input
          class="form-control"
          id="email"
          name="email"
          type="email"
          placeholder="Email Address"
          required="required"
          data-validation-required-message="Please enter your email address."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Phone Number</label>
        <input
          class="form-control"
          id="phone"
          name="phone"
          type="tel"
          placeholder="Phone Number"
          required="required"
          data-validation-required-message="Please enter your phone number."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Message</label>
        <textarea
          class="form-control"
          id="message"
          name="message"
          rows="5"
          placeholder="Message"
          required="required"
          data-validation-required-message="Please enter a message."
        ></textarea>
      </div>
    </div>
    <div class="form-group"><button class="btn btn-primary btn-xl" type="submit">Send</button></div>
  </form>`;class Yp extends L{constructor(){super(...arguments);r(this,"name","form");r(this,"contentCategories",["flow"]);r(this,"html",Xp);r(this,"allowedContent",["flow"]);r(this,"category","forms");r(this,"icon",a.jsx(Wp,{}));r(this,"specificity",3);r(this,"controls",[new ze({label:"Layout",type:Ne.Select,options:[{key:"Basic",value:"form-default"},{key:"Horizontal",value:"form-horizontal"},{key:"Inline",value:"form-inline"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}}),new ze({label:"Action",type:Ne.Input,defaultValue(t){return t.getAttribute("action")??""},onChange(t,s,i){G().executeMutation(new ot(t,{action:s||(i!=null&&i.lastInSession?"default-form-handler":"")}),i)}})]);r(this,"hiddenClasses",["form-default","form-horizontal","form-inline"])}matcher(t){return t.nodeName==="FORM"}}const Jp=`<header class="image-header">
<h3>Welcome to our studio!</h3>
    <h1>It's nice to meet you</h1>
    <p><a class="btn btn-primary btn-lg" role="button">Tell me more</a></p>
</header>`,$p=`
.image-header {
    background-image: url(/images/builder/header-bg.jpg);
    background-position: center center;
    background-size: cover;
    text-align: center;
    padding: 300px 0 200px;
    color: #fff;
}

.image-header > h1 {
    font-size: 75px;
    font-weight: 700;
    margin-bottom: 50px;
    text-transform: uppercase;
}

.image-header > h3 {
    font-size: 40px;
    margin-bottom: 25px;
    font-style: italic;
}

.image-header > .btn-lg {
    padding: 20px 40px;
    font-size: 18px;
}
`;class Zp extends L{constructor(){super(...arguments);r(this,"name","image header");r(this,"contentCategories",["flow"]);r(this,"html",Jp);r(this,"css",$p);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(ws,{}));r(this,"specificity",3)}matcher(t){return D(t,"image-header")}}const em=`<div class="jumbotron">
<h1 class="display-4">Hello, world!</h1>
<p class="lead">This is a simple hero unit, a simple jumbotron-style component for calling extra attention to featured content or information.</p>
<hr class="my-4">
<p>It uses utility classes for typography and spacing to space content out within the larger container.</p>
<a class="btn btn-primary btn-lg" href="#" role="button">Learn more</a>
</div>`,tm=`
.jumbotron {
    text-align: center;
}

.jumbotron p {
    margin: 20px 0 30px;
}
`;class Am extends L{constructor(){super(...arguments);r(this,"name","jumbotron");r(this,"contentCategories",["flow"]);r(this,"html",em);r(this,"css",tm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(Eo,{}));r(this,"specificity",3);r(this,"hiddenClasses",["jumbotron"])}matcher(t){return D(t,"jumbotron")}}const am=`<div class="container">
  <div class="row">
    <div class="material-box col-xs-12 col-sm-6 col-md-6 col-lg-6">
      <div class="box">
        <div class="box-icon">
          <span class="fa fa-4x fa-html5"></span>
        </div>
        <div class="info">
          <h4 class="text-center">Title</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti atque, tenetur quam
            aspernatur corporis at explicabo nulla dolore necessitatibus doloremque exercitationem
            sequi dolorem architecto perferendis quas aperiam debitis dolor soluta!
          </p>
          <a href="" class="btn">Link</a>
        </div>
      </div>
    </div>

    <div class="material-box col-xs-12 col-sm-6 col-md-6 col-lg-6">
      <div class="box">
        <div class="box-icon">
          <span class="fa fa-4x fa-css3"></span>
        </div>
        <div class="info">
          <h4 class="text-center">Title</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti atque, tenetur quam
            aspernatur corporis at explicabo nulla dolore necessitatibus doloremque exercitationem
            sequi dolorem architecto perferendis quas aperiam debitis dolor soluta!
          </p>
          <a href="" class="btn">Link</a>
        </div>
      </div>
    </div>
  </div>
</div>`,sm=`
.material-box .box {
  border-radius: 3px;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
  padding: 10px 25px;
  text-align: right;
  display: block;
  margin-top: 60px;
}
.material-box .box-icon {
  background-color: #57a544;
  border-radius: 50%;
  display: table;
  height: 100px;
  margin: 0 auto;
  width: 100px;
  margin-top: -61px;
}
.material-box .box-icon span {
  color: #fff;
  display: table-cell;
  text-align: center;
  vertical-align: middle;
}
.material-box .info h4 {
  font-size: 26px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.material-box .info > p {
  color: #717171;
  font-size: 16px;
  padding-top: 10px;
  text-align: justify;
}
.material-box .info > a {
  background-color: #03a9f4;
  border-radius: 2px;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  transition: all 0.5s ease 0s;
}
.material-box .info > a:hover {
  background-color: #0288d1;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.16), 0 2px 5px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  transition: all 0.5s ease 0s;
}
`;class im extends L{constructor(){super(...arguments);r(this,"name","material box");r(this,"contentCategories",["flow"]);r(this,"html",am);r(this,"css",sm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(pu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["material-box"])}matcher(t){return D(t,"material-box")}}const nm=`<div class="media">
  <a class="media-left" href="#">
    <img src="/images/builder/placeholder.svg" />
  </a>
  <div class="media-body">
    <h2 class="media-heading">Media heading</h2>
    <p>
      Cras sit amet nibh libero, in gravida nulla. Nulla vel metus scelerisque ante sollicitudin
      commodo. Cras purus odio, vestibulum in vulputate at, tempus viverra turpis. Fusce condimentum
      nunc ac nisi vulputate fringilla. Donec lacinia congue felis in faucibus.
    </p>
    <p>
      Cras sit amet nibh libero, in gravida nulla. Nulla vel metus scelerisque ante sollicitudin
      commodo. Cras purus odio, vestibulum in vulputate at, tempus viverra turpis. Fusce condimentum
      nunc ac nisi vulputate fringilla. Donec lacinia congue felis in faucibus.
    </p>
    <p>
      Cras sit amet nibh libero, in gravida nulla. Nulla vel metus scelerisque ante sollicitudin
      commodo. Cras purus odio, vestibulum in vulputate at, tempus viverra turpis. Fusce condimentum
      nunc ac nisi vulputate fringilla. Donec lacinia congue felis in faucibus.
    </p>
  </div>
</div>`;class rm extends L{constructor(){super(...arguments);r(this,"name","media object");r(this,"contentCategories",["flow"]);r(this,"html",nm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(mu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["media"])}matcher(t){return D(t,"media")}}const om=`<nav class="navbar navbar-expand-lg navbar-light bg-light">
<a class="navbar-brand" href="#">Architect</a>
<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
<span class="navbar-toggler-icon"></span>
</button>

<div class="collapse navbar-collapse" id="navbarSupportedContent">
<ul class="navbar-nav mr-auto">
<li class="nav-item active">
<a class="nav-link" href="#">Home <span class="sr-only">(current)</span></a>
</li>
<li class="nav-item">
<a class="nav-link" href="#portfolio">Portfolio</a>
</li>
<li class="nav-item">
<a class="nav-link" href="#about">About Us</a>
</li>
<li class="nav-item">
<a class="nav-link" href="#team">Team</a>
</li>
<li class="nav-item dropdown">
<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
Dropdown
</a>
<div class="dropdown-menu" aria-labelledby="navbarDropdown">
<a class="dropdown-item" href="#">Action</a>
<a class="dropdown-item" href="#">Another action</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item" href="#">Something else here</a>
</div>
</li>
</ul>
</div>
</nav>`;class lm extends L{constructor(){super(...arguments);r(this,"name","navbar");r(this,"contentCategories",["flow"]);r(this,"html",om);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(Zc,{}));r(this,"specificity",3);r(this,"hiddenClasses",["navbar","navbar-default","navbar-fixed-top"]);r(this,"controls",[new ze({label:"Type",type:Ne.Select,options:[{key:"default",value:"navbar-default"},{key:"fixed top",value:"navbar-fixed-top"}],defaultValue(t){return(this.options.find(i=>t.classList.contains(i.value))||this.options[0]).value},onChange(t,s){var n;const i=(n=this.options.find(o=>t.classList.contains(o.value)))==null?void 0:n.value;G().executeMutation(new Pt(t,s,i??""),{lastInSession:!0})}})])}matcher(t){return D(t,"navbar")}}const cm=`<div class="row pricing-table">
  <div class="col-sm-4">
    <div class="panel panel-success">
      <div class="panel-heading">Basic</div>
      <div class="panel-body">
        <h2>
          <div class="price"><span class="dollar-sign">$</span>5</div>
          <span class="time-period">/ MO</span>
        </h2>
      </div>

      <ul class="list-group">
        <li class="list-group-item"><i class="fa fa-check text-success"></i> 10GB Storage</li>
        <li class="list-group-item"><i class="fa fa-check text-success"></i>All Themes</li>
        <li class="list-group-item"><i class="fa fa-times text-danger"></i> Access to Tutorials</li>
        <li class="list-group-item"><i class="fa fa-times text-danger"></i> Auto Backup</li>
        <li class="list-group-item"><i class="fa fa-times text-danger"></i> Extended Security</li>
      </ul>

      <button class="btn btn-success">sign up</button>
    </div>
  </div>
  <div class="col-sm-4">
    <div class="panel panel-danger">
      <div class="panel-heading">Intermediate</div>
      <div class="panel-body">
        <h2>
          <div class="price"><span class="dollar-sign">$</span>15</div>
          <span class="time-period">/ MO</span>
        </h2>
      </div>

      <ul class="list-group">
        <li class="list-group-item"><i class="fa fa-check text-success"></i> 50GB Storage</li>
        <li class="list-group-item"><i class="fa fa-check text-success"></i>All Themes</li>
        <li class="list-group-item">
          <i class="fa fa-check text-success"></i> Access to Tutorials
        </li>
        <li class="list-group-item"><i class="fa fa-times text-success"></i> Auto Backup</li>
        <li class="list-group-item"><i class="fa fa-times text-success"></i> Extended Security</li>
      </ul>

      <button class="btn btn-danger">sign up</button>
    </div>
  </div>
  <div class="col-sm-4">
    <div class="panel panel-info">
      <div class="panel-heading">Advanced</div>
      <div class="panel-body">
        <h2>
          <div class="price"><span class="dollar-sign">$</span>99</div>
          <span class="time-period">/ MO</span>
        </h2>
      </div>

      <ul class="list-group">
        <li class="list-group-item"><i class="fa fa-check text-success"></i> 100GB Storage</li>
        <li class="list-group-item"><i class="fa fa-check text-success"></i>All Themes</li>
        <li class="list-group-item">
          <i class="fa fa-check text-success"></i> Access to Tutorials
        </li>
        <li class="list-group-item"><i class="fa fa-check text-success"></i> Auto Backup</li>
        <li class="list-group-item"><i class="fa fa-check text-success"></i> Extended Security</li>
      </ul>

      <button class="btn btn-info">sign up</button>
    </div>
  </div>
</div>`,dm=`
.pricing-table .panel-heading {
    text-align: center;
    text-transform: uppercase;
    font-weight: bold;
}

.pricing-table .panel-body {
    background-color: #3F3F3F;
    color: #fff;
    text-align: center;
}

.pricing-table .panel-body .price {
    font-size: 40px;
    display: inline-block;
}

.pricing-table .price > .dollar-sign {
    vertical-align: super;
    font-size: 16px;
}

.pricing-table .time-period {
    color: #9f9f9f;
    font-size: 15px;
    font-weight: lighter;
}

.pricing-table .list-group {
    padding: 0 15px;
}

.pricing-table .list-group > .list-group-item {
    border-style: dotted;
    text-align: center;
    color: #808080;
}

.pricing-table .list-group-item > .fa {
    font-size: 13px;
    margin-right: 5px;
}

.pricing-table .btn {
    display: block;
    text-transform: uppercase;
    margin: 30px auto 20px;
    padding: 13px 35px 13px 35px;
    border-radius: 4px;
}
`;class um extends L{constructor(){super(...arguments);r(this,"name","pricing table");r(this,"contentCategories",["flow"]);r(this,"html",cm);r(this,"css",dm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(hu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["pricing-table"])}matcher(t){return D(t,"pricing-table")}}const gm=`<div class="services-list">
<div class="row">
    <div class="col-lg-3 col-md-6">
        <div class="service-box">
            <div class="service-icon"><i class="fa fa-lightbulb-o"></i></div>
            <h4>Generating ideas</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
        </div>
    </div>

    <div class="col-lg-3 col-md-6">
       <div class="service-box">
            <div class="service-icon"><i class="fa fa-keyboard-o"></i></div>
            <h4>Prototype Model</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
       </div>
    </div>

    <div class="col-lg-3 col-md-6">
       <div class="service-box">
            <div class="service-icon"><i class="fa fa-code"></i></div>
            <h4>Design and Code</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
       </div>
    </div>

    <div class="col-lg-3 col-md-6">
        <div class="service-box">
            <div class="service-icon"><i class="fa fa-rocket"></i></div>
            <h4>Launching and Monitoring</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
        </div>
    </div>
</div>
</div>`,pm=`
.services-list {
    text-align: center;
    background-color: #FCFCFC;
    padding: 30px;
    border: 1px solid #e0eded;
}

.services-list .service-box {
    background-color: #fff;
    border: 1px solid #e0eded;
    padding: 15px 0;
}

.services-list .service-icon {
    text-align: center;
    padding: 10px 0;
}

.services-list .fa {
    font-size: 64px;
}
`;class mm extends L{constructor(){super(...arguments);r(this,"name","service list");r(this,"contentCategories",["flow"]);r(this,"html",gm);r(this,"css",pm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(fu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["services-list"])}matcher(t){return D(t,"services-list")}}const hm=`<div class="row skills-list">
<div class="col-md-4">
    <div>
      <img src="/images/builder/placeholder.svg" alt="Texto Alternativo" class="img-circle img-thumbnail">
      <h2>Webdesigner</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <a href="#" class="btn btn-primary" title="See more">See works »</a>
    </div>
  </div>
  <div class="col-md-4">
    <div>
      <img src="/images/builder/placeholder.svg" alt="Texto Alternativo" class="img-circle img-thumbnail">
      <h2>Photographer</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <a href="#" class="btn btn-primary" title="See more">See works »</a>
    </div>
  </div>
  <div class="col-md-4">
    <div>
      <img src="/images/builder/placeholder.svg" alt="Texto Alternativo" class="img-circle img-thumbnail">
      <h2>Copywriter</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <a href="#" class="btn btn-primary" title="See more">See works »</a>
    </div>
  </div>
</div>`,fm=`
.skills-list {
    padding: 20px 0;
    text-align: center;
}
.skills-list > div > div{
    padding: 10px;
    border: 1px solid transparent;
    border-radius: 4px;
    transition: 0.2s;
}
.skills-list > div:hover > div{
    margin-top: -10px;
    border: 1px solid rgb(200, 200, 200);
    box-shadow: rgba(0, 0, 0, 0.1) 0px 5px 5px 2px;
    background: rgba(200, 200, 200, 0.1);
    transition: 0.5s;
}

.skills-list > div:hover img {
    border-radius: 50%;
    -webkit-transform: rotate(360deg);
    -moz-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    -ms-transform: rotate(360deg);
    transform: rotate(360deg);
}
`;class xm extends L{constructor(){super(...arguments);r(this,"name","skill list");r(this,"contentCategories",["flow"]);r(this,"html",hm);r(this,"css",fm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(xu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["skills-list"])}matcher(t){return D(t,"skills-list")}}const bm=`<div class="stats-counter">
  <div class="stats-container">
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-users"></i>
      </div>
      <div class="stat-number" data-target="1250">1250</div>
      <div class="stat-label">Happy Clients</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-briefcase"></i>
      </div>
      <div class="stat-number" data-target="350">350</div>
      <div class="stat-label">Projects Completed</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-code"></i>
      </div>
      <div class="stat-number" data-target="50000">50000</div>
      <div class="stat-label">Lines of Code</div>
    </div>
    <div class="stat-item">
      <div class="stat-icon">
        <i class="fa fa-trophy"></i>
      </div>
      <div class="stat-number" data-target="25">25</div>
      <div class="stat-label">Awards Won</div>
    </div>
  </div>
</div>`,wm=`.stats-counter {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 0;
  position: relative;
  overflow: hidden;
}

.stats-counter::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
}

.stats-counter .stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.stats-counter .stat-item {
  text-align: center;
  color: white;
  background: rgba(255, 255, 255, 0.1);
  padding: 40px 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stats-counter .stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.stats-counter .stat-item:hover::before {
  left: 100%;
}

.stats-counter .stat-item:hover {
  transform: translateY(-10px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.stats-counter .stat-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: #ffd700;
  position: relative;
  z-index: 2;
}

.stats-counter .stat-number {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 10px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  font-family: 'Arial', sans-serif;
  position: relative;
  z-index: 2;
}

.stats-counter .stat-label {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  z-index: 2;
}

@media (max-width: 768px) {
  .stats-counter .stats-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .stats-counter .stat-item {
    padding: 30px 15px;
  }
  
  .stats-counter .stat-icon {
    font-size: 36px;
    margin-bottom: 15px;
  }
  
  .stats-counter .stat-number {
    font-size: 36px;
  }
  
  .stats-counter .stat-label {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .stats-counter .stats-container {
    grid-template-columns: 1fr;
  }
}`;class Bm extends L{constructor(){super(...arguments);r(this,"name","Stats Counter");r(this,"contentCategories",["flow"]);r(this,"html",bm);r(this,"css",wm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(bu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["stats-counter"])}matcher(t){return D(t,"stats-counter")}}const vm=`<div class="team-member">
  <div class="member-card">
    <div class="member-image">
      <img src="/images/builder/placeholder.svg" alt="Team Member">
      <div class="member-overlay">
        <div class="social-links">
          <a href="#" class="social-link">
            <i class="fa fa-facebook"></i>
          </a>
          <a href="#" class="social-link">
            <i class="fa fa-twitter"></i>
          </a>
          <a href="#" class="social-link">
            <i class="fa fa-linkedin"></i>
          </a>
        </div>
      </div>
    </div>
    <div class="member-info">
      <h3 class="member-name">John Doe</h3>
      <p class="member-position">Senior Developer</p>
      <p class="member-description">Passionate about creating amazing user experiences and building scalable applications.</p>
      <div class="member-skills">
        <span class="skill-tag">React</span>
        <span class="skill-tag">Node.js</span>
        <span class="skill-tag">TypeScript</span>
      </div>
    </div>
  </div>
</div>`,Cm=`.team-member {
  max-width: 350px;
  margin: 0 auto;
}

.team-member .member-card {
  background: #fff;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.team-member .member-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.team-member .member-image {
  position: relative;
  overflow: hidden;
  height: 280px;
}

.team-member .member-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.team-member .member-card:hover .member-image img {
  transform: scale(1.1);
}

.team-member .member-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 110, 253, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.team-member .member-card:hover .member-overlay {
  opacity: 1;
}

.team-member .social-links {
  display: flex;
  gap: 15px;
}

.team-member .social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.team-member .social-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.team-member .member-info {
  padding: 30px 25px;
  text-align: center;
}

.team-member .member-name {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
  margin: 0 0 8px 0;
}

.team-member .member-position {
  font-size: 16px;
  color: #0d6efd;
  font-weight: 600;
  margin: 0 0 15px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.team-member .member-description {
  font-size: 14px;
  line-height: 1.6;
  color: #6c757d;
  margin: 0 0 20px 0;
}

.team-member .member-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.team-member .skill-tag {
  background: #f8f9fa;
  color: #495057;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.team-member .skill-tag:hover {
  background: #0d6efd;
  color: white;
  border-color: #0d6efd;
}`;class il extends L{constructor(){super(...arguments);r(this,"name","Team Member");r(this,"contentCategories",["flow"]);r(this,"html",vm);r(this,"css",Cm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(no,{}));r(this,"specificity",3);r(this,"hiddenClasses",["team-member"])}matcher(t){return D(t,"team-member")}}const ym=`<div class="testimonial-slider">
  <div class="testimonial-container">
    <div class="testimonial-slide active">
      <div class="testimonial-content">
        <div class="quote-icon">
          <i class="fa fa-quote-left"></i>
        </div>
        <p class="testimonial-text">
          "This company exceeded all our expectations. The quality of work and attention to detail was outstanding. I would highly recommend their services to anyone looking for professional excellence."
        </p>
        <div class="testimonial-author">
          <img src="/images/builder/placeholder.svg" alt="Author" class="author-image">
          <div class="author-info">
            <h4 class="author-name">Sarah Johnson</h4>
            <p class="author-title">CEO, Tech Solutions Inc.</p>
            <div class="rating">
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="testimonial-slide">
      <div class="testimonial-content">
        <div class="quote-icon">
          <i class="fa fa-quote-left"></i>
        </div>
        <p class="testimonial-text">
          "Working with this team was an absolute pleasure. They delivered our project on time and within budget, while maintaining the highest standards of quality throughout the process."
        </p>
        <div class="testimonial-author">
          <img src="/images/builder/placeholder.svg" alt="Author" class="author-image">
          <div class="author-info">
            <h4 class="author-name">Michael Chen</h4>
            <p class="author-title">Founder, Digital Innovations</p>
            <div class="rating">
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
              <i class="fa fa-star"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="testimonial-controls">
      <button class="prev-btn" onclick="previousSlide()">
        <i class="fa fa-chevron-left"></i>
      </button>
      <div class="testimonial-dots">
        <span class="dot active" onclick="currentSlide(1)"></span>
        <span class="dot" onclick="currentSlide(2)"></span>
      </div>
      <button class="next-btn" onclick="nextSlide()">
        <i class="fa fa-chevron-right"></i>
      </button>
    </div>
  </div>
</div>`,Qm=`.testimonial-slider {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 80px 20px;
  position: relative;
  overflow: hidden;
}

.testimonial-slider::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%);
}

.testimonial-slider .testimonial-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.testimonial-slider .testimonial-slide {
  display: none;
  text-align: center;
  background: white;
  border-radius: 20px;
  padding: 50px 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.testimonial-slider .testimonial-slide::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.testimonial-slider .testimonial-slide.active {
  display: block;
  animation: fadeIn 0.6s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.testimonial-slider .testimonial-content {
  position: relative;
  z-index: 2;
}

.testimonial-slider .quote-icon {
  font-size: 48px;
  color: #6c5ce7;
  margin-bottom: 30px;
  opacity: 0.3;
}

.testimonial-slider .testimonial-text {
  font-size: 20px;
  line-height: 1.8;
  color: #2d3436;
  margin-bottom: 40px;
  font-style: italic;
  position: relative;
}

.testimonial-slider .testimonial-author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.testimonial-slider .author-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #6c5ce7;
  box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3);
}

.testimonial-slider .author-info {
  text-align: left;
}

.testimonial-slider .author-name {
  font-size: 20px;
  font-weight: 700;
  color: #2d3436;
  margin: 0 0 5px 0;
}

.testimonial-slider .author-title {
  font-size: 16px;
  color: #636e72;
  margin: 0 0 10px 0;
}

.testimonial-slider .rating {
  display: flex;
  gap: 3px;
}

.testimonial-slider .rating i {
  color: #fdcb6e;
  font-size: 16px;
}

.testimonial-slider .testimonial-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 40px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.testimonial-slider .prev-btn,
.testimonial-slider .next-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.testimonial-slider .prev-btn:hover,
.testimonial-slider .next-btn:hover {
  background: #5f39d9;
  transform: scale(1.1);
}

.testimonial-slider .testimonial-dots {
  display: flex;
  gap: 15px;
}

.testimonial-slider .dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
}

.testimonial-slider .dot.active {
  background: #6c5ce7;
  transform: scale(1.2);
}

.testimonial-slider .dot:hover {
  background: #6c5ce7;
}

@media (max-width: 768px) {
  .testimonial-slider .testimonial-slide {
    padding: 30px 25px;
  }
  
  .testimonial-slider .testimonial-text {
    font-size: 18px;
  }
  
  .testimonial-slider .testimonial-author {
    flex-direction: column;
    text-align: center;
  }
  
  .testimonial-slider .author-info {
    text-align: center;
  }
  
  .testimonial-slider .author-image {
    width: 60px;
    height: 60px;
  }
}`;class nl extends L{constructor(){super(...arguments);r(this,"name","Testimonial Slider");r(this,"contentCategories",["flow"]);r(this,"html",ym);r(this,"css",Qm);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(on,{}));r(this,"specificity",3);r(this,"hiddenClasses",["testimonial-slider"])}matcher(t){return D(t,"testimonial-slider")}}const Fm=`<div class="user-profile">
<div class="col-md-8 col-lg-6">
<div class="well profile">
<div class="col-sm-12">
<div class="col-xs-12 col-sm-8">
<h2>Nicole Pearson</h2>
<p><strong>About: </strong> Web Designer / UI. </p>
<p><strong>Hobbies: </strong> Read, out with friends, listen to music, draw and learn new things. </p>
<p><strong>Skills: </strong>
<span class="label label-success">html5</span>
<span class="label label-success">css3</span>
<span class="label label-success">jquery</span>
<span class="label label-success">bootstrap3</span>
</p>
</div>
<div class="col-xs-12 col-sm-4 text-center">
<figure>
<img src="/images/builder/placeholder.svg" alt="" class="img-circle img-responsive">
<figcaption class="ratings">
<p>Ratings
<a href="#">
<span class="fa fa-star"></span>
</a>
<a href="#">
<span class="fa fa-star"></span>
</a>
<a href="#">
<span class="fa fa-star"></span>
</a>
<a href="#">
<span class="fa fa-star"></span>
</a>
<a href="#">
<span class="fa fa-star-o"></span>
</a>
</p>
</figcaption>
</figure>
</div>
</div>
<div class="col-xs-12 divider text-center">
<div class="col-xs-12 col-sm-4 emphasis">
<h2><strong> 20,7K </strong></h2>
<p><small>Followers</small></p>
<button class="btn btn-success btn-block"><span class="fa fa-plus-circle"></span> Follow </button>
</div>
<div class="col-xs-12 col-sm-4 emphasis">
<h2><strong>245</strong></h2>
<p><small>Following</small></p>
<button class="btn btn-info btn-block"><span class="fa fa-user"></span> View Profile </button>
</div>
<div class="col-xs-12 col-sm-4 emphasis">
<h2><strong>43</strong></h2>
<p><small>Snippets</small></p>
<button class="btn btn-primary btn-block"><span class="fa fa-gears"></span> Options </button>
</div>
</div>
</div>
</div>
</div>`,km=`
.profile {
    min-height: 355px;
    display: inline-block;
}
.profile figcaption.ratings{
    margin-top:20px;
}
.profile figcaption.ratings a
{    color:#f1c40f;
    font-size:11px;
}
.profile figcaption.ratings a:hover
{    color:#f39c12;
    text-decoration:none;
}
.profile .divider {
    border-top:1px solid rgba(0,0,0,0.1);
}
.profile .emphasis {
    border-top: 4px solid transparent;
}
.profile .emphasis:hover {
    border-top: 4px solid #1abc9c;
}
.profile .emphasis h2 {
    margin-bottom:0;
}
.profile .label {
    font-weight: bold;
    padding: 3px 6px;
    font-size: 11.5px;
}
`;class rl extends L{constructor(){super(...arguments);r(this,"name","user profile");r(this,"contentCategories",["flow"]);r(this,"html",Fm);r(this,"css",km);r(this,"allowedContent",["flow"]);r(this,"category","components");r(this,"icon",a.jsx(Io,{}));r(this,"specificity",3);r(this,"hiddenClasses",["profile"])}matcher(t){return D(t,"user-profile")}}const Um=`<div class="company-field">
  <label class="form-label">Company/Organization</label>
  <input type="text" class="form-control company-input" name="company" placeholder="Enter company or organization name" autocomplete="organization">
  <small class="text-muted">Optional: Enter your company or organization name</small>
</div>

<style>
.company-field {
  margin: 20px 0;
}

.company-field .form-label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.company-field .company-input {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.company-field .company-input:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: 0;
}

.company-field .company-input::placeholder {
  color: #6c757d;
  font-style: italic;
}

.company-field small {
  display: block;
  margin-top: 5px;
  font-size: 0.875rem;
}

/* Validation styles */
.company-field .company-input:invalid {
  border-color: #dc3545;
}

.company-field .company-input:valid {
  border-color: #28a745;
}
</style>

<script>
function initializeCompanyFields() {
  const companyFields = document.querySelectorAll('.company-input');
  
  companyFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Add input validation and formatting
      field.addEventListener('input', function() {
        // Trim whitespace and capitalize first letters
        const value = this.value.trim();
        if (value) {
          // Capitalize first letter of each word for better presentation
          const formatted = value.replace(/\bw/g, l => l.toUpperCase());
          if (formatted !== this.value) {
            this.value = formatted;
          }
        }
      });
      
      // Add autocomplete suggestions for common company types
      field.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && this.value.length > 0) {
          const value = this.value.toLowerCase();
          const suggestions = [
            'LLC', 'Inc.', 'Corp.', 'Ltd.', 'Co.', 'Corporation', 
            'Limited', 'Company', 'Incorporated', 'Group'
          ];
          
          // Auto-suggest company suffixes
          const suggestion = suggestions.find(s => 
            !value.includes(s.toLowerCase()) && 
            value.match(/\bw+$/)
          );
          
          if (suggestion && !value.endsWith('.') && !value.endsWith('inc') && !value.endsWith('llc')) {
            // Don't auto-suggest, let user type naturally
          }
        }
      });
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCompanyFields);
} else {
  initializeCompanyFields();
}

// Export for manual initialization
window.initializeCompanyFields = initializeCompanyFields;
<\/script>`;class jm extends L{constructor(){super(...arguments);r(this,"name","Company Field");r(this,"contentCategories",["flow"]);r(this,"html",Um);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(wu,{}));r(this,"specificity",4);r(this,"hiddenClasses",["company-field"])}matcher(t){return D(t,"company-field")}}const Em=`<div class="contact-form-component">
  <div class="form-container">
    <div class="form-header">
      <h2>Get In Touch</h2>
      <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
    </div>
    
    <form class="contact-form" action="/contact" method="POST">
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">First Name *</label>
          <input type="text" id="firstName" name="first_name" required>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name *</label>
          <input type="text" id="lastName" name="last_name" required>
        </div>
      </div>
      
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" name="email" required>
      </div>
      
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone">
      </div>
      
      <div class="form-group">
        <label for="subject">Subject *</label>
        <select id="subject" name="subject" required>
          <option value="">Select a subject</option>
          <option value="general">General Inquiry</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="5" required placeholder="Tell us about your project or inquiry..."></textarea>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="newsletter" name="newsletter" value="1">
          <span class="checkmark"></span>
          Subscribe to our newsletter for updates and tips
        </label>
      </div>
      
      <div class="form-group">
        <button type="submit" class="submit-btn">
          <span class="btn-text">Send Message</span>
          <span class="btn-loader" style="display: none;">Sending...</span>
        </button>
      </div>
    </form>
    
    <div class="success-message" style="display: none;">
      <div class="success-icon">✓</div>
      <h3>Thank You!</h3>
      <p>Your message has been sent successfully. We'll get back to you soon.</p>
    </div>
  </div>
  
  <script>
    window.ContactForm = {
      init: function() {
        const forms = document.querySelectorAll('.contact-form');
        forms.forEach(form => this.setupForm(form));
      },
      
      setupForm: function(form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit(form);
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          input.addEventListener('blur', () => this.validateField(input));
          input.addEventListener('input', () => this.clearErrors(input));
        });
      },
      
      validateField: function(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        // Remove existing error
        this.clearErrors(field);
        
        if (field.required && !value) {
          isValid = false;
          message = 'This field is required';
        } else if (field.type === 'email' && value) {
          const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
          if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
          }
        } else if (field.type === 'tel' && value) {
          const phoneRegex = /^[+]?[1-9][d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[s-()]/g, ''))) {
            isValid = false;
            message = 'Please enter a valid phone number';
          }
        }
        
        if (!isValid) {
          this.showFieldError(field, message);
        }
        
        return isValid;
      },
      
      showFieldError: function(field, message) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
      },
      
      clearErrors: function(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
          errorElement.remove();
        }
      },
      
      handleSubmit: function(form) {
        const formData = new FormData(form);
        let isFormValid = true;
        
        // Validate all fields
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          if (!this.validateField(input)) {
            isFormValid = false;
          }
        });
        
        if (!isFormValid) {
          return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        // Simulate form submission (replace with actual endpoint)
        setTimeout(() => {
          this.showSuccess(form);
          this.resetForm(form);
        }, 1500);
      },
      
      showSuccess: function(form) {
        const container = form.closest('.form-container');
        const successMessage = container.querySelector('.success-message');
        
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          form.style.display = 'block';
          successMessage.style.display = 'none';
        }, 5000);
      },
      
      resetForm: function(form) {
        form.reset();
        
        // Reset button state
        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        
        // Clear any remaining errors
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => this.clearErrors(input));
      }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.ContactForm.init();
      });
    } else {
      window.ContactForm.init();
    }
  <\/script>
</div>`,Im=`.contact-form-component {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.contact-form-component .form-container {
  padding: 40px;
}

.contact-form-component .form-header {
  text-align: center;
  margin-bottom: 40px;
}

.contact-form-component .form-header h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.contact-form-component .form-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
  line-height: 1.5;
}

.contact-form-component .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.contact-form-component .form-group {
  margin-bottom: 24px;
}

.contact-form-component label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
}

.contact-form-component input,
.contact-form-component textarea,
.contact-form-component select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  background: #ffffff;
  color: #2c3e50;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.contact-form-component input:focus,
.contact-form-component textarea:focus,
.contact-form-component select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.contact-form-component input.error,
.contact-form-component textarea.error,
.contact-form-component select.error {
  border-color: #e74c3c;
}

.contact-form-component .error-message {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.contact-form-component textarea {
  resize: vertical;
  min-height: 120px;
}

.contact-form-component .checkbox-group {
  margin: 24px 0;
}

.contact-form-component .checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  line-height: 1.4;
}

.contact-form-component .checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  opacity: 0;
  position: absolute;
}

.contact-form-component .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #e1e8ed;
  border-radius: 4px;
  background: #ffffff;
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s ease;
}

.contact-form-component .checkbox-label input:checked + .checkmark {
  background: #3498db;
  border-color: #3498db;
}

.contact-form-component .checkbox-label input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.contact-form-component .submit-btn {
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.contact-form-component .submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5dade2, #3498db);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
}

.contact-form-component .submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.contact-form-component .success-message {
  text-align: center;
  padding: 40px 20px;
}

.contact-form-component .success-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
  font-size: 24px;
  color: white;
  font-weight: bold;
}

.contact-form-component .success-message h3 {
  margin: 0 0 12px 0;
  color: #27ae60;
  font-size: 24px;
}

.contact-form-component .success-message p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

@media (max-width: 768px) {
  .contact-form-component .form-container {
    padding: 24px;
  }
  
  .contact-form-component .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .contact-form-component .form-header h2 {
    font-size: 24px;
  }
  
  .contact-form-component .form-header {
    margin-bottom: 30px;
  }
}`;class Sm extends L{constructor(){super(...arguments);r(this,"name","Contact Form");r(this,"contentCategories",["flow"]);r(this,"html",Em);r(this,"css",Im);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(bA,{}));r(this,"specificity",3);r(this,"hiddenClasses",["contact-form-component"])}matcher(t){return D(t,"contact-form-component")}}const Hm=`<div class="form-group">
  <label for="browsers">Choose a browser:</label>
  <input list="browsers" name="browser" class="form-control" id="browser">
  <datalist id="browsers">
    <option value="Chrome">
    <option value="Firefox">
    <option value="Safari">
    <option value="Edge">
    <option value="Opera">
  </datalist>
</div>`;class Lm extends L{constructor(){super(...arguments);r(this,"name","Datalist");r(this,"html",Hm);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["option"]);r(this,"category","forms");r(this,"icon",a.jsx(Bu,{}));r(this,"specificity",2)}matcher(t){return t.querySelector("datalist")!==null}}const Nm=`<div class="date-signed-field">
  <label class="form-label">Date Signed</label>
  <input type="text" class="form-control date-signed-input" readonly placeholder="Date will appear when signed" style="background-color: #f8f9fa;">
  <small class="text-muted">Automatically filled when document is signed</small>
</div>

<style>
.date-signed-field {
  margin: 20px 0;
}

.date-signed-field .date-signed-input {
  background-color: #f8f9fa !important;
  cursor: not-allowed;
}

.date-signed-field .form-label {
  font-weight: 600;
  color: #495057;
}
</style>

<script>
function initializeDateSignedFields() {
  const dateFields = document.querySelectorAll('.date-signed-input');
  
  dateFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Set current date when field becomes visible or when signing event occurs
      const setCurrentDate = () => {
        const now = new Date();
        field.value = now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      // Listen for custom signing events
      document.addEventListener('documentSigned', setCurrentDate);
      
      // Auto-populate if this is in a preview/test environment
      if (window.location.href.includes('preview') || field.closest('.architect-canvas')) {
        setTimeout(setCurrentDate, 100);
      }
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDateSignedFields);
} else {
  initializeDateSignedFields();
}

// Export for manual initialization
window.initializeDateSignedFields = initializeDateSignedFields;

// Trigger date signing from other elements
window.triggerDocumentSigned = function() {
  document.dispatchEvent(new CustomEvent('documentSigned'));
};
<\/script>`;class Tm extends L{constructor(){super(...arguments);r(this,"name","Date Signed");r(this,"contentCategories",["flow"]);r(this,"html",Nm);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(vu,{}));r(this,"specificity",4);r(this,"hiddenClasses",["date-signed-field"])}matcher(t){return D(t,"date-signed-field")}}const Dm=`<fieldset class="form-fieldset">
  <legend>Form Section</legend>
  <div class="form-group">
    <label for="field1">Field 1</label>
    <input type="text" class="form-control" id="field1" name="field1">
  </div>
  <div class="form-group">
    <label for="field2">Field 2</label>
    <input type="text" class="form-control" id="field2" name="field2">
  </div>
</fieldset>`;class Mm extends L{constructor(){super(...arguments);r(this,"name","Fieldset");r(this,"html",Dm);r(this,"contentCategories",["flow"]);r(this,"allowedContent",["flow"]);r(this,"category","forms");r(this,"icon",a.jsx(jo,{}));r(this,"specificity",2);r(this,"hiddenClasses",["form-fieldset"])}matcher(t){return t.nodeName==="FIELDSET"}}const Km=`<div class="form-group">
  <label for="formFile" class="form-label">Choose file</label>
  <input class="form-control" type="file" id="formFile" name="file">
</div>`;class Rm extends L{constructor(){super(...arguments);r(this,"name","File Upload");r(this,"html",Km);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(Cu,{}));r(this,"specificity",2)}matcher(t){return t.querySelector('input[type="file"]')!==null}}const zm='<input type="hidden" name="hidden_field" value="">';class Om extends L{constructor(){super(...arguments);r(this,"name","Hidden Input");r(this,"html",zm);r(this,"contentCategories",["flow","listed","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(yu,{}));r(this,"specificity",2)}matcher(t){return t.nodeName==="INPUT"&&t.type==="hidden"}}const Pm=`<div class="initials-field">
  <label class="form-label">Initials</label>
  <div class="initials-pad border rounded text-center p-2" style="height: 60px; background: #f8f9fa; cursor: pointer; position: relative;">
    <canvas id="initialsPad" width="150" height="40" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%);"></canvas>
    <div class="initials-placeholder text-muted" style="line-height: 40px; font-size: 0.875rem;">
      <i class="fas fa-pen-fancy me-1"></i>
      Click to add initials
    </div>
  </div>
  <div class="mt-2">
    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearInitials(this)">
      <i class="fas fa-eraser me-1"></i>Clear
    </button>
  </div>
  <input type="hidden" name="initials" class="initials-data">
</div>

<style>
.initials-field {
  margin: 20px 0;
}

.initials-pad {
  display: inline-block;
  position: relative;
}

.initials-pad canvas {
  cursor: crosshair;
  display: block;
}

.initials-pad canvas:hover {
  border-color: #0d6efd;
}
</style>

<script>
// Initialize initials pads
function initializeInitialsPad(canvas) {
  if (!canvas || canvas.initialsPad) return;
  
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  canvas.initialsPad = {
    isEmpty: true,
    clear: function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.isEmpty = true;
      const hiddenInput = canvas.closest('.initials-field').querySelector('.initials-data');
      if (hiddenInput) hiddenInput.value = '';
    }
  };
  
  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    canvas.initialsPad.isEmpty = false;
  }
  
  function draw(e) {
    if (!isDrawing) return;
    const [currentX, currentY] = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    [lastX, lastY] = [currentX, currentY];
  }
  
  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      const dataURL = canvas.toDataURL('image/png');
      const hiddenInput = canvas.closest('.initials-field').querySelector('.initials-data');
      if (hiddenInput) hiddenInput.value = dataURL;
    }
  }
  
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return [clientX - rect.left, clientY - rect.top];
  }
  
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  });
}

window.clearInitials = function(button) {
  const canvas = button.closest('.initials-field').querySelector('canvas');
  if (canvas && canvas.initialsPad) {
    canvas.initialsPad.clear();
  }
};

function initializeAllInitialsPads() {
  const canvases = document.querySelectorAll('.initials-field canvas');
  canvases.forEach(canvas => {
    if (!canvas.initialsPad) {
      initializeInitialsPad(canvas);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAllInitialsPads);
} else {
  initializeAllInitialsPads();
}

window.initializeInitialsPad = initializeInitialsPad;
window.initializeAllInitialsPads = initializeAllInitialsPads;
<\/script>`;class Vm extends L{constructor(){super(...arguments);r(this,"name","Initials Field");r(this,"contentCategories",["flow"]);r(this,"html",Pm);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(So,{}));r(this,"specificity",4);r(this,"hiddenClasses",["initials-field"])}matcher(t){return D(t,"initials-field")}}const Gm='<label class="form-label">Label Text</label>';class _m extends L{constructor(){super(...arguments);r(this,"name","Label");r(this,"html",Gm);r(this,"contentCategories",["flow","phrasing","interactive","reassociateable","form-associated"]);r(this,"allowedContent",["phrasing"]);r(this,"category","forms");r(this,"icon",a.jsx(ln,{}));r(this,"specificity",1);r(this,"hiddenClasses",["form-label"])}matcher(t){return t.nodeName==="LABEL"}}const qm=`<div class="form-group">
  <label for="progress">Progress:</label>
  <progress id="progress" value="50" max="100" class="form-progress">50%</progress>
</div>`;class Wm extends L{constructor(){super(...arguments);r(this,"name","Progress");r(this,"html",qm);r(this,"contentCategories",["flow","phrasing","labelable"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(ko,{}));r(this,"specificity",2);r(this,"hiddenClasses",["form-progress"])}matcher(t){return t.querySelector("progress")!==null}}const Xm=`<div class="form-check">
  <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" value="option1">
  <label class="form-check-label" for="flexRadioDefault1">
    Default radio
  </label>
</div>`;class Ym extends L{constructor(){super(...arguments);r(this,"name","Radio Button");r(this,"html",Xm);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(Qu,{}));r(this,"specificity",2);r(this,"hiddenClasses",["form-check"])}matcher(t){return D(t,"form-check")&&t.querySelector('input[type="radio"]')!==null}}const Jm=`<div class="form-group">
  <label for="customRange" class="form-label">Range</label>
  <input type="range" class="form-range" min="0" max="100" value="50" id="customRange" name="range">
  <div class="range-value">50</div>
</div>`;class $m extends L{constructor(){super(...arguments);r(this,"name","Range Slider");r(this,"html",Jm);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","resettable","reassociateable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(jd,{}));r(this,"specificity",2)}matcher(t){return t.querySelector('input[type="range"]')!==null}}const Zm='<button type="reset" class="btn btn-secondary">Reset</button>';class eh extends L{constructor(){super(...arguments);r(this,"name","Reset Button");r(this,"html",Zm);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","reassociateable","form-associated"]);r(this,"allowedContent",["phrasing"]);r(this,"category","forms");r(this,"icon",a.jsx(Ed,{}));r(this,"specificity",2);r(this,"hiddenClasses",["btn","btn-secondary"])}matcher(t){return t.nodeName==="BUTTON"&&t.type==="reset"}}const th=`<div class="signature-pad-container">
  <label class="form-label">Digital Signature</label>
  <div class="signature-pad">
    <canvas id="signaturePad" width="400" height="200" style="border: 2px solid #ddd; border-radius: 8px; background: white;"></canvas>
    <div class="signature-controls mt-2">
      <button type="button" class="btn btn-sm btn-secondary" onclick="clearSignature(this)">
        <i class="fas fa-eraser"></i> Clear
      </button>
      <button type="button" class="btn btn-sm btn-outline-primary" onclick="saveSignature(this)">
        <i class="fas fa-save"></i> Save
      </button>
    </div>
    <input type="hidden" name="signature" class="signature-data">
    <div class="signature-status text-muted small mt-1">Click and drag to sign</div>
  </div>
</div>

<style>
.signature-pad-container {
  margin: 20px 0;
}

.signature-pad {
  display: inline-block;
  position: relative;
}

.signature-pad canvas {
  cursor: crosshair;
  display: block;
}

.signature-pad canvas:hover {
  border-color: #0d6efd;
}

.signature-controls {
  text-align: center;
}

.signature-status.signed {
  color: #28a745;
  font-weight: 500;
}

.signature-status.error {
  color: #dc3545;
}
</style>

<script>
// Signature Pad Implementation
function initializeSignaturePad(canvas) {
  if (!canvas || canvas.signaturePad) return;
  
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  // Set up canvas context
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  canvas.signaturePad = {
    isEmpty: true,
    clear: function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.isEmpty = true;
      const hiddenInput = canvas.closest('.signature-pad-container').querySelector('.signature-data');
      if (hiddenInput) hiddenInput.value = '';
      updateStatus(canvas, 'Click and drag to sign', '');
    },
    save: function() {
      if (this.isEmpty) {
        updateStatus(canvas, 'Please provide a signature first', 'error');
        return false;
      }
      const dataURL = canvas.toDataURL('image/png');
      const hiddenInput = canvas.closest('.signature-pad-container').querySelector('.signature-data');
      if (hiddenInput) hiddenInput.value = dataURL;
      updateStatus(canvas, 'Signature saved successfully', 'signed');
      return true;
    }
  };
  
  function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    canvas.signaturePad.isEmpty = false;
  }
  
  function draw(e) {
    if (!isDrawing) return;
    
    const [currentX, currentY] = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    [lastX, lastY] = [currentX, currentY];
  }
  
  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      updateStatus(canvas, 'Signature captured - click Save to confirm', '');
    }
  }
  
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return [
      clientX - rect.left,
      clientY - rect.top
    ];
  }
  
  function updateStatus(canvas, message, className) {
    const status = canvas.closest('.signature-pad-container').querySelector('.signature-status');
    if (status) {
      status.textContent = message;
      status.className = 'signature-status text-muted small mt-1';
      if (className) status.classList.add(className);
    }
  }
  
  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  });
}

// Global functions for button controls
window.clearSignature = function(button) {
  const canvas = button.closest('.signature-pad-container').querySelector('canvas');
  if (canvas && canvas.signaturePad) {
    canvas.signaturePad.clear();
  }
};

window.saveSignature = function(button) {
  const canvas = button.closest('.signature-pad-container').querySelector('canvas');
  if (canvas && canvas.signaturePad) {
    return canvas.signaturePad.save();
  }
  return false;
};

// Auto-initialize signature pads
function initializeAllSignaturePads() {
  const canvases = document.querySelectorAll('.signature-pad canvas');
  canvases.forEach(canvas => {
    if (!canvas.signaturePad) {
      initializeSignaturePad(canvas);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAllSignaturePads);
} else {
  initializeAllSignaturePads();
}

// Export for manual initialization
window.initializeSignaturePad = initializeSignaturePad;
window.initializeAllSignaturePads = initializeAllSignaturePads;
<\/script>`;class Ah extends L{constructor(){super(...arguments);r(this,"name","Signature Pad");r(this,"html",th);r(this,"contentCategories",["flow","interactive","listed","submittable","resettable","form-associated"]);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(So,{}));r(this,"specificity",3);r(this,"hiddenClasses",["signature-pad-container","signature-pad","signature-controls"])}matcher(t){return t.querySelector("canvas#signaturePad")!==null||t.classList.contains("signature-pad-container")}}const ah='<button type="submit" class="btn btn-primary">Submit</button>';class sh extends L{constructor(){super(...arguments);r(this,"name","Submit Button");r(this,"html",ah);r(this,"contentCategories",["flow","phrasing","interactive","listed","labelable","submittable","reassociateable","form-associated"]);r(this,"allowedContent",["phrasing"]);r(this,"category","forms");r(this,"icon",a.jsx(Fu,{}));r(this,"specificity",2);r(this,"hiddenClasses",["btn","btn-primary"])}matcher(t){return t.nodeName==="BUTTON"&&t.type==="submit"}}const ih=`<div class="title-field">
  <label class="form-label">Job Title/Position</label>
  <input type="text" class="form-control title-input" name="jobTitle" placeholder="Enter your job title or position" autocomplete="organization-title">
  <small class="text-muted">Optional: Enter your professional title or position</small>
</div>

<style>
.title-field {
  margin: 20px 0;
}

.title-field .form-label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.title-field .title-input {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.title-field .title-input:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  outline: 0;
}

.title-field .title-input::placeholder {
  color: #6c757d;
  font-style: italic;
}

.title-field small {
  display: block;
  margin-top: 5px;
  font-size: 0.875rem;
}

/* Validation styles */
.title-field .title-input:invalid {
  border-color: #dc3545;
}

.title-field .title-input:valid {
  border-color: #28a745;
}

/* Professional styling */
.title-field .title-input {
  text-transform: capitalize;
}
</style>

<script>
function initializeTitleFields() {
  const titleFields = document.querySelectorAll('.title-input');
  
  titleFields.forEach(field => {
    if (!field.dataset.initialized) {
      field.dataset.initialized = 'true';
      
      // Common job titles for autocomplete suggestions
      const commonTitles = [
        'CEO', 'CFO', 'CTO', 'COO', 'President', 'Vice President', 'Director',
        'Manager', 'Senior Manager', 'Assistant Manager', 'Supervisor',
        'Developer', 'Senior Developer', 'Software Engineer', 'Analyst',
        'Consultant', 'Specialist', 'Coordinator', 'Administrator',
        'Executive', 'Representative', 'Associate', 'Assistant'
      ];
      
      // Add input formatting
      field.addEventListener('input', function() {
        // Capitalize first letter of each word
        const value = this.value;
        if (value) {
          const formatted = value.replace(/\bw/g, l => l.toUpperCase());
          if (formatted !== this.value) {
            this.value = formatted;
          }
        }
      });
      
      // Add blur event for final formatting
      field.addEventListener('blur', function() {
        this.value = this.value.trim();
      });
    }
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTitleFields);
} else {
  initializeTitleFields();
}

// Export for manual initialization
window.initializeTitleFields = initializeTitleFields;
<\/script>`;class nh extends L{constructor(){super(...arguments);r(this,"name","Title Field");r(this,"contentCategories",["flow"]);r(this,"html",ih);r(this,"allowedContent",[]);r(this,"category","forms");r(this,"icon",a.jsx(ku,{}));r(this,"specificity",4);r(this,"hiddenClasses",["title-field"])}matcher(t){return D(t,"title-field")}}const rh=`<div class="audio-player">
  <div class="player-container">
    <div class="player-header">
      <div class="track-info">
        <h4 class="track-title">Sample Audio Track</h4>
        <p class="track-artist">Artist Name</p>
      </div>
      <div class="track-artwork">
        <img src="/images/builder/placeholder.svg" alt="Album Art">
      </div>
    </div>
    
    <div class="player-controls">
      <button class="control-btn" id="prevBtn">
        <i class="fa fa-step-backward"></i>
      </button>
      <button class="control-btn play-pause" id="playPauseBtn">
        <i class="fa fa-play"></i>
      </button>
      <button class="control-btn" id="nextBtn">
        <i class="fa fa-step-forward"></i>
      </button>
    </div>
    
    <div class="progress-container">
      <span class="time current-time">0:00</span>
      <div class="progress-bar">
        <div class="progress-fill"></div>
        <div class="progress-handle"></div>
      </div>
      <span class="time total-time">3:45</span>
    </div>
    
    <div class="volume-container">
      <button class="control-btn volume-btn">
        <i class="fa fa-volume-up"></i>
      </button>
      <div class="volume-slider">
        <div class="volume-fill"></div>
        <div class="volume-handle"></div>
      </div>
    </div>
    
    <div class="playlist-container">
      <h5>Playlist</h5>
      <div class="playlist">
        <div class="track-item active">
          <span class="track-number">1</span>
          <div class="track-details">
            <p class="track-name">Sample Audio Track</p>
            <p class="track-duration">3:45</p>
          </div>
        </div>
        <div class="track-item">
          <span class="track-number">2</span>
          <div class="track-details">
            <p class="track-name">Another Great Song</p>
            <p class="track-duration">4:20</p>
          </div>
        </div>
        <div class="track-item">
          <span class="track-number">3</span>
          <div class="track-details">
            <p class="track-name">Musical Experience</p>
            <p class="track-duration">2:58</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <audio id="audioElement" preload="metadata">
    <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvWMcBTOA0PLbgyEFIHfE8N2QQAYUZ7Tj66pYFAhCmNzzwGMcBTA+zfLigyEGHHTG8N6QQAYTZ7Li66tYFQU==" type="audio/wav">
    Your browser does not support the audio element.
  </audio>
</div>`,oh=`.audio-player {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 25px;
  color: white;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.audio-player .player-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.audio-player .player-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.audio-player .track-info {
  flex: 1;
}

.audio-player .track-title {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.audio-player .track-artist {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

.audio-player .track-artwork {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.audio-player .track-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-player .player-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
}

.audio-player .control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  backdrop-filter: blur(5px);
}

.audio-player .control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.audio-player .play-pause {
  background: linear-gradient(145deg, #4ecca3, #45b7aa);
  color: #1a1a2e;
  width: 60px;
  height: 60px;
  font-size: 20px;
}

.audio-player .play-pause:hover {
  background: linear-gradient(145deg, #5ff3d1, #4ecca3);
}

.audio-player .progress-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.audio-player .time {
  font-size: 12px;
  font-weight: 600;
  min-width: 35px;
  opacity: 0.8;
}

.audio-player .progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.audio-player .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecca3, #45b7aa);
  border-radius: 3px;
  width: 30%;
  transition: width 0.1s ease;
}

.audio-player .progress-handle {
  position: absolute;
  top: 50%;
  left: 30%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: left 0.1s ease;
}

.audio-player .volume-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.audio-player .volume-btn {
  width: 35px;
  height: 35px;
  font-size: 14px;
}

.audio-player .volume-slider {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.audio-player .volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecca3, #45b7aa);
  border-radius: 2px;
  width: 70%;
  transition: width 0.1s ease;
}

.audio-player .volume-handle {
  position: absolute;
  top: 50%;
  left: 70%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: left 0.1s ease;
}

.audio-player .playlist-container h5 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  opacity: 0.9;
}

.audio-player .playlist {
  max-height: 200px;
  overflow-y: auto;
}

.audio-player .track-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 5px;
}

.audio-player .track-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.audio-player .track-item.active {
  background: rgba(255, 255, 255, 0.2);
}

.audio-player .track-number {
  width: 20px;
  text-align: center;
  font-weight: 600;
  opacity: 0.7;
  font-size: 14px;
}

.audio-player .track-details {
  flex: 1;
}

.audio-player .track-name {
  margin: 0 0 2px 0;
  font-size: 14px;
  font-weight: 500;
}

.audio-player .track-duration {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}

@media (max-width: 480px) {
  .audio-player {
    padding: 20px;
  }
  
  .audio-player .player-container {
    padding: 20px;
  }
  
  .audio-player .player-header {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .audio-player .track-artwork {
    width: 80px;
    height: 80px;
  }
  
  .audio-player .player-controls {
    gap: 10px;
  }
  
  .audio-player .control-btn {
    width: 45px;
    height: 45px;
    font-size: 16px;
  }
  
  .audio-player .play-pause {
    width: 55px;
    height: 55px;
    font-size: 18px;
  }
}`;class lh extends L{constructor(){super(...arguments);r(this,"name","audio player");r(this,"contentCategories",["flow"]);r(this,"html",rh);r(this,"css",oh);r(this,"allowedContent",[]);r(this,"category","media");r(this,"icon",a.jsx(Uu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["audio-player"])}matcher(t){return D(t,"audio-player")}}const ch=`<div class="image-gallery">
  <div class="gallery-container">
    <div class="gallery-header">
      <h3>Photo Gallery</h3>
      <div class="gallery-controls">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="nature">Nature</button>
        <button class="filter-btn" data-filter="city">City</button>
        <button class="filter-btn" data-filter="people">People</button>
      </div>
    </div>
    
    <div class="gallery-grid">
      <div class="gallery-item" data-category="nature">
        <img src="/images/builder/placeholder.svg" alt="Nature 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Beautiful Landscape</h4>
            <p>Stunning mountain view</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="city">
        <img src="/images/builder/placeholder.svg" alt="City 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Urban Architecture</h4>
            <p>Modern city skyline</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="people">
        <img src="/images/builder/placeholder.svg" alt="People 1">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Portrait Photography</h4>
            <p>Capturing human emotion</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="nature">
        <img src="/images/builder/placeholder.svg" alt="Nature 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Forest Path</h4>
            <p>Peaceful woodland trail</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="city">
        <img src="/images/builder/placeholder.svg" alt="City 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Night Lights</h4>
            <p>City illuminated at night</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
      
      <div class="gallery-item" data-category="people">
        <img src="/images/builder/placeholder.svg" alt="People 2">
        <div class="gallery-overlay">
          <div class="overlay-content">
            <h4>Group Photo</h4>
            <p>Friends having fun</p>
            <button class="view-btn">
              <i class="fa fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="gallery-pagination">
      <button class="pagination-btn" id="prevPage">
        <i class="fa fa-chevron-left"></i>
      </button>
      <div class="page-info">
        <span class="current-page">1</span> / <span class="total-pages">3</span>
      </div>
      <button class="pagination-btn" id="nextPage">
        <i class="fa fa-chevron-right"></i>
      </button>
    </div>
  </div>
  
  <!-- Lightbox Modal -->
  <div class="lightbox-modal" id="lightboxModal">
    <div class="lightbox-content">
      <button class="lightbox-close">&times;</button>
      <img src="" alt="" id="lightboxImage">
      <div class="lightbox-info">
        <h4 id="lightboxTitle"></h4>
        <p id="lightboxDescription"></p>
      </div>
      <div class="lightbox-nav">
        <button class="lightbox-btn prev-btn" id="lightboxPrev">
          <i class="fa fa-chevron-left"></i>
        </button>
        <button class="lightbox-btn next-btn" id="lightboxNext">
          <i class="fa fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</div>`,dh=`.image-gallery {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
}

.image-gallery .gallery-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.image-gallery .gallery-header {
  margin-bottom: 30px;
  text-align: center;
}

.image-gallery .gallery-header h3 {
  margin: 0 0 20px 0;
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.image-gallery .gallery-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.image-gallery .filter-btn {
  background: #f8f9fa;
  color: #6c757d;
  border: 2px solid #dee2e6;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.image-gallery .filter-btn:hover,
.image-gallery .filter-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.image-gallery .gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.image-gallery .gallery-item {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
}

.image-gallery .gallery-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.image-gallery .gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-gallery .gallery-item:hover img {
  transform: scale(1.1);
}

.image-gallery .gallery-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.9), rgba(108, 92, 231, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-gallery .gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.image-gallery .overlay-content {
  text-align: center;
  color: white;
  padding: 20px;
}

.image-gallery .overlay-content h4 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.image-gallery .overlay-content p {
  margin: 0 0 15px 0;
  font-size: 14px;
  opacity: 0.9;
}

.image-gallery .view-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.image-gallery .view-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.image-gallery .gallery-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.image-gallery .pagination-btn {
  background: #007bff;
  color: white;
  border: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.image-gallery .pagination-btn:hover {
  background: #0056b3;
  transform: scale(1.1);
}

.image-gallery .pagination-btn:disabled {
  background: #dee2e6;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.image-gallery .page-info {
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.image-gallery .current-page {
  color: #007bff;
  font-weight: 700;
}

/* Lightbox Modal */
.image-gallery .lightbox-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.image-gallery .lightbox-modal.active {
  display: flex;
}

.image-gallery .lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.image-gallery .lightbox-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  z-index: 10001;
  transition: all 0.3s ease;
}

.image-gallery .lightbox-close:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: rotate(90deg);
}

.image-gallery #lightboxImage {
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
}

.image-gallery .lightbox-info {
  padding: 20px;
  text-align: center;
}

.image-gallery .lightbox-info h4 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.image-gallery .lightbox-info p {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.image-gallery .lightbox-nav {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  pointer-events: none;
}

.image-gallery .lightbox-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.image-gallery .lightbox-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

/* Hidden by default - will be shown by filter */
.image-gallery .gallery-item.hidden {
  display: none;
}

@media (max-width: 768px) {
  .image-gallery {
    padding: 20px;
  }
  
  .image-gallery .gallery-container {
    padding: 20px;
  }
  
  .image-gallery .gallery-header h3 {
    font-size: 24px;
  }
  
  .image-gallery .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .image-gallery .filter-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .image-gallery .overlay-content h4 {
    font-size: 16px;
  }
  
  .image-gallery .overlay-content p {
    font-size: 12px;
  }
  
  .image-gallery .lightbox-content {
    max-width: 95%;
    max-height: 95%;
  }
  
  .image-gallery .lightbox-nav {
    padding: 0 10px;
  }
  
  .image-gallery .lightbox-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .image-gallery .gallery-grid {
    grid-template-columns: 1fr;
  }
  
  .image-gallery .gallery-controls {
    gap: 5px;
  }
  
  .image-gallery .filter-btn {
    padding: 6px 12px;
    font-size: 11px;
  }
}`;class uh extends L{constructor(){super(...arguments);r(this,"name","image gallery");r(this,"contentCategories",["flow"]);r(this,"html",ch);r(this,"css",dh);r(this,"allowedContent",[]);r(this,"category","media");r(this,"icon",a.jsx(Ho,{}));r(this,"specificity",3);r(this,"hiddenClasses",["image-gallery"])}matcher(t){return D(t,"image-gallery")}}const gh=`<div class="bmi-calculator">
  <div class="calculator-container">
    <div class="calculator-header">
      <h3>BMI Calculator</h3>
      <p>Calculate your Body Mass Index</p>
    </div>
    
    <div class="input-section">
      <div class="input-group">
        <label for="height">Height</label>
        <div class="input-with-unit">
          <input type="number" id="height" placeholder="170" min="1" max="300">
          <select id="heightUnit">
            <option value="cm">cm</option>
            <option value="feet">ft/in</option>
          </select>
        </div>
        <div id="feetInchInputs" style="display: none;">
          <input type="number" id="feet" placeholder="5" min="1" max="10"> ft
          <input type="number" id="inches" placeholder="7" min="0" max="11"> in
        </div>
      </div>
      
      <div class="input-group">
        <label for="weight">Weight</label>
        <div class="input-with-unit">
          <input type="number" id="weight" placeholder="70" min="1" max="500">
          <select id="weightUnit">
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
        </div>
      </div>
      
      <button onclick="calculateBMI()" class="calculate-btn">Calculate BMI</button>
    </div>
    
    <div id="bmiResult" class="result-section" style="display: none;">
      <div class="bmi-display">
        <div class="bmi-value">
          <span id="bmiNumber">0</span>
          <span class="unit">kg/m²</span>
        </div>
        <div id="bmiCategory" class="bmi-category">Normal</div>
      </div>
      
      <div class="bmi-scale">
        <div class="scale-bar">
          <div class="scale-segment underweight"></div>
          <div class="scale-segment normal"></div>
          <div class="scale-segment overweight"></div>
          <div class="scale-segment obese"></div>
        </div>
        <div class="scale-labels">
          <span>Underweight</span>
          <span>Normal</span>
          <span>Overweight</span>
          <span>Obese</span>
        </div>
        <div id="bmiIndicator" class="bmi-indicator"></div>
      </div>
      
      <div class="bmi-ranges">
        <h4>BMI Categories:</h4>
        <div class="range-item">
          <span class="range-color underweight"></span>
          <span>Underweight: Below 18.5</span>
        </div>
        <div class="range-item">
          <span class="range-color normal"></span>
          <span>Normal: 18.5 - 24.9</span>
        </div>
        <div class="range-item">
          <span class="range-color overweight"></span>
          <span>Overweight: 25.0 - 29.9</span>
        </div>
        <div class="range-item">
          <span class="range-color obese"></span>
          <span>Obese: 30.0 and above</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    window.BMICalculator = {
      init: function() {
        this.setupEventListeners();
      },
      
      setupEventListeners: function() {
        const heightUnit = document.getElementById('heightUnit');
        const weightUnit = document.getElementById('weightUnit');
        
        heightUnit.addEventListener('change', this.toggleHeightUnit);
        weightUnit.addEventListener('change', this.updateWeightPlaceholder);
        
        // Add Enter key support
        const inputs = ['height', 'weight', 'feet', 'inches'];
        inputs.forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                this.calculate();
              }
            });
          }
        });
      },
      
      toggleHeightUnit: function() {
        const heightUnit = document.getElementById('heightUnit');
        const feetInchInputs = document.getElementById('feetInchInputs');
        const heightInput = document.getElementById('height');
        
        if (heightUnit.value === 'feet') {
          feetInchInputs.style.display = 'block';
          heightInput.style.display = 'none';
        } else {
          feetInchInputs.style.display = 'none';
          heightInput.style.display = 'block';
        }
      },
      
      updateWeightPlaceholder: function() {
        const weightUnit = document.getElementById('weightUnit');
        const weightInput = document.getElementById('weight');
        
        if (weightUnit.value === 'lbs') {
          weightInput.placeholder = '154';
        } else {
          weightInput.placeholder = '70';
        }
      },
      
      calculate: function() {
        const heightUnit = document.getElementById('heightUnit').value;
        const weightUnit = document.getElementById('weightUnit').value;
        
        let heightInMeters;
        
        if (heightUnit === 'feet') {
          const feet = parseFloat(document.getElementById('feet').value) || 0;
          const inches = parseFloat(document.getElementById('inches').value) || 0;
          const totalInches = (feet * 12) + inches;
          heightInMeters = totalInches * 0.0254;
        } else {
          const heightInCm = parseFloat(document.getElementById('height').value) || 0;
          heightInMeters = heightInCm / 100;
        }
        
        let weightInKg;
        const weight = parseFloat(document.getElementById('weight').value) || 0;
        
        if (weightUnit === 'lbs') {
          weightInKg = weight * 0.453592;
        } else {
          weightInKg = weight;
        }
        
        if (heightInMeters <= 0 || weightInKg <= 0) {
          alert('Please enter valid height and weight values.');
          return;
        }
        
        const bmi = weightInKg / (heightInMeters * heightInMeters);
        this.displayResult(bmi);
      },
      
      displayResult: function(bmi) {
        const resultSection = document.getElementById('bmiResult');
        const bmiNumber = document.getElementById('bmiNumber');
        const bmiCategory = document.getElementById('bmiCategory');
        const bmiIndicator = document.getElementById('bmiIndicator');
        
        bmiNumber.textContent = bmi.toFixed(1);
        
        let category, position;
        
        if (bmi < 18.5) {
          category = 'Underweight';
          position = (bmi / 18.5) * 25;
        } else if (bmi < 25) {
          category = 'Normal';
          position = 25 + ((bmi - 18.5) / (25 - 18.5)) * 25;
        } else if (bmi < 30) {
          category = 'Overweight';
          position = 50 + ((bmi - 25) / (30 - 25)) * 25;
        } else {
          category = 'Obese';
          position = 75 + Math.min(((bmi - 30) / 10) * 25, 25);
        }
        
        bmiCategory.textContent = category;
        bmiCategory.className = 'bmi-category ' + category.toLowerCase();
        
        bmiIndicator.style.left = Math.min(position, 100) + '%';
        
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    
    // Global functions
    window.calculateBMI = function() {
      window.BMICalculator.calculate();
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.BMICalculator.init();
      });
    } else {
      window.BMICalculator.init();
    }
  <\/script>
</div>`,ph=`.bmi-calculator {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 25px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  color: white;
  max-width: 450px;
  margin: 0 auto;
}

.bmi-calculator .calculator-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bmi-calculator .calculator-header {
  text-align: center;
  margin-bottom: 25px;
}

.bmi-calculator .calculator-header h3 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .calculator-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.bmi-calculator .input-section {
  margin-bottom: 25px;
}

.bmi-calculator .input-group {
  margin-bottom: 20px;
}

.bmi-calculator label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 16px;
}

.bmi-calculator .input-with-unit {
  display: flex;
  gap: 10px;
  align-items: center;
}

.bmi-calculator input[type="number"] {
  flex: 1;
  padding: 12px 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  outline: none;
  transition: all 0.3s ease;
}

.bmi-calculator input[type="number"]:focus {
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.bmi-calculator select {
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  outline: none;
  cursor: pointer;
}

.bmi-calculator #feetInchInputs {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
}

.bmi-calculator #feetInchInputs input {
  width: 80px;
}

.bmi-calculator .calculate-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(145deg, #4ecca3, #45b7aa);
  color: #1a1a2e;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
}

.bmi-calculator .calculate-btn:hover {
  background: linear-gradient(145deg, #5ff3d1, #4ecca3);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .result-section {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bmi-calculator .bmi-display {
  text-align: center;
  margin-bottom: 25px;
}

.bmi-calculator .bmi-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.bmi-calculator #bmiNumber {
  font-size: 48px;
  font-weight: 800;
  color: #4ecca3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.bmi-calculator .unit {
  font-size: 18px;
  opacity: 0.8;
}

.bmi-calculator .bmi-category {
  font-size: 20px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bmi-calculator .bmi-category.underweight {
  background: #3498db;
  color: white;
}

.bmi-calculator .bmi-category.normal {
  background: #2ecc71;
  color: white;
}

.bmi-calculator .bmi-category.overweight {
  background: #f39c12;
  color: white;
}

.bmi-calculator .bmi-category.obese {
  background: #e74c3c;
  color: white;
}

.bmi-calculator .bmi-scale {
  margin-bottom: 25px;
  position: relative;
}

.bmi-calculator .scale-bar {
  display: flex;
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.bmi-calculator .scale-segment {
  flex: 1;
}

.bmi-calculator .scale-segment.underweight {
  background: #3498db;
}

.bmi-calculator .scale-segment.normal {
  background: #2ecc71;
}

.bmi-calculator .scale-segment.overweight {
  background: #f39c12;
}

.bmi-calculator .scale-segment.obese {
  background: #e74c3c;
}

.bmi-calculator .scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.9;
}

.bmi-calculator .bmi-indicator {
  position: absolute;
  top: -8px;
  width: 4px;
  height: 36px;
  background: white;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.5s ease;
  transform: translateX(-50%);
}

.bmi-calculator .bmi-indicator::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -4px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid white;
}

.bmi-calculator .bmi-ranges {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.bmi-calculator .bmi-ranges h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.bmi-calculator .range-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.bmi-calculator .range-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}

.bmi-calculator .range-color.underweight {
  background: #3498db;
}

.bmi-calculator .range-color.normal {
  background: #2ecc71;
}

.bmi-calculator .range-color.overweight {
  background: #f39c12;
}

.bmi-calculator .range-color.obese {
  background: #e74c3c;
}

@media (max-width: 480px) {
  .bmi-calculator {
    padding: 20px;
  }
  
  .bmi-calculator .calculator-container {
    padding: 20px;
  }
  
  .bmi-calculator .calculator-header h3 {
    font-size: 24px;
  }
  
  .bmi-calculator #bmiNumber {
    font-size: 36px;
  }
  
  .bmi-calculator .scale-labels {
    font-size: 11px;
  }
}`;class mh extends L{constructor(){super(...arguments);r(this,"name","BMI Calculator");r(this,"contentCategories",["flow"]);r(this,"html",gh);r(this,"css",ph);r(this,"allowedContent",[]);r(this,"category","modules");r(this,"icon",a.jsx(ju,{}));r(this,"specificity",3);r(this,"hiddenClasses",["bmi-calculator"])}matcher(t){return D(t,"bmi-calculator")}}const hh=`<div class="calculator-module">
  <div class="calculator-container">
    <div class="calculator-display">
      <input type="text" id="calc-display" readonly value="0">
    </div>
    <div class="calculator-buttons">
      <button class="calc-btn clear" onclick="clearCalculator()">C</button>
      <button class="calc-btn clear" onclick="clearEntry()">CE</button>
      <button class="calc-btn operator" onclick="backspace()">⌫</button>
      <button class="calc-btn operator" onclick="appendToDisplay('/')">/</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('7')">7</button>
      <button class="calc-btn number" onclick="appendToDisplay('8')">8</button>
      <button class="calc-btn number" onclick="appendToDisplay('9')">9</button>
      <button class="calc-btn operator" onclick="appendToDisplay('*')">×</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('4')">4</button>
      <button class="calc-btn number" onclick="appendToDisplay('5')">5</button>
      <button class="calc-btn number" onclick="appendToDisplay('6')">6</button>
      <button class="calc-btn operator" onclick="appendToDisplay('-')">-</button>
      
      <button class="calc-btn number" onclick="appendToDisplay('1')">1</button>
      <button class="calc-btn number" onclick="appendToDisplay('2')">2</button>
      <button class="calc-btn number" onclick="appendToDisplay('3')">3</button>
      <button class="calc-btn operator" onclick="appendToDisplay('+')">+</button>
      
      <button class="calc-btn number zero" onclick="appendToDisplay('0')">0</button>
      <button class="calc-btn number" onclick="appendToDisplay('.')">.</button>
      <button class="calc-btn equals" onclick="calculateResult()">=</button>
    </div>
  </div>
  
  <script>
    window.calculatorFunctions = {
      appendToDisplay: function(value) {
        const display = document.getElementById('calc-display');
        if (display.value === '0' && value !== '.') {
          display.value = value;
        } else {
          display.value += value;
        }
      },
      
      clearCalculator: function() {
        document.getElementById('calc-display').value = '0';
      },
      
      clearEntry: function() {
        const display = document.getElementById('calc-display');
        display.value = '0';
      },
      
      backspace: function() {
        const display = document.getElementById('calc-display');
        if (display.value.length > 1) {
          display.value = display.value.slice(0, -1);
        } else {
          display.value = '0';
        }
      },
      
      calculateResult: function() {
        const display = document.getElementById('calc-display');
        try {
          // Replace × with * for evaluation
          const expression = display.value.replace(/×/g, '*');
          // Use Function constructor for safer evaluation
          const result = new Function('return ' + expression)();
          display.value = parseFloat(result.toFixed(10)).toString();
        } catch (error) {
          display.value = 'Error';
          setTimeout(() => {
            display.value = '0';
          }, 1500);
        }
      }
    };
    
    // Expose functions globally for onclick handlers
    window.appendToDisplay = window.calculatorFunctions.appendToDisplay;
    window.clearCalculator = window.calculatorFunctions.clearCalculator;
    window.clearEntry = window.calculatorFunctions.clearEntry;
    window.backspace = window.calculatorFunctions.backspace;
    window.calculateResult = window.calculatorFunctions.calculateResult;
    
    // Keyboard support
    document.addEventListener('keydown', function(event) {
      const calcModule = event.target.closest('.calculator-module');
      if (!calcModule) return;
      
      const key = event.key;
      event.preventDefault();
      
      if ('0123456789.'.includes(key)) {
        window.appendToDisplay(key);
      } else if (key === '+' || key === '-' || key === '/' || key === '*') {
        window.appendToDisplay(key === '*' ? '×' : key);
      } else if (key === 'Enter' || key === '=') {
        window.calculateResult();
      } else if (key === 'Escape') {
        window.clearCalculator();
      } else if (key === 'Backspace') {
        window.backspace();
      }
    });
  <\/script>
</div>`,fh=`.calculator-module {
  display: inline-block;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(145deg, #2c3e50, #3498db);
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  user-select: none;
}

.calculator-module .calculator-container {
  background: #34495e;
  border-radius: 15px;
  padding: 20px;
  max-width: 300px;
}

.calculator-module .calculator-display {
  margin-bottom: 20px;
}

.calculator-module #calc-display {
  width: 100%;
  height: 60px;
  background: #2c3e50;
  border: none;
  border-radius: 10px;
  color: #ecf0f1;
  font-size: 24px;
  font-weight: bold;
  text-align: right;
  padding: 0 15px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
  outline: none;
}

.calculator-module .calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.calculator-module .calc-btn {
  height: 50px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  position: relative;
  overflow: hidden;
}

.calculator-module .calc-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.calculator-module .calc-btn:hover::before {
  left: 100%;
}

.calculator-module .calc-btn:active {
  transform: scale(0.98);
}

.calculator-module .calc-btn.number {
  background: linear-gradient(145deg, #95a5a6, #7f8c8d);
  color: #2c3e50;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.calculator-module .calc-btn.number:hover {
  background: linear-gradient(145deg, #bdc3c7, #95a5a6);
}

.calculator-module .calc-btn.operator {
  background: linear-gradient(145deg, #e74c3c, #c0392b);
  color: white;
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.calculator-module .calc-btn.operator:hover {
  background: linear-gradient(145deg, #ec7063, #e74c3c);
}

.calculator-module .calc-btn.clear {
  background: linear-gradient(145deg, #f39c12, #e67e22);
  color: white;
  box-shadow: 0 4px 8px rgba(243, 156, 18, 0.3);
}

.calculator-module .calc-btn.clear:hover {
  background: linear-gradient(145deg, #f5b041, #f39c12);
}

.calculator-module .calc-btn.equals {
  background: linear-gradient(145deg, #27ae60, #229954);
  color: white;
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
}

.calculator-module .calc-btn.equals:hover {
  background: linear-gradient(145deg, #58d68d, #27ae60);
}

.calculator-module .calc-btn.zero {
  grid-column: span 2;
}

@media (max-width: 480px) {
  .calculator-module {
    padding: 15px;
  }
  
  .calculator-module .calculator-container {
    padding: 15px;
    max-width: 250px;
  }
  
  .calculator-module #calc-display {
    height: 50px;
    font-size: 20px;
  }
  
  .calculator-module .calc-btn {
    height: 45px;
    font-size: 16px;
  }
}`;class xh extends L{constructor(){super(...arguments);r(this,"name","Calculator");r(this,"contentCategories",["flow"]);r(this,"html",hh);r(this,"css",fh);r(this,"allowedContent",[]);r(this,"category","modules");r(this,"icon",a.jsx(Eu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["calculator-module"])}matcher(t){return D(t,"calculator-module")}}const bh=`<section class="blog-horizontal">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The Catalyzer</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <div class="blog-footer">
              <a class="blog-link">Learn More
                <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </a>
              <span class="blog-stats">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>1.2K
              </span>
              <span class="blog-comments">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
                </svg>6
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The 400 Blows</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <div class="blog-footer">
              <a class="blog-link">Learn More
                <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </a>
              <span class="blog-stats">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>1.2K
              </span>
              <span class="blog-comments">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
                </svg>6
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <img class="blog-image" src="/images/builder/placeholder.svg" alt="blog">
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Shooting Stars</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <div class="blog-footer">
              <a class="blog-link">Learn More
                <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </a>
              <span class="blog-stats">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>1.2K
              </span>
              <span class="blog-comments">
                <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
                </svg>6
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,wh=`.blog-horizontal {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.blog-horizontal .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-horizontal .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.blog-horizontal .blog-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .blog-horizontal .blog-card {
    width: 33.333333%;
  }
}

.blog-horizontal .blog-card-inner {
  height: 100%;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.blog-horizontal .blog-card-inner:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.blog-horizontal .blog-image {
  width: 100%;
  height: 144px;
  object-fit: cover;
  object-position: center;
}

@media (min-width: 1024px) {
  .blog-horizontal .blog-image {
    height: 192px;
  }
}

.blog-horizontal .blog-content {
  padding: 24px;
}

.blog-horizontal .blog-category {
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 500;
  color: #a0aec0;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.blog-horizontal .blog-title {
  font-size: 18px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 12px;
  line-height: 1.4;
}

.blog-horizontal .blog-description {
  line-height: 1.6;
  margin-bottom: 12px;
  color: #4a5568;
}

.blog-horizontal .blog-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.blog-horizontal .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-horizontal .blog-link:hover {
  color: #5a67d8;
}

.blog-horizontal .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.blog-horizontal .blog-stats,
.blog-horizontal .blog-comments {
  color: #a0aec0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  margin-left: auto;
}

@media (min-width: 768px) {
  .blog-horizontal .blog-stats {
    margin-left: auto;
  }
}

@media (min-width: 1024px) {
  .blog-horizontal .blog-stats {
    margin-left: auto;
  }
}

.blog-horizontal .blog-stats {
  padding-right: 12px;
  border-right: 2px solid #e2e8f0;
  margin-right: 12px;
}

.blog-horizontal .blog-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-horizontal {
    padding: 48px 0;
  }
  
  .blog-horizontal .blog-container {
    padding: 0 16px;
  }
  
  .blog-horizontal .blog-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .blog-horizontal .blog-stats,
  .blog-horizontal .blog-comments {
    margin-left: 0;
  }
  
  .blog-horizontal .blog-stats {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
}`;class Bh extends L{constructor(){super(...arguments);r(this,"name","Blog Horizontal");r(this,"contentCategories",["flow"]);r(this,"html",bh);r(this,"css",wh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["blog-horizontal"])}matcher(t){return D(t,"blog-horizontal")}}const vh=`<section class="blog-no-frame">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <span class="blog-category">CATEGORY</span>
          <h2 class="blog-title">Roof party normcore before they sold out, cornhole vape</h2>
          <p class="blog-description">Live-edge letterpress cliche, salvia fanny pack humblebrag narwhal portland. VHS man braid palo santo hoodie brunch trust fund. Bitters hashtag waistcoat fashion axe chia unicorn. Plaid fixie chambray 90's, slow-carb etsy tumeric. Cray pug you probably haven't heard of them hexagon kickstarter craft beer pork chic.</p>
          <div class="blog-footer">
            <a class="blog-link">Learn More
              <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
              </svg>
            </a>
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
          <a class="blog-author">
            <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
            <span class="author-info">
              <span class="author-name">Holden Caulfield</span>
              <span class="author-role">UI DEVELOPER</span>
            </span>
          </a>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <span class="blog-category">CATEGORY</span>
          <h2 class="blog-title">Pinterest DIY dreamcatcher gentrify single-origin coffee</h2>
          <p class="blog-description">Live-edge letterpress cliche, salvia fanny pack humblebrag narwhal portland. VHS man braid palo santo hoodie brunch trust fund. Bitters hashtag waistcoat fashion axe chia unicorn. Plaid fixie chambray 90's, slow-carb etsy tumeric.</p>
          <div class="blog-footer">
            <a class="blog-link">Learn More
              <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
              </svg>
            </a>
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
          <a class="blog-author">
            <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
            <span class="author-info">
              <span class="author-name">Alper Kamu</span>
              <span class="author-role">DESIGNER</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,Ch=`.blog-no-frame {
  color: #718096;
  padding: 96px 0;
  overflow: hidden;
}

.blog-no-frame .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-no-frame .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -48px;
}

.blog-no-frame .blog-card {
  padding: 48px;
  width: 100%;
}

@media (min-width: 768px) {
  .blog-no-frame .blog-card {
    width: 50%;
  }
}

.blog-no-frame .blog-card-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.blog-no-frame .blog-category {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #edf2f7;
  color: #667eea;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-no-frame .blog-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin: 16px 0;
  line-height: 1.4;
}

@media (min-width: 640px) {
  .blog-no-frame .blog-title {
    font-size: 30px;
  }
}

.blog-no-frame .blog-description {
  line-height: 1.6;
  margin-bottom: 32px;
  color: #4a5568;
}

.blog-no-frame .blog-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid #f7fafc;
  margin-top: auto;
  width: 100%;
  gap: 12px;
}

.blog-no-frame .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-no-frame .blog-link:hover {
  color: #5a67d8;
}

.blog-no-frame .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.blog-no-frame .blog-stats,
.blog-no-frame .blog-comments {
  color: #a0aec0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  margin-left: auto;
}

.blog-no-frame .blog-stats {
  margin-right: 12px;
  padding-right: 12px;
  border-right: 2px solid #e2e8f0;
}

.blog-no-frame .blog-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.blog-no-frame .blog-author {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.blog-no-frame .author-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center;
}

.blog-no-frame .author-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding-left: 16px;
}

.blog-no-frame .author-name {
  font-weight: 500;
  color: #1a202c;
}

.blog-no-frame .author-role {
  color: #a0aec0;
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-top: 2px;
  text-transform: uppercase;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-no-frame {
    padding: 48px 0;
  }
  
  .blog-no-frame .blog-container {
    padding: 0 16px;
  }
  
  .blog-no-frame .blog-grid {
    margin: -24px;
  }
  
  .blog-no-frame .blog-card {
    padding: 24px;
  }
  
  .blog-no-frame .blog-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .blog-no-frame .blog-stats,
  .blog-no-frame .blog-comments {
    margin-left: 0;
  }
  
  .blog-no-frame .blog-stats {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
}`;class yh extends L{constructor(){super(...arguments);r(this,"name","Blog No Frame");r(this,"contentCategories",["flow"]);r(this,"html",vh);r(this,"css",Ch);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["blog-no-frame"])}matcher(t){return D(t,"blog-no-frame")}}const Qh=`<section class="blog-rectangle">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <h2 class="blog-category">CATEGORY</h2>
          <h1 class="blog-title">Raclette Blueberry Nextious Level</h1>
          <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
          <div class="blog-footer">
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <h2 class="blog-category">CATEGORY</h2>
          <h1 class="blog-title">Ennui Snackwave Thundercats</h1>
          <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
          <div class="blog-footer">
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <h2 class="blog-category">CATEGORY</h2>
          <h1 class="blog-title">Selvage Poke Waistcoat Godard</h1>
          <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
          <div class="blog-footer">
            <span class="blog-stats">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>1.2K
            </span>
            <span class="blog-comments">
              <svg class="blog-icon" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>6
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,Fh=`.blog-rectangle {
  color: #718096;
  padding: 96px 0;
}

.blog-rectangle .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-rectangle .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.blog-rectangle .blog-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 1024px) {
  .blog-rectangle .blog-card {
    width: 33.333333%;
  }
}

.blog-rectangle .blog-card-inner {
  height: 100%;
  background-color: #f7fafc;
  background-opacity: 0.75;
  padding: 64px 32px 96px;
  border-radius: 8px;
  overflow: hidden;
  text-align: center;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.blog-rectangle .blog-card-inner:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.blog-rectangle .blog-category {
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 500;
  color: #a0aec0;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.blog-rectangle .blog-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 12px;
  line-height: 1.4;
}

@media (min-width: 640px) {
  .blog-rectangle .blog-title {
    font-size: 32px;
  }
}

.blog-rectangle .blog-description {
  line-height: 1.6;
  margin-bottom: 12px;
  color: #4a5568;
}

.blog-rectangle .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-rectangle .blog-link:hover {
  color: #5a67d8;
}

.blog-rectangle .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.blog-rectangle .blog-footer {
  text-align: center;
  margin-top: 8px;
  display: flex;
  justify-content: center;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 16px;
}

.blog-rectangle .blog-stats,
.blog-rectangle .blog-comments {
  color: #a0aec0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
}

.blog-rectangle .blog-stats {
  margin-right: 12px;
  padding-right: 12px;
  border-right: 2px solid #e2e8f0;
}

.blog-rectangle .blog-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .blog-rectangle {
    padding: 48px 0;
  }
  
  .blog-rectangle .blog-container {
    padding: 0 16px;
  }
  
  .blog-rectangle .blog-card-inner {
    padding: 32px 24px 64px;
  }
}`;class kh extends L{constructor(){super(...arguments);r(this,"name","Blog Rectangle");r(this,"contentCategories",["flow"]);r(this,"html",Qh);r(this,"css",Fh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["blog-rectangle"])}matcher(t){return D(t,"blog-rectangle")}}const Uh=`<section class="blog-simple">
  <div class="blog-container">
    <div class="blog-grid">
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">The 400 Blows</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Alper Kamu</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Shooting Stars</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Holden Caulfield</span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div class="blog-card">
        <div class="blog-card-inner">
          <div class="blog-date">
            <span class="blog-month">Jul</span>
            <span class="blog-day">18</span>
          </div>
          <div class="blog-content">
            <h2 class="blog-category">CATEGORY</h2>
            <h1 class="blog-title">Neptune</h1>
            <p class="blog-description">Photo booth fam kinfolk cold-pressed sriracha leggings jianbing microdosing tousled waistcoat.</p>
            <a class="blog-author">
              <img alt="blog" src="/images/builder/placeholder.svg" class="author-image">
              <span class="author-info">
                <span class="author-name">Henry Letham</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,jh=`.blog-simple {
  color: #718096;
  padding: 96px 0;
}

.blog-simple .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-simple .blog-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px;
}

.blog-simple .blog-card {
  padding: 32px 16px;
  width: 100%;
}

@media (min-width: 1024px) {
  .blog-simple .blog-card {
    width: 33.333333%;
  }
}

.blog-simple .blog-card-inner {
  height: 100%;
  display: flex;
  align-items: flex-start;
}

.blog-simple .blog-date {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  text-align: center;
}

.blog-simple .blog-month {
  color: #a0aec0;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 14px;
}

.blog-simple .blog-day {
  font-weight: 500;
  font-size: 18px;
  color: #2d3748;
  line-height: 1;
}

.blog-simple .blog-content {
  flex-grow: 1;
  padding-left: 24px;
}

.blog-simple .blog-category {
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 500;
  color: #667eea;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.blog-simple .blog-title {
  font-size: 20px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 12px;
  line-height: 1.4;
}

.blog-simple .blog-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.blog-simple .blog-author {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.blog-simple .author-image {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center;
}

.blog-simple .author-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding-left: 12px;
}

.blog-simple .author-name {
  font-weight: 500;
  color: #1a202c;
  font-size: 14px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .blog-simple {
    padding: 48px 0;
  }
  
  .blog-simple .blog-container {
    padding: 0 16px;
  }
  
  .blog-simple .blog-card {
    padding: 24px 16px;
  }
  
  .blog-simple .blog-content {
    padding-left: 16px;
  }
}`;class ol extends L{constructor(){super(...arguments);r(this,"name","Blog Simple");r(this,"contentCategories",["flow"]);r(this,"html",Uh);r(this,"css",jh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["blog-simple"])}matcher(t){return D(t,"blog-simple")}}const Eh=`<section class="blog-timeline">
  <div class="blog-container">
    <div class="blog-timeline-list">
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Bitters hashtag waistcoat fashion axe chia unicorn</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Meditation bushwick direct trade taxidermy shaman</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="blog-timeline-item">
        <div class="blog-meta">
          <span class="blog-category">CATEGORY</span>
          <span class="blog-date">12 Jun 2019</span>
        </div>
        <div class="blog-content">
          <h2 class="blog-title">Woke master cleanse drinking vinegar salvia</h2>
          <p class="blog-description">Glossier echo park pug, church-key sartorial biodiesel vexillologist pop-up snackwave ramps cornhole. Marfa 3 wolf moon party messenger bag selfies, poke vaporware kombucha lumbersexual pork belly polaroid hoodie portland craft beer.</p>
          <a class="blog-link">Learn More
            <svg class="blog-arrow" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,Ih=`.blog-timeline {
  color: #718096;
  padding: 96px 0;
  overflow: hidden;
}

.blog-timeline .blog-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.blog-timeline .blog-timeline-list {
  margin: -32px 0;
}

.blog-timeline .blog-timeline-item {
  padding: 32px 0;
  display: flex;
  flex-wrap: wrap;
  border-bottom: 2px solid #f7fafc;
}

.blog-timeline .blog-timeline-item:last-child {
  border-bottom: none;
}

@media (min-width: 768px) {
  .blog-timeline .blog-timeline-item {
    flex-wrap: nowrap;
  }
}

.blog-timeline .blog-meta {
  width: 100%;
  margin-bottom: 24px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .blog-timeline .blog-meta {
    width: 256px;
    margin-bottom: 0;
  }
}

.blog-timeline .blog-category {
  font-weight: 600;
  color: #4a5568;
  text-transform: uppercase;
  font-size: 14px;
}

.blog-timeline .blog-date {
  margin-top: 4px;
  color: #a0aec0;
  font-size: 14px;
}

.blog-timeline .blog-content {
  flex-grow: 1;
}

@media (min-width: 768px) {
  .blog-timeline .blog-content {
    padding-left: 24px;
  }
}

.blog-timeline .blog-title {
  font-size: 32px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 8px;
  line-height: 1.4;
}

.blog-timeline .blog-description {
  line-height: 1.6;
  color: #4a5568;
  margin-bottom: 16px;
}

.blog-timeline .blog-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.blog-timeline .blog-link:hover {
  color: #5a67d8;
}

.blog-timeline .blog-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .blog-timeline {
    padding: 48px 0;
  }
  
  .blog-timeline .blog-container {
    padding: 0 16px;
  }
  
  .blog-timeline .blog-timeline-item {
    padding: 24px 0;
  }
  
  .blog-timeline .blog-title {
    font-size: 24px;
  }
  
  .blog-timeline .blog-meta {
    margin-bottom: 16px;
  }
}`;class Sh extends L{constructor(){super(...arguments);r(this,"name","Blog Timeline");r(this,"contentCategories",["flow"]);r(this,"html",Eh);r(this,"css",Ih);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["blog-timeline"])}matcher(t){return D(t,"blog-timeline")}}const Hh=`<section class="contact-full-map">
  <div class="map-background">
    <iframe 
      width="100%" 
      height="100%" 
      frameborder="0" 
      marginheight="0" 
      marginwidth="0" 
      title="map" 
      scrolling="no" 
      src="https://maps.google.com/maps?width=100%&height=600&hl=en&q=New+York+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed"
      class="map-iframe">
    </iframe>
  </div>
  <div class="contact-container">
    <div class="contact-form-wrapper">
      <h2 class="form-title">Feedback</h2>
      <p class="form-description">Post-ironic portland shabby chic echo park, banjo fashion axe</p>
      <div class="form-field">
        <label for="email" class="field-label">Email</label>
        <input type="email" id="email" name="email" class="field-input">
      </div>
      <div class="form-field">
        <label for="message" class="field-label">Message</label>
        <textarea id="message" name="message" class="field-textarea"></textarea>
      </div>
      <button class="submit-button">Button</button>
      <p class="form-note">Chicharrones blog helvetica normcore iceland tousled brook viral artisan.</p>
    </div>
  </div>
</section>`,Lh=`.contact-full-map {
  color: #718096;
  position: relative;
  min-height: 600px;
}

.contact-full-map .map-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
}

.contact-full-map .map-iframe {
  filter: grayscale(1) contrast(1.2) opacity(0.4);
}

.contact-full-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
  display: flex;
  position: relative;
  z-index: 10;
}

.contact-full-map .contact-form-wrapper {
  background-color: white;
  border-radius: 8px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 40px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@media (min-width: 768px) {
  .contact-full-map .contact-form-wrapper {
    width: 50%;
    margin-left: auto;
    margin-top: 0;
  }
}

@media (min-width: 1024px) {
  .contact-full-map .contact-form-wrapper {
    width: 33.333333%;
  }
}

.contact-full-map .form-title {
  color: #1a202c;
  font-size: 18px;
  margin-bottom: 4px;
  font-weight: 500;
}

.contact-full-map .form-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.contact-full-map .form-field {
  position: relative;
  margin-bottom: 16px;
}

.contact-full-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-full-map .field-input,
.contact-full-map .field-textarea {
  width: 100%;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 8px 12px;
  line-height: 2;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.contact-full-map .field-input:focus,
.contact-full-map .field-textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-full-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-full-map .submit-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-full-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-full-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-full-map .form-note {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 12px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .contact-full-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-full-map .contact-form-wrapper {
    padding: 24px;
  }
}`;class Nh extends L{constructor(){super(...arguments);r(this,"name","Contact Full Map");r(this,"contentCategories",["flow"]);r(this,"html",Hh);r(this,"css",Lh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(cn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["contact-full-map"])}matcher(t){return D(t,"contact-full-map")}}const Th=`<section class="contact-no-map">
  <div class="contact-container">
    <div class="contact-header">
      <h1 class="header-title">Contact Us</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify.</p>
    </div>
    <div class="form-wrapper">
      <div class="form-grid">
        <div class="form-field half-width">
          <div class="field-inner">
            <label for="name" class="field-label">Name</label>
            <input type="text" id="name" name="name" class="field-input">
          </div>
        </div>
        <div class="form-field half-width">
          <div class="field-inner">
            <label for="email" class="field-label">Email</label>
            <input type="email" id="email" name="email" class="field-input">
          </div>
        </div>
        <div class="form-field full-width">
          <div class="field-inner">
            <label for="message" class="field-label">Message</label>
            <textarea id="message" name="message" class="field-textarea"></textarea>
          </div>
        </div>
        <div class="form-field full-width">
          <button class="submit-button">Button</button>
        </div>
        <div class="contact-footer">
          <a class="contact-email">example@email.com</a>
          <p class="contact-address">49 Smith St.<br>Saint Cloud, MN 56301</p>
          <div class="social-links">
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
              </svg>
            </a>
            <a class="social-link">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,Dh=`.contact-no-map {
  color: #718096;
  position: relative;
}

.contact-no-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
}

.contact-no-map .contact-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 48px;
}

.contact-no-map .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .contact-no-map .header-title {
    font-size: 30px;
  }
}

.contact-no-map .header-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  max-width: 66.666667%;
  color: #4a5568;
}

.contact-no-map .form-wrapper {
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 768px) {
  .contact-no-map .form-wrapper {
    width: 66.666667%;
  }
}

@media (min-width: 1024px) {
  .contact-no-map .form-wrapper {
    width: 50%;
  }
}

.contact-no-map .form-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -8px;
}

.contact-no-map .form-field {
  padding: 8px;
}

.contact-no-map .half-width {
  width: 50%;
}

.contact-no-map .full-width {
  width: 100%;
}

.contact-no-map .field-inner {
  position: relative;
}

.contact-no-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-no-map .field-input,
.contact-no-map .field-textarea {
  width: 100%;
  background-color: #f7fafc;
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 8px 12px;
  line-height: 2;
  transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.contact-no-map .field-input:focus,
.contact-no-map .field-textarea:focus {
  border-color: #667eea;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-no-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-no-map .submit-button {
  display: flex;
  margin: 0 auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-no-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-no-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-no-map .contact-footer {
  padding: 8px;
  width: 100%;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.contact-no-map .contact-email {
  color: #667eea;
  text-decoration: none;
}

.contact-no-map .contact-email:hover {
  color: #5a67d8;
}

.contact-no-map .contact-address {
  line-height: 1.4;
  margin: 20px 0;
  color: #4a5568;
}

.contact-no-map .social-links {
  display: inline-flex;
  gap: 16px;
}

.contact-no-map .social-link {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.2s ease;
}

.contact-no-map .social-link:hover {
  color: #667eea;
}

.contact-no-map .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .contact-no-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-no-map .header-description {
    max-width: 100%;
  }
  
  .contact-no-map .form-wrapper {
    width: 100%;
  }
  
  .contact-no-map .half-width {
    width: 100%;
  }
}`;class Mh extends L{constructor(){super(...arguments);r(this,"name","Contact No Map");r(this,"contentCategories",["flow"]);r(this,"html",Th);r(this,"css",Dh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(cn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["contact-no-map"])}matcher(t){return D(t,"contact-no-map")}}const Kh=`<section class="contact-small-map">
  <div class="contact-container">
    <div class="contact-layout">
      <div class="map-section">
        <iframe 
          width="100%" 
          height="100%" 
          class="map-iframe" 
          frameborder="0" 
          title="map" 
          marginheight="0" 
          marginwidth="0" 
          scrolling="no" 
          src="https://maps.google.com/maps?width=100%&height=600&hl=en&q=New+York+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed">
        </iframe>
        <div class="contact-info">
          <div class="info-section">
            <h2 class="info-title">ADDRESS</h2>
            <p class="info-text">Photo booth tattooed prism, portland taiyaki hoodie neutra typewriter</p>
          </div>
          <div class="info-section">
            <h2 class="info-title">EMAIL</h2>
            <a class="info-link">example@email.com</a>
            <h2 class="info-title info-title-spaced">PHONE</h2>
            <p class="info-text">123-456-7890</p>
          </div>
        </div>
      </div>
      <div class="form-section">
        <h2 class="form-title">Feedback</h2>
        <p class="form-description">Post-ironic portland shabby chic echo park, banjo fashion axe</p>
        <div class="form-field">
          <label for="name" class="field-label">Name</label>
          <input type="text" id="name" name="name" class="field-input">
        </div>
        <div class="form-field">
          <label for="email" class="field-label">Email</label>
          <input type="email" id="email" name="email" class="field-input">
        </div>
        <div class="form-field">
          <label for="message" class="field-label">Message</label>
          <textarea id="message" name="message" class="field-textarea"></textarea>
        </div>
        <button class="submit-button">Button</button>
        <p class="form-note">Chicharrones blog helvetica normcore iceland tousled brook viral artisan.</p>
      </div>
    </div>
  </div>
</section>`,Rh=`.contact-small-map {
  color: #718096;
  position: relative;
}

.contact-small-map .contact-container {
  max-width: 1200px;
  padding: 96px 20px;
  margin: 0 auto;
}

.contact-small-map .contact-layout {
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .contact-small-map .contact-layout {
    flex-wrap: nowrap;
  }
}

.contact-small-map .map-section {
  background-color: #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  padding: 40px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  position: relative;
  width: 100%;
  margin-bottom: 40px;
  min-height: 400px;
}

@media (min-width: 640px) {
  .contact-small-map .map-section {
    margin-right: 40px;
    margin-bottom: 0;
  }
}

@media (min-width: 768px) {
  .contact-small-map .map-section {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .contact-small-map .map-section {
    width: 66.666667%;
  }
}

.contact-small-map .map-iframe {
  position: absolute;
  top: 0;
  left: 0;
  filter: grayscale(1) contrast(1.2) opacity(0.4);
}

.contact-small-map .contact-info {
  background-color: white;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.contact-small-map .info-section {
  padding: 0 24px;
  width: 100%;
  margin-top: 16px;
}

@media (min-width: 1024px) {
  .contact-small-map .info-section {
    width: 50%;
    margin-top: 0;
  }
  
  .contact-small-map .info-section:first-child {
    margin-top: 0;
  }
}

.contact-small-map .info-title {
  font-weight: 600;
  color: #1a202c;
  letter-spacing: 0.1em;
  font-size: 12px;
  text-transform: uppercase;
}

.contact-small-map .info-title-spaced {
  margin-top: 16px;
}

.contact-small-map .info-text {
  margin-top: 4px;
  color: #4a5568;
  line-height: 1.6;
}

.contact-small-map .info-link {
  color: #667eea;
  line-height: 1.6;
  text-decoration: none;
}

.contact-small-map .info-link:hover {
  color: #5a67d8;
}

.contact-small-map .form-section {
  background-color: white;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 32px 0;
  margin-top: 32px;
}

@media (min-width: 768px) {
  .contact-small-map .form-section {
    width: 50%;
    margin-left: auto;
    padding: 32px 0;
    margin-top: 0;
  }
}

@media (min-width: 1024px) {
  .contact-small-map .form-section {
    width: 33.333333%;
  }
}

.contact-small-map .form-title {
  color: #1a202c;
  font-size: 18px;
  margin-bottom: 4px;
  font-weight: 500;
}

.contact-small-map .form-description {
  line-height: 1.6;
  margin-bottom: 20px;
  color: #4a5568;
}

.contact-small-map .form-field {
  position: relative;
  margin-bottom: 16px;
}

.contact-small-map .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #4a5568;
  display: block;
  margin-bottom: 4px;
}

.contact-small-map .field-input,
.contact-small-map .field-textarea {
  width: 100%;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 8px 12px;
  line-height: 2;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.contact-small-map .field-input:focus,
.contact-small-map .field-textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.contact-small-map .field-textarea {
  height: 128px;
  resize: none;
  line-height: 1.5;
}

.contact-small-map .submit-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.contact-small-map .submit-button:hover {
  background-color: #5a67d8;
}

.contact-small-map .submit-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.contact-small-map .form-note {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 12px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .contact-small-map .contact-container {
    padding: 48px 16px;
  }
  
  .contact-small-map .map-section {
    padding: 24px;
    min-height: 300px;
  }
  
  .contact-small-map .contact-info {
    padding: 16px;
  }
  
  .contact-small-map .info-section {
    padding: 0 12px;
  }
}`;class zh extends L{constructor(){super(...arguments);r(this,"name","Contact Small Map");r(this,"contentCategories",["flow"]);r(this,"html",Kh);r(this,"css",Rh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(cn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["contact-small-map"])}matcher(t){return D(t,"contact-small-map")}}const Oh=`<section class="content-bordered">
  <div class="content-container">
    <div class="header-section">
      <div class="header-left">
        <h1 class="header-title">Pitchfork Kickstarter Taxidermy</h1>
        <div class="header-accent"></div>
      </div>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.</p>
    </div>
    <div class="content-grid">
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/720x400" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Chichen Itza</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/721x401" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Colosseum Roma</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/722x402" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">Great Pyramid of Giza</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
      <div class="content-card">
        <div class="card-inner">
          <img class="card-image" src="https://dummyimage.com/723x403" alt="content">
          <h3 class="card-subtitle">SUBTITLE</h3>
          <h2 class="card-title">San Francisco</h2>
          <p class="card-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        </div>
      </div>
    </div>
  </div>
</section>`,Ph=`.content-bordered {
  color: #718096;
  padding: 96px 0;
}

.content-bordered .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-bordered .header-section {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 80px;
}

.content-bordered .header-left {
  width: 100%;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .content-bordered .header-left {
    width: 50%;
    margin-bottom: 0;
  }
}

.content-bordered .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-bordered .header-title {
    font-size: 30px;
  }
}

.content-bordered .header-accent {
  height: 4px;
  width: 80px;
  background-color: #667eea;
  border-radius: 2px;
}

.content-bordered .header-description {
  width: 100%;
  line-height: 1.6;
  color: #a0aec0;
  font-size: 16px;
}

@media (min-width: 1024px) {
  .content-bordered .header-description {
    width: 50%;
  }
}

.content-bordered .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.content-bordered .content-card {
  width: 100%;
  padding: 16px;
}

@media (min-width: 768px) {
  .content-bordered .content-card {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-bordered .content-card {
    width: 25%;
  }
}

.content-bordered .card-inner {
  background-color: #f7fafc;
  padding: 24px;
  border-radius: 8px;
}

.content-bordered .card-image {
  height: 160px;
  border-radius: 8px;
  width: 100%;
  object-fit: cover;
  object-position: center;
  margin-bottom: 24px;
}

.content-bordered .card-subtitle {
  letter-spacing: 0.1em;
  color: #667eea;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.content-bordered .card-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin: 4px 0 16px 0;
}

.content-bordered .card-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-bordered {
    padding: 48px 0;
  }
  
  .content-bordered .content-container {
    padding: 0 16px;
  }
  
  .content-bordered .header-section {
    margin-bottom: 48px;
  }
  
  .content-bordered .card-inner {
    padding: 20px;
  }
  
  .content-bordered .card-image {
    height: 140px;
  }
}`;class Vh extends L{constructor(){super(...arguments);r(this,"name","Content Bordered");r(this,"contentCategories",["flow"]);r(this,"html",Oh);r(this,"css",Ph);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Cs,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-bordered"])}matcher(t){return D(t,"content-bordered")}}const Gh=`<section class="content-categories">
  <div class="content-container">
    <div class="content-left">
      <h1 class="main-title">Pitchfork Kickstarter Taxidermy</h1>
      <p class="main-description">Locavore cardigan small batch roof party blue bottle blog meggings sartorial jean shorts kickstarter migas sriracha church-key synth succulents. Actually taiyaki neutra, distillery gastropub pok pok ugh.</p>
      <a class="learn-more-link">Learn More
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </a>
    </div>
    <div class="content-right">
      <h2 class="categories-title">CATEGORIES</h2>
      <nav class="categories-nav">
        <a class="category-link">First Link</a>
        <a class="category-link">Second Link</a>
        <a class="category-link">Third Link</a>
        <a class="category-link">Fourth Link</a>
        <a class="category-link">Fifth Link</a>
        <a class="category-link">Sixth Link</a>
        <a class="category-link">Seventh Link</a>
        <a class="category-link">Eighth Link</a>
      </nav>
    </div>
  </div>
</section>`,_h=`.content-categories {
  color: #718096;
  padding: 96px 0;
}

.content-categories .content-container {
  max-width: 1200px;
  display: flex;
  flex-wrap: wrap;
  padding: 0 20px;
  margin: 0 auto;
  align-items: center;
}

.content-categories .content-left {
  width: 100%;
  padding-right: 0;
  padding: 32px 0;
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #e2e8f0;
}

@media (min-width: 768px) {
  .content-categories .content-left {
    width: 50%;
    padding-right: 48px;
    border-right: 1px solid #e2e8f0;
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 32px;
  }
}

.content-categories .main-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-categories .main-title {
    font-size: 30px;
  }
}

.content-categories .main-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
}

.content-categories .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-categories .learn-more-link:hover {
  color: #5a67d8;
}

.content-categories .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.content-categories .content-right {
  width: 100%;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .content-categories .content-right {
    width: 50%;
    padding-left: 48px;
  }
}

.content-categories .categories-title {
  font-weight: 600;
  color: #2d3748;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.content-categories .categories-nav {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin-bottom: -4px;
}

.content-categories .category-link {
  width: 50%;
  margin-bottom: 4px;
  color: #718096;
  text-decoration: none;
  transition: color 0.2s ease;
  cursor: pointer;
}

@media (min-width: 1024px) {
  .content-categories .category-link {
    width: 33.333333%;
  }
}

.content-categories .category-link:hover {
  color: #2d3748;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-categories {
    padding: 48px 0;
  }
  
  .content-categories .content-container {
    padding: 0 16px;
  }
}`;class qh extends L{constructor(){super(...arguments);r(this,"name","Content Categories");r(this,"contentCategories",["flow"]);r(this,"html",Gh);r(this,"css",_h);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Iu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-categories"])}matcher(t){return D(t,"content-categories")}}const Wh=`<section class="content-details">
  <div class="content-container">
    <div class="content-wrapper">
      <div class="hero-image">
        <img alt="content" class="hero-img" src="https://dummyimage.com/1200x500">
      </div>
      <div class="content-section">
        <div class="profile-section">
          <div class="profile-avatar">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="avatar-icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="profile-info">
            <h2 class="profile-name">Phoebe Caulfield</h2>
            <div class="profile-accent"></div>
            <p class="profile-description">Raclette knausgaard hella meggs normcore williamsburg enamel pin sartorial venmo tbh hot chicken gentrify portland.</p>
          </div>
        </div>
        <div class="content-text">
          <p class="main-text">Meggings portland fingerstache lyft, post-ironic fixie man bun banh mi umami everyday carry hexagon locavore direct trade art party. Locavore small batch listicle gastropub farm-to-table lumbersexual salvia messenger bag. Coloring book flannel truffaut craft beer drinking vinegar sartorial, disrupt fashion axe normcore meh butcher. Portland 90's scenester vexillologist forage post-ironic asymmetrical, chartreuse disrupt butcher paleo intelligentsia pabst before they sold out four loko. 3 wolf moon brooklyn.</p>
          <a class="learn-more-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,Xh=`.content-details {
  color: #718096;
  padding: 96px 0;
}

.content-details .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.content-details .content-wrapper {
  width: 100%;
}

@media (min-width: 1024px) {
  .content-details .content-wrapper {
    width: 83.333333%;
    margin: 0 auto;
  }
}

.content-details .hero-image {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 40px;
}

.content-details .hero-img {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-details .content-section {
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .content-details .content-section {
    flex-direction: row;
  }
}

.content-details .profile-section {
  width: 100%;
  text-align: center;
  padding-right: 0;
  padding: 32px 0;
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

@media (min-width: 640px) {
  .content-details .profile-section {
    width: 33.333333%;
    padding-right: 32px;
    border-right: 1px solid #e2e8f0;
    border-top: none;
    margin-bottom: 0;
    padding-top: 32px;
  }
}

.content-details .profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #e2e8f0;
  color: #a0aec0;
  margin-bottom: 16px;
}

.content-details .avatar-icon {
  width: 40px;
  height: 40px;
}

.content-details .profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
}

.content-details .profile-name {
  font-weight: 500;
  margin-top: 16px;
  color: #1a202c;
  font-size: 18px;
}

.content-details .profile-accent {
  width: 48px;
  height: 4px;
  background-color: #667eea;
  border-radius: 2px;
  margin: 8px 0 16px 0;
}

.content-details .profile-description {
  font-size: 16px;
  color: #4a5568;
  line-height: 1.6;
}

.content-details .content-text {
  width: 100%;
  padding-left: 0;
  border-left: none;
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
  padding-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .content-details .content-text {
    width: 66.666667%;
    padding-left: 32px;
    border-left: 1px solid #e2e8f0;
    border-top: none;
    margin-top: 0;
    padding-top: 32px;
    text-align: left;
  }
}

.content-details .main-text {
  line-height: 1.6;
  font-size: 18px;
  margin-bottom: 16px;
  color: #4a5568;
}

.content-details .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-details .learn-more-link:hover {
  color: #5a67d8;
}

.content-details .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .content-details {
    padding: 48px 0;
  }
  
  .content-details .content-container {
    padding: 0 16px;
  }
  
  .content-details .hero-image {
    height: 200px;
    margin-bottom: 24px;
  }
  
  .content-details .profile-section {
    padding: 24px 0 16px 0;
  }
  
  .content-details .content-text {
    padding-top: 16px;
  }
}`;class Yh extends L{constructor(){super(...arguments);r(this,"name","Content Details");r(this,"contentCategories",["flow"]);r(this,"html",Wh);r(this,"css",Xh);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Lo,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-details"])}matcher(t){return D(t,"content-details")}}const Jh=`<section class="content-divided">
  <div class="content-container">
    <div class="content-header">
      <h2 class="header-subtitle">ROOF PARTY POLAROID</h2>
      <h1 class="header-title">Master Cleanse Reliac Heirloom</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.</p>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <h2 class="item-title">Shooting Stars</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">Neptune</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <h2 class="item-title">Melanchole</h2>
        <p class="item-description">Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
    <button class="cta-button">Button</button>
  </div>
</section>`,$h=`.content-divided {
  color: #718096;
  padding: 96px 0;
}

.content-divided .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-divided .content-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 80px;
}

.content-divided .header-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.content-divided .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-divided .header-title {
    font-size: 30px;
  }
}

.content-divided .header-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  max-width: 66.666667%;
  color: #4a5568;
}

.content-divided .content-grid {
  display: flex;
  flex-wrap: wrap;
}

.content-divided .content-item {
  padding: 24px 32px;
  border-left: 2px solid #e2e8f0;
  width: 100%;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .content-divided .content-item {
    width: 100%;
    margin-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .content-divided .content-item {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-divided .content-item {
    width: 25%;
  }
}

.content-divided .item-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .content-divided .item-title {
    font-size: 20px;
  }
}

.content-divided .item-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 16px;
  color: #4a5568;
}

.content-divided .item-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-divided .item-link:hover {
  color: #5a67d8;
}

.content-divided .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.content-divided .cta-button {
  display: flex;
  margin: 64px auto 0;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.content-divided .cta-button:hover {
  background-color: #5a67d8;
}

.content-divided .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-divided {
    padding: 48px 0;
  }
  
  .content-divided .content-container {
    padding: 0 16px;
  }
  
  .content-divided .header-description {
    max-width: 100%;
  }
  
  .content-divided .content-header {
    margin-bottom: 48px;
  }
  
  .content-divided .content-item {
    padding: 16px 24px;
  }
}`;class Zh extends L{constructor(){super(...arguments);r(this,"name","Content Divided");r(this,"contentCategories",["flow"]);r(this,"html",Jh);r(this,"css",$h);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Cs,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-divided"])}matcher(t){return D(t,"content-divided")}}const ef=`<section class="content-icons">
  <div class="content-container">
    <div class="header-section">
      <h1 class="header-title">Pitchfork Kickstarter Taxidermy</h1>
      <p class="header-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table.</p>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <h2 class="item-title">Shooting Stars</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
            </svg>
          </div>
          <h2 class="item-title">The Catalyzer</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2 class="item-title">Neptune</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path>
            </svg>
          </div>
          <h2 class="item-title">Melanchole</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
            </svg>
          </div>
          <h2 class="item-title">Bunker</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
      <div class="content-item">
        <div class="item-inner">
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="icon" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h2 class="item-title">Ramona Falls</h2>
          <p class="item-description">Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.</p>
        </div>
      </div>
    </div>
    <button class="cta-button">Button</button>
  </div>
</section>`,tf=`.content-icons {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-icons .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-icons .header-section {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 80px;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.content-icons .header-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .content-icons .header-title {
    font-size: 30px;
  }
}

.content-icons .header-description {
  width: 100%;
  line-height: 1.6;
  color: #a0aec0;
  font-size: 16px;
}

@media (min-width: 1024px) {
  .content-icons .header-description {
    width: 50%;
  }
}

.content-icons .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.content-icons .content-item {
  width: 100%;
  padding: 16px;
}

@media (min-width: 768px) {
  .content-icons .content-item {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .content-icons .content-item {
    width: 33.333333%;
  }
}

.content-icons .item-inner {
  border: 1px solid #e2e8f0;
  padding: 24px;
  border-radius: 8px;
}

.content-icons .icon-wrapper {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 16px;
}

.content-icons .icon {
  width: 24px;
  height: 24px;
}

.content-icons .item-title {
  font-size: 18px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
}

.content-icons .item-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

.content-icons .cta-button {
  display: flex;
  margin: 64px auto 0;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.content-icons .cta-button:hover {
  background-color: #5a67d8;
}

.content-icons .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-icons {
    padding: 48px 0;
  }
  
  .content-icons .content-container {
    padding: 0 16px;
  }
  
  .content-icons .header-section {
    margin-bottom: 48px;
  }
  
  .content-icons .item-inner {
    padding: 20px;
  }
}`;class Af extends L{constructor(){super(...arguments);r(this,"name","Content Icons");r(this,"contentCategories",["flow"]);r(this,"html",ef);r(this,"css",tf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(dn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-icons"])}matcher(t){return D(t,"content-icons")}}const af=`<section class="content-large-images">
  <div class="content-container">
    <div class="content-grid">
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1201x501">
        </div>
        <h2 class="item-title">Buy YouTube Videos</h2>
        <p class="item-description">Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.</p>
        <button class="item-button">Button</button>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1202x502">
        </div>
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.</p>
        <button class="item-button">Button</button>
      </div>
    </div>
  </div>
</section>`,sf=`.content-large-images {
  color: #718096;
  padding: 96px 0;
}

.content-large-images .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-large-images .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
  text-align: center;
}

.content-large-images .content-item {
  width: 100%;
  margin-bottom: 40px;
  padding: 16px;
}

@media (min-width: 640px) {
  .content-large-images .content-item {
    width: 50%;
  }
}

.content-large-images .image-wrapper {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 24px;
}

.content-large-images .content-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-large-images .item-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin: 24px 0 12px 0;
}

.content-large-images .item-description {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 24px;
}

.content-large-images .item-button {
  display: flex;
  margin: 0 auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 20px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.content-large-images .item-button:hover {
  background-color: #5a67d8;
}

.content-large-images .item-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .content-large-images {
    padding: 48px 0;
  }
  
  .content-large-images .content-container {
    padding: 0 16px;
  }
  
  .content-large-images .image-wrapper {
    height: 200px;
    margin-bottom: 20px;
  }
  
  .content-large-images .item-title {
    margin: 20px 0 10px 0;
  }
  
  .content-large-images .item-description {
    margin-bottom: 20px;
  }
}`;class nf extends L{constructor(){super(...arguments);r(this,"name","Content Large Images");r(this,"contentCategories",["flow"]);r(this,"html",af);r(this,"css",sf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(ws,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-large-images"])}matcher(t){return D(t,"content-large-images")}}const rf=`<section class="content-simple">
  <div class="content-container">
    <h2 class="content-title">Kickstarter Actually Pinterest Brunch Bitters Occupy</h2>
    <div class="content-description">
      <p class="description-text">Taxidermy bushwick celiac master cleanse microdosing seitan. Fashion axe four dollar toast truffaut, direct trade kombucha brunch williamsburg keffiyeh gastropub tousled squid meh taiyaki drinking vinegar tacos.</p>
      <div class="action-buttons">
        <button class="primary-button">Button</button>
        <a class="learn-more-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>`,of=`.content-simple {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content-simple .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.content-simple .content-title {
  font-size: 24px;
  color: #1a202c;
  font-weight: 500;
  margin-bottom: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .content-simple .content-title {
    font-size: 30px;
  }
}

@media (min-width: 768px) {
  .content-simple .content-title {
    width: 40%;
    margin-bottom: 0;
  }
}

.content-simple .content-description {
  width: 100%;
}

@media (min-width: 768px) {
  .content-simple .content-description {
    width: 60%;
    padding-left: 24px;
  }
}

.content-simple .description-text {
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .content-simple .description-text {
    margin-bottom: 16px;
  }
}

@media (min-width: 768px) {
  .content-simple .action-buttons {
    margin-top: 16px;
  }
}

.content-simple .action-buttons {
  display: flex;
  margin-top: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.content-simple .primary-button {
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 4px 16px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-right: 16px;
  margin-bottom: 8px;
}

.content-simple .primary-button:hover {
  background-color: #5a67d8;
}

.content-simple .primary-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.content-simple .learn-more-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
  margin-bottom: 8px;
}

.content-simple .learn-more-link:hover {
  color: #5a67d8;
}

.content-simple .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-simple {
    padding: 48px 0;
  }
  
  .content-simple .content-container {
    padding: 0 16px;
  }
  
  .content-simple .content-title {
    margin-bottom: 24px;
  }
  
  .content-simple .action-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .content-simple .primary-button {
    margin-right: 0;
    margin-bottom: 12px;
  }
}`;class lf extends L{constructor(){super(...arguments);r(this,"name","Content Simple");r(this,"contentCategories",["flow"]);r(this,"html",rf);r(this,"css",of);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Uo,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-simple"])}matcher(t){return D(t,"content-simple")}}const cf=`<section class="content-small-images">
  <div class="content-container">
    <div class="header-section">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="header-content">
        <h1 class="header-title">Space The Final Frontier</h1>
        <p class="header-description">Street art subway tile salvia four dollar toast bitters selfies quinoa yuccie synth meditation iPhone intelligentsia prism tofu. Viral gochujang bitters dreamcatcher.</p>
      </div>
    </div>
    <div class="content-grid">
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1203x503">
        </div>
        <h2 class="item-title">Shooting Stars</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1204x504">
        </div>
        <h2 class="item-title">The Catalyzer</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="content-item">
        <div class="image-wrapper">
          <img alt="content" class="content-image" src="https://dummyimage.com/1205x505">
        </div>
        <h2 class="item-title">The 400 Blows</h2>
        <p class="item-description">Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.</p>
        <a class="item-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="link-icon" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>`,df=`.content-small-images {
  color: #718096;
  padding: 96px 0;
}

.content-small-images .content-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.content-small-images .header-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 48px;
}

.content-small-images .progress-bar {
  height: 4px;
  background-color: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 24px;
}

.content-small-images .progress-fill {
  width: 96px;
  height: 100%;
  background-color: #667eea;
}

.content-small-images .header-content {
  display: flex;
  flex-wrap: wrap;
  padding: 24px 0;
}

.content-small-images .header-title {
  width: 100%;
  color: #1a202c;
  font-weight: 500;
  font-size: 24px;
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .content-small-images .header-title {
    width: 40%;
    margin-bottom: 0;
  }
}

.content-small-images .header-description {
  width: 100%;
  line-height: 1.6;
  font-size: 16px;
  padding-left: 0;
  color: #4a5568;
}

@media (min-width: 640px) {
  .content-small-images .header-description {
    width: 60%;
    padding-left: 40px;
  }
}

.content-small-images .content-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -16px -16px;
}

.content-small-images .content-item {
  padding: 16px;
  width: 100%;
  margin-bottom: 0;
}

@media (min-width: 768px) {
  .content-small-images .content-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

@media (min-width: 640px) {
  .content-small-images .content-item {
    margin-bottom: 0;
  }
}

.content-small-images .image-wrapper {
  border-radius: 8px;
  height: 256px;
  overflow: hidden;
  margin-bottom: 20px;
}

.content-small-images .content-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
}

.content-small-images .item-title {
  font-size: 20px;
  font-weight: 500;
  color: #1a202c;
  margin: 20px 0 8px 0;
}

.content-small-images .item-description {
  font-size: 16px;
  line-height: 1.6;
  margin: 8px 0 12px 0;
  color: #4a5568;
}

.content-small-images .item-link {
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  cursor: pointer;
}

.content-small-images .item-link:hover {
  color: #5a67d8;
}

.content-small-images .link-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .content-small-images {
    padding: 48px 0;
  }
  
  .content-small-images .content-container {
    padding: 0 16px;
  }
  
  .content-small-images .header-content {
    padding: 16px 0;
  }
  
  .content-small-images .header-description {
    padding-left: 0;
    margin-top: 16px;
  }
  
  .content-small-images .image-wrapper {
    height: 200px;
  }
  
  .content-small-images .item-title {
    margin: 16px 0 6px 0;
  }
  
  .content-small-images .item-description {
    margin: 6px 0 10px 0;
  }
}`;class uf extends L{constructor(){super(...arguments);r(this,"name","Content Small Images");r(this,"contentCategories",["flow"]);r(this,"html",cf);r(this,"css",df);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Ho,{}));r(this,"specificity",3);r(this,"hiddenClasses",["content-small-images"])}matcher(t){return D(t,"content-small-images")}}const gf=`<section class="cta-ios-android">
  <div class="cta-container">
    <div class="cta-content">
      <div class="cta-text">
        <h2 class="cta-subtitle">ROOF PARTY POLAROID</h2>
        <h1 class="cta-title">Master Cleanse Reliac Heirloom</h1>
      </div>
      <div class="cta-buttons">
        <button class="app-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="app-icon" viewBox="0 0 512 512">
            <path d="M99.617 8.057a50.191 50.191 0 00-38.815-6.713l230.932 230.933 74.846-74.846L99.617 8.057zM32.139 20.116c-6.441 8.563-10.148 19.077-10.148 30.199v411.358c0 11.123 3.708 21.636 10.148 30.199l235.877-235.877L32.139 20.116zM464.261 212.087l-67.266-37.637-81.544 81.544 81.548 81.548 67.273-37.64c16.117-9.03 25.738-25.442 25.738-43.908s-9.621-34.877-25.749-43.907zM291.733 279.711L60.815 510.629c3.786.891 7.639 1.371 11.492 1.371a50.275 50.275 0 0027.31-8.07l266.965-149.372-74.849-74.847z"></path>
          </svg>
          <span class="app-text">
            <span class="app-subtitle">GET IT ON</span>
            <span class="app-title">Google Play</span>
          </span>
        </button>
        <button class="app-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="app-icon" viewBox="0 0 305 305">
            <path d="M40.74 112.12c-25.79 44.74-9.4 112.65 19.12 153.82C74.09 286.52 88.5 305 108.24 305c.37 0 .74 0 1.13-.02 9.27-.37 15.97-3.23 22.45-5.99 7.27-3.1 14.8-6.3 26.6-6.3 11.22 0 18.39 3.1 25.31 6.1 6.83 2.95 13.87 6 24.26 5.81 22.23-.41 35.88-20.35 47.92-37.94a168.18 168.18 0 0021-43l.09-.28a2.5 2.5 0 00-1.33-3.06l-.18-.08c-3.92-1.6-38.26-16.84-38.62-58.36-.34-33.74 25.76-51.6 31-54.84l.24-.15a2.5 2.5 0 00.7-3.51c-18-26.37-45.62-30.34-56.73-30.82a50.04 50.04 0 00-4.95-.24c-13.06 0-25.56 4.93-35.61 8.9-6.94 2.73-12.93 5.09-17.06 5.09-4.64 0-10.67-2.4-17.65-5.16-9.33-3.7-19.9-7.9-31.1-7.9l-.79.01c-26.03.38-50.62 15.27-64.18 38.86z"></path>
            <path d="M212.1 0c-15.76.64-34.67 10.35-45.97 23.58-9.6 11.13-19 29.68-16.52 48.38a2.5 2.5 0 002.29 2.17c1.06.08 2.15.12 3.23.12 15.41 0 32.04-8.52 43.4-22.25 11.94-14.5 17.99-33.1 16.16-49.77A2.52 2.52 0 00212.1 0z"></path>
          </svg>
          <span class="app-text">
            <span class="app-subtitle">Download on the</span>
            <span class="app-title">App Store</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</section>`,pf=`.cta-ios-android {
  color: #718096;
  padding: 96px 0;
}

.cta-ios-android .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
}

.cta-ios-android .cta-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-content {
    flex-direction: row;
  }
}

.cta-ios-android .cta-text {
  display: flex;
  flex-direction: column;
  padding-right: 0;
  margin-bottom: 24px;
  padding: 0;
  width: 100%;
  text-align: center;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-text {
    padding-right: 40px;
    margin-bottom: 0;
    width: auto;
    text-align: left;
  }
}

.cta-ios-android .cta-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.cta-ios-android .cta-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-title {
    font-size: 30px;
  }
}

.cta-ios-android .cta-buttons {
  display: flex;
  margin-left: 0;
  margin-right: 0;
  margin: 0 auto;
  align-items: center;
  flex-shrink: 0;
  gap: 16px;
  flex-direction: column;
}

@media (min-width: 768px) {
  .cta-ios-android .cta-buttons {
    margin-left: auto;
    margin-right: 0;
    flex-direction: row;
  }
}

.cta-ios-android .app-button {
  background-color: #f7fafc;
  display: inline-flex;
  padding: 12px 20px;
  border-radius: 8px;
  align-items: center;
  border: none;
  cursor: pointer;
  outline: none;
  transition: background-color 0.2s ease;
  width: 100%;
  min-width: 200px;
}

@media (min-width: 768px) {
  .cta-ios-android .app-button {
    width: auto;
  }
}

.cta-ios-android .app-button:hover {
  background-color: #e2e8f0;
}

.cta-ios-android .app-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.cta-ios-android .app-icon {
  width: 24px;
  height: 24px;
  color: #374151;
}

.cta-ios-android .app-text {
  margin-left: 16px;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  line-height: 1;
}

.cta-ios-android .app-subtitle {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.cta-ios-android .app-title {
  font-weight: 500;
  color: #1a202c;
  font-size: 16px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .cta-ios-android {
    padding: 48px 0;
  }
  
  .cta-ios-android .cta-container {
    padding: 0 16px;
  }
  
  .cta-ios-android .cta-title {
    font-size: 20px;
  }
  
  .cta-ios-android .cta-buttons {
    gap: 12px;
  }
  
  .cta-ios-android .app-button {
    min-width: 180px;
  }
}`;class mf extends L{constructor(){super(...arguments);r(this,"name","CTA iOS Android");r(this,"contentCategories",["flow"]);r(this,"html",gf);r(this,"css",pf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Su,{}));r(this,"specificity",3);r(this,"hiddenClasses",["cta-ios-android"])}matcher(t){return D(t,"cta-ios-android")}}const hf=`<section class="cta-signup-horizontal">
  <div class="cta-container">
    <div class="cta-header">
      <h1 class="cta-title">Master Cleanse Reliac Heirloom</h1>
      <p class="cta-description">Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep.</p>
    </div>
    <div class="cta-form">
      <div class="form-group">
        <label for="full-name" class="form-label">Full Name</label>
        <input type="text" id="full-name" name="full-name" class="form-input">
      </div>
      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <input type="email" id="email" name="email" class="form-input">
      </div>
      <button class="form-button">Button</button>
    </div>
  </div>
</section>`,ff=`.cta-signup-horizontal {
  color: #718096;
  padding: 96px 0;
}

.cta-signup-horizontal .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.cta-signup-horizontal .cta-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 48px;
}

.cta-signup-horizontal .cta-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #1a202c;
}

@media (min-width: 640px) {
  .cta-signup-horizontal .cta-title {
    font-size: 30px;
  }
}

.cta-signup-horizontal .cta-description {
  margin: 0 auto;
  line-height: 1.6;
  font-size: 16px;
  color: #4a5568;
}

@media (min-width: 1024px) {
  .cta-signup-horizontal .cta-description {
    width: 66.666667%;
  }
}

.cta-signup-horizontal .cta-form {
  display: flex;
  width: 100%;
  flex-direction: column;
  margin: 0 auto;
  padding: 0 32px;
  gap: 16px;
  align-items: end;
}

@media (min-width: 640px) {
  .cta-signup-horizontal .cta-form {
    flex-direction: row;
    gap: 16px;
    padding: 0;
  }
}

@media (min-width: 1024px) {
  .cta-signup-horizontal .cta-form {
    width: 66.666667%;
  }
}

.cta-signup-horizontal .form-group {
  position: relative;
  flex-grow: 1;
  width: 100%;
}

.cta-signup-horizontal .form-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
  display: block;
  margin-bottom: 2px;
}

.cta-signup-horizontal .form-input {
  width: 100%;
  background-color: #f7fafc;
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.cta-signup-horizontal .form-input:focus {
  border-color: #667eea;
  background-color: transparent;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.cta-signup-horizontal .form-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.cta-signup-horizontal .form-button:hover {
  background-color: #5a67d8;
}

.cta-signup-horizontal .form-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .cta-signup-horizontal {
    padding: 48px 0;
  }
  
  .cta-signup-horizontal .cta-container {
    padding: 0 16px;
  }
  
  .cta-signup-horizontal .cta-header {
    margin-bottom: 32px;
  }
  
  .cta-signup-horizontal .cta-form {
    padding: 0 16px;
    gap: 12px;
  }
  
  .cta-signup-horizontal .form-button {
    align-self: stretch;
  }
}`;class xf extends L{constructor(){super(...arguments);r(this,"name","CTA Signup Horizontal");r(this,"contentCategories",["flow"]);r(this,"html",hf);r(this,"css",ff);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(pn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["cta-signup-horizontal"])}matcher(t){return D(t,"cta-signup-horizontal")}}const bf=`<section class="cta-signup-vertical">
  <div class="cta-container">
    <div class="cta-content">
      <div class="cta-text">
        <h1 class="cta-title">Slow-carb next level shoindcgoitch ethical authentic, poko scenester</h1>
        <p class="cta-description">Poke slow-carb mixtape knausgaard, typewriter street art gentrify hammock starladder roathse. Craies vegan tousled etsy austin.</p>
      </div>
      <div class="cta-form">
        <h2 class="form-title">Sign Up</h2>
        <div class="form-group">
          <label for="full-name" class="form-label">Full Name</label>
          <input type="text" id="full-name" name="full-name" class="form-input">
        </div>
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input type="email" id="email" name="email" class="form-input">
        </div>
        <button class="form-button">Button</button>
        <p class="form-note">Literally you probably haven't heard of them jean shorts.</p>
      </div>
    </div>
  </div>
</section>`,wf=`.cta-signup-vertical {
  color: #718096;
  padding: 96px 0;
}

.cta-signup-vertical .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.cta-signup-vertical .cta-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.cta-signup-vertical .cta-text {
  width: 100%;
  padding-right: 0;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .cta-signup-vertical .cta-text {
    width: 50%;
    padding-right: 64px;
    margin-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .cta-signup-vertical .cta-text {
    width: 60%;
  }
}

.cta-signup-vertical .cta-title {
  font-weight: 500;
  font-size: 30px;
  color: #1a202c;
  margin-bottom: 16px;
}

.cta-signup-vertical .cta-description {
  line-height: 1.6;
  color: #4a5568;
  font-size: 16px;
}

.cta-signup-vertical .cta-form {
  width: 100%;
  background-color: #f7fafc;
  border-radius: 8px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  margin-left: 0;
}

@media (min-width: 768px) {
  .cta-signup-vertical .cta-form {
    width: 50%;
    margin-left: auto;
  }
}

@media (min-width: 1024px) {
  .cta-signup-vertical .cta-form {
    width: 33.333333%;
  }
}

.cta-signup-vertical .form-title {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 20px;
}

.cta-signup-vertical .form-group {
  position: relative;
  margin-bottom: 16px;
}

.cta-signup-vertical .form-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
  display: block;
  margin-bottom: 2px;
}

.cta-signup-vertical .form-input {
  width: 100%;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  font-size: 16px;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cta-signup-vertical .form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.cta-signup-vertical .form-button {
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 12px;
}

.cta-signup-vertical .form-button:hover {
  background-color: #5a67d8;
}

.cta-signup-vertical .form-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.cta-signup-vertical .form-note {
  font-size: 12px;
  color: #a0aec0;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .cta-signup-vertical {
    padding: 48px 0;
  }
  
  .cta-signup-vertical .cta-container {
    padding: 0 16px;
  }
  
  .cta-signup-vertical .cta-title {
    font-size: 24px;
  }
  
  .cta-signup-vertical .cta-form {
    padding: 24px;
  }
}`;class Bf extends L{constructor(){super(...arguments);r(this,"name","CTA Signup Vertical");r(this,"contentCategories",["flow"]);r(this,"html",bf);r(this,"css",wf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(ed,{}));r(this,"specificity",3);r(this,"hiddenClasses",["cta-signup-vertical"])}matcher(t){return D(t,"cta-signup-vertical")}}const vf=`<section class="cta-simple">
  <div class="cta-container">
    <div class="cta-content">
      <h1 class="cta-title">Slow-carb next level shoindxgoitch ethical authentic, scenester sriracha forage.</h1>
      <button class="cta-button">Button</button>
    </div>
  </div>
</section>`,Cf=`.cta-simple {
  color: #718096;
  padding: 96px 0;
}

.cta-simple .cta-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.cta-simple .cta-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 640px) {
  .cta-simple .cta-content {
    flex-direction: row;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .cta-simple .cta-content {
    width: 66.666667%;
  }
}

.cta-simple .cta-title {
  flex-grow: 1;
  padding-right: 0;
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 40px;
}

@media (min-width: 640px) {
  .cta-simple .cta-title {
    padding-right: 64px;
    margin-bottom: 0;
  }
}

.cta-simple .cta-button {
  flex-shrink: 0;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  outline: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cta-simple .cta-button:hover {
  background-color: #5a67d8;
}

.cta-simple .cta-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .cta-simple {
    padding: 48px 0;
  }
  
  .cta-simple .cta-container {
    padding: 0 16px;
  }
  
  .cta-simple .cta-title {
    font-size: 20px;
    margin-bottom: 24px;
  }
}`;class yf extends L{constructor(){super(...arguments);r(this,"name","CTA Simple");r(this,"contentCategories",["flow"]);r(this,"html",vf);r(this,"css",Cf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Eo,{}));r(this,"specificity",3);r(this,"hiddenClasses",["cta-simple"])}matcher(t){return D(t,"cta-simple")}}const Qf=`<section class="ecommerce-details-left">
  <div class="ecommerce-container">
    <div class="product-details">
      <div class="product-info">
        <h2 class="brand-name">BRAND NAME</h2>
        <h1 class="product-title">Animated Night Hill Illustrations</h1>
        <div class="product-tabs">
          <a class="tab-link active">Description</a>
          <a class="tab-link">Reviews</a>
          <a class="tab-link">Details</a>
        </div>
        <p class="product-description">Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam inxigo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean.</p>
        <div class="product-specs">
          <div class="spec-row">
            <span class="spec-label">Color</span>
            <span class="spec-value">Blue</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">Size</span>
            <span class="spec-value">Medium</span>
          </div>
          <div class="spec-row final">
            <span class="spec-label">Quantity</span>
            <span class="spec-value">4</span>
          </div>
        </div>
        <div class="purchase-section">
          <span class="product-price">$58.00</span>
          <button class="add-to-cart">Button</button>
          <button class="wishlist-btn">
            <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="heart-icon" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
      <img alt="ecommerce" class="product-image" src="https://dummyimage.com/400x400">
    </div>
  </div>
</section>`,Ff=`.ecommerce-details-left {
  color: #718096;
  overflow: hidden;
  padding: 96px 0;
}

.ecommerce-details-left .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-details-left .product-details {
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-details {
    width: 80%;
  }
}

.ecommerce-details-left .product-info {
  width: 100%;
  padding-right: 0;
  padding: 24px 0;
  margin-bottom: 24px;
  order: 2;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-info {
    width: 50%;
    padding-right: 40px;
    padding: 24px 0;
    margin-bottom: 0;
    order: 1;
  }
}

.ecommerce-details-left .product-image {
  width: 100%;
  height: 256px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  order: 1;
}

@media (min-width: 1024px) {
  .ecommerce-details-left .product-image {
    width: 50%;
    height: auto;
    order: 2;
  }
}

.ecommerce-details-left .brand-name {
  font-size: 14px;
  color: #a0aec0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ecommerce-details-left .product-title {
  color: #1a202c;
  font-size: 30px;
  font-weight: 500;
  margin: 16px 0;
}

.ecommerce-details-left .product-tabs {
  display: flex;
  margin-bottom: 16px;
}

.ecommerce-details-left .tab-link {
  flex-grow: 1;
  color: #a0aec0;
  border-bottom: 2px solid #d2d6dc;
  padding: 8px 4px;
  font-size: 18px;
  cursor: pointer;
  text-align: center;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.ecommerce-details-left .tab-link.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.ecommerce-details-left .tab-link:hover {
  color: #667eea;
}

.ecommerce-details-left .product-description {
  line-height: 1.6;
  margin-bottom: 16px;
  color: #4a5568;
}

.ecommerce-details-left .product-specs {
  margin-bottom: 24px;
}

.ecommerce-details-left .spec-row {
  display: flex;
  border-top: 1px solid #e2e8f0;
  padding: 8px 0;
}

.ecommerce-details-left .spec-row.final {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
}

.ecommerce-details-left .spec-label {
  color: #a0aec0;
}

.ecommerce-details-left .spec-value {
  margin-left: auto;
  color: #1a202c;
}

.ecommerce-details-left .purchase-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.ecommerce-details-left .product-price {
  font-weight: 500;
  font-size: 24px;
  color: #1a202c;
}

.ecommerce-details-left .add-to-cart {
  display: flex;
  margin-left: auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ecommerce-details-left .add-to-cart:hover {
  background-color: #5a67d8;
}

.ecommerce-details-left .add-to-cart:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ecommerce-details-left .wishlist-btn {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  background-color: #e2e8f0;
  padding: 0;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.ecommerce-details-left .wishlist-btn:hover {
  background-color: #cbd5e0;
  color: #e53e3e;
}

.ecommerce-details-left .heart-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .ecommerce-details-left {
    padding: 48px 0;
  }
  
  .ecommerce-details-left .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-details-left .product-title {
    font-size: 24px;
    margin: 12px 0;
  }
  
  .ecommerce-details-left .tab-link {
    font-size: 16px;
    padding: 6px 2px;
  }
  
  .ecommerce-details-left .purchase-section {
    justify-content: space-between;
  }
  
  .ecommerce-details-left .add-to-cart {
    margin-left: 0;
  }
}`;class kf extends L{constructor(){super(...arguments);r(this,"name","Ecommerce Details Left");r(this,"contentCategories",["flow"]);r(this,"html",Qf);r(this,"css",Ff);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Hu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["ecommerce-details-left"])}matcher(t){return D(t,"ecommerce-details-left")}}const Uf=`<section class="ecommerce-details-right">
  <div class="ecommerce-container">
    <div class="product-details">
      <img alt="ecommerce" class="product-image" src="https://dummyimage.com/400x400">
      <div class="product-info">
        <h2 class="brand-name">BRAND NAME</h2>
        <h1 class="product-title">The Catcher in the Rye</h1>
        <div class="rating-social">
          <span class="rating-section">
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="star-icon" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            <span class="review-count">4 Reviews</span>
          </span>
          <span class="social-links">
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
              </svg>
            </a>
            <a class="social-icon">
              <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-svg" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
              </svg>
            </a>
          </span>
        </div>
        <p class="product-description">Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam indxgo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean shorts keytar banjo tattooed umami cardigan.</p>
        <div class="product-options">
          <div class="color-options">
            <span class="option-label">Color</span>
            <button class="color-btn white" aria-label="White color"></button>
            <button class="color-btn gray" aria-label="Gray color"></button>
            <button class="color-btn blue" aria-label="Blue color"></button>
          </div>
          <div class="size-options">
            <span class="option-label">Size</span>
            <div class="size-select">
              <select class="size-dropdown">
                <option>SM</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
              </select>
              <span class="dropdown-icon">
                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="chevron-icon" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div class="purchase-section">
          <span class="product-price">$58.00</span>
          <button class="add-to-cart">Button</button>
          <button class="wishlist-btn">
            <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="heart-icon" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>`,jf=`.ecommerce-details-right {
  color: #718096;
  overflow: hidden;
  padding: 96px 0;
}

.ecommerce-details-right .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-details-right .product-details {
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-details {
    width: 80%;
  }
}

.ecommerce-details-right .product-image {
  width: 100%;
  height: 256px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-image {
    width: 50%;
    height: auto;
    margin-bottom: 0;
  }
}

.ecommerce-details-right .product-info {
  width: 100%;
  padding-left: 0;
  padding: 24px 0;
  margin-top: 0;
}

@media (min-width: 1024px) {
  .ecommerce-details-right .product-info {
    width: 50%;
    padding-left: 40px;
    padding: 24px 0;
    margin-top: 0;
  }
}

.ecommerce-details-right .brand-name {
  font-size: 14px;
  color: #a0aec0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ecommerce-details-right .product-title {
  color: #1a202c;
  font-size: 30px;
  font-weight: 500;
  margin: 4px 0 16px 0;
}

.ecommerce-details-right .rating-social {
  display: flex;
  margin-bottom: 16px;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .rating-social {
    flex-direction: row;
    align-items: center;
  }
}

.ecommerce-details-right .rating-section {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .star-icon {
  width: 16px;
  height: 16px;
  color: #667eea;
}

.ecommerce-details-right .star-icon.filled {
  fill: currentColor;
}

.ecommerce-details-right .review-count {
  color: #718096;
  margin-left: 12px;
}

.ecommerce-details-right .social-links {
  display: flex;
  margin-left: 0;
  padding-left: 0;
  padding: 8px 0;
  border-left: none;
  gap: 8px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .social-links {
    margin-left: 12px;
    padding-left: 12px;
    padding: 8px 0;
    border-left: 2px solid #e2e8f0;
  }
}

.ecommerce-details-right .social-icon {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.ecommerce-details-right .social-icon:hover {
  color: #667eea;
}

.ecommerce-details-right .social-svg {
  width: 20px;
  height: 20px;
}

.ecommerce-details-right .product-description {
  line-height: 1.6;
  color: #4a5568;
  margin-bottom: 24px;
}

.ecommerce-details-right .product-options {
  display: flex;
  margin-top: 24px;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 2px solid #f7fafc;
  margin-bottom: 20px;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .ecommerce-details-right .product-options {
    flex-direction: row;
    gap: 24px;
  }
}

.ecommerce-details-right .color-options {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .option-label {
  margin-right: 12px;
  color: #4a5568;
}

.ecommerce-details-right .color-btn {
  border: 2px solid #d2d6dc;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  outline: none;
  margin-left: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.ecommerce-details-right .color-btn:focus {
  border-color: #667eea;
}

.ecommerce-details-right .color-btn.white {
  background-color: white;
}

.ecommerce-details-right .color-btn.gray {
  background-color: #374151;
}

.ecommerce-details-right .color-btn.blue {
  background-color: #667eea;
}

.ecommerce-details-right .size-options {
  display: flex;
  align-items: center;
}

.ecommerce-details-right .size-select {
  position: relative;
}

.ecommerce-details-right .size-dropdown {
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  padding: 8px 32px 8px 12px;
  outline: none;
  font-size: 16px;
  appearance: none;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ecommerce-details-right .size-dropdown:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.ecommerce-details-right .dropdown-icon {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 40px;
  text-align: center;
  color: #718096;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ecommerce-details-right .chevron-icon {
  width: 16px;
  height: 16px;
}

.ecommerce-details-right .purchase-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.ecommerce-details-right .product-price {
  font-weight: 500;
  font-size: 24px;
  color: #1a202c;
}

.ecommerce-details-right .add-to-cart {
  display: flex;
  margin-left: auto;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ecommerce-details-right .add-to-cart:hover {
  background-color: #5a67d8;
}

.ecommerce-details-right .add-to-cart:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ecommerce-details-right .wishlist-btn {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  background-color: #e2e8f0;
  padding: 0;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.ecommerce-details-right .wishlist-btn:hover {
  background-color: #cbd5e0;
  color: #e53e3e;
}

.ecommerce-details-right .heart-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .ecommerce-details-right {
    padding: 48px 0;
  }
  
  .ecommerce-details-right .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-details-right .product-title {
    font-size: 24px;
  }
  
  .ecommerce-details-right .purchase-section {
    justify-content: space-between;
  }
  
  .ecommerce-details-right .add-to-cart {
    margin-left: 0;
  }
}`;class Ef extends L{constructor(){super(...arguments);r(this,"name","Ecommerce Details Right");r(this,"contentCategories",["flow"]);r(this,"html",Uf);r(this,"css",jf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Lu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["ecommerce-details-right"])}matcher(t){return D(t,"ecommerce-details-right")}}const If=`<section class="ecommerce-simple-grid">
  <div class="ecommerce-container">
    <div class="products-grid">
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/420x260">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The Catalyzer</h2>
          <p class="product-price">$16.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/421x261">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Shooting Stars</h2>
          <p class="product-price">$21.15</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/422x262">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Neptune</h2>
          <p class="product-price">$12.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/423x263">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The 400 Blows</h2>
          <p class="product-price">$18.40</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/424x264">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The Catalyzer</h2>
          <p class="product-price">$16.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/425x265">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Shooting Stars</h2>
          <p class="product-price">$21.15</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/427x267">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">Neptune</h2>
          <p class="product-price">$12.00</p>
        </div>
      </div>
      <div class="product-item">
        <a class="product-link">
          <img alt="ecommerce" class="product-image" src="https://dummyimage.com/428x268">
        </a>
        <div class="product-info">
          <h3 class="product-category">CATEGORY</h3>
          <h2 class="product-title">The 400 Blows</h2>
          <p class="product-price">$18.40</p>
        </div>
      </div>
    </div>
  </div>
</section>`,Sf=`.ecommerce-simple-grid {
  color: #718096;
  padding: 96px 0;
}

.ecommerce-simple-grid .ecommerce-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.ecommerce-simple-grid .products-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.ecommerce-simple-grid .product-item {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .ecommerce-simple-grid .product-item {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .ecommerce-simple-grid .product-item {
    width: 25%;
  }
}

.ecommerce-simple-grid .product-link {
  display: block;
  position: relative;
  height: 192px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ecommerce-simple-grid .product-link:hover {
  transform: translateY(-2px);
}

.ecommerce-simple-grid .product-image {
  object-fit: cover;
  object-position: center;
  width: 100%;
  height: 100%;
  display: block;
}

.ecommerce-simple-grid .product-info {
  margin-top: 16px;
}

.ecommerce-simple-grid .product-category {
  color: #a0aec0;
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.ecommerce-simple-grid .product-title {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
}

.ecommerce-simple-grid .product-price {
  margin-top: 4px;
  color: #4a5568;
  font-weight: 500;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .ecommerce-simple-grid {
    padding: 48px 0;
  }
  
  .ecommerce-simple-grid .ecommerce-container {
    padding: 0 16px;
  }
  
  .ecommerce-simple-grid .product-link {
    height: 160px;
  }
  
  .ecommerce-simple-grid .product-info {
    margin-top: 12px;
  }
}`;class ll extends L{constructor(){super(...arguments);r(this,"name","Ecommerce Simple Grid");r(this,"contentCategories",["flow"]);r(this,"html",If);r(this,"css",Sf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Nu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["ecommerce-simple-grid"])}matcher(t){return D(t,"ecommerce-simple-grid")}}const Hf=`<section class="feature-back-and-forth">
  <div class="feature-container">
    <div class="feature-item">
      <div class="feature-icon">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      </div>
      <div class="feature-content">
        <h2 class="feature-heading">Shooting Stars</h2>
        <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
        <a class="feature-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
    <div class="feature-item reverse">
      <div class="feature-content">
        <h2 class="feature-heading">The Catalyzer</h2>
        <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
        <a class="feature-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
      <div class="feature-icon">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
        </svg>
      </div>
    </div>
    <div class="feature-item">
      <div class="feature-icon">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="feature-content">
        <h2 class="feature-heading">The 400 Blows</h2>
        <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
        <a class="feature-link">Learn More
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`,Lf=`.feature-back-and-forth {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-back-and-forth .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-back-and-forth .feature-item {
  display: flex;
  align-items: center;
  margin: 0 auto;
  padding-bottom: 40px;
  margin-bottom: 40px;
  border-bottom: 1px solid #e2e8f0;
  flex-direction: column;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-item {
    flex-direction: row;
  }
}

@media (min-width: 1024px) {
  .feature-back-and-forth .feature-item {
    width: 60%;
  }
}

.feature-back-and-forth .feature-item:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.feature-back-and-forth .feature-item.reverse {
  flex-direction: column;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-item.reverse {
    flex-direction: row-reverse;
  }
}

.feature-back-and-forth .feature-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-icon {
    width: 128px;
    height: 128px;
    margin-right: 40px;
    margin-bottom: 0;
  }
  
  .feature-back-and-forth .feature-item.reverse .feature-icon {
    margin-right: 0;
    margin-left: 40px;
  }
}

.feature-back-and-forth .feature-svg {
  width: 40px;
  height: 40px;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-svg {
    width: 64px;
    height: 64px;
  }
}

.feature-back-and-forth .feature-content {
  flex-grow: 1;
  text-align: center;
  margin-top: 24px;
}

@media (min-width: 640px) {
  .feature-back-and-forth .feature-content {
    text-align: left;
    margin-top: 0;
  }
}

.feature-back-and-forth .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.feature-back-and-forth .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-back-and-forth .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-back-and-forth .feature-link:hover {
  color: #5a67d8;
}

.feature-back-and-forth .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.feature-back-and-forth .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 80px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-back-and-forth .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-back-and-forth .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-back-and-forth {
    padding: 48px 0;
  }
  
  .feature-back-and-forth .feature-container {
    padding: 0 16px;
  }
  
  .feature-back-and-forth .feature-item {
    padding-bottom: 32px;
    margin-bottom: 32px;
  }
  
  .feature-back-and-forth .feature-icon {
    width: 60px;
    height: 60px;
  }
  
  .feature-back-and-forth .feature-svg {
    width: 30px;
    height: 30px;
  }
  
  .feature-back-and-forth .feature-cta {
    margin-top: 40px;
  }
}`;class Nf extends L{constructor(){super(...arguments);r(this,"name","Feature Back and Forth");r(this,"contentCategories",["flow"]);r(this,"html",Hf);r(this,"css",Lf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Tu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-back-and-forth"])}matcher(t){return D(t,"feature-back-and-forth")}}const Tf=`<section class="feature-bordered">
  <div class="feature-container">
    <div class="feature-header">
      <h2 class="feature-subtitle">ROOF PARTY POLAROID</h2>
      <h1 class="feature-title">Master Cleanse Reliac Heirloom</h1>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h2 class="feature-heading">Shooting Stars</h2>
          </div>
          <div class="feature-content">
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2 class="feature-heading">The Catalyzer</h2>
          </div>
          <div class="feature-content">
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="feature-card">
        <div class="feature-card-content">
          <div class="feature-header-row">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
              </svg>
            </div>
            <h2 class="feature-heading">Neptune</h2>
          </div>
          <div class="feature-content">
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,Df=`.feature-bordered {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-bordered .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-bordered .feature-header {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 100%;
  margin-bottom: 80px;
}

.feature-bordered .feature-subtitle {
  font-size: 12px;
  color: #667eea;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.feature-bordered .feature-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
}

@media (min-width: 640px) {
  .feature-bordered .feature-title {
    font-size: 30px;
  }
}

.feature-bordered .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-bordered .feature-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .feature-bordered .feature-card {
    width: 33.333333%;
  }
}

.feature-bordered .feature-card-content {
  display: flex;
  border-radius: 8px;
  height: 100%;
  background-color: #f7fafc;
  padding: 32px;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-bordered .feature-card-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-bordered .feature-header-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.feature-bordered .feature-icon {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #667eea;
  color: white;
  flex-shrink: 0;
}

.feature-bordered .feature-svg {
  width: 20px;
  height: 20px;
}

.feature-bordered .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
}

.feature-bordered .feature-content {
  flex-grow: 1;
}

.feature-bordered .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-bordered .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-bordered .feature-link:hover {
  color: #5a67d8;
}

.feature-bordered .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-bordered {
    padding: 48px 0;
  }
  
  .feature-bordered .feature-container {
    padding: 0 16px;
  }
  
  .feature-bordered .feature-title {
    font-size: 20px;
  }
  
  .feature-bordered .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-bordered .feature-card-content {
    padding: 24px;
  }
}`;class Mf extends L{constructor(){super(...arguments);r(this,"name","Feature Bordered");r(this,"contentCategories",["flow"]);r(this,"html",Tf);r(this,"css",Df);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(dn,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-bordered"])}matcher(t){return D(t,"feature-bordered")}}const Kf=`<section class="feature-checkmarked">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
    </div>
    <div class="checklist-grid">
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Authentic Cliche Forage</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Kinfolk Chips Snackwave</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Coloring Book Ethical</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Typewriter Polaroid Cray</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">Pack Truffaut Blue</span>
        </div>
      </div>
      <div class="checklist-item">
        <div class="check-card">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="check-icon" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <path d="M22 4L12 14.01l-3-3"></path>
          </svg>
          <span class="check-text">The Catcher In The Rye</span>
        </div>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`,Rf=`.feature-checkmarked {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-checkmarked .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-checkmarked .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-checkmarked .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-checkmarked .feature-title {
    font-size: 30px;
  }
}

.feature-checkmarked .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #718096;
}

@media (min-width: 1024px) {
  .feature-checkmarked .feature-subtitle {
    width: 75%;
  }
}

@media (min-width: 1280px) {
  .feature-checkmarked .feature-subtitle {
    width: 50%;
  }
}

.feature-checkmarked .checklist-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 auto -8px auto;
}

@media (min-width: 640px) {
  .feature-checkmarked .checklist-grid {
    margin: 0 auto -8px auto;
  }
}

@media (min-width: 1024px) {
  .feature-checkmarked .checklist-grid {
    width: 80%;
  }
}

.feature-checkmarked .checklist-item {
  padding: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .feature-checkmarked .checklist-item {
    width: 50%;
  }
}

.feature-checkmarked .check-card {
  background-color: #f7fafc;
  border-radius: 4px;
  display: flex;
  padding: 16px;
  height: 100%;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-checkmarked .check-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-checkmarked .check-icon {
  color: #667eea;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-right: 16px;
}

.feature-checkmarked .check-text {
  font-weight: 500;
  color: #1a202c;
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex: 1;
  line-height: 1.4;
}

.feature-checkmarked .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 64px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-checkmarked .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-checkmarked .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-checkmarked {
    padding: 48px 0;
  }
  
  .feature-checkmarked .feature-container {
    padding: 0 16px;
  }
  
  .feature-checkmarked .feature-title {
    font-size: 20px;
  }
  
  .feature-checkmarked .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-checkmarked .feature-cta {
    margin-top: 40px;
  }
}`;class zf extends L{constructor(){super(...arguments);r(this,"name","Feature Checkmarked");r(this,"contentCategories",["flow"]);r(this,"html",Kf);r(this,"css",Rf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(td,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-checkmarked"])}matcher(t){return D(t,"feature-checkmarked")}}const Of=`<section class="feature-horizontal-simple">
  <div class="feature-container">
    <div class="features-wrapper">
      <div class="feature-card">
        <div class="feature-card-inner">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">Shooting Stars</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="feature-card">
        <div class="feature-card-inner">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">The Catalyzer</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,Pf=`.feature-horizontal-simple {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-horizontal-simple .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.feature-horizontal-simple .features-wrapper {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-horizontal-simple .feature-card {
  padding: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .feature-horizontal-simple .feature-card {
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .feature-horizontal-simple .feature-card {
    width: 50%;
  }
}

.feature-horizontal-simple .feature-card-inner {
  display: flex;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  border-opacity: 0.5;
  padding: 32px;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-card-inner {
    flex-direction: row;
  }
}

.feature-horizontal-simple .feature-card-inner:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-horizontal-simple .feature-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-icon {
    margin-right: 32px;
    margin-bottom: 0;
  }
}

.feature-horizontal-simple .feature-svg {
  width: 32px;
  height: 32px;
}

@media (min-width: 640px) {
  .feature-horizontal-simple .feature-svg {
    width: 40px;
    height: 40px;
  }
}

.feature-horizontal-simple .feature-content {
  flex-grow: 1;
}

.feature-horizontal-simple .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-horizontal-simple .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-horizontal-simple .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-horizontal-simple .feature-link:hover {
  color: #5a67d8;
}

.feature-horizontal-simple .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-horizontal-simple {
    padding: 48px 0;
  }
  
  .feature-horizontal-simple .feature-container {
    padding: 0 16px;
  }
  
  .feature-horizontal-simple .feature-card-inner {
    padding: 24px;
    text-align: center;
  }
  
  .feature-horizontal-simple .feature-icon {
    margin: 0 auto 16px auto;
  }
}`;class Vf extends L{constructor(){super(...arguments);r(this,"name","Feature Horizontal Simple");r(this,"contentCategories",["flow"]);r(this,"html",Of);r(this,"css",Pf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Du,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-horizontal-simple"])}matcher(t){return D(t,"feature-horizontal-simple")}}const Gf=`<section class="feature-side-image">
  <div class="feature-container">
    <h1 class="feature-title">Raw Denim Heirloom Man Braid<br class="feature-break">Selfies Wayfarers</h1>
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Shooting Stars</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">The Catalyzer</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Neptune</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`,_f=`.feature-side-image {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-side-image .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-side-image .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 80px;
}

@media (min-width: 640px) {
  .feature-side-image .feature-title {
    font-size: 30px;
  }
}

.feature-side-image .feature-break {
  display: none;
}

@media (min-width: 640px) {
  .feature-side-image .feature-break {
    display: block;
  }
}

.feature-side-image .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
}

@media (min-width: 640px) {
  .feature-side-image .features-grid {
    margin: -16px;
    gap: 0;
  }
}

@media (min-width: 768px) {
  .feature-side-image .features-grid {
    gap: 0;
  }
}

.feature-side-image .feature-item {
  padding: 16px;
  width: 100%;
  display: flex;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .feature-side-image .feature-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

@media (min-width: 640px) {
  .feature-side-image .features-grid {
    gap: 0;
  }
}

.feature-side-image .feature-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.feature-side-image .feature-svg {
  width: 24px;
  height: 24px;
}

.feature-side-image .feature-content {
  flex-grow: 1;
  padding-left: 24px;
}

.feature-side-image .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.feature-side-image .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-side-image .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-side-image .feature-link:hover {
  color: #5a67d8;
}

.feature-side-image .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-side-image {
    padding: 48px 0;
  }
  
  .feature-side-image .feature-container {
    padding: 0 16px;
  }
  
  .feature-side-image .feature-title {
    font-size: 20px;
    margin-bottom: 40px;
  }
  
  .feature-side-image .feature-item {
    flex-direction: column;
    text-align: center;
  }
  
  .feature-side-image .feature-content {
    padding-left: 0;
    padding-top: 16px;
  }
}`;class qf extends L{constructor(){super(...arguments);r(this,"name","Feature Side Image");r(this,"contentCategories",["flow"]);r(this,"html",Gf);r(this,"css",_f);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(hs,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-side-image"])}matcher(t){return D(t,"feature-side-image")}}const Wf=`<section class="feature-small-checkmarked">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
    </div>
    <div class="features-grid">
      <div class="feature-column">
        <h2 class="column-title">SHOOTING STARS</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">THE 400 BLOWS</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">THE CATALYZER</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
      <div class="feature-column">
        <h2 class="column-title">NEPTUNE</h2>
        <nav class="column-nav">
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>First Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Second Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Third Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fourth Link
          </a>
          <a class="nav-item">
            <span class="nav-icon">
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" class="nav-svg" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </span>Fifth Link
          </a>
        </nav>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`,Xf=`.feature-small-checkmarked {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-small-checkmarked .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-small-checkmarked .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-small-checkmarked .feature-title {
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .feature-title {
    font-size: 30px;
  }
}

.feature-small-checkmarked .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #718096;
}

@media (min-width: 1024px) {
  .feature-small-checkmarked .feature-subtitle {
    width: 75%;
  }
}

@media (min-width: 1280px) {
  .feature-small-checkmarked .feature-subtitle {
    width: 50%;
  }
}

.feature-small-checkmarked .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px;
}

.feature-small-checkmarked .feature-column {
  padding: 16px;
  width: 100%;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .feature-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .feature-small-checkmarked .feature-column {
    width: 25%;
  }
}

.feature-small-checkmarked .column-title {
  font-weight: 500;
  letter-spacing: 0.05em;
  color: #1a202c;
  margin-bottom: 16px;
  font-size: 14px;
  text-align: center;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .column-title {
    text-align: left;
  }
}

.feature-small-checkmarked .column-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: -4px;
  gap: 10px;
}

@media (min-width: 640px) {
  .feature-small-checkmarked .column-nav {
    align-items: flex-start;
    text-align: left;
  }
}

.feature-small-checkmarked .nav-item {
  display: flex;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.feature-small-checkmarked .nav-item:hover {
  color: #667eea;
}

.feature-small-checkmarked .nav-icon {
  background-color: #edf2f7;
  color: #667eea;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.feature-small-checkmarked .nav-svg {
  width: 12px;
  height: 12px;
}

.feature-small-checkmarked .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 64px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-small-checkmarked .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-small-checkmarked .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .feature-small-checkmarked {
    padding: 48px 0;
  }
  
  .feature-small-checkmarked .feature-container {
    padding: 0 16px;
  }
  
  .feature-small-checkmarked .feature-title {
    font-size: 20px;
  }
  
  .feature-small-checkmarked .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-small-checkmarked .feature-cta {
    margin-top: 40px;
  }
}`;class Yf extends L{constructor(){super(...arguments);r(this,"name","Feature Small Checkmarked");r(this,"contentCategories",["flow"]);r(this,"html",Wf);r(this,"css",Xf);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(tg,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-small-checkmarked"])}matcher(t){return D(t,"feature-small-checkmarked")}}const Jf=`<section class="feature-top-image">
  <div class="feature-container">
    <div class="feature-header">
      <h1 class="feature-title">Raw Denim Heirloom Man Braid</h1>
      <p class="feature-subtitle">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.</p>
      <div class="feature-divider">
        <div class="feature-line"></div>
      </div>
    </div>
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Shooting Stars</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">The Catalyzer</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="feature-content">
          <h2 class="feature-heading">Neptune</h2>
          <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.</p>
          <a class="feature-link">Learn More
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
    <button class="feature-cta">Button</button>
  </div>
</section>`,$f=`.feature-top-image {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-top-image .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

.feature-top-image .feature-header {
  text-align: center;
  margin-bottom: 80px;
}

.feature-top-image .feature-title {
  font-size: 24px;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 16px;
}

@media (min-width: 640px) {
  .feature-top-image .feature-title {
    font-size: 30px;
  }
}

.feature-top-image .feature-subtitle {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 auto;
  color: #a0aec0;
  margin-bottom: 24px;
}

@media (min-width: 1024px) {
  .feature-top-image .feature-subtitle {
    width: 50%;
  }
}

@media (min-width: 1280px) {
  .feature-top-image .feature-subtitle {
    width: 41.666667%;
  }
}

.feature-top-image .feature-divider {
  display: flex;
  margin-top: 24px;
  justify-content: center;
}

.feature-top-image .feature-line {
  width: 64px;
  height: 4px;
  border-radius: 9999px;
  background-color: #667eea;
  display: inline-flex;
}

.feature-top-image .features-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -16px -16px -40px -16px;
}

@media (min-width: 640px) {
  .feature-top-image .features-grid {
    margin: -16px;
    gap: 0;
  }
}

@media (min-width: 768px) {
  .feature-top-image .features-grid {
    gap: 0;
  }
}

.feature-top-image .feature-item {
  padding: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .feature-top-image .feature-item {
    width: 33.333333%;
    margin-bottom: 0;
  }
}

.feature-top-image .feature-icon {
  width: 80px;
  height: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.feature-top-image .feature-svg {
  width: 40px;
  height: 40px;
}

.feature-top-image .feature-content {
  flex-grow: 1;
}

.feature-top-image .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-top-image .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-top-image .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-top-image .feature-link:hover {
  color: #5a67d8;
}

.feature-top-image .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.feature-top-image .feature-cta {
  display: flex;
  margin: 0 auto;
  margin-top: 64px;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 32px;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.feature-top-image .feature-cta:hover {
  background-color: #5a67d8;
}

.feature-top-image .feature-cta:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .feature-top-image {
    padding: 48px 0;
  }
  
  .feature-top-image .feature-container {
    padding: 0 16px;
  }
  
  .feature-top-image .feature-title {
    font-size: 20px;
  }
  
  .feature-top-image .feature-header {
    margin-bottom: 40px;
  }
  
  .feature-top-image .feature-icon {
    width: 60px;
    height: 60px;
  }
  
  .feature-top-image .feature-svg {
    width: 30px;
    height: 30px;
  }
  
  .feature-top-image .feature-cta {
    margin-top: 40px;
  }
}`;class Zf extends L{constructor(){super(...arguments);r(this,"name","Feature Top Image");r(this,"contentCategories",["flow"]);r(this,"html",Jf);r(this,"css",$f);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Mu,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-top-image"])}matcher(t){return D(t,"feature-top-image")}}const ex=`<section class="feature-vertical">
  <div class="feature-container">
    <div class="feature-layout">
      <div class="feature-image-container">
        <img alt="feature" class="feature-image" src="https://dummyimage.com/460x500">
      </div>
      <div class="feature-content-container">
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">Shooting Stars</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">The Catalyzer</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-svg" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="feature-content">
            <h2 class="feature-heading">Neptune</h2>
            <p class="feature-description">Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.</p>
            <a class="feature-link">Learn More
              <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="feature-arrow" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,tx=`.feature-vertical {
  color: #718096;
  padding: 96px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.feature-vertical .feature-container {
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
}

.feature-vertical .feature-layout {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.feature-vertical .feature-image-container {
  width: 100%;
  margin-bottom: 40px;
  border-radius: 8px;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-image-container {
    width: 50%;
    margin-bottom: 0;
  }
}

.feature-vertical .feature-image {
  object-fit: cover;
  object-position: center;
  height: 100%;
  width: 100%;
  min-height: 300px;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-image {
    min-height: 500px;
  }
}

.feature-vertical .feature-content-container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  margin-bottom: -40px;
  width: 100%;
  padding: 0;
  text-align: center;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-content-container {
    width: 50%;
    padding: 24px 0 0 48px;
    text-align: left;
    margin-bottom: 0;
  }
}

.feature-vertical .feature-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 40px;
  align-items: center;
}

@media (min-width: 1024px) {
  .feature-vertical .feature-item {
    align-items: flex-start;
  }
}

.feature-vertical .feature-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #edf2f7;
  color: #667eea;
  margin-bottom: 20px;
}

.feature-vertical .feature-svg {
  width: 24px;
  height: 24px;
}

.feature-vertical .feature-content {
  flex-grow: 1;
}

.feature-vertical .feature-heading {
  color: #1a202c;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 12px;
}

.feature-vertical .feature-description {
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 12px;
}

.feature-vertical .feature-link {
  margin-top: 12px;
  color: #667eea;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.feature-vertical .feature-link:hover {
  color: #5a67d8;
}

.feature-vertical .feature-arrow {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

/* Mobile responsiveness */
@media (max-width: 1023px) {
  .feature-vertical {
    padding: 48px 0;
  }
  
  .feature-vertical .feature-container {
    padding: 0 16px;
  }
  
  .feature-vertical .feature-image {
    min-height: 250px;
  }
  
  .feature-vertical .feature-item {
    margin-bottom: 32px;
  }
}`;class Ax extends L{constructor(){super(...arguments);r(this,"name","Feature Vertical");r(this,"contentCategories",["flow"]);r(this,"html",ex);r(this,"css",tx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(Cs,{}));r(this,"specificity",3);r(this,"hiddenClasses",["feature-vertical"])}matcher(t){return D(t,"feature-vertical")}}const ax=`<footer class="footer-left">
  <div class="footer-container">
    <div class="footer-brand">
      <a class="brand-link">
        <div class="brand-logo">
          <svg viewBox="0 0 200 200" class="logo-svg">
            <!-- Nullkode logo cubes -->
            <g>
              <!-- Main cube structure -->
              <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
              
              <!-- Additional cubes for the nullkode pattern -->
              <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">Nullkode</span>
      </a>
      <p class="brand-description">Building the future with code</p>
    </div>
    <div class="footer-content">
      <div class="footer-column">
        <h2 class="column-title">SERVICES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Web Development</a></li>
          <li><a class="nav-link">App Development</a></li>
          <li><a class="nav-link">UI/UX Design</a></li>
          <li><a class="nav-link">Consulting</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">COMPANY</h2>
        <nav class="column-nav">
          <li><a class="nav-link">About Us</a></li>
          <li><a class="nav-link">Careers</a></li>
          <li><a class="nav-link">Blog</a></li>
          <li><a class="nav-link">Contact</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">SUPPORT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Documentation</a></li>
          <li><a class="nav-link">Help Center</a></li>
          <li><a class="nav-link">Community</a></li>
          <li><a class="nav-link">Status</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">LEGAL</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Privacy Policy</a></li>
          <li><a class="nav-link">Terms of Service</a></li>
          <li><a class="nav-link">Cookie Policy</a></li>
          <li><a class="nav-link">Disclaimer</a></li>
        </nav>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
      <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
      <span class="social-links">
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
            <path stroke="none" d="M16 8a6 6 0 616 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2" stroke="none"></circle>
          </svg>
        </a>
      </span>
    </div>
  </div>
</footer>`,sx=`.footer-left {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-left .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .footer-left .footer-container {
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

@media (min-width: 1024px) {
  .footer-left .footer-container {
    align-items: flex-start;
  }
}

.footer-left .footer-brand {
  width: 256px;
  flex-shrink: 0;
  margin: 0 auto;
  text-align: center;
  margin-top: 40px;
}

@media (min-width: 768px) {
  .footer-left .footer-brand {
    margin: 0;
    text-align: left;
    margin-top: 0;
  }
}

.footer-left .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-left .brand-link {
    justify-content: flex-start;
  }
}

.footer-left .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-left .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-left .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-left .brand-description {
  margin-top: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.footer-left .footer-content {
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  padding-right: 0;
  margin-bottom: -40px;
  text-align: center;
  order: -1;
}

@media (min-width: 768px) {
  .footer-left .footer-content {
    padding-right: 80px;
    text-align: left;
    order: 0;
  }
}

.footer-left .footer-column {
  padding: 0 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .footer-left .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-left .footer-column {
    width: 25%;
  }
}

.footer-left .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-left .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-left .column-nav li {
  margin-bottom: 8px;
}

.footer-left .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  display: block;
  line-height: 1.4;
}

.footer-left .nav-link:hover {
  color: #1a202c;
}

.footer-left .footer-bottom {
  background-color: #f7fafc;
}

.footer-left .bottom-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-left .bottom-container {
    flex-direction: row;
  }
}

.footer-left .copyright {
  color: #a0aec0;
  font-size: 14px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-left .copyright {
    text-align: left;
  }
}

.footer-left .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-left .copyright-link:hover {
  color: #1a202c;
}

.footer-left .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 0;
  margin-bottom: 8px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-left .social-links {
    margin-top: 0;
    margin-bottom: 0;
    justify-content: flex-start;
  }
}

.footer-left .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-left .social-link:hover {
  color: #718096;
}

.footer-left .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-left .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-left .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-left .footer-brand {
    margin-top: 32px;
  }
  
  .footer-left .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
}`;class ix extends L{constructor(){super(...arguments);r(this,"name","Footer Left");r(this,"contentCategories",["flow"]);r(this,"html",ax);r(this,"css",sx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["footer-left"])}matcher(t){return D(t,"footer-left")}}const nx=`<footer class="footer-middle">
  <div class="footer-container">
    <div class="footer-columns">
      <div class="footer-column">
        <h2 class="column-title">SERVICES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Web Development</a></li>
          <li><a class="nav-link">App Development</a></li>
          <li><a class="nav-link">UI/UX Design</a></li>
          <li><a class="nav-link">Consulting</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">COMPANY</h2>
        <nav class="column-nav">
          <li><a class="nav-link">About Us</a></li>
          <li><a class="nav-link">Careers</a></li>
          <li><a class="nav-link">Blog</a></li>
          <li><a class="nav-link">Contact</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">SUPPORT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Documentation</a></li>
          <li><a class="nav-link">Help Center</a></li>
          <li><a class="nav-link">Community</a></li>
          <li><a class="nav-link">Status</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">LEGAL</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Privacy Policy</a></li>
          <li><a class="nav-link">Terms of Service</a></li>
          <li><a class="nav-link">Cookie Policy</a></li>
          <li><a class="nav-link">Disclaimer</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">RESOURCES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Templates</a></li>
          <li><a class="nav-link">Components</a></li>
          <li><a class="nav-link">Tools</a></li>
          <li><a class="nav-link">Tutorials</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">CONNECT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">GitHub</a></li>
          <li><a class="nav-link">Discord</a></li>
          <li><a class="nav-link">Newsletter</a></li>
          <li><a class="nav-link">Partners</a></li>
        </nav>
      </div>
    </div>
  </div>
  <div class="footer-newsletter">
    <div class="newsletter-container">
      <div class="newsletter-content">
        <div class="newsletter-form">
          <div class="form-field">
            <label for="footer-field" class="field-label">Newsletter</label>
            <input type="text" id="footer-field" name="footer-field" class="form-input" placeholder="Enter your email">
          </div>
          <button class="subscribe-button">Subscribe</button>
          <p class="newsletter-text">
            Stay updated with our latest news
            <br class="newsletter-break">and product releases
          </p>
        </div>
        <span class="social-links">
          <a class="social-link">
            <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
            </svg>
          </a>
          <a class="social-link">
            <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
            </svg>
          </a>
          <a class="social-link">
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
            </svg>
          </a>
          <a class="social-link">
            <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
              <path stroke="none" d="M16 8a6 6 0 616 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 616-6zM2 9h4v12H2z"></path>
              <circle cx="4" cy="4" r="2" stroke="none"></circle>
            </svg>
          </a>
        </span>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
      <a class="brand-link">
        <div class="brand-logo">
          <svg viewBox="0 0 200 200" class="logo-svg">
            <!-- Nullkode logo cubes -->
            <g>
              <!-- Main cube structure -->
              <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
              
              <!-- Additional cubes for the nullkode pattern -->
              <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">Nullkode</span>
      </a>
      <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
      <span class="footer-tagline">Building the future with code</span>
    </div>
  </div>
</footer>`,rx=`.footer-middle {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-middle .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
}

.footer-middle .footer-columns {
  display: flex;
  flex-wrap: wrap;
  text-align: center;
  margin-bottom: -40px;
  margin-left: -16px;
  margin-right: -16px;
}

@media (min-width: 768px) {
  .footer-middle .footer-columns {
    text-align: left;
  }
}

.footer-middle .footer-column {
  padding: 0 16px;
  width: 100%;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .footer-middle .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-middle .footer-column {
    width: 16.666667%;
  }
}

.footer-middle .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-middle .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-middle .column-nav li {
  margin-bottom: 8px;
}

.footer-middle .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-middle .nav-link:hover {
  color: #1a202c;
}

.footer-middle .footer-newsletter {
  border-top: 1px solid #e2e8f0;
}

.footer-middle .newsletter-container {
  max-width: 1200px;
  padding: 0 20px 32px 20px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.footer-middle .newsletter-content {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-content {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1024px) {
  .footer-middle .newsletter-content {
    justify-content: flex-start;
  }
}

.footer-middle .newsletter-form {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-end;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

.footer-middle .form-field {
  position: relative;
  width: 160px;
  margin-right: 16px;
}

@media (min-width: 640px) {
  .footer-middle .form-field {
    width: auto;
    margin-right: 16px;
  }
}

.footer-middle .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
}

.footer-middle .form-input {
  width: 100%;
  background-color: rgba(247, 250, 252, 0.5);
  background-opacity: 0.5;
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: all 0.2s ease-in-out;
}

.footer-middle .form-input:focus {
  background-color: transparent;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.footer-middle .subscribe-button {
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.footer-middle .subscribe-button:hover {
  background-color: #5a67d8;
}

.footer-middle .newsletter-text {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 24px;
  margin-top: 0;
  text-align: left;
  display: none;
}

@media (min-width: 768px) {
  .footer-middle .newsletter-text {
    margin-left: 24px;
    margin-top: 0;
    display: block;
  }
}

.footer-middle .newsletter-break {
  display: none;
}

@media (min-width: 1024px) {
  .footer-middle .newsletter-break {
    display: block;
  }
}

.footer-middle .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 24px;
  width: 100%;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-middle .social-links {
    margin-top: 0;
    width: auto;
    justify-content: flex-start;
  }
}

.footer-middle .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-middle .social-link:hover {
  color: #718096;
}

.footer-middle .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-middle .social-icon {
  width: 20px;
  height: 20px;
}

.footer-middle .footer-bottom {
  background-color: #f7fafc;
}

.footer-middle .bottom-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: center;
}

@media (min-width: 640px) {
  .footer-middle .bottom-container {
    flex-direction: row;
  }
}

.footer-middle .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-middle .brand-link {
    justify-content: flex-start;
  }
}

.footer-middle .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-middle .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-middle .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-middle .copyright {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 2px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-middle .copyright {
    padding-top: 8px;
    margin-top: 0;
    text-align: left;
  }
}

.footer-middle .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-middle .copyright-link:hover {
  color: #1a202c;
}

.footer-middle .footer-tagline {
  margin-left: auto;
  margin-top: 8px;
  width: 100%;
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
}

@media (min-width: 640px) {
  .footer-middle .footer-tagline {
    margin-top: 0;
    width: auto;
    text-align: left;
  }
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-middle .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-middle .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
  
  .footer-middle .newsletter-container {
    padding: 0 16px 24px 16px;
  }
  
  .footer-middle .newsletter-content {
    flex-direction: column;
    align-items: center;
  }
  
  .footer-middle .newsletter-form {
    margin-bottom: 16px;
  }
}`;class ox extends L{constructor(){super(...arguments);r(this,"name","Footer Middle");r(this,"contentCategories",["flow"]);r(this,"html",nx);r(this,"css",rx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["footer-middle"])}matcher(t){return D(t,"footer-middle")}}const lx=`<footer class="footer-right">
  <div class="footer-container">
    <div class="footer-brand">
      <a class="brand-link">
        <div class="brand-logo">
          <svg viewBox="0 0 200 200" class="logo-svg">
            <!-- Nullkode logo cubes -->
            <g>
              <!-- Main cube structure -->
              <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
              
              <!-- Additional cubes for the nullkode pattern -->
              <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">Nullkode</span>
      </a>
      <p class="brand-description">Building the future with code</p>
    </div>
    <div class="footer-content">
      <div class="footer-column">
        <h2 class="column-title">SERVICES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Web Development</a></li>
          <li><a class="nav-link">App Development</a></li>
          <li><a class="nav-link">UI/UX Design</a></li>
          <li><a class="nav-link">Consulting</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">COMPANY</h2>
        <nav class="column-nav">
          <li><a class="nav-link">About Us</a></li>
          <li><a class="nav-link">Careers</a></li>
          <li><a class="nav-link">Blog</a></li>
          <li><a class="nav-link">Contact</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">SUPPORT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Documentation</a></li>
          <li><a class="nav-link">Help Center</a></li>
          <li><a class="nav-link">Community</a></li>
          <li><a class="nav-link">Status</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">LEGAL</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Privacy Policy</a></li>
          <li><a class="nav-link">Terms of Service</a></li>
          <li><a class="nav-link">Cookie Policy</a></li>
          <li><a class="nav-link">Disclaimer</a></li>
        </nav>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
      <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
      <span class="social-links">
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
            <path stroke="none" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2" stroke="none"></circle>
          </svg>
        </a>
      </span>
    </div>
  </div>
</footer>`,cx=`.footer-right {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-right .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  flex-wrap: wrap;
}

@media (min-width: 768px) {
  .footer-right .footer-container {
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

@media (min-width: 1024px) {
  .footer-right .footer-container {
    align-items: flex-start;
  }
}

.footer-right .footer-brand {
  width: 256px;
  flex-shrink: 0;
  margin: 0 auto;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-right .footer-brand {
    margin: 0;
    text-align: left;
  }
}

.footer-right .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-right .brand-link {
    justify-content: flex-start;
  }
}

.footer-right .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-right .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-right .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-right .brand-description {
  margin-top: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.footer-right .footer-content {
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  padding-left: 0;
  margin-bottom: -40px;
  margin-top: 40px;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-right .footer-content {
    padding-left: 80px;
    margin-top: 0;
    text-align: left;
  }
}

.footer-right .footer-column {
  padding: 0 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .footer-right .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-right .footer-column {
    width: 25%;
  }
}

.footer-right .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-right .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-right .column-nav li {
  margin-bottom: 8px;
}

.footer-right .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  display: block;
  line-height: 1.4;
}

.footer-right .nav-link:hover {
  color: #1a202c;
}

.footer-right .footer-bottom {
  background-color: #f7fafc;
}

.footer-right .bottom-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-right .bottom-container {
    flex-direction: row;
  }
}

.footer-right .copyright {
  color: #a0aec0;
  font-size: 14px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-right .copyright {
    text-align: left;
  }
}

.footer-right .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-right .copyright-link:hover {
  color: #1a202c;
}

.footer-right .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 0;
  margin-bottom: 8px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-right .social-links {
    margin-top: 0;
    margin-bottom: 0;
    justify-content: flex-start;
  }
}

.footer-right .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-right .social-link:hover {
  color: #718096;
}

.footer-right .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-right .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-right .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-right .footer-content {
    margin-top: 32px;
  }
  
  .footer-right .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
}`;class dx extends L{constructor(){super(...arguments);r(this,"name","Footer Right");r(this,"contentCategories",["flow"]);r(this,"html",lx);r(this,"css",cx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["footer-right"])}matcher(t){return D(t,"footer-right")}}const ux=`<footer class="footer-simple">
  <div class="footer-container">
    <a class="brand-link">
      <div class="brand-logo">
        <svg viewBox="0 0 200 200" class="logo-svg">
          <!-- Nullkode logo cubes -->
          <g>
            <!-- Main cube structure -->
            <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
            <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
            <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            
            <!-- Additional cubes for the nullkode pattern -->
            <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
            <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
            <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
          </g>
        </svg>
      </div>
      <span class="brand-name">Nullkode</span>
    </a>
    <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
    <span class="social-links">
      <a class="social-link">
        <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
        </svg>
      </a>
      <a class="social-link">
        <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
        </svg>
      </a>
      <a class="social-link">
        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
        </svg>
      </a>
      <a class="social-link">
        <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
          <path stroke="none" d="M16 8a6 6 0 616 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 616-6zM2 9h4v12H2z"></path>
          <circle cx="4" cy="4" r="2" stroke="none"></circle>
        </svg>
      </a>
    </span>
  </div>
</footer>`,gx=`.footer-simple {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-simple .footer-container {
  max-width: 1200px;
  padding: 0 20px 32px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-simple .footer-container {
    flex-direction: row;
  }
}

.footer-simple .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-simple .brand-link {
    justify-content: flex-start;
  }
}

.footer-simple .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-simple .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-simple .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-simple .copyright {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 2px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-simple .copyright {
    padding-top: 8px;
    margin-top: 0;
    text-align: left;
  }
}

.footer-simple .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-simple .copyright-link:hover {
  color: #1a202c;
}

.footer-simple .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 16px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-simple .social-links {
    margin-top: 0;
    justify-content: flex-start;
  }
}

.footer-simple .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-simple .social-link:hover {
  color: #718096;
}

.footer-simple .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-simple .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 639px) {
  .footer-simple .footer-container {
    padding: 0 16px 24px 16px;
  }
  
  .footer-simple .copyright {
    border-left: none;
    padding-left: 0;
    margin-left: 0;
    margin-top: 12px;
  }
  
  .footer-simple .social-links {
    margin-left: 0;
  }
}`;class px extends L{constructor(){super(...arguments);r(this,"name","Footer Simple");r(this,"contentCategories",["flow"]);r(this,"html",ux);r(this,"css",gx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["footer-simple"])}matcher(t){return D(t,"footer-simple")}}const mx=`<footer class="footer-subscribe">
  <div class="footer-container">
    <div class="footer-columns">
      <div class="footer-column">
        <h2 class="column-title">SERVICES</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Web Development</a></li>
          <li><a class="nav-link">App Development</a></li>
          <li><a class="nav-link">UI/UX Design</a></li>
          <li><a class="nav-link">Consulting</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">COMPANY</h2>
        <nav class="column-nav">
          <li><a class="nav-link">About Us</a></li>
          <li><a class="nav-link">Careers</a></li>
          <li><a class="nav-link">Blog</a></li>
          <li><a class="nav-link">Contact</a></li>
        </nav>
      </div>
      <div class="footer-column">
        <h2 class="column-title">SUPPORT</h2>
        <nav class="column-nav">
          <li><a class="nav-link">Documentation</a></li>
          <li><a class="nav-link">Help Center</a></li>
          <li><a class="nav-link">Community</a></li>
          <li><a class="nav-link">Status</a></li>
        </nav>
      </div>
      <div class="footer-column subscribe-column">
        <h2 class="column-title">SUBSCRIBE</h2>
        <div class="subscribe-form">
          <div class="form-field">
            <label for="footer-field" class="field-label">Newsletter</label>
            <input type="text" id="footer-field" name="footer-field" class="form-input" placeholder="Enter your email">
          </div>
          <button class="subscribe-button">Subscribe</button>
        </div>
        <p class="subscribe-text">
          Stay updated with our latest
          <br class="subscribe-break">coding innovations and tools
        </p>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="bottom-container">
      <a class="brand-link">
        <div class="brand-logo">
          <svg viewBox="0 0 200 200" class="logo-svg">
            <!-- Nullkode logo cubes -->
            <g>
              <!-- Main cube structure -->
              <polygon points="50,80 100,50 150,80 100,110" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="100,50 150,80 150,120 100,150" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="50,80 100,110 100,150 50,120" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
              
              <!-- Additional cubes for the nullkode pattern -->
              <polygon points="30,90 50,80 50,120 30,130" fill="#4A90E2" stroke="#357ABD" stroke-width="2"/>
              <polygon points="150,80 170,70 170,110 150,120" fill="#2E5BBA" stroke="#357ABD" stroke-width="2"/>
              <polygon points="80,130 100,150 120,130 100,160" fill="#6BB6FF" stroke="#357ABD" stroke-width="2"/>
            </g>
          </svg>
        </div>
        <span class="brand-name">Nullkode</span>
      </a>
      <p class="copyright">© 2025 Nullkode — <a href="https://nullkode.com" class="copyright-link" target="_blank">nullkode.com</a></p>
      <span class="social-links">
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="social-icon" viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
          </svg>
        </a>
        <a class="social-link">
          <svg fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="0" class="social-icon" viewBox="0 0 24 24">
            <path stroke="none" d="M16 8a6 6 0 616 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 616-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2" stroke="none"></circle>
          </svg>
        </a>
      </span>
    </div>
  </div>
</footer>`,hx=`.footer-subscribe {
  color: #718096;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.footer-subscribe .footer-container {
  max-width: 1200px;
  padding: 0 20px 96px 20px;
  margin: 0 auto;
}

.footer-subscribe .footer-columns {
  display: flex;
  flex-wrap: wrap;
  text-align: center;
  order: 1;
}

@media (min-width: 768px) {
  .footer-subscribe .footer-columns {
    text-align: left;
  }
}

.footer-subscribe .footer-column {
  padding: 0 16px;
  width: 100%;
  margin-bottom: 40px;
}

@media (min-width: 768px) {
  .footer-subscribe .footer-column {
    width: 50%;
  }
}

@media (min-width: 1024px) {
  .footer-subscribe .footer-column {
    width: 25%;
  }
}

.footer-subscribe .column-title {
  font-weight: 500;
  color: #1a202c;
  letter-spacing: 0.05em;
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-subscribe .column-nav {
  list-style: none;
  margin-bottom: 40px;
  padding: 0;
}

.footer-subscribe .column-nav li {
  margin-bottom: 8px;
}

.footer-subscribe .nav-link {
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-subscribe .nav-link:hover {
  color: #1a202c;
}

.footer-subscribe .subscribe-column {
  /* Special styling for subscribe column */
}

.footer-subscribe .subscribe-form {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
}

@media (min-width: 768px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .subscribe-form {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
}

.footer-subscribe .form-field {
  position: relative;
  width: 160px;
  margin-right: 8px;
}

@media (min-width: 640px) {
  .footer-subscribe .form-field {
    width: auto;
    margin-right: 16px;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .form-field {
    margin-right: 16px;
  }
}

.footer-subscribe .field-label {
  line-height: 1.75;
  font-size: 14px;
  color: #718096;
}

.footer-subscribe .form-input {
  width: 100%;
  background-color: rgba(247, 250, 252, 0.5);
  border-radius: 4px;
  border: 1px solid #d2d6dc;
  outline: none;
  color: #374151;
  padding: 4px 12px;
  line-height: 2;
  transition: all 0.2s ease-in-out;
}

.footer-subscribe .form-input:focus {
  background-color: transparent;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.footer-subscribe .subscribe-button {
  margin-top: 8px;
  flex-shrink: 0;
  display: inline-flex;
  color: white;
  background-color: #667eea;
  border: none;
  padding: 8px 24px;
  outline: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-button {
    margin-top: 8px;
  }
}

@media (min-width: 1280px) {
  .footer-subscribe .subscribe-button {
    margin-top: 0;
  }
}

.footer-subscribe .subscribe-button:hover {
  background-color: #5a67d8;
}

.footer-subscribe .subscribe-text {
  color: #a0aec0;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

@media (min-width: 768px) {
  .footer-subscribe .subscribe-text {
    text-align: left;
  }
}

.footer-subscribe .subscribe-break {
  display: none;
}

@media (min-width: 1024px) {
  .footer-subscribe .subscribe-break {
    display: block;
  }
}

.footer-subscribe .footer-bottom {
  background-color: #f7fafc;
}

.footer-subscribe .bottom-container {
  max-width: 1200px;
  padding: 0 20px 24px 20px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
}

@media (min-width: 640px) {
  .footer-subscribe .bottom-container {
    flex-direction: row;
  }
}

.footer-subscribe .brand-link {
  display: flex;
  font-weight: 500;
  align-items: center;
  color: #1a202c;
  text-decoration: none;
  cursor: pointer;
  justify-content: center;
}

@media (min-width: 768px) {
  .footer-subscribe .brand-link {
    justify-content: flex-start;
  }
}

.footer-subscribe .brand-logo {
  width: 40px;
  height: 40px;
  color: white;
  padding: 8px;
  background-color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-subscribe .logo-svg {
  width: 24px;
  height: 24px;
}

.footer-subscribe .brand-name {
  margin-left: 12px;
  font-size: 20px;
}

.footer-subscribe .copyright {
  color: #a0aec0;
  font-size: 14px;
  margin-left: 24px;
  margin-top: 16px;
  text-align: center;
}

@media (min-width: 640px) {
  .footer-subscribe .copyright {
    margin-top: 0;
    text-align: left;
  }
}

.footer-subscribe .copyright-link {
  color: #718096;
  margin-left: 4px;
  text-decoration: none;
}

.footer-subscribe .copyright-link:hover {
  color: #1a202c;
}

.footer-subscribe .social-links {
  display: inline-flex;
  margin-left: auto;
  margin-top: 16px;
  justify-content: center;
}

@media (min-width: 640px) {
  .footer-subscribe .social-links {
    margin-top: 0;
    justify-content: flex-start;
  }
}

.footer-subscribe .social-link {
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.footer-subscribe .social-link:hover {
  color: #718096;
}

.footer-subscribe .social-link:not(:first-child) {
  margin-left: 12px;
}

.footer-subscribe .social-icon {
  width: 20px;
  height: 20px;
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .footer-subscribe .footer-container {
    padding: 0 16px 48px 16px;
  }
  
  .footer-subscribe .footer-column {
    width: 50%;
    margin-bottom: 24px;
  }
  
  .footer-subscribe .subscribe-column {
    width: 100%;
  }
  
  .footer-subscribe .subscribe-form {
    flex-direction: column;
    align-items: center;
  }
  
  .footer-subscribe .form-field {
    margin-right: 0;
    margin-bottom: 12px;
    width: 200px;
  }
  
  .footer-subscribe .subscribe-button {
    margin-top: 0;
  }
  
  .footer-subscribe .bottom-container {
    padding: 0 16px 20px 16px;
  }
  
  .footer-subscribe .copyright {
    margin-left: 0;
  }
  
  .footer-subscribe .social-links {
    margin-left: 0;
  }
}`;class fx extends L{constructor(){super(...arguments);r(this,"name","Footer Subscribe");r(this,"contentCategories",["flow"]);r(this,"html",mx);r(this,"css",hx);r(this,"allowedContent",["flow"]);r(this,"category","prebuilt-blocks");r(this,"icon",a.jsx(aa,{}));r(this,"specificity",3);r(this,"hiddenClasses",["footer-subscribe"])}matcher(t){return D(t,"footer-subscribe")}}const xx=`<div class="quote-block">
  <div class="quote-container">
    <div class="quote-icon-top">
      <i class="fa fa-quote-left"></i>
    </div>
    
    <blockquote class="quote-text">
      "The best way to predict the future is to create it. Innovation distinguishes between a leader and a follower, so we must continue pushing boundaries and embracing change."
    </blockquote>
    
    <div class="quote-attribution">
      <div class="author-info">
        <img src="/images/builder/placeholder.svg" alt="Author" class="author-avatar">
        <div class="author-details">
          <h4 class="author-name">Steve Jobs</h4>
          <p class="author-title">Co-founder, Apple Inc.</p>
          <div class="quote-meta">
            <span class="quote-date">March 15, 2024</span>
            <span class="quote-source">Innovation Conference</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="quote-decoration">
      <div class="decoration-line"></div>
      <div class="decoration-dot"></div>
      <div class="decoration-line"></div>
    </div>
  </div>
</div>`,bx=`.quote-block {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 40px;
  border-radius: 20px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.quote-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.quote-block .quote-container {
  position: relative;
  z-index: 1;
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  border-left: 5px solid #007bff;
}

.quote-block .quote-icon-top {
  text-align: center;
  margin-bottom: 25px;
}

.quote-block .quote-icon-top i {
  font-size: 48px;
  color: #007bff;
  opacity: 0.3;
  background: linear-gradient(135deg, #007bff, #6610f2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block .quote-text {
  font-size: 24px;
  line-height: 1.6;
  color: #2c3e50;
  text-align: center;
  margin: 0 0 35px 0;
  font-style: italic;
  font-weight: 300;
  position: relative;
  padding: 0 20px;
}

.quote-block .quote-text::before,
.quote-block .quote-text::after {
  content: '';
  position: absolute;
  top: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, #007bff, transparent);
  opacity: 0.3;
}

.quote-block .quote-text::before {
  left: 0;
}

.quote-block .quote-text::after {
  right: 0;
}

.quote-block .quote-attribution {
  margin-bottom: 25px;
}

.quote-block .author-info {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.quote-block .author-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #007bff;
  box-shadow: 0 8px 20px rgba(0, 123, 255, 0.3);
  transition: transform 0.3s ease;
}

.quote-block .author-avatar:hover {
  transform: scale(1.05);
}

.quote-block .author-details {
  text-align: left;
}

.quote-block .author-name {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  background: linear-gradient(135deg, #2c3e50, #007bff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block .author-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #6c757d;
  font-weight: 500;
}

.quote-block .quote-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quote-block .quote-date,
.quote-block .quote-source {
  font-size: 14px;
  color: #868e96;
  font-style: italic;
}

.quote-block .quote-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.quote-block .decoration-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #007bff, transparent);
  border-radius: 1px;
}

.quote-block .decoration-dot {
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

/* Alternative styles for different quote types */
.quote-block.testimonial {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.quote-block.testimonial .quote-container {
  border-left-color: #28a745;
}

.quote-block.testimonial .quote-icon-top i,
.quote-block.testimonial .author-name,
.quote-block.testimonial .decoration-dot {
  color: #28a745;
  background: linear-gradient(135deg, #28a745, #20c997);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block.testimonial .decoration-dot {
  background: #28a745;
  -webkit-text-fill-color: initial;
}

.quote-block.testimonial .author-avatar {
  border-color: #28a745;
  box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
}

.quote-block.inspirational {
  background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);
}

.quote-block.inspirational .quote-container {
  border-left-color: #fd7e14;
}

.quote-block.inspirational .quote-icon-top i,
.quote-block.inspirational .author-name,
.quote-block.inspirational .decoration-dot {
  color: #fd7e14;
  background: linear-gradient(135deg, #fd7e14, #ffc107);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quote-block.inspirational .decoration-dot {
  background: #fd7e14;
  -webkit-text-fill-color: initial;
}

.quote-block.inspirational .author-avatar {
  border-color: #fd7e14;
  box-shadow: 0 8px 20px rgba(253, 126, 20, 0.3);
}

@media (max-width: 768px) {
  .quote-block {
    padding: 25px;
  }
  
  .quote-block .quote-container {
    padding: 25px;
  }
  
  .quote-block .quote-text {
    font-size: 20px;
    padding: 0 10px;
  }
  
  .quote-block .author-info {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .quote-block .author-details {
    text-align: center;
  }
  
  .quote-block .author-avatar {
    width: 60px;
    height: 60px;
  }
  
  .quote-block .quote-icon-top i {
    font-size: 36px;
  }
}

@media (max-width: 480px) {
  .quote-block {
    padding: 20px;
  }
  
  .quote-block .quote-container {
    padding: 20px;
  }
  
  .quote-block .quote-text {
    font-size: 18px;
    line-height: 1.5;
  }
  
  .quote-block .author-name {
    font-size: 18px;
  }
  
  .quote-block .author-title {
    font-size: 14px;
  }
  
  .quote-block .quote-date,
  .quote-block .quote-source {
    font-size: 12px;
  }
  
  .quote-block .decoration-line {
    width: 40px;
  }
}`;class wx extends L{constructor(){super(...arguments);r(this,"name","quote block");r(this,"contentCategories",["flow"]);r(this,"html",xx);r(this,"css",bx);r(this,"allowedContent",[]);r(this,"category","typography");r(this,"icon",a.jsx(on,{}));r(this,"specificity",3);r(this,"hiddenClasses",["quote-block"])}matcher(t){return D(t,"quote-block")}}const Bx=`<div class="text-highlighter">
  <div class="highlight-container">
    <div class="highlight-header">
      <h3>Text Highlighting Examples</h3>
      <p>Multiple styles to emphasize important content</p>
    </div>
    
    <div class="highlight-examples">
      <div class="highlight-item">
        <p class="highlight-text">
          This is a paragraph with <span class="highlight-yellow">yellow highlighted text</span> that draws attention to key information.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          You can also use <span class="highlight-blue">blue highlighting</span> for links or secondary information that needs emphasis.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          For warnings or important notes, <span class="highlight-red">red highlighting</span> is perfect to catch the reader's attention.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          Success messages or positive information can use <span class="highlight-green">green highlighting</span> to convey the right tone.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          For subtle emphasis, <span class="highlight-gray">gray highlighting</span> provides a professional, understated look.
        </p>
      </div>
      
      <div class="highlight-item">
        <p class="highlight-text">
          Creative projects might benefit from <span class="highlight-purple">purple highlighting</span> to add personality and flair.
        </p>
      </div>
    </div>
    
    <div class="highlight-styles-demo">
      <h4>Available Highlighting Styles</h4>
      <div class="styles-grid">
        <div class="style-sample">
          <span class="highlight-marker highlight-yellow">Yellow</span>
          <p>Default highlighting</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-blue">Blue</span>
          <p>Information & links</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-red">Red</span>
          <p>Warnings & alerts</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-green">Green</span>
          <p>Success & positive</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-gray">Gray</span>
          <p>Subtle emphasis</p>
        </div>
        <div class="style-sample">
          <span class="highlight-marker highlight-purple">Purple</span>
          <p>Creative & unique</p>
        </div>
      </div>
    </div>
    
    <div class="highlight-advanced">
      <h4>Advanced Highlighting Techniques</h4>
      <div class="advanced-examples">
        <div class="example-box">
          <h5>Gradient Highlight</h5>
          <p>Text with <span class="highlight-gradient">beautiful gradient highlighting</span> for modern designs.</p>
        </div>
        <div class="example-box">
          <h5>Animated Highlight</h5>
          <p>Text with <span class="highlight-animated">animated highlighting effect</span> that pulses gently.</p>
        </div>
        <div class="example-box">
          <h5>Underline Highlight</h5>
          <p>Text with <span class="highlight-underline">stylish underline highlighting</span> for elegant emphasis.</p>
        </div>
      </div>
    </div>
  </div>
</div>`,vx=`.text-highlighter {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  padding: 30px;
  border-radius: 15px;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.text-highlighter .highlight-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.text-highlighter .highlight-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.text-highlighter .highlight-header h3 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.text-highlighter .highlight-header p {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.text-highlighter .highlight-examples {
  margin-bottom: 35px;
}

.text-highlighter .highlight-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.text-highlighter .highlight-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: #495057;
}

/* Basic Highlight Styles */
.text-highlighter .highlight-yellow {
  background: linear-gradient(120deg, #fff59d 0%, #fff59d 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-yellow:hover {
  background-size: 100% 100%;
  color: #333;
}

.text-highlighter .highlight-blue {
  background: linear-gradient(120deg, #81d4fa 0%, #81d4fa 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-blue:hover {
  background-size: 100% 100%;
  color: #0d47a1;
}

.text-highlighter .highlight-red {
  background: linear-gradient(120deg, #ffab91 0%, #ffab91 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-red:hover {
  background-size: 100% 100%;
  color: #b71c1c;
}

.text-highlighter .highlight-green {
  background: linear-gradient(120deg, #a5d6a7 0%, #a5d6a7 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-green:hover {
  background-size: 100% 100%;
  color: #1b5e20;
}

.text-highlighter .highlight-gray {
  background: linear-gradient(120deg, #e0e0e0 0%, #e0e0e0 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-gray:hover {
  background-size: 100% 100%;
  color: #212121;
}

.text-highlighter .highlight-purple {
  background: linear-gradient(120deg, #ce93d8 0%, #ce93d8 100%);
  background-size: 100% 0.4em;
  background-repeat: no-repeat;
  background-position: 0 88%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.text-highlighter .highlight-purple:hover {
  background-size: 100% 100%;
  color: #4a148c;
}

/* Styles Demo Section */
.text-highlighter .highlight-styles-demo {
  margin-bottom: 35px;
  padding: 25px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 10px;
}

.text-highlighter .highlight-styles-demo h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.text-highlighter .styles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
}

.text-highlighter .style-sample {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.text-highlighter .style-sample:hover {
  transform: translateY(-3px);
}

.text-highlighter .highlight-marker {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.text-highlighter .style-sample p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

/* Advanced Highlighting Styles */
.text-highlighter .highlight-advanced h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.text-highlighter .advanced-examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.text-highlighter .example-box {
  padding: 20px;
  background: linear-gradient(135deg, #fff, #f8f9fa);
  border-radius: 10px;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.text-highlighter .example-box:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.text-highlighter .example-box h5 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.text-highlighter .example-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #6c757d;
}

.text-highlighter .highlight-gradient {
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  padding: 2px 4px;
  position: relative;
}

.text-highlighter .highlight-gradient::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border-radius: 2px;
}

.text-highlighter .highlight-animated {
  background: #fff59d;
  padding: 2px 4px;
  border-radius: 3px;
  animation: highlightPulse 2s infinite;
  font-weight: 500;
}

@keyframes highlightPulse {
  0%, 100% {
    background: #fff59d;
    transform: scale(1);
  }
  50% {
    background: #ffeb3b;
    transform: scale(1.02);
  }
}

.text-highlighter .highlight-underline {
  position: relative;
  padding: 2px 0;
  font-weight: 500;
  color: #495057;
  text-decoration: none;
}

.text-highlighter .highlight-underline::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #007bff, #6610f2);
  border-radius: 2px;
  animation: underlineSlide 3s infinite;
}

@keyframes underlineSlide {
  0%, 100% {
    transform: scaleX(1);
    transform-origin: left;
  }
  50% {
    transform: scaleX(1.1);
    transform-origin: center;
  }
}

@media (max-width: 768px) {
  .text-highlighter {
    padding: 20px;
  }
  
  .text-highlighter .highlight-container {
    padding: 20px;
  }
  
  .text-highlighter .highlight-header h3 {
    font-size: 24px;
  }
  
  .text-highlighter .styles-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
  }
  
  .text-highlighter .advanced-examples {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .text-highlighter .highlight-text {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .text-highlighter .styles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .text-highlighter .style-sample {
    padding: 10px;
  }
  
  .text-highlighter .highlight-marker {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .text-highlighter .highlight-text {
    font-size: 14px;
  }
}`;class Cx extends L{constructor(){super(...arguments);r(this,"name","text highlighter");r(this,"contentCategories",["flow"]);r(this,"html",Bx);r(this,"css",vx);r(this,"allowedContent",[]);r(this,"category","typography");r(this,"icon",a.jsx(Ku,{}));r(this,"specificity",3);r(this,"hiddenClasses",["text-highlighter"])}matcher(t){return D(t,"text-highlighter")}}const yx=Object.freeze(Object.defineProperty({__proto__:null,AddonEl:Sp,AlertEl:vp,AudioPlayerEl:lh,BMICalculatorEl:mh,BadgeEl:Cp,BlockquoteEl:Yg,BlogHorizontalEl:Bh,BlogNoFrameEl:yh,BlogRectangleEl:kh,BlogSimpleEl:ol,BlogTimelineEl:Sh,BodyEl:Zg,ButtonEl:ep,ButtonGroupEl:yp,ButtonToolbarEl:Qp,CalculatorModuleEl:xh,CardEl:sl,CheckboxEl:Up,ColumnEl:ia,CompanyFieldEl:jm,ContactFormEl:Sm,ContactFullMapEl:Nh,ContactNoMapEl:Mh,ContactSmallMapEl:zh,ContainerEl:al,ContentBorderedEl:Vh,ContentCategoriesEl:qh,ContentDetailsEl:Yh,ContentDividedEl:Zh,ContentIconsEl:Af,ContentLargeImagesEl:nf,ContentSimpleEl:lf,ContentSmallImagesEl:uf,CtaIosAndroidEl:mf,CtaSignupHorizontalEl:xf,CtaSignupVerticalEl:Bf,CtaSimpleEl:yf,CustomPricingTableEl:qp,DatalistEl:Lm,DateSignedEl:Tm,DefinitionListEl:Xg,DivContainerEl:tp,DividerEl:qg,EcommerceDetailsLeftEl:kf,EcommerceDetailsRightEl:Ef,EcommerceSimpleGridEl:ll,FeatureBackAndForthEl:Nf,FeatureBorderedEl:Mf,FeatureCheckmarkedEl:zf,FeatureHorizontalSimpleEl:Vf,FeatureSideImageEl:qf,FeatureSmallCheckmarkedEl:Yf,FeatureTopImageEl:Zf,FeatureVerticalEl:Ax,FieldsetEl:Mm,FileUploadEl:Rm,FooterEl:ap,FooterLeftEl:ix,FooterMiddleEl:ox,FooterRightEl:dx,FooterSimpleEl:px,FooterSubscribeEl:fx,FormEl:Yp,FormGroupEl:Ep,GenericEl:rp,HeaderEl:sp,HeadingEl:ip,HiddenInputEl:Om,IconEl:np,ImageEl:tl,ImageGalleryEl:uh,ImageGridEl:Np,ImageHeaderEl:Zp,InitialsEl:Vm,InputFieldEl:Fp,InputGroupEl:jp,JumbotronEl:Am,LabelEl:_m,LayoutEl:ys,LinkEl:Ip,ListGroupEl:Bp,ListItemEl:Jg,MarkedTextEl:Wg,MaterialBoxEl:im,MediaObjectEl:rm,NavbarEl:lm,PageHeaderEl:bp,ParagraphEl:_g,PricingTableEl:um,ProgressBarEl:wp,ProgressEl:Wm,QuoteBlockEl:wx,RadioButtonEl:Ym,RangeInputEl:$m,ResetButtonEl:eh,ResponsiveVideoEl:Lp,RowEl:Bn,SectionEl:Ap,SelectEl:Hp,ServiceListEl:mm,SignaturePadEl:Ah,SkillListEl:xm,StatsCounterEl:Bm,SubmitButtonEl:sh,SvgEl:op,TableEl:Mp,TbodyEl:Rp,TdEl:Op,TeamMemberEl:il,TestimonialSliderEl:nl,TextAreaEl:kp,TextHighlighterEl:Cx,TheadEl:Kp,TitleFieldEl:nh,TrEl:zp,UnorderedListEl:$g,UserProfileEl:rl},Symbol.toStringTag,{value:"Module"}));class Qx{constructor(){r(this,"elementsCache",null)}canInsertElInto(A,t){var i;if(A.nodeName==="BODY")return!0;if(A.nodeName==="HTML")return!1;const s=(i=this.match(A))==null?void 0:i.el;return s?s.allowedEls.length?s.allowedEls.some(n=>t instanceof n):s.allowedContent&&t.contentCategories?t.contentCategories.some(n=>s.allowedContent.includes(n)):!1:!1}match(A){var t;if(!(A!=null&&A.nodeName)||!this.elementsCache)return null;for(const s of this.elementsCache.elements){const i=(t=s.matcher)==null?void 0:t.call(s,A);if(i)return{el:s,node:i===!0?A:i}}return null}async load(A){this.elementsCache={categories:[],elements:[]};const t=await Fx();return this.elementsCache.elements=[...Object.values(yx).filter(s=>s.name),...t.filter(s=>s.name)].map(s=>(typeof s=="function"&&(s=new s),s.name=A(v(s.name)),s.category&&!this.elementsCache.categories.includes(s.category)&&this.elementsCache.categories.push(s.category),s)).sort((s,i)=>s.specificity<i.specificity?1:-1),J.setState({elementsLoading:!1}),this.elementsCache}}async function Fx(){return[]}const nt=new Qx;function Ja(e){let A=null,t=null,s=null,i=null,n=null,o=null;if(!e){Ke().setSelectedContainer(null),Ke().setSelectedRow(null),Ke().setSelectedColumn(null);return}e.el instanceof ia?(s=e.node.closest(".row"),A=e.node.closest(Ui),n=e.node):e.el instanceof Bn?(s=e.node,A=e.node.closest(Ui)):e.el instanceof al&&(A=e.node),A&&(t=Z(A)),Ke().setSelectedContainer(t),s&&(i=Z(s)),i?Ke().setSelectedRow({id:i,columns:Xo(s)}):Ke().setSelectedRow(null),n&&(o=Z(n)),Ke().setSelectedColumn(o)}function xe(e,A){var o;if(e==null)return B().setSelectedContext(null),Ja(null),B().selectedContext;typeof e=="string"&&(e=Ee(e,B().getEditorDoc()));const t=B().selectedContext;if((e==null?void 0:e.nodeType)!==Node.ELEMENT_NODE||!(A!=null&&A.force)&&(t==null?void 0:t.node)===e)return B().selectedContext;const s=nt.match(e);if(!s)return;const i={path:[],el:s.el,node:s.node,isVisible:!0,nodeId:Z(s.node)};ae().setInitialConfig(s);let n=i.node;for(;(n==null?void 0:n.nodeType)===Node.ELEMENT_NODE&&n.nodeName.toLowerCase()!=="body";)i.path.unshift({nodeId:Z(n),name:kx((o=nt.match(n))==null?void 0:o.el,n)}),n=n.parentElement;return Ja(i),bi.flushSync(()=>{B().setSelectedContext(i)}),gt.reposition(),B().setActivePanel(i.el.defaultSidebarPanel??fe.STYLE),B().selectedContext}function kx(e,A){return e?e.name==="div container"?A.id?A.id:A.classList[0]?A.classList[0]:e.name:e.name:"Unknown"}function cl(e,A){const t=getComputedStyle(e),s=parseInt(t.paddingLeft),i=parseInt(t.paddingRight);return(s||i)&&(A.width-=s+i,A.left+=(s+i)/2),A}class dl{constructor(){r(this,"overlayNode",null)}reposition(A){var n;const t=A??this.getCurrentTarget();if(!t||t.node.nodeType!==Node.ELEMENT_NODE||this.nodeIsHtmlOrBody(t.node)||(n=t.node.parentElement)!=null&&n.hasAttribute("contenteditable")||!this.overlayNode)return this.hide();const s=t.node.getBoundingClientRect();let i={top:s.top,left:s.left,width:s.width,height:s.height};t.el instanceof ia&&(i=cl(t.node,i)),!i.width||!i.height?this.hide():(this.overlayNode.style.top=`${i.top}px`,this.overlayNode.style.left=`${i.left}px`,this.overlayNode.style.height=`${i.height}px`,this.overlayNode.style.width=`${i.width}px`,this.show())}nodeIsHtmlOrBody(A){return A?A.nodeName==="BODY"||A.nodeName==="HTML":!1}}const gt=new class extends dl{constructor(){super(...arguments);r(this,"name","selected")}getCurrentTarget(){return B().selectedContext}remove(){xe(null)}hide(){const A=B().selectedContext;A!=null&&A.isVisible&&B().setSelectedContext({...A,isVisible:!1})}show(){const A=B().selectedContext;A&&!A.isVisible&&B().setSelectedContext({...A,isVisible:!0})}},Oe=new class extends dl{constructor(){super(...arguments);r(this,"name","hovered")}getCurrentTarget(){return B().hoveredContext}remove(){B().setHoveredContext(null)}hide(){const A=B().hoveredContext;A&&B().setHoveredContext({...A,isVisible:!1})}show(){const A=B().hoveredContext;A&&B().setHoveredContext({...A,isVisible:!0})}};function Ux(){gt.hide(),Oe.hide()}function ul(e){var t;const A=(t=B().getEditorDoc())==null?void 0:t.getSelection();return A==null||A.isCollapsed?!1:e?e.contains(A.anchorNode):!0}let kA={};const Pn={activeCommands:[],sessionIsActive:!1,hasInlineSelection:!1,repositionToolbar:void 0},_A=JA()((e,A)=>({...Pn,reset:()=>e(Pn),setHasInlineSelection:t=>{e({hasInlineSelection:t})},setRepositionToolbar:t=>{e({repositionToolbar:t})},startSession:()=>{var s;const t=(s=B().selectedContext)==null?void 0:s.node;t&&(Oe.remove(),kA.initialHtml=t.innerHTML,kA.node=t,t.contentEditable="true",t.focus(),e({sessionIsActive:!0}),ul(t)&&(He().setHasInlineSelection(!0),He().syncActiveCommands()))},endSession:()=>{const t={...kA};if(kA={},e({sessionIsActive:!1,hasInlineSelection:!1}),t.node){t.node.removeAttribute("contenteditable");const s=t.node.innerHTML;t.initialHtml&&s!==kA.initialHtml&&G().executeMutation(new fn(Z(t.node)||"",s),{lastInSession:!0})}},syncActiveCommands:()=>{var i;const t=[];B().getEditorDoc().queryCommandState("bold")&&t.push("bold"),B().getEditorDoc().queryCommandState("underline")&&t.push("underline"),B().getEditorDoc().queryCommandState("italic")&&t.push("italic");const s=B().getEditorWindow().getSelection();s!=null&&s.anchorNode&&((i=s.anchorNode.parentNode)==null?void 0:i.nodeName)==="A"&&t.push("createLink"),e({activeCommands:t})},execCommand:(t,s)=>{var i,n,o;if(t==="createLink"){const l=s;Vn("createLink",l.href),l.target&&((o=(n=(i=B().getEditorDoc().getSelection())==null?void 0:i.anchorNode)==null?void 0:n.parentElement)==null||o.setAttribute("target",l.target))}else Vn(t,s);A().syncActiveCommands()}}));function He(){return _A.getState()}function Vn(e,A){B().getEditorDoc().execCommand(e,!1,A??void 0)}var dt=(e=>(e.mobile="mobile",e.tablet="tablet",e.laptop="laptop",e.desktop="desktop",e))(dt||{});let et=null;const Gn={sidebarWidth:"350px",sidebarIsVisible:!0,iframeLoading:!0,iframeRect:{top:0,left:350,width:0,height:0},elementsLoading:!0,selectedBreakpoint:null,contextMenuPosition:null,hasCopiedNode:!1,hoveredContext:null,activePanel:fe.ELEMENTS,activePageId:null,project:null,selectedContext:null,dragState:!1,isResizing:!1},J=JA()(Id((...e)=>{const A=e[1],t=e[0];return{...Gn,reset:()=>{t(Gn),He().reset(),el().reset(),ae().reset(),G().reset()},setSidebarIsVisible:s=>{t({sidebarIsVisible:s}),setTimeout(()=>{B().syncIframeRect()},300)},syncIframeRect:()=>{et&&t({iframeRect:Bi(et.getBoundingClientRect())})},setSelectedBreakpoint:s=>{s===dt.desktop&&(s=null),t({selectedBreakpoint:s}),requestAnimationFrame(()=>{gt.reposition()})},setContextMenuPosition:s=>t({contextMenuPosition:s}),setHasCopiedNode:s=>t({hasCopiedNode:s}),getIframe:()=>et,setSelectedContext:s=>{He().endSession(),t({selectedContext:s})},getSelectedContextStyle:()=>{var s;return(s=A().selectedContext)!=null&&s.node?A().getEditorWindow().getComputedStyle(A().selectedContext.node):null},setHoveredContext:s=>{t({hoveredContext:s})},setDragState:s=>t({dragState:s}),setIsResizing:s=>t({isResizing:s}),setActivePanel:s=>t({activePanel:s}),init:(s,i)=>{et=i,A().syncIframeRect(),s.pages=og(s.pages),t({project:s}),A().setActivePage(s.pages[0].id)},updateProject:s=>{t({project:{...s,pages:s.pages.map(i=>{const n=A().project.pages.find(o=>o.name===i.name);return n?{...i,doc:n.doc,id:n.id}:i})}})},setActivePage:s=>{var n;if(A().activePageId===s)return;const i=(n=A().project)==null?void 0:n.pages.find(o=>o.id===s);i&&(i.doc||(i.doc=Ro(i.html)),t({activePageId:s}),jx(i))},updatePage:(s,i)=>{const n=A().project;n&&t({project:{...n,pages:n.pages.map(o=>o.id===s?{...o,...i}:o)}})},addNewPage:s=>{const i=A().project;return i&&t({project:{...i,pages:[...i.pages,s]}}),s},deletePage:s=>{const i=A().project;i&&t({project:{...i,pages:i.pages.filter(n=>n.id!==s)}})},getEditorDoc:()=>et==null?void 0:et.contentDocument,getEditorWindow:()=>et==null?void 0:et.contentWindow,getActivePageDoc:()=>{var s,i;return((i=(s=A().project)==null?void 0:s.pages.find(n=>n.id===A().activePageId))==null?void 0:i.doc)??null}}}));function B(){return J.getState()}function jx(e){if(e.doc&&et){const A=e.doc.createElement("base");A.href=_d(B().project),e.doc.head.prepend(A);const t=e.doc.documentElement.outerHTML;A.remove(),et.srcdoc=t}}function Ex(){const{trans:e}=Qt(),[A,t]=h.useState(null);return h.useEffect(()=>{A||nt.load(e).then(s=>{t(s)})},[A,e]),A}const Ix=ut.forwardRef((e,A)=>{const t=e.children,[s,i]=h.useState(null),n=h.useRef(null);return h.useImperativeHandle(A,()=>(o,l)=>{bi.flushSync(()=>{i(t(o))}),l(n.current),requestAnimationFrame(()=>{i(null)})},[t]),s?bi.createPortal(a.jsx("div",{style:{zIndex:-100,position:"absolute",top:0,left:-1e5},ref:n,children:s}),Ad):null}),gl=ut.forwardRef(({element:e},A)=>a.jsx(Ix,{ref:A,children:()=>a.jsx("div",{className:"rounded bg-chip px-10 py-6 text-sm font-semibold capitalize shadow",children:e==null?void 0:e.name})}));function CA({children:e,actions:A}){return a.jsxs("div",{className:"flex items-center justify-between gap-10 p-14",children:[a.jsx("h1",{className:"text-base font-bold",children:e}),A]})}function Sx(){const e=Ex();if(!e)return null;const A=t=>e.elements.filter(s=>s.category===t);return a.jsxs("div",{children:[a.jsx(CA,{children:a.jsx(d,{message:"Elements"})}),a.jsx(vA,{defaultExpandedValues:[0],children:e.categories.map(t=>a.jsx(Fe,{label:a.jsx("div",{className:"capitalize",children:a.jsx(d,{message:t})}),children:a.jsx("div",{className:"grid grid-cols-2 gap-8",children:A(t).map(s=>a.jsx(Hx,{element:s},s.name))})},t))})]})}function Hx({element:e}){const A=h.useRef(null),t=h.useRef(null),{draggableProps:s}=fo({id:e.name,type:"element-panel",ref:A,preview:t,getData:()=>({el:e}),onDragStart:()=>B().setDragState("dragging"),onDragEnd:()=>B().setDragState(!1)});return a.jsxs(h.Fragment,{children:[a.jsxs(Ft,{display:"flex",className:"cursor-move flex-col items-center rounded-panel border py-18 transition-colors hover:bg-hover",ref:A,...s,children:[a.jsx(Lx,{config:e}),a.jsx("span",{className:"mt-6 block text-xs font-medium capitalize leading-tight text-center break-words overflow-hidden",children:a.jsx(d,{message:e.name})})]},e.name),a.jsx(gl,{ref:t,element:e})]})}function Lx({config:e}){if(!e.icon)return null;let A;if(h.isValidElement(e.icon))A=h.cloneElement(e.icon,{size:"md"});else{const t=ad(e.icon);A=a.jsx(t,{size:"md"})}return a.jsx("span",{className:"text-muted",children:A})}/*!
 * html2canvas 1.4.1 <https://html2canvas.hertzen.com>
 * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 *//*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */var ji=function(e,A){return ji=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,s){t.__proto__=s}||function(t,s){for(var i in s)Object.prototype.hasOwnProperty.call(s,i)&&(t[i]=s[i])},ji(e,A)};function lt(e,A){if(typeof A!="function"&&A!==null)throw new TypeError("Class extends value "+String(A)+" is not a constructor or null");ji(e,A);function t(){this.constructor=e}e.prototype=A===null?Object.create(A):(t.prototype=A.prototype,new t)}var Ei=function(){return Ei=Object.assign||function(A){for(var t,s=1,i=arguments.length;s<i;s++){t=arguments[s];for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(A[n]=t[n])}return A},Ei.apply(this,arguments)};function Ve(e,A,t,s){function i(n){return n instanceof t?n:new t(function(o){o(n)})}return new(t||(t=Promise))(function(n,o){function l(u){try{g(s.next(u))}catch(p){o(p)}}function c(u){try{g(s.throw(u))}catch(p){o(p)}}function g(u){u.done?n(u.value):i(u.value).then(l,c)}g((s=s.apply(e,A||[])).next())})}function Me(e,A){var t={label:0,sent:function(){if(n[0]&1)throw n[1];return n[1]},trys:[],ops:[]},s,i,n,o;return o={next:l(0),throw:l(1),return:l(2)},typeof Symbol=="function"&&(o[Symbol.iterator]=function(){return this}),o;function l(g){return function(u){return c([g,u])}}function c(g){if(s)throw new TypeError("Generator is already executing.");for(;t;)try{if(s=1,i&&(n=g[0]&2?i.return:g[0]?i.throw||((n=i.return)&&n.call(i),0):i.next)&&!(n=n.call(i,g[1])).done)return n;switch(i=0,n&&(g=[g[0]&2,n.value]),g[0]){case 0:case 1:n=g;break;case 4:return t.label++,{value:g[1],done:!1};case 5:t.label++,i=g[1],g=[0];continue;case 7:g=t.ops.pop(),t.trys.pop();continue;default:if(n=t.trys,!(n=n.length>0&&n[n.length-1])&&(g[0]===6||g[0]===2)){t=0;continue}if(g[0]===3&&(!n||g[1]>n[0]&&g[1]<n[3])){t.label=g[1];break}if(g[0]===6&&t.label<n[1]){t.label=n[1],n=g;break}if(n&&t.label<n[2]){t.label=n[2],t.ops.push(g);break}n[2]&&t.ops.pop(),t.trys.pop();continue}g=A.call(e,t)}catch(u){g=[6,u],i=0}finally{s=n=0}if(g[0]&5)throw g[1];return{value:g[0]?g[1]:void 0,done:!0}}}function ma(e,A,t){if(t||arguments.length===2)for(var s=0,i=A.length,n;s<i;s++)(n||!(s in A))&&(n||(n=Array.prototype.slice.call(A,0,s)),n[s]=A[s]);return e.concat(n||A)}var yt=function(){function e(A,t,s,i){this.left=A,this.top=t,this.width=s,this.height=i}return e.prototype.add=function(A,t,s,i){return new e(this.left+A,this.top+t,this.width+s,this.height+i)},e.fromClientRect=function(A,t){return new e(t.left+A.windowBounds.left,t.top+A.windowBounds.top,t.width,t.height)},e.fromDOMRectList=function(A,t){var s=Array.from(t).find(function(i){return i.width!==0});return s?new e(s.left+A.windowBounds.left,s.top+A.windowBounds.top,s.width,s.height):e.EMPTY},e.EMPTY=new e(0,0,0,0),e}(),Qs=function(e,A){return yt.fromClientRect(e,A.getBoundingClientRect())},Nx=function(e){var A=e.body,t=e.documentElement;if(!A||!t)throw new Error("Unable to get document size");var s=Math.max(Math.max(A.scrollWidth,t.scrollWidth),Math.max(A.offsetWidth,t.offsetWidth),Math.max(A.clientWidth,t.clientWidth)),i=Math.max(Math.max(A.scrollHeight,t.scrollHeight),Math.max(A.offsetHeight,t.offsetHeight),Math.max(A.clientHeight,t.clientHeight));return new yt(0,0,s,i)},Fs=function(e){for(var A=[],t=0,s=e.length;t<s;){var i=e.charCodeAt(t++);if(i>=55296&&i<=56319&&t<s){var n=e.charCodeAt(t++);(n&64512)===56320?A.push(((i&1023)<<10)+(n&1023)+65536):(A.push(i),t--)}else A.push(i)}return A},ve=function(){for(var e=[],A=0;A<arguments.length;A++)e[A]=arguments[A];if(String.fromCodePoint)return String.fromCodePoint.apply(String,e);var t=e.length;if(!t)return"";for(var s=[],i=-1,n="";++i<t;){var o=e[i];o<=65535?s.push(o):(o-=65536,s.push((o>>10)+55296,o%1024+56320)),(i+1===t||s.length>16384)&&(n+=String.fromCharCode.apply(String,s),s.length=0)}return n},_n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Tx=typeof Uint8Array>"u"?[]:new Uint8Array(256);for(var ha=0;ha<_n.length;ha++)Tx[_n.charCodeAt(ha)]=ha;var qn="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",HA=typeof Uint8Array>"u"?[]:new Uint8Array(256);for(var fa=0;fa<qn.length;fa++)HA[qn.charCodeAt(fa)]=fa;var Dx=function(e){var A=e.length*.75,t=e.length,s,i=0,n,o,l,c;e[e.length-1]==="="&&(A--,e[e.length-2]==="="&&A--);var g=typeof ArrayBuffer<"u"&&typeof Uint8Array<"u"&&typeof Uint8Array.prototype.slice<"u"?new ArrayBuffer(A):new Array(A),u=Array.isArray(g)?g:new Uint8Array(g);for(s=0;s<t;s+=4)n=HA[e.charCodeAt(s)],o=HA[e.charCodeAt(s+1)],l=HA[e.charCodeAt(s+2)],c=HA[e.charCodeAt(s+3)],u[i++]=n<<2|o>>4,u[i++]=(o&15)<<4|l>>2,u[i++]=(l&3)<<6|c&63;return g},Mx=function(e){for(var A=e.length,t=[],s=0;s<A;s+=2)t.push(e[s+1]<<8|e[s]);return t},Kx=function(e){for(var A=e.length,t=[],s=0;s<A;s+=4)t.push(e[s+3]<<24|e[s+2]<<16|e[s+1]<<8|e[s]);return t},$t=5,vn=6+5,_s=2,Rx=vn-$t,pl=65536>>$t,zx=1<<$t,qs=zx-1,Ox=1024>>$t,Px=pl+Ox,Vx=Px,Gx=32,_x=Vx+Gx,qx=65536>>vn,Wx=1<<Rx,Xx=Wx-1,Wn=function(e,A,t){return e.slice?e.slice(A,t):new Uint16Array(Array.prototype.slice.call(e,A,t))},Yx=function(e,A,t){return e.slice?e.slice(A,t):new Uint32Array(Array.prototype.slice.call(e,A,t))},Jx=function(e,A){var t=Dx(e),s=Array.isArray(t)?Kx(t):new Uint32Array(t),i=Array.isArray(t)?Mx(t):new Uint16Array(t),n=24,o=Wn(i,n/2,s[4]/2),l=s[5]===2?Wn(i,(n+s[4])/2):Yx(s,Math.ceil((n+s[4])/4));return new $x(s[0],s[1],s[2],s[3],o,l)},$x=function(){function e(A,t,s,i,n,o){this.initialValue=A,this.errorValue=t,this.highStart=s,this.highValueIndex=i,this.index=n,this.data=o}return e.prototype.get=function(A){var t;if(A>=0){if(A<55296||A>56319&&A<=65535)return t=this.index[A>>$t],t=(t<<_s)+(A&qs),this.data[t];if(A<=65535)return t=this.index[pl+(A-55296>>$t)],t=(t<<_s)+(A&qs),this.data[t];if(A<this.highStart)return t=_x-qx+(A>>vn),t=this.index[t],t+=A>>$t&Xx,t=this.index[t],t=(t<<_s)+(A&qs),this.data[t];if(A<=1114111)return this.data[this.highValueIndex]}return this.errorValue},e}(),Xn="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Zx=typeof Uint8Array>"u"?[]:new Uint8Array(256);for(var xa=0;xa<Xn.length;xa++)Zx[Xn.charCodeAt(xa)]=xa;var e0="KwAAAAAAAAAACA4AUD0AADAgAAACAAAAAAAIABAAGABAAEgAUABYAGAAaABgAGgAYgBqAF8AZwBgAGgAcQB5AHUAfQCFAI0AlQCdAKIAqgCyALoAYABoAGAAaABgAGgAwgDKAGAAaADGAM4A0wDbAOEA6QDxAPkAAQEJAQ8BFwF1AH0AHAEkASwBNAE6AUIBQQFJAVEBWQFhAWgBcAF4ATAAgAGGAY4BlQGXAZ8BpwGvAbUBvQHFAc0B0wHbAeMB6wHxAfkBAQIJAvEBEQIZAiECKQIxAjgCQAJGAk4CVgJeAmQCbAJ0AnwCgQKJApECmQKgAqgCsAK4ArwCxAIwAMwC0wLbAjAA4wLrAvMC+AIAAwcDDwMwABcDHQMlAy0DNQN1AD0DQQNJA0kDSQNRA1EDVwNZA1kDdQB1AGEDdQBpA20DdQN1AHsDdQCBA4kDkQN1AHUAmQOhA3UAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AKYDrgN1AHUAtgO+A8YDzgPWAxcD3gPjA+sD8wN1AHUA+wMDBAkEdQANBBUEHQQlBCoEFwMyBDgEYABABBcDSARQBFgEYARoBDAAcAQzAXgEgASIBJAEdQCXBHUAnwSnBK4EtgS6BMIEyAR1AHUAdQB1AHUAdQCVANAEYABgAGAAYABgAGAAYABgANgEYADcBOQEYADsBPQE/AQEBQwFFAUcBSQFLAU0BWQEPAVEBUsFUwVbBWAAYgVgAGoFcgV6BYIFigWRBWAAmQWfBaYFYABgAGAAYABgAKoFYACxBbAFuQW6BcEFwQXHBcEFwQXPBdMF2wXjBeoF8gX6BQIGCgYSBhoGIgYqBjIGOgZgAD4GRgZMBmAAUwZaBmAAYABgAGAAYABgAGAAYABgAGAAYABgAGIGYABpBnAGYABgAGAAYABgAGAAYABgAGAAYAB4Bn8GhQZgAGAAYAB1AHcDFQSLBmAAYABgAJMGdQA9A3UAmwajBqsGqwaVALMGuwbDBjAAywbSBtIG1QbSBtIG0gbSBtIG0gbdBuMG6wbzBvsGAwcLBxMHAwcbByMHJwcsBywHMQcsB9IGOAdAB0gHTgfSBkgHVgfSBtIG0gbSBtIG0gbSBtIG0gbSBiwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdgAGAALAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdbB2MHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB2kH0gZwB64EdQB1AHUAdQB1AHUAdQB1AHUHfQdgAIUHjQd1AHUAlQedB2AAYAClB6sHYACzB7YHvgfGB3UAzgfWBzMB3gfmB1EB7gf1B/0HlQENAQUIDQh1ABUIHQglCBcDLQg1CD0IRQhNCEEDUwh1AHUAdQBbCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIcAh3CHoIMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIgggwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAALAcsBywHLAcsBywHLAcsBywHLAcsB4oILAcsB44I0gaWCJ4Ipgh1AHUAqgiyCHUAdQB1AHUAdQB1AHUAdQB1AHUAtwh8AXUAvwh1AMUIyQjRCNkI4AjoCHUAdQB1AO4I9gj+CAYJDgkTCS0HGwkjCYIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiAAIAAAAFAAYABgAGIAXwBgAHEAdQBFAJUAogCyAKAAYABgAEIA4ABGANMA4QDxAMEBDwE1AFwBLAE6AQEBUQF4QkhCmEKoQrhCgAHIQsAB0MLAAcABwAHAAeDC6ABoAHDCwMMAAcABwAHAAdDDGMMAAcAB6MM4wwjDWMNow3jDaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAEjDqABWw6bDqABpg6gAaABoAHcDvwOPA+gAaABfA/8DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DpcPAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcAB9cPKwkyCToJMAB1AHUAdQBCCUoJTQl1AFUJXAljCWcJawkwADAAMAAwAHMJdQB2CX4JdQCECYoJjgmWCXUAngkwAGAAYABxAHUApgn3A64JtAl1ALkJdQDACTAAMAAwADAAdQB1AHUAdQB1AHUAdQB1AHUAowYNBMUIMAAwADAAMADICcsJ0wnZCRUE4QkwAOkJ8An4CTAAMAB1AAAKvwh1AAgKDwoXCh8KdQAwACcKLgp1ADYKqAmICT4KRgowADAAdQB1AE4KMAB1AFYKdQBeCnUAZQowADAAMAAwADAAMAAwADAAMAAVBHUAbQowADAAdQC5CXUKMAAwAHwBxAijBogEMgF9CoQKiASMCpQKmgqIBKIKqgquCogEDQG2Cr4KxgrLCjAAMADTCtsKCgHjCusK8Qr5CgELMAAwADAAMAB1AIsECQsRC3UANAEZCzAAMAAwADAAMAB1ACELKQswAHUANAExCzkLdQBBC0kLMABRC1kLMAAwADAAMAAwADAAdQBhCzAAMAAwAGAAYABpC3ELdwt/CzAAMACHC4sLkwubC58Lpwt1AK4Ltgt1APsDMAAwADAAMAAwADAAMAAwAL4LwwvLC9IL1wvdCzAAMADlC+kL8Qv5C/8LSQswADAAMAAwADAAMAAwADAAMAAHDDAAMAAwADAAMAAODBYMHgx1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1ACYMMAAwADAAdQB1AHUALgx1AHUAdQB1AHUAdQA2DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AD4MdQBGDHUAdQB1AHUAdQB1AEkMdQB1AHUAdQB1AFAMMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQBYDHUAdQB1AF8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUA+wMVBGcMMAAwAHwBbwx1AHcMfwyHDI8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAYABgAJcMMAAwADAAdQB1AJ8MlQClDDAAMACtDCwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB7UMLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AA0EMAC9DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAsBywHLAcsBywHLAcsBywHLQcwAMEMyAwsBywHLAcsBywHLAcsBywHLAcsBywHzAwwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1ANQM2QzhDDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMABgAGAAYABgAGAAYABgAOkMYADxDGAA+AwADQYNYABhCWAAYAAODTAAMAAwADAAFg1gAGAAHg37AzAAMAAwADAAYABgACYNYAAsDTQNPA1gAEMNPg1LDWAAYABgAGAAYABgAGAAYABgAGAAUg1aDYsGVglhDV0NcQBnDW0NdQ15DWAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAlQCBDZUAiA2PDZcNMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAnw2nDTAAMAAwADAAMAAwAHUArw23DTAAMAAwADAAMAAwADAAMAAwADAAMAB1AL8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQDHDTAAYABgAM8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA1w11ANwNMAAwAD0B5A0wADAAMAAwADAAMADsDfQN/A0EDgwOFA4wABsOMAAwADAAMAAwADAAMAAwANIG0gbSBtIG0gbSBtIG0gYjDigOwQUuDsEFMw7SBjoO0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGQg5KDlIOVg7SBtIGXg5lDm0OdQ7SBtIGfQ6EDooOjQ6UDtIGmg6hDtIG0gaoDqwO0ga0DrwO0gZgAGAAYADEDmAAYAAkBtIGzA5gANIOYADaDokO0gbSBt8O5w7SBu8O0gb1DvwO0gZgAGAAxA7SBtIG0gbSBtIGYABgAGAAYAAED2AAsAUMD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHJA8sBywHLAcsBywHLAccDywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywPLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAc0D9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHPA/SBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gYUD0QPlQCVAJUAMAAwADAAMACVAJUAlQCVAJUAlQCVAEwPMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA//8EAAQABAAEAAQABAAEAAQABAANAAMAAQABAAIABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACgATABcAHgAbABoAHgAXABYAEgAeABsAGAAPABgAHABLAEsASwBLAEsASwBLAEsASwBLABgAGAAeAB4AHgATAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABYAGwASAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWAA0AEQAeAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAFAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJABYAGgAbABsAGwAeAB0AHQAeAE8AFwAeAA0AHgAeABoAGwBPAE8ADgBQAB0AHQAdAE8ATwAXAE8ATwBPABYAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAFAATwBAAE8ATwBPAEAATwBQAFAATwBQAB4AHgAeAB4AHgAeAB0AHQAdAB0AHgAdAB4ADgBQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgBQAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAkACQAJAAkACQAJAAkABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAFAAHgAeAB4AKwArAFAAUABQAFAAGABQACsAKwArACsAHgAeAFAAHgBQAFAAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUAAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAYAA0AKwArAB4AHgAbACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAB4ABAAEAB4ABAAEABMABAArACsAKwArACsAKwArACsAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAKwArACsAKwBWAFYAVgBWAB4AHgArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AGgAaABoAGAAYAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQAEwAEACsAEwATAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABLAEsASwBLAEsASwBLAEsASwBLABoAGQAZAB4AUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABMAUAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABABQAFAABAAEAB4ABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUAAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAFAABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQAUABQAB4AHgAYABMAUAArACsABAAbABsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAFAABAAEAAQABAAEAFAABAAEAAQAUAAEAAQABAAEAAQAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArACsAHgArAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEAA0ADQBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUAArACsAKwBQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABABQACsAKwArACsAKwArACsAKwAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUAAaABoAUABQAFAAUABQAEwAHgAbAFAAHgAEACsAKwAEAAQABAArAFAAUABQAFAAUABQACsAKwArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQACsAUABQACsAKwAEACsABAAEAAQABAAEACsAKwArACsABAAEACsAKwAEAAQABAArACsAKwAEACsAKwArACsAKwArACsAUABQAFAAUAArAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLAAQABABQAFAAUAAEAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAArACsAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AGwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAKwArACsAKwArAAQABAAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAAQAUAArAFAAUABQAFAAUABQACsAKwArAFAAUABQACsAUABQAFAAUAArACsAKwBQAFAAKwBQACsAUABQACsAKwArAFAAUAArACsAKwBQAFAAUAArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArAAQABAAEAAQABAArACsAKwAEAAQABAArAAQABAAEAAQAKwArAFAAKwArACsAKwArACsABAArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAHgAeAB4AHgAeAB4AGwAeACsAKwArACsAKwAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAUABQAFAAKwArACsAKwArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwAOAFAAUABQAFAAUABQAFAAHgBQAAQABAAEAA4AUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAKwArAAQAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAKwArACsAKwArACsAUAArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAFAABAAEAAQABAAEAAQABAArAAQABAAEACsABAAEAAQABABQAB4AKwArACsAKwBQAFAAUAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQABoAUABQAFAAUABQAFAAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQACsAUAArACsAUABQAFAAUABQAFAAUAArACsAKwAEACsAKwArACsABAAEAAQABAAEAAQAKwAEACsABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArAAQABAAeACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAXAAqACoAKgAqACoAKgAqACsAKwArACsAGwBcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAeAEsASwBLAEsASwBLAEsASwBLAEsADQANACsAKwArACsAKwBcAFwAKwBcACsAXABcAFwAXABcACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAXAArAFwAXABcAFwAXABcAFwAXABcAFwAKgBcAFwAKgAqACoAKgAqACoAKgAqACoAXAArACsAXABcAFwAXABcACsAXAArACoAKgAqACoAKgAqACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwBcAFwAXABcAFAADgAOAA4ADgAeAA4ADgAJAA4ADgANAAkAEwATABMAEwATAAkAHgATAB4AHgAeAAQABAAeAB4AHgAeAB4AHgBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQAFAADQAEAB4ABAAeAAQAFgARABYAEQAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAAQABAAEAAQADQAEAAQAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAA0ADQAeAB4AHgAeAB4AHgAEAB4AHgAeAB4AHgAeACsAHgAeAA4ADgANAA4AHgAeAB4AHgAeAAkACQArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgBcAEsASwBLAEsASwBLAEsASwBLAEsADQANAB4AHgAeAB4AXABcAFwAXABcAFwAKgAqACoAKgBcAFwAXABcACoAKgAqAFwAKgAqACoAXABcACoAKgAqACoAKgAqACoAXABcAFwAKgAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqAFwAKgBLAEsASwBLAEsASwBLAEsASwBLACoAKgAqACoAKgAqAFAAUABQAFAAUABQACsAUAArACsAKwArACsAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAKwBQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsABAAEAAQAHgANAB4AHgAeAB4AHgAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUAArACsADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWABEAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQANAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAANAA0AKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUAArAAQABAArACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqAA0ADQAVAFwADQAeAA0AGwBcACoAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwAeAB4AEwATAA0ADQAOAB4AEwATAB4ABAAEAAQACQArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAHgArACsAKwATABMASwBLAEsASwBLAEsASwBLAEsASwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAXABcAFwAXABcACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAXAArACsAKwAqACoAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsAHgAeAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKwAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKwArAAQASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACoAKgAqACoAKgAqACoAXAAqACoAKgAqACoAKgArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABABQAFAAUABQAFAAUABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwANAA0AHgANAA0ADQANAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwAeAB4AHgAeAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArAA0ADQANAA0ADQBLAEsASwBLAEsASwBLAEsASwBLACsAKwArAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUAAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAAQAUABQAFAAUABQAFAABABQAFAABAAEAAQAUAArACsAKwArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQACsAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAFAAUABQACsAHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQACsAKwAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQACsAHgAeAB4AHgAeAB4AHgAOAB4AKwANAA0ADQANAA0ADQANAAkADQANAA0ACAAEAAsABAAEAA0ACQANAA0ADAAdAB0AHgAXABcAFgAXABcAFwAWABcAHQAdAB4AHgAUABQAFAANAAEAAQAEAAQABAAEAAQACQAaABoAGgAaABoAGgAaABoAHgAXABcAHQAVABUAHgAeAB4AHgAeAB4AGAAWABEAFQAVABUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ADQAeAA0ADQANAA0AHgANAA0ADQAHAB4AHgAeAB4AKwAEAAQABAAEAAQABAAEAAQABAAEAFAAUAArACsATwBQAFAAUABQAFAAHgAeAB4AFgARAE8AUABPAE8ATwBPAFAAUABQAFAAUAAeAB4AHgAWABEAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArABsAGwAbABsAGwAbABsAGgAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGgAbABsAGwAbABoAGwAbABoAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAHgAeAFAAGgAeAB0AHgBQAB4AGgAeAB4AHgAeAB4AHgAeAB4AHgBPAB4AUAAbAB4AHgBQAFAAUABQAFAAHgAeAB4AHQAdAB4AUAAeAFAAHgBQAB4AUABPAFAAUAAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgBQAFAAUABQAE8ATwBQAFAAUABQAFAATwBQAFAATwBQAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAUABQAFAATwBPAE8ATwBPAE8ATwBPAE8ATwBQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABPAB4AHgArACsAKwArAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHQAdAB4AHgAeAB0AHQAeAB4AHQAeAB4AHgAdAB4AHQAbABsAHgAdAB4AHgAeAB4AHQAeAB4AHQAdAB0AHQAeAB4AHQAeAB0AHgAdAB0AHQAdAB0AHQAeAB0AHgAeAB4AHgAeAB0AHQAdAB0AHgAeAB4AHgAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHgAeAB0AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAeAB0AHQAdAB0AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAdAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAWABEAHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAWABEAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AHQAdAB0AHgAeAB0AHgAeAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlAB4AHQAdAB4AHgAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AJQAlAB0AHQAlAB4AJQAlACUAIAAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAdAB0AHQAeAB0AJQAdAB0AHgAdAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAdAB0AHQAdACUAHgAlACUAJQAdACUAJQAdAB0AHQAlACUAHQAdACUAHQAdACUAJQAlAB4AHQAeAB4AHgAeAB0AHQAlAB0AHQAdAB0AHQAdACUAJQAlACUAJQAdACUAJQAgACUAHQAdACUAJQAlACUAJQAlACUAJQAeAB4AHgAlACUAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AFwAXABcAFwAXABcAHgATABMAJQAeAB4AHgAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARABYAEQAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAEAAQABAAeAB4AKwArACsAKwArABMADQANAA0AUAATAA0AUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUAANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAA0ADQANAA0ADQANAA0ADQAeAA0AFgANAB4AHgAXABcAHgAeABcAFwAWABEAFgARABYAEQAWABEADQANAA0ADQATAFAADQANAB4ADQANAB4AHgAeAB4AHgAMAAwADQANAA0AHgANAA0AFgANAA0ADQANAA0ADQANAA0AHgANAB4ADQANAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArAA0AEQARACUAJQBHAFcAVwAWABEAFgARABYAEQAWABEAFgARACUAJQAWABEAFgARABYAEQAWABEAFQAWABEAEQAlAFcAVwBXAFcAVwBXAFcAVwBXAAQABAAEAAQABAAEACUAVwBXAFcAVwA2ACUAJQBXAFcAVwBHAEcAJQAlACUAKwBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBRAFcAUQBXAFEAVwBXAFcAVwBXAFcAUQBXAFcAVwBXAFcAVwBRAFEAKwArAAQABAAVABUARwBHAFcAFQBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBRAFcAVwBXAFcAVwBXAFEAUQBXAFcAVwBXABUAUQBHAEcAVwArACsAKwArACsAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwAlACUAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACsAKwArACsAKwArACsAKwArACsAKwArAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBPAE8ATwBPAE8ATwBPAE8AJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADQATAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABLAEsASwBLAEsASwBLAEsASwBLAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAABAAEAAQABAAeAAQABAAEAAQABAAEAAQABAAEAAQAHgBQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAeAA0ADQANAA0ADQArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAAQAUABQAFAABABQAFAAUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAeAB4AHgAeAAQAKwArACsAUABQAFAAUABQAFAAHgAeABoAHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADgAOABMAEwArACsAKwArACsAKwArACsABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwANAA0ASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUAAeAB4AHgBQAA4AUABQAAQAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArAB4AWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYACsAKwArAAQAHgAeAB4AHgAeAB4ADQANAA0AHgAeAB4AHgArAFAASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArAB4AHgBcAFwAXABcAFwAKgBcAFwAXABcAFwAXABcAFwAXABcAEsASwBLAEsASwBLAEsASwBLAEsAXABcAFwAXABcACsAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAFAAUABQAAQAUABQAFAAUABQAFAAUABQAAQABAArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAHgANAA0ADQBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAXAAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAKgAqACoAXABcACoAKgBcAFwAXABcAFwAKgAqAFwAKgBcACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcACoAKgBQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAA0ADQBQAFAAUAAEAAQAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQADQAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAVABVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBUAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVACsAKwArACsAKwArACsAKwArACsAKwArAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAKwArACsAKwBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAKwArACsAKwAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAKwArACsAKwArAFYABABWAFYAVgBWAFYAVgBWAFYAVgBWAB4AVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgArAFYAVgBWAFYAVgArAFYAKwBWAFYAKwBWAFYAKwBWAFYAVgBWAFYAVgBWAFYAVgBWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAEQAWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAaAB4AKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAGAARABEAGAAYABMAEwAWABEAFAArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACUAJQAlACUAJQAWABEAFgARABYAEQAWABEAFgARABYAEQAlACUAFgARACUAJQAlACUAJQAlACUAEQAlABEAKwAVABUAEwATACUAFgARABYAEQAWABEAJQAlACUAJQAlACUAJQAlACsAJQAbABoAJQArACsAKwArAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAcAKwATACUAJQAbABoAJQAlABYAEQAlACUAEQAlABEAJQBXAFcAVwBXAFcAVwBXAFcAVwBXABUAFQAlACUAJQATACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXABYAJQARACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAWACUAEQAlABYAEQARABYAEQARABUAVwBRAFEAUQBRAFEAUQBRAFEAUQBRAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcARwArACsAVwBXAFcAVwBXAFcAKwArAFcAVwBXAFcAVwBXACsAKwBXAFcAVwBXAFcAVwArACsAVwBXAFcAKwArACsAGgAbACUAJQAlABsAGwArAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAAQAB0AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsADQANAA0AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAA0AUABQAFAAUAArACsAKwArAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwArAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwBQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAUABQAFAAUABQAAQABAAEACsABAAEACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAKwBQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAA0ADQANAA0ADQANAA0ADQAeACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAArACsAKwArAFAAUABQAFAAUAANAA0ADQANAA0ADQAUACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsADQANAA0ADQANAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArAAQABAANACsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAB4AHgAeAB4AHgArACsAKwArACsAKwAEAAQABAAEAAQABAAEAA0ADQAeAB4AHgAeAB4AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsASwBLAEsASwBLAEsASwBLAEsASwANAA0ADQANAFAABAAEAFAAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAeAA4AUAArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAADQANAB4ADQAEAAQABAAEAB4ABAAEAEsASwBLAEsASwBLAEsASwBLAEsAUAAOAFAADQANAA0AKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAANAA0AHgANAA0AHgAEACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAA0AKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsABAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsABAAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAUAArACsAKwArACsAKwAEACsAKwArACsAKwBQAFAAUABQAFAABAAEACsAKwAEAAQABAAEAAQABAAEACsAKwArAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAAQABABQAFAAUABQAA0ADQANAA0AHgBLAEsASwBLAEsASwBLAEsASwBLAA0ADQArAB4ABABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUAAeAFAAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABAAEAAQADgANAA0AEwATAB4AHgAeAA0ADQANAA0ADQANAA0ADQANAA0ADQANAA0ADQANAFAAUABQAFAABAAEACsAKwAEAA0ADQAeAFAAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKwArACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBcAFwADQANAA0AKgBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAKwArAFAAKwArAFAAUABQAFAAUABQAFAAUAArAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQAKwAEAAQAKwArAAQABAAEAAQAUAAEAFAABAAEAA0ADQANACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABABQAA4AUAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAFAABAAEAAQABAAOAB4ADQANAA0ADQAOAB4ABAArACsAKwArACsAKwArACsAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAA0ADQANAFAADgAOAA4ADQANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAAQABAAEAFAADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAOABMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAArACsAKwAEACsABAAEACsABAAEAAQABAAEAAQABABQAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAaABoAGgAaAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABIAEgAQwBDAEMAUABQAFAAUABDAFAAUABQAEgAQwBIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABDAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAJAAkACQAJAAkACQAJABYAEQArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwANAA0AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAANACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAA0ADQANAB4AHgAeAB4AHgAeAFAAUABQAFAADQAeACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAA0AHgAeACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAARwBHABUARwAJACsAKwArACsAKwArACsAKwArACsAKwAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUQBRAFEAKwArACsAKwArACsAKwArACsAKwArACsAKwBRAFEAUQBRACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAHgAEAAQADQAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQABAAEAAQABAAeAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQAHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAKwArAFAAKwArAFAAUAArACsAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUAArAFAAUABQAFAAUABQAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAHgAeAFAAUABQAFAAUAArAFAAKwArACsAUABQAFAAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeACsAKwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4ABAAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAHgAeAA0ADQANAA0AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArAAQABAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwBQAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArABsAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAB4AHgAeAB4ABAAEAAQABAAEAAQABABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArABYAFgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAGgBQAFAAUAAaAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUAArACsAKwArACsAKwBQACsAKwArACsAUAArAFAAKwBQACsAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUAArAFAAKwBQACsAUAArAFAAUAArAFAAKwArAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAKwBQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8AJQAlACUAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB4AHgAeACUAJQAlAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAlACUAJQAlACUAHgAlACUAJQAlACUAIAAgACAAJQAlACAAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACEAIQAhACEAIQAlACUAIAAgACUAJQAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAIAAlACUAJQAlACAAIAAgACUAIAAgACAAJQAlACUAJQAlACUAJQAgACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAlAB4AJQAeACUAJQAlACUAJQAgACUAJQAlACUAHgAlAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACAAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABcAFwAXABUAFQAVAB4AHgAeAB4AJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAgACUAJQAgACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAIAAgACUAJQAgACAAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACAAIAAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACAAIAAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAA==",Yn=50,t0=1,ml=2,hl=3,A0=4,a0=5,Jn=7,fl=8,$n=9,Ht=10,Ii=11,Zn=12,Si=13,s0=14,LA=15,Hi=16,ba=17,UA=18,i0=19,er=20,Li=21,jA=22,Ws=23,iA=24,qe=25,NA=26,TA=27,nA=28,n0=29,qt=30,r0=31,wa=32,Ba=33,Ni=34,Ti=35,Di=36,qA=37,Mi=38,Ra=39,za=40,Xs=41,xl=42,o0=43,l0=[9001,65288],bl="!",Ae="×",va="÷",Ki=Jx(e0),xt=[qt,Di],Ri=[t0,ml,hl,a0],wl=[Ht,fl],tr=[TA,NA],c0=Ri.concat(wl),Ar=[Mi,Ra,za,Ni,Ti],d0=[LA,Si],u0=function(e,A){A===void 0&&(A="strict");var t=[],s=[],i=[];return e.forEach(function(n,o){var l=Ki.get(n);if(l>Yn?(i.push(!0),l-=Yn):i.push(!1),["normal","auto","loose"].indexOf(A)!==-1&&[8208,8211,12316,12448].indexOf(n)!==-1)return s.push(o),t.push(Hi);if(l===A0||l===Ii){if(o===0)return s.push(o),t.push(qt);var c=t[o-1];return c0.indexOf(c)===-1?(s.push(s[o-1]),t.push(c)):(s.push(o),t.push(qt))}if(s.push(o),l===r0)return t.push(A==="strict"?Li:qA);if(l===xl||l===n0)return t.push(qt);if(l===o0)return n>=131072&&n<=196605||n>=196608&&n<=262141?t.push(qA):t.push(qt);t.push(l)}),[s,t,i]},Ys=function(e,A,t,s){var i=s[t];if(Array.isArray(e)?e.indexOf(i)!==-1:e===i)for(var n=t;n<=s.length;){n++;var o=s[n];if(o===A)return!0;if(o!==Ht)break}if(i===Ht)for(var n=t;n>0;){n--;var l=s[n];if(Array.isArray(e)?e.indexOf(l)!==-1:e===l)for(var c=t;c<=s.length;){c++;var o=s[c];if(o===A)return!0;if(o!==Ht)break}if(l!==Ht)break}return!1},ar=function(e,A){for(var t=e;t>=0;){var s=A[t];if(s===Ht)t--;else return s}return 0},g0=function(e,A,t,s,i){if(t[s]===0)return Ae;var n=s-1;if(Array.isArray(i)&&i[n]===!0)return Ae;var o=n-1,l=n+1,c=A[n],g=o>=0?A[o]:0,u=A[l];if(c===ml&&u===hl)return Ae;if(Ri.indexOf(c)!==-1)return bl;if(Ri.indexOf(u)!==-1||wl.indexOf(u)!==-1)return Ae;if(ar(n,A)===fl)return va;if(Ki.get(e[n])===Ii||(c===wa||c===Ba)&&Ki.get(e[l])===Ii||c===Jn||u===Jn||c===$n||[Ht,Si,LA].indexOf(c)===-1&&u===$n||[ba,UA,i0,iA,nA].indexOf(u)!==-1||ar(n,A)===jA||Ys(Ws,jA,n,A)||Ys([ba,UA],Li,n,A)||Ys(Zn,Zn,n,A))return Ae;if(c===Ht)return va;if(c===Ws||u===Ws)return Ae;if(u===Hi||c===Hi)return va;if([Si,LA,Li].indexOf(u)!==-1||c===s0||g===Di&&d0.indexOf(c)!==-1||c===nA&&u===Di||u===er||xt.indexOf(u)!==-1&&c===qe||xt.indexOf(c)!==-1&&u===qe||c===TA&&[qA,wa,Ba].indexOf(u)!==-1||[qA,wa,Ba].indexOf(c)!==-1&&u===NA||xt.indexOf(c)!==-1&&tr.indexOf(u)!==-1||tr.indexOf(c)!==-1&&xt.indexOf(u)!==-1||[TA,NA].indexOf(c)!==-1&&(u===qe||[jA,LA].indexOf(u)!==-1&&A[l+1]===qe)||[jA,LA].indexOf(c)!==-1&&u===qe||c===qe&&[qe,nA,iA].indexOf(u)!==-1)return Ae;if([qe,nA,iA,ba,UA].indexOf(u)!==-1)for(var p=n;p>=0;){var f=A[p];if(f===qe)return Ae;if([nA,iA].indexOf(f)!==-1)p--;else break}if([TA,NA].indexOf(u)!==-1)for(var p=[ba,UA].indexOf(c)!==-1?o:n;p>=0;){var f=A[p];if(f===qe)return Ae;if([nA,iA].indexOf(f)!==-1)p--;else break}if(Mi===c&&[Mi,Ra,Ni,Ti].indexOf(u)!==-1||[Ra,Ni].indexOf(c)!==-1&&[Ra,za].indexOf(u)!==-1||[za,Ti].indexOf(c)!==-1&&u===za||Ar.indexOf(c)!==-1&&[er,NA].indexOf(u)!==-1||Ar.indexOf(u)!==-1&&c===TA||xt.indexOf(c)!==-1&&xt.indexOf(u)!==-1||c===iA&&xt.indexOf(u)!==-1||xt.concat(qe).indexOf(c)!==-1&&u===jA&&l0.indexOf(e[l])===-1||xt.concat(qe).indexOf(u)!==-1&&c===UA)return Ae;if(c===Xs&&u===Xs){for(var x=t[n],w=1;x>0&&(x--,A[x]===Xs);)w++;if(w%2!==0)return Ae}return c===wa&&u===Ba?Ae:va},p0=function(e,A){A||(A={lineBreak:"normal",wordBreak:"normal"});var t=u0(e,A.lineBreak),s=t[0],i=t[1],n=t[2];(A.wordBreak==="break-all"||A.wordBreak==="break-word")&&(i=i.map(function(l){return[qe,qt,xl].indexOf(l)!==-1?qA:l}));var o=A.wordBreak==="keep-all"?n.map(function(l,c){return l&&e[c]>=19968&&e[c]<=40959}):void 0;return[s,i,o]},m0=function(){function e(A,t,s,i){this.codePoints=A,this.required=t===bl,this.start=s,this.end=i}return e.prototype.slice=function(){return ve.apply(void 0,this.codePoints.slice(this.start,this.end))},e}(),h0=function(e,A){var t=Fs(e),s=p0(t,A),i=s[0],n=s[1],o=s[2],l=t.length,c=0,g=0;return{next:function(){if(g>=l)return{done:!0,value:null};for(var u=Ae;g<l&&(u=g0(t,n,i,++g,o))===Ae;);if(u!==Ae||g===l){var p=new m0(t,u,c,g);return c=g,{value:p,done:!1}}return{done:!0,value:null}}}},f0=1,x0=2,na=4,sr=8,$a=10,ir=47,RA=92,b0=9,w0=32,Ca=34,EA=61,B0=35,v0=36,C0=37,ya=39,Qa=40,IA=41,y0=95,_e=45,Q0=33,F0=60,k0=62,U0=64,j0=91,E0=93,I0=61,S0=123,Fa=63,H0=125,nr=124,L0=126,N0=128,rr=65533,Js=42,Wt=43,T0=44,D0=58,M0=59,WA=46,K0=0,R0=8,z0=11,O0=14,P0=31,V0=127,ct=-1,Bl=48,vl=97,Cl=101,G0=102,_0=117,q0=122,yl=65,Ql=69,Fl=70,W0=85,X0=90,Re=function(e){return e>=Bl&&e<=57},Y0=function(e){return e>=55296&&e<=57343},rA=function(e){return Re(e)||e>=yl&&e<=Fl||e>=vl&&e<=G0},J0=function(e){return e>=vl&&e<=q0},$0=function(e){return e>=yl&&e<=X0},Z0=function(e){return J0(e)||$0(e)},eb=function(e){return e>=N0},ka=function(e){return e===$a||e===b0||e===w0},Za=function(e){return Z0(e)||eb(e)||e===y0},or=function(e){return Za(e)||Re(e)||e===_e},tb=function(e){return e>=K0&&e<=R0||e===z0||e>=O0&&e<=P0||e===V0},It=function(e,A){return e!==RA?!1:A!==$a},Ua=function(e,A,t){return e===_e?Za(A)||It(A,t):Za(e)?!0:!!(e===RA&&It(e,A))},$s=function(e,A,t){return e===Wt||e===_e?Re(A)?!0:A===WA&&Re(t):Re(e===WA?A:e)},Ab=function(e){var A=0,t=1;(e[A]===Wt||e[A]===_e)&&(e[A]===_e&&(t=-1),A++);for(var s=[];Re(e[A]);)s.push(e[A++]);var i=s.length?parseInt(ve.apply(void 0,s),10):0;e[A]===WA&&A++;for(var n=[];Re(e[A]);)n.push(e[A++]);var o=n.length,l=o?parseInt(ve.apply(void 0,n),10):0;(e[A]===Ql||e[A]===Cl)&&A++;var c=1;(e[A]===Wt||e[A]===_e)&&(e[A]===_e&&(c=-1),A++);for(var g=[];Re(e[A]);)g.push(e[A++]);var u=g.length?parseInt(ve.apply(void 0,g),10):0;return t*(i+l*Math.pow(10,-o))*Math.pow(10,c*u)},ab={type:2},sb={type:3},ib={type:4},nb={type:13},rb={type:8},ob={type:21},lb={type:9},cb={type:10},db={type:11},ub={type:12},gb={type:14},ja={type:23},pb={type:1},mb={type:25},hb={type:24},fb={type:26},xb={type:27},bb={type:28},wb={type:29},Bb={type:31},zi={type:32},kl=function(){function e(){this._value=[]}return e.prototype.write=function(A){this._value=this._value.concat(Fs(A))},e.prototype.read=function(){for(var A=[],t=this.consumeToken();t!==zi;)A.push(t),t=this.consumeToken();return A},e.prototype.consumeToken=function(){var A=this.consumeCodePoint();switch(A){case Ca:return this.consumeStringToken(Ca);case B0:var t=this.peekCodePoint(0),s=this.peekCodePoint(1),i=this.peekCodePoint(2);if(or(t)||It(s,i)){var n=Ua(t,s,i)?x0:f0,o=this.consumeName();return{type:5,value:o,flags:n}}break;case v0:if(this.peekCodePoint(0)===EA)return this.consumeCodePoint(),nb;break;case ya:return this.consumeStringToken(ya);case Qa:return ab;case IA:return sb;case Js:if(this.peekCodePoint(0)===EA)return this.consumeCodePoint(),gb;break;case Wt:if($s(A,this.peekCodePoint(0),this.peekCodePoint(1)))return this.reconsumeCodePoint(A),this.consumeNumericToken();break;case T0:return ib;case _e:var l=A,c=this.peekCodePoint(0),g=this.peekCodePoint(1);if($s(l,c,g))return this.reconsumeCodePoint(A),this.consumeNumericToken();if(Ua(l,c,g))return this.reconsumeCodePoint(A),this.consumeIdentLikeToken();if(c===_e&&g===k0)return this.consumeCodePoint(),this.consumeCodePoint(),hb;break;case WA:if($s(A,this.peekCodePoint(0),this.peekCodePoint(1)))return this.reconsumeCodePoint(A),this.consumeNumericToken();break;case ir:if(this.peekCodePoint(0)===Js)for(this.consumeCodePoint();;){var u=this.consumeCodePoint();if(u===Js&&(u=this.consumeCodePoint(),u===ir))return this.consumeToken();if(u===ct)return this.consumeToken()}break;case D0:return fb;case M0:return xb;case F0:if(this.peekCodePoint(0)===Q0&&this.peekCodePoint(1)===_e&&this.peekCodePoint(2)===_e)return this.consumeCodePoint(),this.consumeCodePoint(),mb;break;case U0:var p=this.peekCodePoint(0),f=this.peekCodePoint(1),x=this.peekCodePoint(2);if(Ua(p,f,x)){var o=this.consumeName();return{type:7,value:o}}break;case j0:return bb;case RA:if(It(A,this.peekCodePoint(0)))return this.reconsumeCodePoint(A),this.consumeIdentLikeToken();break;case E0:return wb;case I0:if(this.peekCodePoint(0)===EA)return this.consumeCodePoint(),rb;break;case S0:return db;case H0:return ub;case _0:case W0:var w=this.peekCodePoint(0),C=this.peekCodePoint(1);return w===Wt&&(rA(C)||C===Fa)&&(this.consumeCodePoint(),this.consumeUnicodeRangeToken()),this.reconsumeCodePoint(A),this.consumeIdentLikeToken();case nr:if(this.peekCodePoint(0)===EA)return this.consumeCodePoint(),lb;if(this.peekCodePoint(0)===nr)return this.consumeCodePoint(),ob;break;case L0:if(this.peekCodePoint(0)===EA)return this.consumeCodePoint(),cb;break;case ct:return zi}return ka(A)?(this.consumeWhiteSpace(),Bb):Re(A)?(this.reconsumeCodePoint(A),this.consumeNumericToken()):Za(A)?(this.reconsumeCodePoint(A),this.consumeIdentLikeToken()):{type:6,value:ve(A)}},e.prototype.consumeCodePoint=function(){var A=this._value.shift();return typeof A>"u"?-1:A},e.prototype.reconsumeCodePoint=function(A){this._value.unshift(A)},e.prototype.peekCodePoint=function(A){return A>=this._value.length?-1:this._value[A]},e.prototype.consumeUnicodeRangeToken=function(){for(var A=[],t=this.consumeCodePoint();rA(t)&&A.length<6;)A.push(t),t=this.consumeCodePoint();for(var s=!1;t===Fa&&A.length<6;)A.push(t),t=this.consumeCodePoint(),s=!0;if(s){var i=parseInt(ve.apply(void 0,A.map(function(c){return c===Fa?Bl:c})),16),n=parseInt(ve.apply(void 0,A.map(function(c){return c===Fa?Fl:c})),16);return{type:30,start:i,end:n}}var o=parseInt(ve.apply(void 0,A),16);if(this.peekCodePoint(0)===_e&&rA(this.peekCodePoint(1))){this.consumeCodePoint(),t=this.consumeCodePoint();for(var l=[];rA(t)&&l.length<6;)l.push(t),t=this.consumeCodePoint();var n=parseInt(ve.apply(void 0,l),16);return{type:30,start:o,end:n}}else return{type:30,start:o,end:o}},e.prototype.consumeIdentLikeToken=function(){var A=this.consumeName();return A.toLowerCase()==="url"&&this.peekCodePoint(0)===Qa?(this.consumeCodePoint(),this.consumeUrlToken()):this.peekCodePoint(0)===Qa?(this.consumeCodePoint(),{type:19,value:A}):{type:20,value:A}},e.prototype.consumeUrlToken=function(){var A=[];if(this.consumeWhiteSpace(),this.peekCodePoint(0)===ct)return{type:22,value:""};var t=this.peekCodePoint(0);if(t===ya||t===Ca){var s=this.consumeStringToken(this.consumeCodePoint());return s.type===0&&(this.consumeWhiteSpace(),this.peekCodePoint(0)===ct||this.peekCodePoint(0)===IA)?(this.consumeCodePoint(),{type:22,value:s.value}):(this.consumeBadUrlRemnants(),ja)}for(;;){var i=this.consumeCodePoint();if(i===ct||i===IA)return{type:22,value:ve.apply(void 0,A)};if(ka(i))return this.consumeWhiteSpace(),this.peekCodePoint(0)===ct||this.peekCodePoint(0)===IA?(this.consumeCodePoint(),{type:22,value:ve.apply(void 0,A)}):(this.consumeBadUrlRemnants(),ja);if(i===Ca||i===ya||i===Qa||tb(i))return this.consumeBadUrlRemnants(),ja;if(i===RA)if(It(i,this.peekCodePoint(0)))A.push(this.consumeEscapedCodePoint());else return this.consumeBadUrlRemnants(),ja;else A.push(i)}},e.prototype.consumeWhiteSpace=function(){for(;ka(this.peekCodePoint(0));)this.consumeCodePoint()},e.prototype.consumeBadUrlRemnants=function(){for(;;){var A=this.consumeCodePoint();if(A===IA||A===ct)return;It(A,this.peekCodePoint(0))&&this.consumeEscapedCodePoint()}},e.prototype.consumeStringSlice=function(A){for(var t=5e4,s="";A>0;){var i=Math.min(t,A);s+=ve.apply(void 0,this._value.splice(0,i)),A-=i}return this._value.shift(),s},e.prototype.consumeStringToken=function(A){var t="",s=0;do{var i=this._value[s];if(i===ct||i===void 0||i===A)return t+=this.consumeStringSlice(s),{type:0,value:t};if(i===$a)return this._value.splice(0,s),pb;if(i===RA){var n=this._value[s+1];n!==ct&&n!==void 0&&(n===$a?(t+=this.consumeStringSlice(s),s=-1,this._value.shift()):It(i,n)&&(t+=this.consumeStringSlice(s),t+=ve(this.consumeEscapedCodePoint()),s=-1))}s++}while(!0)},e.prototype.consumeNumber=function(){var A=[],t=na,s=this.peekCodePoint(0);for((s===Wt||s===_e)&&A.push(this.consumeCodePoint());Re(this.peekCodePoint(0));)A.push(this.consumeCodePoint());s=this.peekCodePoint(0);var i=this.peekCodePoint(1);if(s===WA&&Re(i))for(A.push(this.consumeCodePoint(),this.consumeCodePoint()),t=sr;Re(this.peekCodePoint(0));)A.push(this.consumeCodePoint());s=this.peekCodePoint(0),i=this.peekCodePoint(1);var n=this.peekCodePoint(2);if((s===Ql||s===Cl)&&((i===Wt||i===_e)&&Re(n)||Re(i)))for(A.push(this.consumeCodePoint(),this.consumeCodePoint()),t=sr;Re(this.peekCodePoint(0));)A.push(this.consumeCodePoint());return[Ab(A),t]},e.prototype.consumeNumericToken=function(){var A=this.consumeNumber(),t=A[0],s=A[1],i=this.peekCodePoint(0),n=this.peekCodePoint(1),o=this.peekCodePoint(2);if(Ua(i,n,o)){var l=this.consumeName();return{type:15,number:t,flags:s,unit:l}}return i===C0?(this.consumeCodePoint(),{type:16,number:t,flags:s}):{type:17,number:t,flags:s}},e.prototype.consumeEscapedCodePoint=function(){var A=this.consumeCodePoint();if(rA(A)){for(var t=ve(A);rA(this.peekCodePoint(0))&&t.length<6;)t+=ve(this.consumeCodePoint());ka(this.peekCodePoint(0))&&this.consumeCodePoint();var s=parseInt(t,16);return s===0||Y0(s)||s>1114111?rr:s}return A===ct?rr:A},e.prototype.consumeName=function(){for(var A="";;){var t=this.consumeCodePoint();if(or(t))A+=ve(t);else if(It(t,this.peekCodePoint(0)))A+=ve(this.consumeEscapedCodePoint());else return this.reconsumeCodePoint(t),A}},e}(),Ul=function(){function e(A){this._tokens=A}return e.create=function(A){var t=new kl;return t.write(A),new e(t.read())},e.parseValue=function(A){return e.create(A).parseComponentValue()},e.parseValues=function(A){return e.create(A).parseComponentValues()},e.prototype.parseComponentValue=function(){for(var A=this.consumeToken();A.type===31;)A=this.consumeToken();if(A.type===32)throw new SyntaxError("Error parsing CSS component value, unexpected EOF");this.reconsumeToken(A);var t=this.consumeComponentValue();do A=this.consumeToken();while(A.type===31);if(A.type===32)return t;throw new SyntaxError("Error parsing CSS component value, multiple values found when expecting only one")},e.prototype.parseComponentValues=function(){for(var A=[];;){var t=this.consumeComponentValue();if(t.type===32)return A;A.push(t),A.push()}},e.prototype.consumeComponentValue=function(){var A=this.consumeToken();switch(A.type){case 11:case 28:case 2:return this.consumeSimpleBlock(A.type);case 19:return this.consumeFunction(A)}return A},e.prototype.consumeSimpleBlock=function(A){for(var t={type:A,values:[]},s=this.consumeToken();;){if(s.type===32||Cb(s,A))return t;this.reconsumeToken(s),t.values.push(this.consumeComponentValue()),s=this.consumeToken()}},e.prototype.consumeFunction=function(A){for(var t={name:A.value,values:[],type:18};;){var s=this.consumeToken();if(s.type===32||s.type===3)return t;this.reconsumeToken(s),t.values.push(this.consumeComponentValue())}},e.prototype.consumeToken=function(){var A=this._tokens.shift();return typeof A>"u"?zi:A},e.prototype.reconsumeToken=function(A){this._tokens.unshift(A)},e}(),ra=function(e){return e.type===15},yA=function(e){return e.type===17},le=function(e){return e.type===20},vb=function(e){return e.type===0},Oi=function(e,A){return le(e)&&e.value===A},jl=function(e){return e.type!==31},wA=function(e){return e.type!==31&&e.type!==4},pt=function(e){var A=[],t=[];return e.forEach(function(s){if(s.type===4){if(t.length===0)throw new Error("Error parsing function args, zero tokens for arg");A.push(t),t=[];return}s.type!==31&&t.push(s)}),t.length&&A.push(t),A},Cb=function(e,A){return A===11&&e.type===12||A===28&&e.type===29?!0:A===2&&e.type===3},Rt=function(e){return e.type===17||e.type===15},ye=function(e){return e.type===16||Rt(e)},El=function(e){return e.length>1?[e[0],e[1]]:[e[0]]},Le={type:17,number:0,flags:na},Cn={type:16,number:50,flags:na},Lt={type:16,number:100,flags:na},DA=function(e,A,t){var s=e[0],i=e[1];return[de(s,A),de(typeof i<"u"?i:s,t)]},de=function(e,A){if(e.type===16)return e.number/100*A;if(ra(e))switch(e.unit){case"rem":case"em":return 16*e.number;case"px":default:return e.number}return e.number},Il="deg",Sl="grad",Hl="rad",Ll="turn",ks={name:"angle",parse:function(e,A){if(A.type===15)switch(A.unit){case Il:return Math.PI*A.number/180;case Sl:return Math.PI/200*A.number;case Hl:return A.number;case Ll:return Math.PI*2*A.number}throw new Error("Unsupported angle type")}},Nl=function(e){return e.type===15&&(e.unit===Il||e.unit===Sl||e.unit===Hl||e.unit===Ll)},Tl=function(e){var A=e.filter(le).map(function(t){return t.value}).join(" ");switch(A){case"to bottom right":case"to right bottom":case"left top":case"top left":return[Le,Le];case"to top":case"bottom":return at(0);case"to bottom left":case"to left bottom":case"right top":case"top right":return[Le,Lt];case"to right":case"left":return at(90);case"to top left":case"to left top":case"right bottom":case"bottom right":return[Lt,Lt];case"to bottom":case"top":return at(180);case"to top right":case"to right top":case"left bottom":case"bottom left":return[Lt,Le];case"to left":case"right":return at(270)}return 0},at=function(e){return Math.PI*e/180},Dt={name:"color",parse:function(e,A){if(A.type===18){var t=yb[A.name];if(typeof t>"u")throw new Error('Attempting to parse an unsupported color function "'+A.name+'"');return t(e,A.values)}if(A.type===5){if(A.value.length===3){var s=A.value.substring(0,1),i=A.value.substring(1,2),n=A.value.substring(2,3);return Nt(parseInt(s+s,16),parseInt(i+i,16),parseInt(n+n,16),1)}if(A.value.length===4){var s=A.value.substring(0,1),i=A.value.substring(1,2),n=A.value.substring(2,3),o=A.value.substring(3,4);return Nt(parseInt(s+s,16),parseInt(i+i,16),parseInt(n+n,16),parseInt(o+o,16)/255)}if(A.value.length===6){var s=A.value.substring(0,2),i=A.value.substring(2,4),n=A.value.substring(4,6);return Nt(parseInt(s,16),parseInt(i,16),parseInt(n,16),1)}if(A.value.length===8){var s=A.value.substring(0,2),i=A.value.substring(2,4),n=A.value.substring(4,6),o=A.value.substring(6,8);return Nt(parseInt(s,16),parseInt(i,16),parseInt(n,16),parseInt(o,16)/255)}}if(A.type===20){var l=Bt[A.value.toUpperCase()];if(typeof l<"u")return l}return Bt.TRANSPARENT}},Mt=function(e){return(255&e)===0},Ue=function(e){var A=255&e,t=255&e>>8,s=255&e>>16,i=255&e>>24;return A<255?"rgba("+i+","+s+","+t+","+A/255+")":"rgb("+i+","+s+","+t+")"},Nt=function(e,A,t,s){return(e<<24|A<<16|t<<8|Math.round(s*255)<<0)>>>0},lr=function(e,A){if(e.type===17)return e.number;if(e.type===16){var t=A===3?1:255;return A===3?e.number/100*t:Math.round(e.number/100*t)}return 0},cr=function(e,A){var t=A.filter(wA);if(t.length===3){var s=t.map(lr),i=s[0],n=s[1],o=s[2];return Nt(i,n,o,1)}if(t.length===4){var l=t.map(lr),i=l[0],n=l[1],o=l[2],c=l[3];return Nt(i,n,o,c)}return 0};function Zs(e,A,t){return t<0&&(t+=1),t>=1&&(t-=1),t<1/6?(A-e)*t*6+e:t<1/2?A:t<2/3?(A-e)*6*(2/3-t)+e:e}var dr=function(e,A){var t=A.filter(wA),s=t[0],i=t[1],n=t[2],o=t[3],l=(s.type===17?at(s.number):ks.parse(e,s))/(Math.PI*2),c=ye(i)?i.number/100:0,g=ye(n)?n.number/100:0,u=typeof o<"u"&&ye(o)?de(o,1):1;if(c===0)return Nt(g*255,g*255,g*255,1);var p=g<=.5?g*(c+1):g+c-g*c,f=g*2-p,x=Zs(f,p,l+1/3),w=Zs(f,p,l),C=Zs(f,p,l-1/3);return Nt(x*255,w*255,C*255,u)},yb={hsl:dr,hsla:dr,rgb:cr,rgba:cr},zA=function(e,A){return Dt.parse(e,Ul.create(A).parseComponentValue())},Bt={ALICEBLUE:4042850303,ANTIQUEWHITE:4209760255,AQUA:16777215,AQUAMARINE:2147472639,AZURE:4043309055,BEIGE:4126530815,BISQUE:4293182719,BLACK:255,BLANCHEDALMOND:4293643775,BLUE:65535,BLUEVIOLET:2318131967,BROWN:2771004159,BURLYWOOD:3736635391,CADETBLUE:1604231423,CHARTREUSE:2147418367,CHOCOLATE:3530104575,CORAL:4286533887,CORNFLOWERBLUE:1687547391,CORNSILK:4294499583,CRIMSON:3692313855,CYAN:16777215,DARKBLUE:35839,DARKCYAN:9145343,DARKGOLDENROD:3095837695,DARKGRAY:2846468607,DARKGREEN:6553855,DARKGREY:2846468607,DARKKHAKI:3182914559,DARKMAGENTA:2332068863,DARKOLIVEGREEN:1433087999,DARKORANGE:4287365375,DARKORCHID:2570243327,DARKRED:2332033279,DARKSALMON:3918953215,DARKSEAGREEN:2411499519,DARKSLATEBLUE:1211993087,DARKSLATEGRAY:793726975,DARKSLATEGREY:793726975,DARKTURQUOISE:13554175,DARKVIOLET:2483082239,DEEPPINK:4279538687,DEEPSKYBLUE:12582911,DIMGRAY:1768516095,DIMGREY:1768516095,DODGERBLUE:512819199,FIREBRICK:2988581631,FLORALWHITE:4294635775,FORESTGREEN:579543807,FUCHSIA:4278255615,GAINSBORO:3705462015,GHOSTWHITE:4177068031,GOLD:4292280575,GOLDENROD:3668254975,GRAY:2155905279,GREEN:8388863,GREENYELLOW:2919182335,GREY:2155905279,HONEYDEW:4043305215,HOTPINK:4285117695,INDIANRED:3445382399,INDIGO:1258324735,IVORY:4294963455,KHAKI:4041641215,LAVENDER:3873897215,LAVENDERBLUSH:4293981695,LAWNGREEN:2096890111,LEMONCHIFFON:4294626815,LIGHTBLUE:2916673279,LIGHTCORAL:4034953471,LIGHTCYAN:3774873599,LIGHTGOLDENRODYELLOW:4210742015,LIGHTGRAY:3553874943,LIGHTGREEN:2431553791,LIGHTGREY:3553874943,LIGHTPINK:4290167295,LIGHTSALMON:4288707327,LIGHTSEAGREEN:548580095,LIGHTSKYBLUE:2278488831,LIGHTSLATEGRAY:2005441023,LIGHTSLATEGREY:2005441023,LIGHTSTEELBLUE:2965692159,LIGHTYELLOW:4294959359,LIME:16711935,LIMEGREEN:852308735,LINEN:4210091775,MAGENTA:4278255615,MAROON:2147483903,MEDIUMAQUAMARINE:1724754687,MEDIUMBLUE:52735,MEDIUMORCHID:3126187007,MEDIUMPURPLE:2473647103,MEDIUMSEAGREEN:1018393087,MEDIUMSLATEBLUE:2070474495,MEDIUMSPRINGGREEN:16423679,MEDIUMTURQUOISE:1221709055,MEDIUMVIOLETRED:3340076543,MIDNIGHTBLUE:421097727,MINTCREAM:4127193855,MISTYROSE:4293190143,MOCCASIN:4293178879,NAVAJOWHITE:4292783615,NAVY:33023,OLDLACE:4260751103,OLIVE:2155872511,OLIVEDRAB:1804477439,ORANGE:4289003775,ORANGERED:4282712319,ORCHID:3664828159,PALEGOLDENROD:4008225535,PALEGREEN:2566625535,PALETURQUOISE:2951671551,PALEVIOLETRED:3681588223,PAPAYAWHIP:4293907967,PEACHPUFF:4292524543,PERU:3448061951,PINK:4290825215,PLUM:3718307327,POWDERBLUE:2967529215,PURPLE:2147516671,REBECCAPURPLE:1714657791,RED:4278190335,ROSYBROWN:3163525119,ROYALBLUE:1097458175,SADDLEBROWN:2336560127,SALMON:4202722047,SANDYBROWN:4104413439,SEAGREEN:780883967,SEASHELL:4294307583,SIENNA:2689740287,SILVER:3233857791,SKYBLUE:2278484991,SLATEBLUE:1784335871,SLATEGRAY:1887473919,SLATEGREY:1887473919,SNOW:4294638335,SPRINGGREEN:16744447,STEELBLUE:1182971135,TAN:3535047935,TEAL:8421631,THISTLE:3636451583,TOMATO:4284696575,TRANSPARENT:0,TURQUOISE:1088475391,VIOLET:4001558271,WHEAT:4125012991,WHITE:4294967295,WHITESMOKE:4126537215,YELLOW:4294902015,YELLOWGREEN:2597139199},Qb={name:"background-clip",initialValue:"border-box",prefix:!1,type:1,parse:function(e,A){return A.map(function(t){if(le(t))switch(t.value){case"padding-box":return 1;case"content-box":return 2}return 0})}},Fb={name:"background-color",initialValue:"transparent",prefix:!1,type:3,format:"color"},Us=function(e,A){var t=Dt.parse(e,A[0]),s=A[1];return s&&ye(s)?{color:t,stop:s}:{color:t,stop:null}},ur=function(e,A){var t=e[0],s=e[e.length-1];t.stop===null&&(t.stop=Le),s.stop===null&&(s.stop=Lt);for(var i=[],n=0,o=0;o<e.length;o++){var l=e[o].stop;if(l!==null){var c=de(l,A);c>n?i.push(c):i.push(n),n=c}else i.push(null)}for(var g=null,o=0;o<i.length;o++){var u=i[o];if(u===null)g===null&&(g=o);else if(g!==null){for(var p=o-g,f=i[g-1],x=(u-f)/(p+1),w=1;w<=p;w++)i[g+w-1]=x*w;g=null}}return e.map(function(C,H){var j=C.color;return{color:j,stop:Math.max(Math.min(1,i[H]/A),0)}})},kb=function(e,A,t){var s=A/2,i=t/2,n=de(e[0],A)-s,o=i-de(e[1],t);return(Math.atan2(o,n)+Math.PI*2)%(Math.PI*2)},Ub=function(e,A,t){var s=typeof e=="number"?e:kb(e,A,t),i=Math.abs(A*Math.sin(s))+Math.abs(t*Math.cos(s)),n=A/2,o=t/2,l=i/2,c=Math.sin(s-Math.PI/2)*l,g=Math.cos(s-Math.PI/2)*l;return[i,n-g,n+g,o-c,o+c]},it=function(e,A){return Math.sqrt(e*e+A*A)},gr=function(e,A,t,s,i){var n=[[0,0],[0,A],[e,0],[e,A]];return n.reduce(function(o,l){var c=l[0],g=l[1],u=it(t-c,s-g);return(i?u<o.optimumDistance:u>o.optimumDistance)?{optimumCorner:l,optimumDistance:u}:o},{optimumDistance:i?1/0:-1/0,optimumCorner:null}).optimumCorner},jb=function(e,A,t,s,i){var n=0,o=0;switch(e.size){case 0:e.shape===0?n=o=Math.min(Math.abs(A),Math.abs(A-s),Math.abs(t),Math.abs(t-i)):e.shape===1&&(n=Math.min(Math.abs(A),Math.abs(A-s)),o=Math.min(Math.abs(t),Math.abs(t-i)));break;case 2:if(e.shape===0)n=o=Math.min(it(A,t),it(A,t-i),it(A-s,t),it(A-s,t-i));else if(e.shape===1){var l=Math.min(Math.abs(t),Math.abs(t-i))/Math.min(Math.abs(A),Math.abs(A-s)),c=gr(s,i,A,t,!0),g=c[0],u=c[1];n=it(g-A,(u-t)/l),o=l*n}break;case 1:e.shape===0?n=o=Math.max(Math.abs(A),Math.abs(A-s),Math.abs(t),Math.abs(t-i)):e.shape===1&&(n=Math.max(Math.abs(A),Math.abs(A-s)),o=Math.max(Math.abs(t),Math.abs(t-i)));break;case 3:if(e.shape===0)n=o=Math.max(it(A,t),it(A,t-i),it(A-s,t),it(A-s,t-i));else if(e.shape===1){var l=Math.max(Math.abs(t),Math.abs(t-i))/Math.max(Math.abs(A),Math.abs(A-s)),p=gr(s,i,A,t,!1),g=p[0],u=p[1];n=it(g-A,(u-t)/l),o=l*n}break}return Array.isArray(e.size)&&(n=de(e.size[0],s),o=e.size.length===2?de(e.size[1],i):n),[n,o]},Eb=function(e,A){var t=at(180),s=[];return pt(A).forEach(function(i,n){if(n===0){var o=i[0];if(o.type===20&&o.value==="to"){t=Tl(i);return}else if(Nl(o)){t=ks.parse(e,o);return}}var l=Us(e,i);s.push(l)}),{angle:t,stops:s,type:1}},Ea=function(e,A){var t=at(180),s=[];return pt(A).forEach(function(i,n){if(n===0){var o=i[0];if(o.type===20&&["top","left","right","bottom"].indexOf(o.value)!==-1){t=Tl(i);return}else if(Nl(o)){t=(ks.parse(e,o)+at(270))%at(360);return}}var l=Us(e,i);s.push(l)}),{angle:t,stops:s,type:1}},Ib=function(e,A){var t=at(180),s=[],i=1,n=0,o=3,l=[];return pt(A).forEach(function(c,g){var u=c[0];if(g===0){if(le(u)&&u.value==="linear"){i=1;return}else if(le(u)&&u.value==="radial"){i=2;return}}if(u.type===18){if(u.name==="from"){var p=Dt.parse(e,u.values[0]);s.push({stop:Le,color:p})}else if(u.name==="to"){var p=Dt.parse(e,u.values[0]);s.push({stop:Lt,color:p})}else if(u.name==="color-stop"){var f=u.values.filter(wA);if(f.length===2){var p=Dt.parse(e,f[1]),x=f[0];yA(x)&&s.push({stop:{type:16,number:x.number*100,flags:x.flags},color:p})}}}}),i===1?{angle:(t+at(180))%at(360),stops:s,type:i}:{size:o,shape:n,stops:s,position:l,type:i}},Dl="closest-side",Ml="farthest-side",Kl="closest-corner",Rl="farthest-corner",zl="circle",Ol="ellipse",Pl="cover",Vl="contain",Sb=function(e,A){var t=0,s=3,i=[],n=[];return pt(A).forEach(function(o,l){var c=!0;if(l===0){var g=!1;c=o.reduce(function(p,f){if(g)if(le(f))switch(f.value){case"center":return n.push(Cn),p;case"top":case"left":return n.push(Le),p;case"right":case"bottom":return n.push(Lt),p}else(ye(f)||Rt(f))&&n.push(f);else if(le(f))switch(f.value){case zl:return t=0,!1;case Ol:return t=1,!1;case"at":return g=!0,!1;case Dl:return s=0,!1;case Pl:case Ml:return s=1,!1;case Vl:case Kl:return s=2,!1;case Rl:return s=3,!1}else if(Rt(f)||ye(f))return Array.isArray(s)||(s=[]),s.push(f),!1;return p},c)}if(c){var u=Us(e,o);i.push(u)}}),{size:s,shape:t,stops:i,position:n,type:2}},Ia=function(e,A){var t=0,s=3,i=[],n=[];return pt(A).forEach(function(o,l){var c=!0;if(l===0?c=o.reduce(function(u,p){if(le(p))switch(p.value){case"center":return n.push(Cn),!1;case"top":case"left":return n.push(Le),!1;case"right":case"bottom":return n.push(Lt),!1}else if(ye(p)||Rt(p))return n.push(p),!1;return u},c):l===1&&(c=o.reduce(function(u,p){if(le(p))switch(p.value){case zl:return t=0,!1;case Ol:return t=1,!1;case Vl:case Dl:return s=0,!1;case Ml:return s=1,!1;case Kl:return s=2,!1;case Pl:case Rl:return s=3,!1}else if(Rt(p)||ye(p))return Array.isArray(s)||(s=[]),s.push(p),!1;return u},c)),c){var g=Us(e,o);i.push(g)}}),{size:s,shape:t,stops:i,position:n,type:2}},Hb=function(e){return e.type===1},Lb=function(e){return e.type===2},yn={name:"image",parse:function(e,A){if(A.type===22){var t={url:A.value,type:0};return e.cache.addImage(A.value),t}if(A.type===18){var s=Gl[A.name];if(typeof s>"u")throw new Error('Attempting to parse an unsupported image function "'+A.name+'"');return s(e,A.values)}throw new Error("Unsupported image type "+A.type)}};function Nb(e){return!(e.type===20&&e.value==="none")&&(e.type!==18||!!Gl[e.name])}var Gl={"linear-gradient":Eb,"-moz-linear-gradient":Ea,"-ms-linear-gradient":Ea,"-o-linear-gradient":Ea,"-webkit-linear-gradient":Ea,"radial-gradient":Sb,"-moz-radial-gradient":Ia,"-ms-radial-gradient":Ia,"-o-radial-gradient":Ia,"-webkit-radial-gradient":Ia,"-webkit-gradient":Ib},Tb={name:"background-image",initialValue:"none",type:1,prefix:!1,parse:function(e,A){if(A.length===0)return[];var t=A[0];return t.type===20&&t.value==="none"?[]:A.filter(function(s){return wA(s)&&Nb(s)}).map(function(s){return yn.parse(e,s)})}},Db={name:"background-origin",initialValue:"border-box",prefix:!1,type:1,parse:function(e,A){return A.map(function(t){if(le(t))switch(t.value){case"padding-box":return 1;case"content-box":return 2}return 0})}},Mb={name:"background-position",initialValue:"0% 0%",type:1,prefix:!1,parse:function(e,A){return pt(A).map(function(t){return t.filter(ye)}).map(El)}},Kb={name:"background-repeat",initialValue:"repeat",prefix:!1,type:1,parse:function(e,A){return pt(A).map(function(t){return t.filter(le).map(function(s){return s.value}).join(" ")}).map(Rb)}},Rb=function(e){switch(e){case"no-repeat":return 1;case"repeat-x":case"repeat no-repeat":return 2;case"repeat-y":case"no-repeat repeat":return 3;case"repeat":default:return 0}},fA;(function(e){e.AUTO="auto",e.CONTAIN="contain",e.COVER="cover"})(fA||(fA={}));var zb={name:"background-size",initialValue:"0",prefix:!1,type:1,parse:function(e,A){return pt(A).map(function(t){return t.filter(Ob)})}},Ob=function(e){return le(e)||ye(e)},js=function(e){return{name:"border-"+e+"-color",initialValue:"transparent",prefix:!1,type:3,format:"color"}},Pb=js("top"),Vb=js("right"),Gb=js("bottom"),_b=js("left"),Es=function(e){return{name:"border-radius-"+e,initialValue:"0 0",prefix:!1,type:1,parse:function(A,t){return El(t.filter(ye))}}},qb=Es("top-left"),Wb=Es("top-right"),Xb=Es("bottom-right"),Yb=Es("bottom-left"),Is=function(e){return{name:"border-"+e+"-style",initialValue:"solid",prefix:!1,type:2,parse:function(A,t){switch(t){case"none":return 0;case"dashed":return 2;case"dotted":return 3;case"double":return 4}return 1}}},Jb=Is("top"),$b=Is("right"),Zb=Is("bottom"),ew=Is("left"),Ss=function(e){return{name:"border-"+e+"-width",initialValue:"0",type:0,prefix:!1,parse:function(A,t){return ra(t)?t.number:0}}},tw=Ss("top"),Aw=Ss("right"),aw=Ss("bottom"),sw=Ss("left"),iw={name:"color",initialValue:"transparent",prefix:!1,type:3,format:"color"},nw={name:"direction",initialValue:"ltr",prefix:!1,type:2,parse:function(e,A){switch(A){case"rtl":return 1;case"ltr":default:return 0}}},rw={name:"display",initialValue:"inline-block",prefix:!1,type:1,parse:function(e,A){return A.filter(le).reduce(function(t,s){return t|ow(s.value)},0)}},ow=function(e){switch(e){case"block":case"-webkit-box":return 2;case"inline":return 4;case"run-in":return 8;case"flow":return 16;case"flow-root":return 32;case"table":return 64;case"flex":case"-webkit-flex":return 128;case"grid":case"-ms-grid":return 256;case"ruby":return 512;case"subgrid":return 1024;case"list-item":return 2048;case"table-row-group":return 4096;case"table-header-group":return 8192;case"table-footer-group":return 16384;case"table-row":return 32768;case"table-cell":return 65536;case"table-column-group":return 131072;case"table-column":return 262144;case"table-caption":return 524288;case"ruby-base":return 1048576;case"ruby-text":return 2097152;case"ruby-base-container":return 4194304;case"ruby-text-container":return 8388608;case"contents":return 16777216;case"inline-block":return 33554432;case"inline-list-item":return 67108864;case"inline-table":return 134217728;case"inline-flex":return 268435456;case"inline-grid":return 536870912}return 0},lw={name:"float",initialValue:"none",prefix:!1,type:2,parse:function(e,A){switch(A){case"left":return 1;case"right":return 2;case"inline-start":return 3;case"inline-end":return 4}return 0}},cw={name:"letter-spacing",initialValue:"0",prefix:!1,type:0,parse:function(e,A){return A.type===20&&A.value==="normal"?0:A.type===17||A.type===15?A.number:0}},es;(function(e){e.NORMAL="normal",e.STRICT="strict"})(es||(es={}));var dw={name:"line-break",initialValue:"normal",prefix:!1,type:2,parse:function(e,A){switch(A){case"strict":return es.STRICT;case"normal":default:return es.NORMAL}}},uw={name:"line-height",initialValue:"normal",prefix:!1,type:4},pr=function(e,A){return le(e)&&e.value==="normal"?1.2*A:e.type===17?A*e.number:ye(e)?de(e,A):A},gw={name:"list-style-image",initialValue:"none",type:0,prefix:!1,parse:function(e,A){return A.type===20&&A.value==="none"?null:yn.parse(e,A)}},pw={name:"list-style-position",initialValue:"outside",prefix:!1,type:2,parse:function(e,A){switch(A){case"inside":return 0;case"outside":default:return 1}}},Pi={name:"list-style-type",initialValue:"none",prefix:!1,type:2,parse:function(e,A){switch(A){case"disc":return 0;case"circle":return 1;case"square":return 2;case"decimal":return 3;case"cjk-decimal":return 4;case"decimal-leading-zero":return 5;case"lower-roman":return 6;case"upper-roman":return 7;case"lower-greek":return 8;case"lower-alpha":return 9;case"upper-alpha":return 10;case"arabic-indic":return 11;case"armenian":return 12;case"bengali":return 13;case"cambodian":return 14;case"cjk-earthly-branch":return 15;case"cjk-heavenly-stem":return 16;case"cjk-ideographic":return 17;case"devanagari":return 18;case"ethiopic-numeric":return 19;case"georgian":return 20;case"gujarati":return 21;case"gurmukhi":return 22;case"hebrew":return 22;case"hiragana":return 23;case"hiragana-iroha":return 24;case"japanese-formal":return 25;case"japanese-informal":return 26;case"kannada":return 27;case"katakana":return 28;case"katakana-iroha":return 29;case"khmer":return 30;case"korean-hangul-formal":return 31;case"korean-hanja-formal":return 32;case"korean-hanja-informal":return 33;case"lao":return 34;case"lower-armenian":return 35;case"malayalam":return 36;case"mongolian":return 37;case"myanmar":return 38;case"oriya":return 39;case"persian":return 40;case"simp-chinese-formal":return 41;case"simp-chinese-informal":return 42;case"tamil":return 43;case"telugu":return 44;case"thai":return 45;case"tibetan":return 46;case"trad-chinese-formal":return 47;case"trad-chinese-informal":return 48;case"upper-armenian":return 49;case"disclosure-open":return 50;case"disclosure-closed":return 51;case"none":default:return-1}}},Hs=function(e){return{name:"margin-"+e,initialValue:"0",prefix:!1,type:4}},mw=Hs("top"),hw=Hs("right"),fw=Hs("bottom"),xw=Hs("left"),bw={name:"overflow",initialValue:"visible",prefix:!1,type:1,parse:function(e,A){return A.filter(le).map(function(t){switch(t.value){case"hidden":return 1;case"scroll":return 2;case"clip":return 3;case"auto":return 4;case"visible":default:return 0}})}},ww={name:"overflow-wrap",initialValue:"normal",prefix:!1,type:2,parse:function(e,A){switch(A){case"break-word":return"break-word";case"normal":default:return"normal"}}},Ls=function(e){return{name:"padding-"+e,initialValue:"0",prefix:!1,type:3,format:"length-percentage"}},Bw=Ls("top"),vw=Ls("right"),Cw=Ls("bottom"),yw=Ls("left"),Qw={name:"text-align",initialValue:"left",prefix:!1,type:2,parse:function(e,A){switch(A){case"right":return 2;case"center":case"justify":return 1;case"left":default:return 0}}},Fw={name:"position",initialValue:"static",prefix:!1,type:2,parse:function(e,A){switch(A){case"relative":return 1;case"absolute":return 2;case"fixed":return 3;case"sticky":return 4}return 0}},kw={name:"text-shadow",initialValue:"none",type:1,prefix:!1,parse:function(e,A){return A.length===1&&Oi(A[0],"none")?[]:pt(A).map(function(t){for(var s={color:Bt.TRANSPARENT,offsetX:Le,offsetY:Le,blur:Le},i=0,n=0;n<t.length;n++){var o=t[n];Rt(o)?(i===0?s.offsetX=o:i===1?s.offsetY=o:s.blur=o,i++):s.color=Dt.parse(e,o)}return s})}},Uw={name:"text-transform",initialValue:"none",prefix:!1,type:2,parse:function(e,A){switch(A){case"uppercase":return 2;case"lowercase":return 1;case"capitalize":return 3}return 0}},jw={name:"transform",initialValue:"none",prefix:!0,type:0,parse:function(e,A){if(A.type===20&&A.value==="none")return null;if(A.type===18){var t=Sw[A.name];if(typeof t>"u")throw new Error('Attempting to parse an unsupported transform function "'+A.name+'"');return t(A.values)}return null}},Ew=function(e){var A=e.filter(function(t){return t.type===17}).map(function(t){return t.number});return A.length===6?A:null},Iw=function(e){var A=e.filter(function(c){return c.type===17}).map(function(c){return c.number}),t=A[0],s=A[1];A[2],A[3];var i=A[4],n=A[5];A[6],A[7],A[8],A[9],A[10],A[11];var o=A[12],l=A[13];return A[14],A[15],A.length===16?[t,s,i,n,o,l]:null},Sw={matrix:Ew,matrix3d:Iw},mr={type:16,number:50,flags:na},Hw=[mr,mr],Lw={name:"transform-origin",initialValue:"50% 50%",prefix:!0,type:1,parse:function(e,A){var t=A.filter(ye);return t.length!==2?Hw:[t[0],t[1]]}},Nw={name:"visible",initialValue:"none",prefix:!1,type:2,parse:function(e,A){switch(A){case"hidden":return 1;case"collapse":return 2;case"visible":default:return 0}}},OA;(function(e){e.NORMAL="normal",e.BREAK_ALL="break-all",e.KEEP_ALL="keep-all"})(OA||(OA={}));var Tw={name:"word-break",initialValue:"normal",prefix:!1,type:2,parse:function(e,A){switch(A){case"break-all":return OA.BREAK_ALL;case"keep-all":return OA.KEEP_ALL;case"normal":default:return OA.NORMAL}}},Dw={name:"z-index",initialValue:"auto",prefix:!1,type:0,parse:function(e,A){if(A.type===20)return{auto:!0,order:0};if(yA(A))return{auto:!1,order:A.number};throw new Error("Invalid z-index number parsed")}},_l={name:"time",parse:function(e,A){if(A.type===15)switch(A.unit.toLowerCase()){case"s":return 1e3*A.number;case"ms":return A.number}throw new Error("Unsupported time type")}},Mw={name:"opacity",initialValue:"1",type:0,prefix:!1,parse:function(e,A){return yA(A)?A.number:1}},Kw={name:"text-decoration-color",initialValue:"transparent",prefix:!1,type:3,format:"color"},Rw={name:"text-decoration-line",initialValue:"none",prefix:!1,type:1,parse:function(e,A){return A.filter(le).map(function(t){switch(t.value){case"underline":return 1;case"overline":return 2;case"line-through":return 3;case"none":return 4}return 0}).filter(function(t){return t!==0})}},zw={name:"font-family",initialValue:"",prefix:!1,type:1,parse:function(e,A){var t=[],s=[];return A.forEach(function(i){switch(i.type){case 20:case 0:t.push(i.value);break;case 17:t.push(i.number.toString());break;case 4:s.push(t.join(" ")),t.length=0;break}}),t.length&&s.push(t.join(" ")),s.map(function(i){return i.indexOf(" ")===-1?i:"'"+i+"'"})}},Ow={name:"font-size",initialValue:"0",prefix:!1,type:3,format:"length"},Pw={name:"font-weight",initialValue:"normal",type:0,prefix:!1,parse:function(e,A){if(yA(A))return A.number;if(le(A))switch(A.value){case"bold":return 700;case"normal":default:return 400}return 400}},Vw={name:"font-variant",initialValue:"none",type:1,prefix:!1,parse:function(e,A){return A.filter(le).map(function(t){return t.value})}},Gw={name:"font-style",initialValue:"normal",prefix:!1,type:2,parse:function(e,A){switch(A){case"oblique":return"oblique";case"italic":return"italic";case"normal":default:return"normal"}}},ke=function(e,A){return(e&A)!==0},_w={name:"content",initialValue:"none",type:1,prefix:!1,parse:function(e,A){if(A.length===0)return[];var t=A[0];return t.type===20&&t.value==="none"?[]:A}},qw={name:"counter-increment",initialValue:"none",prefix:!0,type:1,parse:function(e,A){if(A.length===0)return null;var t=A[0];if(t.type===20&&t.value==="none")return null;for(var s=[],i=A.filter(jl),n=0;n<i.length;n++){var o=i[n],l=i[n+1];if(o.type===20){var c=l&&yA(l)?l.number:1;s.push({counter:o.value,increment:c})}}return s}},Ww={name:"counter-reset",initialValue:"none",prefix:!0,type:1,parse:function(e,A){if(A.length===0)return[];for(var t=[],s=A.filter(jl),i=0;i<s.length;i++){var n=s[i],o=s[i+1];if(le(n)&&n.value!=="none"){var l=o&&yA(o)?o.number:0;t.push({counter:n.value,reset:l})}}return t}},Xw={name:"duration",initialValue:"0s",prefix:!1,type:1,parse:function(e,A){return A.filter(ra).map(function(t){return _l.parse(e,t)})}},Yw={name:"quotes",initialValue:"none",prefix:!0,type:1,parse:function(e,A){if(A.length===0)return null;var t=A[0];if(t.type===20&&t.value==="none")return null;var s=[],i=A.filter(vb);if(i.length%2!==0)return null;for(var n=0;n<i.length;n+=2){var o=i[n].value,l=i[n+1].value;s.push({open:o,close:l})}return s}},hr=function(e,A,t){if(!e)return"";var s=e[Math.min(A,e.length-1)];return s?t?s.open:s.close:""},Jw={name:"box-shadow",initialValue:"none",type:1,prefix:!1,parse:function(e,A){return A.length===1&&Oi(A[0],"none")?[]:pt(A).map(function(t){for(var s={color:255,offsetX:Le,offsetY:Le,blur:Le,spread:Le,inset:!1},i=0,n=0;n<t.length;n++){var o=t[n];Oi(o,"inset")?s.inset=!0:Rt(o)?(i===0?s.offsetX=o:i===1?s.offsetY=o:i===2?s.blur=o:s.spread=o,i++):s.color=Dt.parse(e,o)}return s})}},$w={name:"paint-order",initialValue:"normal",prefix:!1,type:1,parse:function(e,A){var t=[0,1,2],s=[];return A.filter(le).forEach(function(i){switch(i.value){case"stroke":s.push(1);break;case"fill":s.push(0);break;case"markers":s.push(2);break}}),t.forEach(function(i){s.indexOf(i)===-1&&s.push(i)}),s}},Zw={name:"-webkit-text-stroke-color",initialValue:"currentcolor",prefix:!1,type:3,format:"color"},eB={name:"-webkit-text-stroke-width",initialValue:"0",type:0,prefix:!1,parse:function(e,A){return ra(A)?A.number:0}},tB=function(){function e(A,t){var s,i;this.animationDuration=O(A,Xw,t.animationDuration),this.backgroundClip=O(A,Qb,t.backgroundClip),this.backgroundColor=O(A,Fb,t.backgroundColor),this.backgroundImage=O(A,Tb,t.backgroundImage),this.backgroundOrigin=O(A,Db,t.backgroundOrigin),this.backgroundPosition=O(A,Mb,t.backgroundPosition),this.backgroundRepeat=O(A,Kb,t.backgroundRepeat),this.backgroundSize=O(A,zb,t.backgroundSize),this.borderTopColor=O(A,Pb,t.borderTopColor),this.borderRightColor=O(A,Vb,t.borderRightColor),this.borderBottomColor=O(A,Gb,t.borderBottomColor),this.borderLeftColor=O(A,_b,t.borderLeftColor),this.borderTopLeftRadius=O(A,qb,t.borderTopLeftRadius),this.borderTopRightRadius=O(A,Wb,t.borderTopRightRadius),this.borderBottomRightRadius=O(A,Xb,t.borderBottomRightRadius),this.borderBottomLeftRadius=O(A,Yb,t.borderBottomLeftRadius),this.borderTopStyle=O(A,Jb,t.borderTopStyle),this.borderRightStyle=O(A,$b,t.borderRightStyle),this.borderBottomStyle=O(A,Zb,t.borderBottomStyle),this.borderLeftStyle=O(A,ew,t.borderLeftStyle),this.borderTopWidth=O(A,tw,t.borderTopWidth),this.borderRightWidth=O(A,Aw,t.borderRightWidth),this.borderBottomWidth=O(A,aw,t.borderBottomWidth),this.borderLeftWidth=O(A,sw,t.borderLeftWidth),this.boxShadow=O(A,Jw,t.boxShadow),this.color=O(A,iw,t.color),this.direction=O(A,nw,t.direction),this.display=O(A,rw,t.display),this.float=O(A,lw,t.cssFloat),this.fontFamily=O(A,zw,t.fontFamily),this.fontSize=O(A,Ow,t.fontSize),this.fontStyle=O(A,Gw,t.fontStyle),this.fontVariant=O(A,Vw,t.fontVariant),this.fontWeight=O(A,Pw,t.fontWeight),this.letterSpacing=O(A,cw,t.letterSpacing),this.lineBreak=O(A,dw,t.lineBreak),this.lineHeight=O(A,uw,t.lineHeight),this.listStyleImage=O(A,gw,t.listStyleImage),this.listStylePosition=O(A,pw,t.listStylePosition),this.listStyleType=O(A,Pi,t.listStyleType),this.marginTop=O(A,mw,t.marginTop),this.marginRight=O(A,hw,t.marginRight),this.marginBottom=O(A,fw,t.marginBottom),this.marginLeft=O(A,xw,t.marginLeft),this.opacity=O(A,Mw,t.opacity);var n=O(A,bw,t.overflow);this.overflowX=n[0],this.overflowY=n[n.length>1?1:0],this.overflowWrap=O(A,ww,t.overflowWrap),this.paddingTop=O(A,Bw,t.paddingTop),this.paddingRight=O(A,vw,t.paddingRight),this.paddingBottom=O(A,Cw,t.paddingBottom),this.paddingLeft=O(A,yw,t.paddingLeft),this.paintOrder=O(A,$w,t.paintOrder),this.position=O(A,Fw,t.position),this.textAlign=O(A,Qw,t.textAlign),this.textDecorationColor=O(A,Kw,(s=t.textDecorationColor)!==null&&s!==void 0?s:t.color),this.textDecorationLine=O(A,Rw,(i=t.textDecorationLine)!==null&&i!==void 0?i:t.textDecoration),this.textShadow=O(A,kw,t.textShadow),this.textTransform=O(A,Uw,t.textTransform),this.transform=O(A,jw,t.transform),this.transformOrigin=O(A,Lw,t.transformOrigin),this.visibility=O(A,Nw,t.visibility),this.webkitTextStrokeColor=O(A,Zw,t.webkitTextStrokeColor),this.webkitTextStrokeWidth=O(A,eB,t.webkitTextStrokeWidth),this.wordBreak=O(A,Tw,t.wordBreak),this.zIndex=O(A,Dw,t.zIndex)}return e.prototype.isVisible=function(){return this.display>0&&this.opacity>0&&this.visibility===0},e.prototype.isTransparent=function(){return Mt(this.backgroundColor)},e.prototype.isTransformed=function(){return this.transform!==null},e.prototype.isPositioned=function(){return this.position!==0},e.prototype.isPositionedWithZIndex=function(){return this.isPositioned()&&!this.zIndex.auto},e.prototype.isFloating=function(){return this.float!==0},e.prototype.isInlineLevel=function(){return ke(this.display,4)||ke(this.display,33554432)||ke(this.display,268435456)||ke(this.display,536870912)||ke(this.display,67108864)||ke(this.display,134217728)},e}(),AB=function(){function e(A,t){this.content=O(A,_w,t.content),this.quotes=O(A,Yw,t.quotes)}return e}(),fr=function(){function e(A,t){this.counterIncrement=O(A,qw,t.counterIncrement),this.counterReset=O(A,Ww,t.counterReset)}return e}(),O=function(e,A,t){var s=new kl,i=t!==null&&typeof t<"u"?t.toString():A.initialValue;s.write(i);var n=new Ul(s.read());switch(A.type){case 2:var o=n.parseComponentValue();return A.parse(e,le(o)?o.value:A.initialValue);case 0:return A.parse(e,n.parseComponentValue());case 1:return A.parse(e,n.parseComponentValues());case 4:return n.parseComponentValue();case 3:switch(A.format){case"angle":return ks.parse(e,n.parseComponentValue());case"color":return Dt.parse(e,n.parseComponentValue());case"image":return yn.parse(e,n.parseComponentValue());case"length":var l=n.parseComponentValue();return Rt(l)?l:Le;case"length-percentage":var c=n.parseComponentValue();return ye(c)?c:Le;case"time":return _l.parse(e,n.parseComponentValue())}break}},aB="data-html2canvas-debug",sB=function(e){var A=e.getAttribute(aB);switch(A){case"all":return 1;case"clone":return 2;case"parse":return 3;case"render":return 4;default:return 0}},Vi=function(e,A){var t=sB(e);return t===1||A===t},mt=function(){function e(A,t){if(this.context=A,this.textNodes=[],this.elements=[],this.flags=0,Vi(t,3))debugger;this.styles=new tB(A,window.getComputedStyle(t,null)),qi(t)&&(this.styles.animationDuration.some(function(s){return s>0})&&(t.style.animationDuration="0s"),this.styles.transform!==null&&(t.style.transform="none")),this.bounds=Qs(this.context,t),Vi(t,4)&&(this.flags|=16)}return e}(),iB="AAAAAAAAAAAAEA4AGBkAAFAaAAACAAAAAAAIABAAGAAwADgACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAAQABIAEQATAAIABAACAAQAAgAEAAIABAAVABcAAgAEAAIABAACAAQAGAAaABwAHgAgACIAI4AlgAIABAAmwCjAKgAsAC2AL4AvQDFAMoA0gBPAVYBWgEIAAgACACMANoAYgFkAWwBdAF8AX0BhQGNAZUBlgGeAaMBlQGWAasBswF8AbsBwwF0AcsBYwHTAQgA2wG/AOMBdAF8AekB8QF0AfkB+wHiAHQBfAEIAAMC5gQIAAsCEgIIAAgAFgIeAggAIgIpAggAMQI5AkACygEIAAgASAJQAlgCYAIIAAgACAAKBQoFCgUTBRMFGQUrBSsFCAAIAAgACAAIAAgACAAIAAgACABdAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABoAmgCrwGvAQgAbgJ2AggAHgEIAAgACADnAXsCCAAIAAgAgwIIAAgACAAIAAgACACKAggAkQKZAggAPADJAAgAoQKkAqwCsgK6AsICCADJAggA0AIIAAgACAAIANYC3gIIAAgACAAIAAgACABAAOYCCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAkASoB+QIEAAgACAA8AEMCCABCBQgACABJBVAFCAAIAAgACAAIAAgACAAIAAgACABTBVoFCAAIAFoFCABfBWUFCAAIAAgACAAIAAgAbQUIAAgACAAIAAgACABzBXsFfQWFBYoFigWKBZEFigWKBYoFmAWfBaYFrgWxBbkFCAAIAAgACAAIAAgACAAIAAgACAAIAMEFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAMgFCADQBQgACAAIAAgACAAIAAgACAAIAAgACAAIAO4CCAAIAAgAiQAIAAgACABAAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAD0AggACAD8AggACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIANYFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAMDvwAIAAgAJAIIAAgACAAIAAgACAAIAAgACwMTAwgACAB9BOsEGwMjAwgAKwMyAwsFYgE3A/MEPwMIAEUDTQNRAwgAWQOsAGEDCAAIAAgACAAIAAgACABpAzQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFIQUoBSwFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABtAwgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABMAEwACAAIAAgACAAIABgACAAIAAgACAC/AAgACAAyAQgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACAAIAAwAAgACAAIAAgACAAIAAgACAAIAAAARABIAAgACAAIABQASAAIAAgAIABwAEAAjgCIABsAqAC2AL0AigDQAtwC+IJIQqVAZUBWQqVAZUBlQGVAZUBlQGrC5UBlQGVAZUBlQGVAZUBlQGVAXsKlQGVAbAK6wsrDGUMpQzlDJUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAfAKAAuZA64AtwCJALoC6ADwAAgAuACgA/oEpgO6AqsD+AAIAAgAswMIAAgACAAIAIkAuwP5AfsBwwPLAwgACAAIAAgACADRA9kDCAAIAOED6QMIAAgACAAIAAgACADuA/YDCAAIAP4DyQAIAAgABgQIAAgAXQAOBAgACAAIAAgACAAIABMECAAIAAgACAAIAAgACAD8AAQBCAAIAAgAGgQiBCoECAExBAgAEAEIAAgACAAIAAgACAAIAAgACAAIAAgACAA4BAgACABABEYECAAIAAgATAQYAQgAVAQIAAgACAAIAAgACAAIAAgACAAIAFoECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAOQEIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAB+BAcACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAEABhgSMBAgACAAIAAgAlAQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAwAEAAQABAADAAMAAwADAAQABAAEAAQABAAEAAQABHATAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAdQMIAAgACAAIAAgACAAIAMkACAAIAAgAfQMIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACFA4kDCAAIAAgACAAIAOcBCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAIcDCAAIAAgACAAIAAgACAAIAAgACAAIAJEDCAAIAAgACADFAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABgBAgAZgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAbAQCBXIECAAIAHkECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABAAJwEQACjBKoEsgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAC6BMIECAAIAAgACAAIAAgACABmBAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAxwQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAGYECAAIAAgAzgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBd0FXwUIAOIF6gXxBYoF3gT5BQAGCAaKBYoFigWKBYoFigWKBYoFigWKBYoFigXWBIoFigWKBYoFigWKBYoFigWKBYsFEAaKBYoFigWKBYoFigWKBRQGCACKBYoFigWKBQgACAAIANEECAAIABgGigUgBggAJgYIAC4GMwaKBYoF0wQ3Bj4GigWKBYoFigWKBYoFigWKBYoFigWKBYoFigUIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWLBf///////wQABAAEAAQABAAEAAQABAAEAAQAAwAEAAQAAgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAQADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUAAAAFAAUAAAAFAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAQAAAAUABQAFAAUABQAFAAAAAAAFAAUAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAFAAUAAQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAAABwAHAAcAAAAHAAcABwAFAAEAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAcABwAFAAUAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAQABAAAAAAAAAAAAAAAFAAUABQAFAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAHAAcAAAAHAAcAAAAAAAUABQAHAAUAAQAHAAEABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwABAAUABQAFAAUAAAAAAAAAAAAAAAEAAQABAAEAAQABAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABQANAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAABQAHAAUABQAFAAAAAAAAAAcABQAFAAUABQAFAAQABAAEAAQABAAEAAQABAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUAAAAFAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAUAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAcABwAFAAcABwAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUABwAHAAUABQAFAAUAAAAAAAcABwAAAAAABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAAAAAAAAAAABQAFAAAAAAAFAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAFAAUABQAFAAUAAAAFAAUABwAAAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABwAFAAUABQAFAAAAAAAHAAcAAAAAAAcABwAFAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAAAAAAAAAHAAcABwAAAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAUABQAFAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAHAAcABQAHAAcAAAAFAAcABwAAAAcABwAFAAUAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAFAAcABwAFAAUABQAAAAUAAAAHAAcABwAHAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAHAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUAAAAFAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAUAAAAFAAUAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABwAFAAUABQAFAAUABQAAAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABQAFAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAFAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAHAAUABQAFAAUABQAFAAUABwAHAAcABwAHAAcABwAHAAUABwAHAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABwAHAAcABwAFAAUABwAHAAcAAAAAAAAAAAAHAAcABQAHAAcABwAHAAcABwAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAUABQAFAAUABQAFAAUAAAAFAAAABQAAAAAABQAFAAUABQAFAAUABQAFAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAUABQAFAAUABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABwAFAAcABwAHAAcABwAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAUABQAFAAUABwAHAAUABQAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABQAFAAcABwAHAAUABwAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAcABQAFAAUABQAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAAAAAABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAAAAAAAAAFAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAUABQAHAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAFAAUABQAFAAcABwAFAAUABwAHAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAcABwAFAAUABwAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABQAAAAAABQAFAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAcABwAAAAAAAAAAAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAcABwAFAAcABwAAAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAFAAUABQAAAAUABQAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABwAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAHAAcABQAHAAUABQAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAAABwAHAAAAAAAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAFAAUABwAFAAcABwAFAAcABQAFAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAAAAAABwAHAAcABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAFAAcABwAFAAUABQAFAAUABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAUABQAFAAcABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABQAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAAAAAAFAAUABwAHAAcABwAFAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAHAAUABQAFAAUABQAFAAUABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAABQAAAAUABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAHAAcAAAAFAAUAAAAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABQAFAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAABQAFAAUABQAFAAUABQAAAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAFAAUABQAFAAUADgAOAA4ADgAOAA4ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAMAAwADAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAAAAAAAAAAAAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAAAAAAAAAAAAsADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwACwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAADgAOAA4AAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAAAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4AAAAOAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAAAAAAAAAAAA4AAAAOAAAAAAAAAAAADgAOAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAA=",xr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",MA=typeof Uint8Array>"u"?[]:new Uint8Array(256);for(var Sa=0;Sa<xr.length;Sa++)MA[xr.charCodeAt(Sa)]=Sa;var nB=function(e){var A=e.length*.75,t=e.length,s,i=0,n,o,l,c;e[e.length-1]==="="&&(A--,e[e.length-2]==="="&&A--);var g=typeof ArrayBuffer<"u"&&typeof Uint8Array<"u"&&typeof Uint8Array.prototype.slice<"u"?new ArrayBuffer(A):new Array(A),u=Array.isArray(g)?g:new Uint8Array(g);for(s=0;s<t;s+=4)n=MA[e.charCodeAt(s)],o=MA[e.charCodeAt(s+1)],l=MA[e.charCodeAt(s+2)],c=MA[e.charCodeAt(s+3)],u[i++]=n<<2|o>>4,u[i++]=(o&15)<<4|l>>2,u[i++]=(l&3)<<6|c&63;return g},rB=function(e){for(var A=e.length,t=[],s=0;s<A;s+=2)t.push(e[s+1]<<8|e[s]);return t},oB=function(e){for(var A=e.length,t=[],s=0;s<A;s+=4)t.push(e[s+3]<<24|e[s+2]<<16|e[s+1]<<8|e[s]);return t},Zt=5,Qn=6+5,ei=2,lB=Qn-Zt,ql=65536>>Zt,cB=1<<Zt,ti=cB-1,dB=1024>>Zt,uB=ql+dB,gB=uB,pB=32,mB=gB+pB,hB=65536>>Qn,fB=1<<lB,xB=fB-1,br=function(e,A,t){return e.slice?e.slice(A,t):new Uint16Array(Array.prototype.slice.call(e,A,t))},bB=function(e,A,t){return e.slice?e.slice(A,t):new Uint32Array(Array.prototype.slice.call(e,A,t))},wB=function(e,A){var t=nB(e),s=Array.isArray(t)?oB(t):new Uint32Array(t),i=Array.isArray(t)?rB(t):new Uint16Array(t),n=24,o=br(i,n/2,s[4]/2),l=s[5]===2?br(i,(n+s[4])/2):bB(s,Math.ceil((n+s[4])/4));return new BB(s[0],s[1],s[2],s[3],o,l)},BB=function(){function e(A,t,s,i,n,o){this.initialValue=A,this.errorValue=t,this.highStart=s,this.highValueIndex=i,this.index=n,this.data=o}return e.prototype.get=function(A){var t;if(A>=0){if(A<55296||A>56319&&A<=65535)return t=this.index[A>>Zt],t=(t<<ei)+(A&ti),this.data[t];if(A<=65535)return t=this.index[ql+(A-55296>>Zt)],t=(t<<ei)+(A&ti),this.data[t];if(A<this.highStart)return t=mB-hB+(A>>Qn),t=this.index[t],t+=A>>Zt&xB,t=this.index[t],t=(t<<ei)+(A&ti),this.data[t];if(A<=1114111)return this.data[this.highValueIndex]}return this.errorValue},e}(),wr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",vB=typeof Uint8Array>"u"?[]:new Uint8Array(256);for(var Ha=0;Ha<wr.length;Ha++)vB[wr.charCodeAt(Ha)]=Ha;var CB=1,Ai=2,ai=3,Br=4,vr=5,yB=7,Cr=8,si=9,ii=10,yr=11,Qr=12,Fr=13,kr=14,ni=15,QB=function(e){for(var A=[],t=0,s=e.length;t<s;){var i=e.charCodeAt(t++);if(i>=55296&&i<=56319&&t<s){var n=e.charCodeAt(t++);(n&64512)===56320?A.push(((i&1023)<<10)+(n&1023)+65536):(A.push(i),t--)}else A.push(i)}return A},FB=function(){for(var e=[],A=0;A<arguments.length;A++)e[A]=arguments[A];if(String.fromCodePoint)return String.fromCodePoint.apply(String,e);var t=e.length;if(!t)return"";for(var s=[],i=-1,n="";++i<t;){var o=e[i];o<=65535?s.push(o):(o-=65536,s.push((o>>10)+55296,o%1024+56320)),(i+1===t||s.length>16384)&&(n+=String.fromCharCode.apply(String,s),s.length=0)}return n},kB=wB(iB),tt="×",ri="÷",UB=function(e){return kB.get(e)},jB=function(e,A,t){var s=t-2,i=A[s],n=A[t-1],o=A[t];if(n===Ai&&o===ai)return tt;if(n===Ai||n===ai||n===Br||o===Ai||o===ai||o===Br)return ri;if(n===Cr&&[Cr,si,yr,Qr].indexOf(o)!==-1||(n===yr||n===si)&&(o===si||o===ii)||(n===Qr||n===ii)&&o===ii||o===Fr||o===vr||o===yB||n===CB)return tt;if(n===Fr&&o===kr){for(;i===vr;)i=A[--s];if(i===kr)return tt}if(n===ni&&o===ni){for(var l=0;i===ni;)l++,i=A[--s];if(l%2===0)return tt}return ri},EB=function(e){var A=QB(e),t=A.length,s=0,i=0,n=A.map(UB);return{next:function(){if(s>=t)return{done:!0,value:null};for(var o=tt;s<t&&(o=jB(A,n,++s))===tt;);if(o!==tt||s===t){var l=FB.apply(null,A.slice(i,s));return i=s,{value:l,done:!1}}return{done:!0,value:null}}}},IB=function(e){for(var A=EB(e),t=[],s;!(s=A.next()).done;)s.value&&t.push(s.value.slice());return t},SB=function(e){var A=123;if(e.createRange){var t=e.createRange();if(t.getBoundingClientRect){var s=e.createElement("boundtest");s.style.height=A+"px",s.style.display="block",e.body.appendChild(s),t.selectNode(s);var i=t.getBoundingClientRect(),n=Math.round(i.height);if(e.body.removeChild(s),n===A)return!0}}return!1},HB=function(e){var A=e.createElement("boundtest");A.style.width="50px",A.style.display="block",A.style.fontSize="12px",A.style.letterSpacing="0px",A.style.wordSpacing="0px",e.body.appendChild(A);var t=e.createRange();A.innerHTML=typeof"".repeat=="function"?"&#128104;".repeat(10):"";var s=A.firstChild,i=Fs(s.data).map(function(c){return ve(c)}),n=0,o={},l=i.every(function(c,g){t.setStart(s,n),t.setEnd(s,n+c.length);var u=t.getBoundingClientRect();n+=c.length;var p=u.x>o.x||u.y>o.y;return o=u,g===0?!0:p});return e.body.removeChild(A),l},LB=function(){return typeof new Image().crossOrigin<"u"},NB=function(){return typeof new XMLHttpRequest().responseType=="string"},TB=function(e){var A=new Image,t=e.createElement("canvas"),s=t.getContext("2d");if(!s)return!1;A.src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";try{s.drawImage(A,0,0),t.toDataURL()}catch{return!1}return!0},Ur=function(e){return e[0]===0&&e[1]===255&&e[2]===0&&e[3]===255},DB=function(e){var A=e.createElement("canvas"),t=100;A.width=t,A.height=t;var s=A.getContext("2d");if(!s)return Promise.reject(!1);s.fillStyle="rgb(0, 255, 0)",s.fillRect(0,0,t,t);var i=new Image,n=A.toDataURL();i.src=n;var o=Gi(t,t,0,0,i);return s.fillStyle="red",s.fillRect(0,0,t,t),jr(o).then(function(l){s.drawImage(l,0,0);var c=s.getImageData(0,0,t,t).data;s.fillStyle="red",s.fillRect(0,0,t,t);var g=e.createElement("div");return g.style.backgroundImage="url("+n+")",g.style.height=t+"px",Ur(c)?jr(Gi(t,t,0,0,g)):Promise.reject(!1)}).then(function(l){return s.drawImage(l,0,0),Ur(s.getImageData(0,0,t,t).data)}).catch(function(){return!1})},Gi=function(e,A,t,s,i){var n="http://www.w3.org/2000/svg",o=document.createElementNS(n,"svg"),l=document.createElementNS(n,"foreignObject");return o.setAttributeNS(null,"width",e.toString()),o.setAttributeNS(null,"height",A.toString()),l.setAttributeNS(null,"width","100%"),l.setAttributeNS(null,"height","100%"),l.setAttributeNS(null,"x",t.toString()),l.setAttributeNS(null,"y",s.toString()),l.setAttributeNS(null,"externalResourcesRequired","true"),o.appendChild(l),l.appendChild(i),o},jr=function(e){return new Promise(function(A,t){var s=new Image;s.onload=function(){return A(s)},s.onerror=t,s.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(e))})},Se={get SUPPORT_RANGE_BOUNDS(){var e=SB(document);return Object.defineProperty(Se,"SUPPORT_RANGE_BOUNDS",{value:e}),e},get SUPPORT_WORD_BREAKING(){var e=Se.SUPPORT_RANGE_BOUNDS&&HB(document);return Object.defineProperty(Se,"SUPPORT_WORD_BREAKING",{value:e}),e},get SUPPORT_SVG_DRAWING(){var e=TB(document);return Object.defineProperty(Se,"SUPPORT_SVG_DRAWING",{value:e}),e},get SUPPORT_FOREIGNOBJECT_DRAWING(){var e=typeof Array.from=="function"&&typeof window.fetch=="function"?DB(document):Promise.resolve(!1);return Object.defineProperty(Se,"SUPPORT_FOREIGNOBJECT_DRAWING",{value:e}),e},get SUPPORT_CORS_IMAGES(){var e=LB();return Object.defineProperty(Se,"SUPPORT_CORS_IMAGES",{value:e}),e},get SUPPORT_RESPONSE_TYPE(){var e=NB();return Object.defineProperty(Se,"SUPPORT_RESPONSE_TYPE",{value:e}),e},get SUPPORT_CORS_XHR(){var e="withCredentials"in new XMLHttpRequest;return Object.defineProperty(Se,"SUPPORT_CORS_XHR",{value:e}),e},get SUPPORT_NATIVE_TEXT_SEGMENTATION(){var e=!!(typeof Intl<"u"&&Intl.Segmenter);return Object.defineProperty(Se,"SUPPORT_NATIVE_TEXT_SEGMENTATION",{value:e}),e}},PA=function(){function e(A,t){this.text=A,this.bounds=t}return e}(),MB=function(e,A,t,s){var i=zB(A,t),n=[],o=0;return i.forEach(function(l){if(t.textDecorationLine.length||l.trim().length>0)if(Se.SUPPORT_RANGE_BOUNDS){var c=Er(s,o,l.length).getClientRects();if(c.length>1){var g=Fn(l),u=0;g.forEach(function(f){n.push(new PA(f,yt.fromDOMRectList(e,Er(s,u+o,f.length).getClientRects()))),u+=f.length})}else n.push(new PA(l,yt.fromDOMRectList(e,c)))}else{var p=s.splitText(l.length);n.push(new PA(l,KB(e,s))),s=p}else Se.SUPPORT_RANGE_BOUNDS||(s=s.splitText(l.length));o+=l.length}),n},KB=function(e,A){var t=A.ownerDocument;if(t){var s=t.createElement("html2canvaswrapper");s.appendChild(A.cloneNode(!0));var i=A.parentNode;if(i){i.replaceChild(s,A);var n=Qs(e,s);return s.firstChild&&i.replaceChild(s.firstChild,s),n}}return yt.EMPTY},Er=function(e,A,t){var s=e.ownerDocument;if(!s)throw new Error("Node has no owner document");var i=s.createRange();return i.setStart(e,A),i.setEnd(e,A+t),i},Fn=function(e){if(Se.SUPPORT_NATIVE_TEXT_SEGMENTATION){var A=new Intl.Segmenter(void 0,{granularity:"grapheme"});return Array.from(A.segment(e)).map(function(t){return t.segment})}return IB(e)},RB=function(e,A){if(Se.SUPPORT_NATIVE_TEXT_SEGMENTATION){var t=new Intl.Segmenter(void 0,{granularity:"word"});return Array.from(t.segment(e)).map(function(s){return s.segment})}return PB(e,A)},zB=function(e,A){return A.letterSpacing!==0?Fn(e):RB(e,A)},OB=[32,160,4961,65792,65793,4153,4241],PB=function(e,A){for(var t=h0(e,{lineBreak:A.lineBreak,wordBreak:A.overflowWrap==="break-word"?"break-word":A.wordBreak}),s=[],i,n=function(){if(i.value){var o=i.value.slice(),l=Fs(o),c="";l.forEach(function(g){OB.indexOf(g)===-1?c+=ve(g):(c.length&&s.push(c),s.push(ve(g)),c="")}),c.length&&s.push(c)}};!(i=t.next()).done;)n();return s},VB=function(){function e(A,t,s){this.text=GB(t.data,s.textTransform),this.textBounds=MB(A,this.text,s,t)}return e}(),GB=function(e,A){switch(A){case 1:return e.toLowerCase();case 3:return e.replace(_B,qB);case 2:return e.toUpperCase();default:return e}},_B=/(^|\s|:|-|\(|\))([a-z])/g,qB=function(e,A,t){return e.length>0?A+t.toUpperCase():e},Wl=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.src=s.currentSrc||s.src,i.intrinsicWidth=s.naturalWidth,i.intrinsicHeight=s.naturalHeight,i.context.cache.addImage(i.src),i}return A}(mt),Xl=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.canvas=s,i.intrinsicWidth=s.width,i.intrinsicHeight=s.height,i}return A}(mt),Yl=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this,n=new XMLSerializer,o=Qs(t,s);return s.setAttribute("width",o.width+"px"),s.setAttribute("height",o.height+"px"),i.svg="data:image/svg+xml,"+encodeURIComponent(n.serializeToString(s)),i.intrinsicWidth=s.width.baseVal.value,i.intrinsicHeight=s.height.baseVal.value,i.context.cache.addImage(i.svg),i}return A}(mt),Jl=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.value=s.value,i}return A}(mt),_i=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.start=s.start,i.reversed=typeof s.reversed=="boolean"&&s.reversed===!0,i}return A}(mt),WB=[{type:15,flags:0,unit:"px",number:3}],XB=[{type:16,flags:0,number:50}],YB=function(e){return e.width>e.height?new yt(e.left+(e.width-e.height)/2,e.top,e.height,e.height):e.width<e.height?new yt(e.left,e.top+(e.height-e.width)/2,e.width,e.width):e},JB=function(e){var A=e.type===$B?new Array(e.value.length+1).join("•"):e.value;return A.length===0?e.placeholder||"":A},ts="checkbox",As="radio",$B="password",Ir=707406591,kn=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;switch(i.type=s.type.toLowerCase(),i.checked=s.checked,i.value=JB(s),(i.type===ts||i.type===As)&&(i.styles.backgroundColor=3739148031,i.styles.borderTopColor=i.styles.borderRightColor=i.styles.borderBottomColor=i.styles.borderLeftColor=2779096575,i.styles.borderTopWidth=i.styles.borderRightWidth=i.styles.borderBottomWidth=i.styles.borderLeftWidth=1,i.styles.borderTopStyle=i.styles.borderRightStyle=i.styles.borderBottomStyle=i.styles.borderLeftStyle=1,i.styles.backgroundClip=[0],i.styles.backgroundOrigin=[0],i.bounds=YB(i.bounds)),i.type){case ts:i.styles.borderTopRightRadius=i.styles.borderTopLeftRadius=i.styles.borderBottomRightRadius=i.styles.borderBottomLeftRadius=WB;break;case As:i.styles.borderTopRightRadius=i.styles.borderTopLeftRadius=i.styles.borderBottomRightRadius=i.styles.borderBottomLeftRadius=XB;break}return i}return A}(mt),$l=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this,n=s.options[s.selectedIndex||0];return i.value=n&&n.text||"",i}return A}(mt),Zl=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.value=s.value,i}return A}(mt),ec=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;i.src=s.src,i.width=parseInt(s.width,10)||0,i.height=parseInt(s.height,10)||0,i.backgroundColor=i.styles.backgroundColor;try{if(s.contentWindow&&s.contentWindow.document&&s.contentWindow.document.documentElement){i.tree=Ac(t,s.contentWindow.document.documentElement);var n=s.contentWindow.document.documentElement?zA(t,getComputedStyle(s.contentWindow.document.documentElement).backgroundColor):Bt.TRANSPARENT,o=s.contentWindow.document.body?zA(t,getComputedStyle(s.contentWindow.document.body).backgroundColor):Bt.TRANSPARENT;i.backgroundColor=Mt(n)?Mt(o)?i.styles.backgroundColor:o:n}}catch{}return i}return A}(mt),ZB=["OL","UL","MENU"],Oa=function(e,A,t,s){for(var i=A.firstChild,n=void 0;i;i=n)if(n=i.nextSibling,ac(i)&&i.data.trim().length>0)t.textNodes.push(new VB(e,i,t.styles));else if(hA(i))if(rc(i)&&i.assignedNodes)i.assignedNodes().forEach(function(l){return Oa(e,l,t,s)});else{var o=tc(e,i);o.styles.isVisible()&&(ev(i,o,s)?o.flags|=4:tv(o.styles)&&(o.flags|=2),ZB.indexOf(i.tagName)!==-1&&(o.flags|=8),t.elements.push(o),i.slot,i.shadowRoot?Oa(e,i.shadowRoot,o,s):!as(i)&&!sc(i)&&!ss(i)&&Oa(e,i,o,s))}},tc=function(e,A){return Wi(A)?new Wl(e,A):ic(A)?new Xl(e,A):sc(A)?new Yl(e,A):Av(A)?new Jl(e,A):av(A)?new _i(e,A):sv(A)?new kn(e,A):ss(A)?new $l(e,A):as(A)?new Zl(e,A):nc(A)?new ec(e,A):new mt(e,A)},Ac=function(e,A){var t=tc(e,A);return t.flags|=4,Oa(e,A,t,t),t},ev=function(e,A,t){return A.styles.isPositionedWithZIndex()||A.styles.opacity<1||A.styles.isTransformed()||Un(e)&&t.styles.isTransparent()},tv=function(e){return e.isPositioned()||e.isFloating()},ac=function(e){return e.nodeType===Node.TEXT_NODE},hA=function(e){return e.nodeType===Node.ELEMENT_NODE},qi=function(e){return hA(e)&&typeof e.style<"u"&&!Pa(e)},Pa=function(e){return typeof e.className=="object"},Av=function(e){return e.tagName==="LI"},av=function(e){return e.tagName==="OL"},sv=function(e){return e.tagName==="INPUT"},iv=function(e){return e.tagName==="HTML"},sc=function(e){return e.tagName==="svg"},Un=function(e){return e.tagName==="BODY"},ic=function(e){return e.tagName==="CANVAS"},Sr=function(e){return e.tagName==="VIDEO"},Wi=function(e){return e.tagName==="IMG"},nc=function(e){return e.tagName==="IFRAME"},Hr=function(e){return e.tagName==="STYLE"},nv=function(e){return e.tagName==="SCRIPT"},as=function(e){return e.tagName==="TEXTAREA"},ss=function(e){return e.tagName==="SELECT"},rc=function(e){return e.tagName==="SLOT"},Lr=function(e){return e.tagName.indexOf("-")>0},rv=function(){function e(){this.counters={}}return e.prototype.getCounterValue=function(A){var t=this.counters[A];return t&&t.length?t[t.length-1]:1},e.prototype.getCounterValues=function(A){var t=this.counters[A];return t||[]},e.prototype.pop=function(A){var t=this;A.forEach(function(s){return t.counters[s].pop()})},e.prototype.parse=function(A){var t=this,s=A.counterIncrement,i=A.counterReset,n=!0;s!==null&&s.forEach(function(l){var c=t.counters[l.counter];c&&l.increment!==0&&(n=!1,c.length||c.push(1),c[Math.max(0,c.length-1)]+=l.increment)});var o=[];return n&&i.forEach(function(l){var c=t.counters[l.counter];o.push(l.counter),c||(c=t.counters[l.counter]=[]),c.push(l.reset)}),o},e}(),Nr={integers:[1e3,900,500,400,100,90,50,40,10,9,5,4,1],values:["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"]},Tr={integers:[9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,900,800,700,600,500,400,300,200,100,90,80,70,60,50,40,30,20,10,9,8,7,6,5,4,3,2,1],values:["Ք","Փ","Ւ","Ց","Ր","Տ","Վ","Ս","Ռ","Ջ","Պ","Չ","Ո","Շ","Ն","Յ","Մ","Ճ","Ղ","Ձ","Հ","Կ","Ծ","Խ","Լ","Ի","Ժ","Թ","Ը","Է","Զ","Ե","Դ","Գ","Բ","Ա"]},ov={integers:[1e4,9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,400,300,200,100,90,80,70,60,50,40,30,20,19,18,17,16,15,10,9,8,7,6,5,4,3,2,1],values:["י׳","ט׳","ח׳","ז׳","ו׳","ה׳","ד׳","ג׳","ב׳","א׳","ת","ש","ר","ק","צ","פ","ע","ס","נ","מ","ל","כ","יט","יח","יז","טז","טו","י","ט","ח","ז","ו","ה","ד","ג","ב","א"]},lv={integers:[1e4,9e3,8e3,7e3,6e3,5e3,4e3,3e3,2e3,1e3,900,800,700,600,500,400,300,200,100,90,80,70,60,50,40,30,20,10,9,8,7,6,5,4,3,2,1],values:["ჵ","ჰ","ჯ","ჴ","ხ","ჭ","წ","ძ","ც","ჩ","შ","ყ","ღ","ქ","ფ","ჳ","ტ","ს","რ","ჟ","პ","ო","ჲ","ნ","მ","ლ","კ","ი","თ","ჱ","ზ","ვ","ე","დ","გ","ბ","ა"]},oA=function(e,A,t,s,i,n){return e<A||e>t?XA(e,i,n.length>0):s.integers.reduce(function(o,l,c){for(;e>=l;)e-=l,o+=s.values[c];return o},"")+n},oc=function(e,A,t,s){var i="";do t||e--,i=s(e)+i,e/=A;while(e*A>=A);return i},we=function(e,A,t,s,i){var n=t-A+1;return(e<0?"-":"")+(oc(Math.abs(e),n,s,function(o){return ve(Math.floor(o%n)+A)})+i)},_t=function(e,A,t){t===void 0&&(t=". ");var s=A.length;return oc(Math.abs(e),s,!1,function(i){return A[Math.floor(i%s)]})+t},gA=1,jt=2,Et=4,KA=8,bt=function(e,A,t,s,i,n){if(e<-9999||e>9999)return XA(e,4,i.length>0);var o=Math.abs(e),l=i;if(o===0)return A[0]+l;for(var c=0;o>0&&c<=4;c++){var g=o%10;g===0&&ke(n,gA)&&l!==""?l=A[g]+l:g>1||g===1&&c===0||g===1&&c===1&&ke(n,jt)||g===1&&c===1&&ke(n,Et)&&e>100||g===1&&c>1&&ke(n,KA)?l=A[g]+(c>0?t[c-1]:"")+l:g===1&&c>0&&(l=t[c-1]+l),o=Math.floor(o/10)}return(e<0?s:"")+l},Dr="十百千萬",Mr="拾佰仟萬",Kr="マイナス",oi="마이너스",XA=function(e,A,t){var s=t?". ":"",i=t?"、":"",n=t?", ":"",o=t?" ":"";switch(A){case 0:return"•"+o;case 1:return"◦"+o;case 2:return"◾"+o;case 5:var l=we(e,48,57,!0,s);return l.length<4?"0"+l:l;case 4:return _t(e,"〇一二三四五六七八九",i);case 6:return oA(e,1,3999,Nr,3,s).toLowerCase();case 7:return oA(e,1,3999,Nr,3,s);case 8:return we(e,945,969,!1,s);case 9:return we(e,97,122,!1,s);case 10:return we(e,65,90,!1,s);case 11:return we(e,1632,1641,!0,s);case 12:case 49:return oA(e,1,9999,Tr,3,s);case 35:return oA(e,1,9999,Tr,3,s).toLowerCase();case 13:return we(e,2534,2543,!0,s);case 14:case 30:return we(e,6112,6121,!0,s);case 15:return _t(e,"子丑寅卯辰巳午未申酉戌亥",i);case 16:return _t(e,"甲乙丙丁戊己庚辛壬癸",i);case 17:case 48:return bt(e,"零一二三四五六七八九",Dr,"負",i,jt|Et|KA);case 47:return bt(e,"零壹貳參肆伍陸柒捌玖",Mr,"負",i,gA|jt|Et|KA);case 42:return bt(e,"零一二三四五六七八九",Dr,"负",i,jt|Et|KA);case 41:return bt(e,"零壹贰叁肆伍陆柒捌玖",Mr,"负",i,gA|jt|Et|KA);case 26:return bt(e,"〇一二三四五六七八九","十百千万",Kr,i,0);case 25:return bt(e,"零壱弐参四伍六七八九","拾百千万",Kr,i,gA|jt|Et);case 31:return bt(e,"영일이삼사오육칠팔구","십백천만",oi,n,gA|jt|Et);case 33:return bt(e,"零一二三四五六七八九","十百千萬",oi,n,0);case 32:return bt(e,"零壹貳參四五六七八九","拾百千",oi,n,gA|jt|Et);case 18:return we(e,2406,2415,!0,s);case 20:return oA(e,1,19999,lv,3,s);case 21:return we(e,2790,2799,!0,s);case 22:return we(e,2662,2671,!0,s);case 22:return oA(e,1,10999,ov,3,s);case 23:return _t(e,"あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん");case 24:return _t(e,"いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす");case 27:return we(e,3302,3311,!0,s);case 28:return _t(e,"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン",i);case 29:return _t(e,"イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス",i);case 34:return we(e,3792,3801,!0,s);case 37:return we(e,6160,6169,!0,s);case 38:return we(e,4160,4169,!0,s);case 39:return we(e,2918,2927,!0,s);case 40:return we(e,1776,1785,!0,s);case 43:return we(e,3046,3055,!0,s);case 44:return we(e,3174,3183,!0,s);case 45:return we(e,3664,3673,!0,s);case 46:return we(e,3872,3881,!0,s);case 3:default:return we(e,48,57,!0,s)}},lc="data-html2canvas-ignore",Rr=function(){function e(A,t,s){if(this.context=A,this.options=s,this.scrolledElements=[],this.referenceElement=t,this.counters=new rv,this.quoteDepth=0,!t.ownerDocument)throw new Error("Cloned element does not have an owner document");this.documentElement=this.cloneNode(t.ownerDocument.documentElement,!1)}return e.prototype.toIFrame=function(A,t){var s=this,i=cv(A,t);if(!i.contentWindow)return Promise.reject("Unable to find iframe window");var n=A.defaultView.pageXOffset,o=A.defaultView.pageYOffset,l=i.contentWindow,c=l.document,g=gv(i).then(function(){return Ve(s,void 0,void 0,function(){var u,p;return Me(this,function(f){switch(f.label){case 0:return this.scrolledElements.forEach(fv),l&&(l.scrollTo(t.left,t.top),/(iPad|iPhone|iPod)/g.test(navigator.userAgent)&&(l.scrollY!==t.top||l.scrollX!==t.left)&&(this.context.logger.warn("Unable to restore scroll position for cloned document"),this.context.windowBounds=this.context.windowBounds.add(l.scrollX-t.left,l.scrollY-t.top,0,0))),u=this.options.onclone,p=this.clonedReferenceElement,typeof p>"u"?[2,Promise.reject("Error finding the "+this.referenceElement.nodeName+" in the cloned document")]:c.fonts&&c.fonts.ready?[4,c.fonts.ready]:[3,2];case 1:f.sent(),f.label=2;case 2:return/(AppleWebKit)/g.test(navigator.userAgent)?[4,uv(c)]:[3,4];case 3:f.sent(),f.label=4;case 4:return typeof u=="function"?[2,Promise.resolve().then(function(){return u(c,p)}).then(function(){return i})]:[2,i]}})})});return c.open(),c.write(mv(document.doctype)+"<html></html>"),hv(this.referenceElement.ownerDocument,n,o),c.replaceChild(c.adoptNode(this.documentElement),c.documentElement),c.close(),g},e.prototype.createElementClone=function(A){if(Vi(A,2))debugger;if(ic(A))return this.createCanvasClone(A);if(Sr(A))return this.createVideoClone(A);if(Hr(A))return this.createStyleClone(A);var t=A.cloneNode(!1);return Wi(t)&&(Wi(A)&&A.currentSrc&&A.currentSrc!==A.src&&(t.src=A.currentSrc,t.srcset=""),t.loading==="lazy"&&(t.loading="eager")),Lr(t)?this.createCustomElementClone(t):t},e.prototype.createCustomElementClone=function(A){var t=document.createElement("html2canvascustomelement");return li(A.style,t),t},e.prototype.createStyleClone=function(A){try{var t=A.sheet;if(t&&t.cssRules){var s=[].slice.call(t.cssRules,0).reduce(function(n,o){return o&&typeof o.cssText=="string"?n+o.cssText:n},""),i=A.cloneNode(!1);return i.textContent=s,i}}catch(n){if(this.context.logger.error("Unable to access cssRules property",n),n.name!=="SecurityError")throw n}return A.cloneNode(!1)},e.prototype.createCanvasClone=function(A){var t;if(this.options.inlineImages&&A.ownerDocument){var s=A.ownerDocument.createElement("img");try{return s.src=A.toDataURL(),s}catch{this.context.logger.info("Unable to inline canvas contents, canvas is tainted",A)}}var i=A.cloneNode(!1);try{i.width=A.width,i.height=A.height;var n=A.getContext("2d"),o=i.getContext("2d");if(o)if(!this.options.allowTaint&&n)o.putImageData(n.getImageData(0,0,A.width,A.height),0,0);else{var l=(t=A.getContext("webgl2"))!==null&&t!==void 0?t:A.getContext("webgl");if(l){var c=l.getContextAttributes();(c==null?void 0:c.preserveDrawingBuffer)===!1&&this.context.logger.warn("Unable to clone WebGL context as it has preserveDrawingBuffer=false",A)}o.drawImage(A,0,0)}return i}catch{this.context.logger.info("Unable to clone canvas as it is tainted",A)}return i},e.prototype.createVideoClone=function(A){var t=A.ownerDocument.createElement("canvas");t.width=A.offsetWidth,t.height=A.offsetHeight;var s=t.getContext("2d");try{return s&&(s.drawImage(A,0,0,t.width,t.height),this.options.allowTaint||s.getImageData(0,0,t.width,t.height)),t}catch{this.context.logger.info("Unable to clone video as it is tainted",A)}var i=A.ownerDocument.createElement("canvas");return i.width=A.offsetWidth,i.height=A.offsetHeight,i},e.prototype.appendChildNode=function(A,t,s){(!hA(t)||!nv(t)&&!t.hasAttribute(lc)&&(typeof this.options.ignoreElements!="function"||!this.options.ignoreElements(t)))&&(!this.options.copyStyles||!hA(t)||!Hr(t))&&A.appendChild(this.cloneNode(t,s))},e.prototype.cloneChildNodes=function(A,t,s){for(var i=this,n=A.shadowRoot?A.shadowRoot.firstChild:A.firstChild;n;n=n.nextSibling)if(hA(n)&&rc(n)&&typeof n.assignedNodes=="function"){var o=n.assignedNodes();o.length&&o.forEach(function(l){return i.appendChildNode(t,l,s)})}else this.appendChildNode(t,n,s)},e.prototype.cloneNode=function(A,t){if(ac(A))return document.createTextNode(A.data);if(!A.ownerDocument)return A.cloneNode(!1);var s=A.ownerDocument.defaultView;if(s&&hA(A)&&(qi(A)||Pa(A))){var i=this.createElementClone(A);i.style.transitionProperty="none";var n=s.getComputedStyle(A),o=s.getComputedStyle(A,":before"),l=s.getComputedStyle(A,":after");this.referenceElement===A&&qi(i)&&(this.clonedReferenceElement=i),Un(i)&&wv(i);var c=this.counters.parse(new fr(this.context,n)),g=this.resolvePseudoContent(A,i,o,VA.BEFORE);Lr(A)&&(t=!0),Sr(A)||this.cloneChildNodes(A,i,t),g&&i.insertBefore(g,i.firstChild);var u=this.resolvePseudoContent(A,i,l,VA.AFTER);return u&&i.appendChild(u),this.counters.pop(c),(n&&(this.options.copyStyles||Pa(A))&&!nc(A)||t)&&li(n,i),(A.scrollTop!==0||A.scrollLeft!==0)&&this.scrolledElements.push([i,A.scrollLeft,A.scrollTop]),(as(A)||ss(A))&&(as(i)||ss(i))&&(i.value=A.value),i}return A.cloneNode(!1)},e.prototype.resolvePseudoContent=function(A,t,s,i){var n=this;if(s){var o=s.content,l=t.ownerDocument;if(!(!l||!o||o==="none"||o==="-moz-alt-content"||s.display==="none")){this.counters.parse(new fr(this.context,s));var c=new AB(this.context,s),g=l.createElement("html2canvaspseudoelement");li(s,g),c.content.forEach(function(p){if(p.type===0)g.appendChild(l.createTextNode(p.value));else if(p.type===22){var f=l.createElement("img");f.src=p.value,f.style.opacity="1",g.appendChild(f)}else if(p.type===18){if(p.name==="attr"){var x=p.values.filter(le);x.length&&g.appendChild(l.createTextNode(A.getAttribute(x[0].value)||""))}else if(p.name==="counter"){var w=p.values.filter(wA),C=w[0],H=w[1];if(C&&le(C)){var j=n.counters.getCounterValue(C.value),E=H&&le(H)?Pi.parse(n.context,H.value):3;g.appendChild(l.createTextNode(XA(j,E,!1)))}}else if(p.name==="counters"){var V=p.values.filter(wA),C=V[0],T=V[1],H=V[2];if(C&&le(C)){var I=n.counters.getCounterValues(C.value),Q=H&&le(H)?Pi.parse(n.context,H.value):3,P=T&&T.type===0?T.value:"",_=I.map(function(S){return XA(S,Q,!1)}).join(P);g.appendChild(l.createTextNode(_))}}}else if(p.type===20)switch(p.value){case"open-quote":g.appendChild(l.createTextNode(hr(c.quotes,n.quoteDepth++,!0)));break;case"close-quote":g.appendChild(l.createTextNode(hr(c.quotes,--n.quoteDepth,!1)));break;default:g.appendChild(l.createTextNode(p.value))}}),g.className=Xi+" "+Yi;var u=i===VA.BEFORE?" "+Xi:" "+Yi;return Pa(t)?t.className.baseValue+=u:t.className+=u,g}}},e.destroy=function(A){return A.parentNode?(A.parentNode.removeChild(A),!0):!1},e}(),VA;(function(e){e[e.BEFORE=0]="BEFORE",e[e.AFTER=1]="AFTER"})(VA||(VA={}));var cv=function(e,A){var t=e.createElement("iframe");return t.className="html2canvas-container",t.style.visibility="hidden",t.style.position="fixed",t.style.left="-10000px",t.style.top="0px",t.style.border="0",t.width=A.width.toString(),t.height=A.height.toString(),t.scrolling="no",t.setAttribute(lc,"true"),e.body.appendChild(t),t},dv=function(e){return new Promise(function(A){if(e.complete){A();return}if(!e.src){A();return}e.onload=A,e.onerror=A})},uv=function(e){return Promise.all([].slice.call(e.images,0).map(dv))},gv=function(e){return new Promise(function(A,t){var s=e.contentWindow;if(!s)return t("No window assigned for iframe");var i=s.document;s.onload=e.onload=function(){s.onload=e.onload=null;var n=setInterval(function(){i.body.childNodes.length>0&&i.readyState==="complete"&&(clearInterval(n),A(e))},50)}})},pv=["all","d","content"],li=function(e,A){for(var t=e.length-1;t>=0;t--){var s=e.item(t);pv.indexOf(s)===-1&&A.style.setProperty(s,e.getPropertyValue(s))}return A},mv=function(e){var A="";return e&&(A+="<!DOCTYPE ",e.name&&(A+=e.name),e.internalSubset&&(A+=e.internalSubset),e.publicId&&(A+='"'+e.publicId+'"'),e.systemId&&(A+='"'+e.systemId+'"'),A+=">"),A},hv=function(e,A,t){e&&e.defaultView&&(A!==e.defaultView.pageXOffset||t!==e.defaultView.pageYOffset)&&e.defaultView.scrollTo(A,t)},fv=function(e){var A=e[0],t=e[1],s=e[2];A.scrollLeft=t,A.scrollTop=s},xv=":before",bv=":after",Xi="___html2canvas___pseudoelement_before",Yi="___html2canvas___pseudoelement_after",zr=`{
    content: "" !important;
    display: none !important;
}`,wv=function(e){Bv(e,"."+Xi+xv+zr+`
         .`+Yi+bv+zr)},Bv=function(e,A){var t=e.ownerDocument;if(t){var s=t.createElement("style");s.textContent=A,e.appendChild(s)}},cc=function(){function e(){}return e.getOrigin=function(A){var t=e._link;return t?(t.href=A,t.href=t.href,t.protocol+t.hostname+t.port):"about:blank"},e.isSameOrigin=function(A){return e.getOrigin(A)===e._origin},e.setContext=function(A){e._link=A.document.createElement("a"),e._origin=e.getOrigin(A.location.href)},e._origin="about:blank",e}(),vv=function(){function e(A,t){this.context=A,this._options=t,this._cache={}}return e.prototype.addImage=function(A){var t=Promise.resolve();return this.has(A)||(di(A)||Fv(A))&&(this._cache[A]=this.loadImage(A)).catch(function(){}),t},e.prototype.match=function(A){return this._cache[A]},e.prototype.loadImage=function(A){return Ve(this,void 0,void 0,function(){var t,s,i,n,o=this;return Me(this,function(l){switch(l.label){case 0:return t=cc.isSameOrigin(A),s=!ci(A)&&this._options.useCORS===!0&&Se.SUPPORT_CORS_IMAGES&&!t,i=!ci(A)&&!t&&!di(A)&&typeof this._options.proxy=="string"&&Se.SUPPORT_CORS_XHR&&!s,!t&&this._options.allowTaint===!1&&!ci(A)&&!di(A)&&!i&&!s?[2]:(n=A,i?[4,this.proxy(n)]:[3,2]);case 1:n=l.sent(),l.label=2;case 2:return this.context.logger.debug("Added image "+A.substring(0,256)),[4,new Promise(function(c,g){var u=new Image;u.onload=function(){return c(u)},u.onerror=g,(kv(n)||s)&&(u.crossOrigin="anonymous"),u.src=n,u.complete===!0&&setTimeout(function(){return c(u)},500),o._options.imageTimeout>0&&setTimeout(function(){return g("Timed out ("+o._options.imageTimeout+"ms) loading image")},o._options.imageTimeout)})];case 3:return[2,l.sent()]}})})},e.prototype.has=function(A){return typeof this._cache[A]<"u"},e.prototype.keys=function(){return Promise.resolve(Object.keys(this._cache))},e.prototype.proxy=function(A){var t=this,s=this._options.proxy;if(!s)throw new Error("No proxy defined");var i=A.substring(0,256);return new Promise(function(n,o){var l=Se.SUPPORT_RESPONSE_TYPE?"blob":"text",c=new XMLHttpRequest;c.onload=function(){if(c.status===200)if(l==="text")n(c.response);else{var p=new FileReader;p.addEventListener("load",function(){return n(p.result)},!1),p.addEventListener("error",function(f){return o(f)},!1),p.readAsDataURL(c.response)}else o("Failed to proxy resource "+i+" with status code "+c.status)},c.onerror=o;var g=s.indexOf("?")>-1?"&":"?";if(c.open("GET",""+s+g+"url="+encodeURIComponent(A)+"&responseType="+l),l!=="text"&&c instanceof XMLHttpRequest&&(c.responseType=l),t._options.imageTimeout){var u=t._options.imageTimeout;c.timeout=u,c.ontimeout=function(){return o("Timed out ("+u+"ms) proxying "+i)}}c.send()})},e}(),Cv=/^data:image\/svg\+xml/i,yv=/^data:image\/.*;base64,/i,Qv=/^data:image\/.*/i,Fv=function(e){return Se.SUPPORT_SVG_DRAWING||!Uv(e)},ci=function(e){return Qv.test(e)},kv=function(e){return yv.test(e)},di=function(e){return e.substr(0,4)==="blob"},Uv=function(e){return e.substr(-3).toLowerCase()==="svg"||Cv.test(e)},R=function(){function e(A,t){this.type=0,this.x=A,this.y=t}return e.prototype.add=function(A,t){return new e(this.x+A,this.y+t)},e}(),lA=function(e,A,t){return new R(e.x+(A.x-e.x)*t,e.y+(A.y-e.y)*t)},La=function(){function e(A,t,s,i){this.type=1,this.start=A,this.startControl=t,this.endControl=s,this.end=i}return e.prototype.subdivide=function(A,t){var s=lA(this.start,this.startControl,A),i=lA(this.startControl,this.endControl,A),n=lA(this.endControl,this.end,A),o=lA(s,i,A),l=lA(i,n,A),c=lA(o,l,A);return t?new e(this.start,s,o,c):new e(c,l,n,this.end)},e.prototype.add=function(A,t){return new e(this.start.add(A,t),this.startControl.add(A,t),this.endControl.add(A,t),this.end.add(A,t))},e.prototype.reverse=function(){return new e(this.end,this.endControl,this.startControl,this.start)},e}(),At=function(e){return e.type===1},jv=function(){function e(A){var t=A.styles,s=A.bounds,i=DA(t.borderTopLeftRadius,s.width,s.height),n=i[0],o=i[1],l=DA(t.borderTopRightRadius,s.width,s.height),c=l[0],g=l[1],u=DA(t.borderBottomRightRadius,s.width,s.height),p=u[0],f=u[1],x=DA(t.borderBottomLeftRadius,s.width,s.height),w=x[0],C=x[1],H=[];H.push((n+c)/s.width),H.push((w+p)/s.width),H.push((o+C)/s.height),H.push((g+f)/s.height);var j=Math.max.apply(Math,H);j>1&&(n/=j,o/=j,c/=j,g/=j,p/=j,f/=j,w/=j,C/=j);var E=s.width-c,V=s.height-f,T=s.width-p,I=s.height-C,Q=t.borderTopWidth,P=t.borderRightWidth,_=t.borderBottomWidth,z=t.borderLeftWidth,$=de(t.paddingTop,A.bounds.width),S=de(t.paddingRight,A.bounds.width),F=de(t.paddingBottom,A.bounds.width),m=de(t.paddingLeft,A.bounds.width);this.topLeftBorderDoubleOuterBox=n>0||o>0?ge(s.left+z/3,s.top+Q/3,n-z/3,o-Q/3,oe.TOP_LEFT):new R(s.left+z/3,s.top+Q/3),this.topRightBorderDoubleOuterBox=n>0||o>0?ge(s.left+E,s.top+Q/3,c-P/3,g-Q/3,oe.TOP_RIGHT):new R(s.left+s.width-P/3,s.top+Q/3),this.bottomRightBorderDoubleOuterBox=p>0||f>0?ge(s.left+T,s.top+V,p-P/3,f-_/3,oe.BOTTOM_RIGHT):new R(s.left+s.width-P/3,s.top+s.height-_/3),this.bottomLeftBorderDoubleOuterBox=w>0||C>0?ge(s.left+z/3,s.top+I,w-z/3,C-_/3,oe.BOTTOM_LEFT):new R(s.left+z/3,s.top+s.height-_/3),this.topLeftBorderDoubleInnerBox=n>0||o>0?ge(s.left+z*2/3,s.top+Q*2/3,n-z*2/3,o-Q*2/3,oe.TOP_LEFT):new R(s.left+z*2/3,s.top+Q*2/3),this.topRightBorderDoubleInnerBox=n>0||o>0?ge(s.left+E,s.top+Q*2/3,c-P*2/3,g-Q*2/3,oe.TOP_RIGHT):new R(s.left+s.width-P*2/3,s.top+Q*2/3),this.bottomRightBorderDoubleInnerBox=p>0||f>0?ge(s.left+T,s.top+V,p-P*2/3,f-_*2/3,oe.BOTTOM_RIGHT):new R(s.left+s.width-P*2/3,s.top+s.height-_*2/3),this.bottomLeftBorderDoubleInnerBox=w>0||C>0?ge(s.left+z*2/3,s.top+I,w-z*2/3,C-_*2/3,oe.BOTTOM_LEFT):new R(s.left+z*2/3,s.top+s.height-_*2/3),this.topLeftBorderStroke=n>0||o>0?ge(s.left+z/2,s.top+Q/2,n-z/2,o-Q/2,oe.TOP_LEFT):new R(s.left+z/2,s.top+Q/2),this.topRightBorderStroke=n>0||o>0?ge(s.left+E,s.top+Q/2,c-P/2,g-Q/2,oe.TOP_RIGHT):new R(s.left+s.width-P/2,s.top+Q/2),this.bottomRightBorderStroke=p>0||f>0?ge(s.left+T,s.top+V,p-P/2,f-_/2,oe.BOTTOM_RIGHT):new R(s.left+s.width-P/2,s.top+s.height-_/2),this.bottomLeftBorderStroke=w>0||C>0?ge(s.left+z/2,s.top+I,w-z/2,C-_/2,oe.BOTTOM_LEFT):new R(s.left+z/2,s.top+s.height-_/2),this.topLeftBorderBox=n>0||o>0?ge(s.left,s.top,n,o,oe.TOP_LEFT):new R(s.left,s.top),this.topRightBorderBox=c>0||g>0?ge(s.left+E,s.top,c,g,oe.TOP_RIGHT):new R(s.left+s.width,s.top),this.bottomRightBorderBox=p>0||f>0?ge(s.left+T,s.top+V,p,f,oe.BOTTOM_RIGHT):new R(s.left+s.width,s.top+s.height),this.bottomLeftBorderBox=w>0||C>0?ge(s.left,s.top+I,w,C,oe.BOTTOM_LEFT):new R(s.left,s.top+s.height),this.topLeftPaddingBox=n>0||o>0?ge(s.left+z,s.top+Q,Math.max(0,n-z),Math.max(0,o-Q),oe.TOP_LEFT):new R(s.left+z,s.top+Q),this.topRightPaddingBox=c>0||g>0?ge(s.left+Math.min(E,s.width-P),s.top+Q,E>s.width+P?0:Math.max(0,c-P),Math.max(0,g-Q),oe.TOP_RIGHT):new R(s.left+s.width-P,s.top+Q),this.bottomRightPaddingBox=p>0||f>0?ge(s.left+Math.min(T,s.width-z),s.top+Math.min(V,s.height-_),Math.max(0,p-P),Math.max(0,f-_),oe.BOTTOM_RIGHT):new R(s.left+s.width-P,s.top+s.height-_),this.bottomLeftPaddingBox=w>0||C>0?ge(s.left+z,s.top+Math.min(I,s.height-_),Math.max(0,w-z),Math.max(0,C-_),oe.BOTTOM_LEFT):new R(s.left+z,s.top+s.height-_),this.topLeftContentBox=n>0||o>0?ge(s.left+z+m,s.top+Q+$,Math.max(0,n-(z+m)),Math.max(0,o-(Q+$)),oe.TOP_LEFT):new R(s.left+z+m,s.top+Q+$),this.topRightContentBox=c>0||g>0?ge(s.left+Math.min(E,s.width+z+m),s.top+Q+$,E>s.width+z+m?0:c-z+m,g-(Q+$),oe.TOP_RIGHT):new R(s.left+s.width-(P+S),s.top+Q+$),this.bottomRightContentBox=p>0||f>0?ge(s.left+Math.min(T,s.width-(z+m)),s.top+Math.min(V,s.height+Q+$),Math.max(0,p-(P+S)),f-(_+F),oe.BOTTOM_RIGHT):new R(s.left+s.width-(P+S),s.top+s.height-(_+F)),this.bottomLeftContentBox=w>0||C>0?ge(s.left+z+m,s.top+I,Math.max(0,w-(z+m)),C-(_+F),oe.BOTTOM_LEFT):new R(s.left+z+m,s.top+s.height-(_+F))}return e}(),oe;(function(e){e[e.TOP_LEFT=0]="TOP_LEFT",e[e.TOP_RIGHT=1]="TOP_RIGHT",e[e.BOTTOM_RIGHT=2]="BOTTOM_RIGHT",e[e.BOTTOM_LEFT=3]="BOTTOM_LEFT"})(oe||(oe={}));var ge=function(e,A,t,s,i){var n=4*((Math.sqrt(2)-1)/3),o=t*n,l=s*n,c=e+t,g=A+s;switch(i){case oe.TOP_LEFT:return new La(new R(e,g),new R(e,g-l),new R(c-o,A),new R(c,A));case oe.TOP_RIGHT:return new La(new R(e,A),new R(e+o,A),new R(c,g-l),new R(c,g));case oe.BOTTOM_RIGHT:return new La(new R(c,A),new R(c,A+l),new R(e+o,g),new R(e,g));case oe.BOTTOM_LEFT:default:return new La(new R(c,g),new R(c-o,g),new R(e,A+l),new R(e,A))}},is=function(e){return[e.topLeftBorderBox,e.topRightBorderBox,e.bottomRightBorderBox,e.bottomLeftBorderBox]},Ev=function(e){return[e.topLeftContentBox,e.topRightContentBox,e.bottomRightContentBox,e.bottomLeftContentBox]},ns=function(e){return[e.topLeftPaddingBox,e.topRightPaddingBox,e.bottomRightPaddingBox,e.bottomLeftPaddingBox]},Iv=function(){function e(A,t,s){this.offsetX=A,this.offsetY=t,this.matrix=s,this.type=0,this.target=6}return e}(),Na=function(){function e(A,t){this.path=A,this.target=t,this.type=1}return e}(),Sv=function(){function e(A){this.opacity=A,this.type=2,this.target=6}return e}(),Hv=function(e){return e.type===0},dc=function(e){return e.type===1},Lv=function(e){return e.type===2},Or=function(e,A){return e.length===A.length?e.some(function(t,s){return t===A[s]}):!1},Nv=function(e,A,t,s,i){return e.map(function(n,o){switch(o){case 0:return n.add(A,t);case 1:return n.add(A+s,t);case 2:return n.add(A+s,t+i);case 3:return n.add(A,t+i)}return n})},uc=function(){function e(A){this.element=A,this.inlineLevel=[],this.nonInlineLevel=[],this.negativeZIndex=[],this.zeroOrAutoZIndexOrTransformedOrOpacity=[],this.positiveZIndex=[],this.nonPositionedFloats=[],this.nonPositionedInlineLevel=[]}return e}(),gc=function(){function e(A,t){if(this.container=A,this.parent=t,this.effects=[],this.curves=new jv(this.container),this.container.styles.opacity<1&&this.effects.push(new Sv(this.container.styles.opacity)),this.container.styles.transform!==null){var s=this.container.bounds.left+this.container.styles.transformOrigin[0].number,i=this.container.bounds.top+this.container.styles.transformOrigin[1].number,n=this.container.styles.transform;this.effects.push(new Iv(s,i,n))}if(this.container.styles.overflowX!==0){var o=is(this.curves),l=ns(this.curves);Or(o,l)?this.effects.push(new Na(o,6)):(this.effects.push(new Na(o,2)),this.effects.push(new Na(l,4)))}}return e.prototype.getEffects=function(A){for(var t=[2,3].indexOf(this.container.styles.position)===-1,s=this.parent,i=this.effects.slice(0);s;){var n=s.effects.filter(function(c){return!dc(c)});if(t||s.container.styles.position!==0||!s.parent){if(i.unshift.apply(i,n),t=[2,3].indexOf(s.container.styles.position)===-1,s.container.styles.overflowX!==0){var o=is(s.curves),l=ns(s.curves);Or(o,l)||i.unshift(new Na(l,6))}}else i.unshift.apply(i,n);s=s.parent}return i.filter(function(c){return ke(c.target,A)})},e}(),Ji=function(e,A,t,s){e.container.elements.forEach(function(i){var n=ke(i.flags,4),o=ke(i.flags,2),l=new gc(i,e);ke(i.styles.display,2048)&&s.push(l);var c=ke(i.flags,8)?[]:s;if(n||o){var g=n||i.styles.isPositioned()?t:A,u=new uc(l);if(i.styles.isPositioned()||i.styles.opacity<1||i.styles.isTransformed()){var p=i.styles.zIndex.order;if(p<0){var f=0;g.negativeZIndex.some(function(w,C){return p>w.element.container.styles.zIndex.order?(f=C,!1):f>0}),g.negativeZIndex.splice(f,0,u)}else if(p>0){var x=0;g.positiveZIndex.some(function(w,C){return p>=w.element.container.styles.zIndex.order?(x=C+1,!1):x>0}),g.positiveZIndex.splice(x,0,u)}else g.zeroOrAutoZIndexOrTransformedOrOpacity.push(u)}else i.styles.isFloating()?g.nonPositionedFloats.push(u):g.nonPositionedInlineLevel.push(u);Ji(l,u,n?u:t,c)}else i.styles.isInlineLevel()?A.inlineLevel.push(l):A.nonInlineLevel.push(l),Ji(l,A,t,c);ke(i.flags,8)&&pc(i,c)})},pc=function(e,A){for(var t=e instanceof _i?e.start:1,s=e instanceof _i?e.reversed:!1,i=0;i<A.length;i++){var n=A[i];n.container instanceof Jl&&typeof n.container.value=="number"&&n.container.value!==0&&(t=n.container.value),n.listValue=XA(t,n.container.styles.listStyleType,!0),t+=s?-1:1}},Tv=function(e){var A=new gc(e,null),t=new uc(A),s=[];return Ji(A,t,t,s),pc(A.container,s),t},Pr=function(e,A){switch(A){case 0:return st(e.topLeftBorderBox,e.topLeftPaddingBox,e.topRightBorderBox,e.topRightPaddingBox);case 1:return st(e.topRightBorderBox,e.topRightPaddingBox,e.bottomRightBorderBox,e.bottomRightPaddingBox);case 2:return st(e.bottomRightBorderBox,e.bottomRightPaddingBox,e.bottomLeftBorderBox,e.bottomLeftPaddingBox);case 3:default:return st(e.bottomLeftBorderBox,e.bottomLeftPaddingBox,e.topLeftBorderBox,e.topLeftPaddingBox)}},Dv=function(e,A){switch(A){case 0:return st(e.topLeftBorderBox,e.topLeftBorderDoubleOuterBox,e.topRightBorderBox,e.topRightBorderDoubleOuterBox);case 1:return st(e.topRightBorderBox,e.topRightBorderDoubleOuterBox,e.bottomRightBorderBox,e.bottomRightBorderDoubleOuterBox);case 2:return st(e.bottomRightBorderBox,e.bottomRightBorderDoubleOuterBox,e.bottomLeftBorderBox,e.bottomLeftBorderDoubleOuterBox);case 3:default:return st(e.bottomLeftBorderBox,e.bottomLeftBorderDoubleOuterBox,e.topLeftBorderBox,e.topLeftBorderDoubleOuterBox)}},Mv=function(e,A){switch(A){case 0:return st(e.topLeftBorderDoubleInnerBox,e.topLeftPaddingBox,e.topRightBorderDoubleInnerBox,e.topRightPaddingBox);case 1:return st(e.topRightBorderDoubleInnerBox,e.topRightPaddingBox,e.bottomRightBorderDoubleInnerBox,e.bottomRightPaddingBox);case 2:return st(e.bottomRightBorderDoubleInnerBox,e.bottomRightPaddingBox,e.bottomLeftBorderDoubleInnerBox,e.bottomLeftPaddingBox);case 3:default:return st(e.bottomLeftBorderDoubleInnerBox,e.bottomLeftPaddingBox,e.topLeftBorderDoubleInnerBox,e.topLeftPaddingBox)}},Kv=function(e,A){switch(A){case 0:return Ta(e.topLeftBorderStroke,e.topRightBorderStroke);case 1:return Ta(e.topRightBorderStroke,e.bottomRightBorderStroke);case 2:return Ta(e.bottomRightBorderStroke,e.bottomLeftBorderStroke);case 3:default:return Ta(e.bottomLeftBorderStroke,e.topLeftBorderStroke)}},Ta=function(e,A){var t=[];return At(e)?t.push(e.subdivide(.5,!1)):t.push(e),At(A)?t.push(A.subdivide(.5,!0)):t.push(A),t},st=function(e,A,t,s){var i=[];return At(e)?i.push(e.subdivide(.5,!1)):i.push(e),At(t)?i.push(t.subdivide(.5,!0)):i.push(t),At(s)?i.push(s.subdivide(.5,!0).reverse()):i.push(s),At(A)?i.push(A.subdivide(.5,!1).reverse()):i.push(A),i},mc=function(e){var A=e.bounds,t=e.styles;return A.add(t.borderLeftWidth,t.borderTopWidth,-(t.borderRightWidth+t.borderLeftWidth),-(t.borderTopWidth+t.borderBottomWidth))},rs=function(e){var A=e.styles,t=e.bounds,s=de(A.paddingLeft,t.width),i=de(A.paddingRight,t.width),n=de(A.paddingTop,t.width),o=de(A.paddingBottom,t.width);return t.add(s+A.borderLeftWidth,n+A.borderTopWidth,-(A.borderRightWidth+A.borderLeftWidth+s+i),-(A.borderTopWidth+A.borderBottomWidth+n+o))},Rv=function(e,A){return e===0?A.bounds:e===2?rs(A):mc(A)},zv=function(e,A){return e===0?A.bounds:e===2?rs(A):mc(A)},ui=function(e,A,t){var s=Rv(pA(e.styles.backgroundOrigin,A),e),i=zv(pA(e.styles.backgroundClip,A),e),n=Ov(pA(e.styles.backgroundSize,A),t,s),o=n[0],l=n[1],c=DA(pA(e.styles.backgroundPosition,A),s.width-o,s.height-l),g=Pv(pA(e.styles.backgroundRepeat,A),c,n,s,i),u=Math.round(s.left+c[0]),p=Math.round(s.top+c[1]);return[g,u,p,o,l]},cA=function(e){return le(e)&&e.value===fA.AUTO},Da=function(e){return typeof e=="number"},Ov=function(e,A,t){var s=A[0],i=A[1],n=A[2],o=e[0],l=e[1];if(!o)return[0,0];if(ye(o)&&l&&ye(l))return[de(o,t.width),de(l,t.height)];var c=Da(n);if(le(o)&&(o.value===fA.CONTAIN||o.value===fA.COVER)){if(Da(n)){var g=t.width/t.height;return g<n!=(o.value===fA.COVER)?[t.width,t.width/n]:[t.height*n,t.height]}return[t.width,t.height]}var u=Da(s),p=Da(i),f=u||p;if(cA(o)&&(!l||cA(l))){if(u&&p)return[s,i];if(!c&&!f)return[t.width,t.height];if(f&&c){var x=u?s:i*n,w=p?i:s/n;return[x,w]}var C=u?s:t.width,H=p?i:t.height;return[C,H]}if(c){var j=0,E=0;return ye(o)?j=de(o,t.width):ye(l)&&(E=de(l,t.height)),cA(o)?j=E*n:(!l||cA(l))&&(E=j/n),[j,E]}var V=null,T=null;if(ye(o)?V=de(o,t.width):l&&ye(l)&&(T=de(l,t.height)),V!==null&&(!l||cA(l))&&(T=u&&p?V/s*i:t.height),T!==null&&cA(o)&&(V=u&&p?T/i*s:t.width),V!==null&&T!==null)return[V,T];throw new Error("Unable to calculate background-size for element")},pA=function(e,A){var t=e[A];return typeof t>"u"?e[0]:t},Pv=function(e,A,t,s,i){var n=A[0],o=A[1],l=t[0],c=t[1];switch(e){case 2:return[new R(Math.round(s.left),Math.round(s.top+o)),new R(Math.round(s.left+s.width),Math.round(s.top+o)),new R(Math.round(s.left+s.width),Math.round(c+s.top+o)),new R(Math.round(s.left),Math.round(c+s.top+o))];case 3:return[new R(Math.round(s.left+n),Math.round(s.top)),new R(Math.round(s.left+n+l),Math.round(s.top)),new R(Math.round(s.left+n+l),Math.round(s.height+s.top)),new R(Math.round(s.left+n),Math.round(s.height+s.top))];case 1:return[new R(Math.round(s.left+n),Math.round(s.top+o)),new R(Math.round(s.left+n+l),Math.round(s.top+o)),new R(Math.round(s.left+n+l),Math.round(s.top+o+c)),new R(Math.round(s.left+n),Math.round(s.top+o+c))];default:return[new R(Math.round(i.left),Math.round(i.top)),new R(Math.round(i.left+i.width),Math.round(i.top)),new R(Math.round(i.left+i.width),Math.round(i.height+i.top)),new R(Math.round(i.left),Math.round(i.height+i.top))]}},Vv="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",Vr="Hidden Text",Gv=function(){function e(A){this._data={},this._document=A}return e.prototype.parseMetrics=function(A,t){var s=this._document.createElement("div"),i=this._document.createElement("img"),n=this._document.createElement("span"),o=this._document.body;s.style.visibility="hidden",s.style.fontFamily=A,s.style.fontSize=t,s.style.margin="0",s.style.padding="0",s.style.whiteSpace="nowrap",o.appendChild(s),i.src=Vv,i.width=1,i.height=1,i.style.margin="0",i.style.padding="0",i.style.verticalAlign="baseline",n.style.fontFamily=A,n.style.fontSize=t,n.style.margin="0",n.style.padding="0",n.appendChild(this._document.createTextNode(Vr)),s.appendChild(n),s.appendChild(i);var l=i.offsetTop-n.offsetTop+2;s.removeChild(n),s.appendChild(this._document.createTextNode(Vr)),s.style.lineHeight="normal",i.style.verticalAlign="super";var c=i.offsetTop-s.offsetTop+2;return o.removeChild(s),{baseline:l,middle:c}},e.prototype.getMetrics=function(A,t){var s=A+" "+t;return typeof this._data[s]>"u"&&(this._data[s]=this.parseMetrics(A,t)),this._data[s]},e}(),hc=function(){function e(A,t){this.context=A,this.options=t}return e}(),_v=1e4,qv=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i._activeEffects=[],i.canvas=s.canvas?s.canvas:document.createElement("canvas"),i.ctx=i.canvas.getContext("2d"),s.canvas||(i.canvas.width=Math.floor(s.width*s.scale),i.canvas.height=Math.floor(s.height*s.scale),i.canvas.style.width=s.width+"px",i.canvas.style.height=s.height+"px"),i.fontMetrics=new Gv(document),i.ctx.scale(i.options.scale,i.options.scale),i.ctx.translate(-s.x,-s.y),i.ctx.textBaseline="bottom",i._activeEffects=[],i.context.logger.debug("Canvas renderer initialized ("+s.width+"x"+s.height+") with scale "+s.scale),i}return A.prototype.applyEffects=function(t){for(var s=this;this._activeEffects.length;)this.popEffect();t.forEach(function(i){return s.applyEffect(i)})},A.prototype.applyEffect=function(t){this.ctx.save(),Lv(t)&&(this.ctx.globalAlpha=t.opacity),Hv(t)&&(this.ctx.translate(t.offsetX,t.offsetY),this.ctx.transform(t.matrix[0],t.matrix[1],t.matrix[2],t.matrix[3],t.matrix[4],t.matrix[5]),this.ctx.translate(-t.offsetX,-t.offsetY)),dc(t)&&(this.path(t.path),this.ctx.clip()),this._activeEffects.push(t)},A.prototype.popEffect=function(){this._activeEffects.pop(),this.ctx.restore()},A.prototype.renderStack=function(t){return Ve(this,void 0,void 0,function(){var s;return Me(this,function(i){switch(i.label){case 0:return s=t.element.container.styles,s.isVisible()?[4,this.renderStackContent(t)]:[3,2];case 1:i.sent(),i.label=2;case 2:return[2]}})})},A.prototype.renderNode=function(t){return Ve(this,void 0,void 0,function(){return Me(this,function(s){switch(s.label){case 0:if(ke(t.container.flags,16))debugger;return t.container.styles.isVisible()?[4,this.renderNodeBackgroundAndBorders(t)]:[3,3];case 1:return s.sent(),[4,this.renderNodeContent(t)];case 2:s.sent(),s.label=3;case 3:return[2]}})})},A.prototype.renderTextWithLetterSpacing=function(t,s,i){var n=this;if(s===0)this.ctx.fillText(t.text,t.bounds.left,t.bounds.top+i);else{var o=Fn(t.text);o.reduce(function(l,c){return n.ctx.fillText(c,l,t.bounds.top+i),l+n.ctx.measureText(c).width},t.bounds.left)}},A.prototype.createFontStyle=function(t){var s=t.fontVariant.filter(function(o){return o==="normal"||o==="small-caps"}).join(""),i=$v(t.fontFamily).join(", "),n=ra(t.fontSize)?""+t.fontSize.number+t.fontSize.unit:t.fontSize.number+"px";return[[t.fontStyle,s,t.fontWeight,n,i].join(" "),i,n]},A.prototype.renderTextNode=function(t,s){return Ve(this,void 0,void 0,function(){var i,n,o,l,c,g,u,p,f=this;return Me(this,function(x){return i=this.createFontStyle(s),n=i[0],o=i[1],l=i[2],this.ctx.font=n,this.ctx.direction=s.direction===1?"rtl":"ltr",this.ctx.textAlign="left",this.ctx.textBaseline="alphabetic",c=this.fontMetrics.getMetrics(o,l),g=c.baseline,u=c.middle,p=s.paintOrder,t.textBounds.forEach(function(w){p.forEach(function(C){switch(C){case 0:f.ctx.fillStyle=Ue(s.color),f.renderTextWithLetterSpacing(w,s.letterSpacing,g);var H=s.textShadow;H.length&&w.text.trim().length&&(H.slice(0).reverse().forEach(function(j){f.ctx.shadowColor=Ue(j.color),f.ctx.shadowOffsetX=j.offsetX.number*f.options.scale,f.ctx.shadowOffsetY=j.offsetY.number*f.options.scale,f.ctx.shadowBlur=j.blur.number,f.renderTextWithLetterSpacing(w,s.letterSpacing,g)}),f.ctx.shadowColor="",f.ctx.shadowOffsetX=0,f.ctx.shadowOffsetY=0,f.ctx.shadowBlur=0),s.textDecorationLine.length&&(f.ctx.fillStyle=Ue(s.textDecorationColor||s.color),s.textDecorationLine.forEach(function(j){switch(j){case 1:f.ctx.fillRect(w.bounds.left,Math.round(w.bounds.top+g),w.bounds.width,1);break;case 2:f.ctx.fillRect(w.bounds.left,Math.round(w.bounds.top),w.bounds.width,1);break;case 3:f.ctx.fillRect(w.bounds.left,Math.ceil(w.bounds.top+u),w.bounds.width,1);break}}));break;case 1:s.webkitTextStrokeWidth&&w.text.trim().length&&(f.ctx.strokeStyle=Ue(s.webkitTextStrokeColor),f.ctx.lineWidth=s.webkitTextStrokeWidth,f.ctx.lineJoin=window.chrome?"miter":"round",f.ctx.strokeText(w.text,w.bounds.left,w.bounds.top+g)),f.ctx.strokeStyle="",f.ctx.lineWidth=0,f.ctx.lineJoin="miter";break}})}),[2]})})},A.prototype.renderReplacedElement=function(t,s,i){if(i&&t.intrinsicWidth>0&&t.intrinsicHeight>0){var n=rs(t),o=ns(s);this.path(o),this.ctx.save(),this.ctx.clip(),this.ctx.drawImage(i,0,0,t.intrinsicWidth,t.intrinsicHeight,n.left,n.top,n.width,n.height),this.ctx.restore()}},A.prototype.renderNodeContent=function(t){return Ve(this,void 0,void 0,function(){var s,i,n,o,l,c,E,E,g,u,p,f,T,x,w,I,C,H,j,E,V,T,I;return Me(this,function(Q){switch(Q.label){case 0:this.applyEffects(t.getEffects(4)),s=t.container,i=t.curves,n=s.styles,o=0,l=s.textNodes,Q.label=1;case 1:return o<l.length?(c=l[o],[4,this.renderTextNode(c,n)]):[3,4];case 2:Q.sent(),Q.label=3;case 3:return o++,[3,1];case 4:if(!(s instanceof Wl))return[3,8];Q.label=5;case 5:return Q.trys.push([5,7,,8]),[4,this.context.cache.match(s.src)];case 6:return E=Q.sent(),this.renderReplacedElement(s,i,E),[3,8];case 7:return Q.sent(),this.context.logger.error("Error loading image "+s.src),[3,8];case 8:if(s instanceof Xl&&this.renderReplacedElement(s,i,s.canvas),!(s instanceof Yl))return[3,12];Q.label=9;case 9:return Q.trys.push([9,11,,12]),[4,this.context.cache.match(s.svg)];case 10:return E=Q.sent(),this.renderReplacedElement(s,i,E),[3,12];case 11:return Q.sent(),this.context.logger.error("Error loading svg "+s.svg.substring(0,255)),[3,12];case 12:return s instanceof ec&&s.tree?(g=new A(this.context,{scale:this.options.scale,backgroundColor:s.backgroundColor,x:0,y:0,width:s.width,height:s.height}),[4,g.render(s.tree)]):[3,14];case 13:u=Q.sent(),s.width&&s.height&&this.ctx.drawImage(u,0,0,s.width,s.height,s.bounds.left,s.bounds.top,s.bounds.width,s.bounds.height),Q.label=14;case 14:if(s instanceof kn&&(p=Math.min(s.bounds.width,s.bounds.height),s.type===ts?s.checked&&(this.ctx.save(),this.path([new R(s.bounds.left+p*.39363,s.bounds.top+p*.79),new R(s.bounds.left+p*.16,s.bounds.top+p*.5549),new R(s.bounds.left+p*.27347,s.bounds.top+p*.44071),new R(s.bounds.left+p*.39694,s.bounds.top+p*.5649),new R(s.bounds.left+p*.72983,s.bounds.top+p*.23),new R(s.bounds.left+p*.84,s.bounds.top+p*.34085),new R(s.bounds.left+p*.39363,s.bounds.top+p*.79)]),this.ctx.fillStyle=Ue(Ir),this.ctx.fill(),this.ctx.restore()):s.type===As&&s.checked&&(this.ctx.save(),this.ctx.beginPath(),this.ctx.arc(s.bounds.left+p/2,s.bounds.top+p/2,p/4,0,Math.PI*2,!0),this.ctx.fillStyle=Ue(Ir),this.ctx.fill(),this.ctx.restore())),Wv(s)&&s.value.length){switch(f=this.createFontStyle(n),T=f[0],x=f[1],w=this.fontMetrics.getMetrics(T,x).baseline,this.ctx.font=T,this.ctx.fillStyle=Ue(n.color),this.ctx.textBaseline="alphabetic",this.ctx.textAlign=Yv(s.styles.textAlign),I=rs(s),C=0,s.styles.textAlign){case 1:C+=I.width/2;break;case 2:C+=I.width;break}H=I.add(C,0,0,-I.height/2+1),this.ctx.save(),this.path([new R(I.left,I.top),new R(I.left+I.width,I.top),new R(I.left+I.width,I.top+I.height),new R(I.left,I.top+I.height)]),this.ctx.clip(),this.renderTextWithLetterSpacing(new PA(s.value,H),n.letterSpacing,w),this.ctx.restore(),this.ctx.textBaseline="alphabetic",this.ctx.textAlign="left"}if(!ke(s.styles.display,2048))return[3,20];if(s.styles.listStyleImage===null)return[3,19];if(j=s.styles.listStyleImage,j.type!==0)return[3,18];E=void 0,V=j.url,Q.label=15;case 15:return Q.trys.push([15,17,,18]),[4,this.context.cache.match(V)];case 16:return E=Q.sent(),this.ctx.drawImage(E,s.bounds.left-(E.width+10),s.bounds.top),[3,18];case 17:return Q.sent(),this.context.logger.error("Error loading list-style-image "+V),[3,18];case 18:return[3,20];case 19:t.listValue&&s.styles.listStyleType!==-1&&(T=this.createFontStyle(n)[0],this.ctx.font=T,this.ctx.fillStyle=Ue(n.color),this.ctx.textBaseline="middle",this.ctx.textAlign="right",I=new yt(s.bounds.left,s.bounds.top+de(s.styles.paddingTop,s.bounds.width),s.bounds.width,pr(n.lineHeight,n.fontSize.number)/2+1),this.renderTextWithLetterSpacing(new PA(t.listValue,I),n.letterSpacing,pr(n.lineHeight,n.fontSize.number)/2+2),this.ctx.textBaseline="bottom",this.ctx.textAlign="left"),Q.label=20;case 20:return[2]}})})},A.prototype.renderStackContent=function(t){return Ve(this,void 0,void 0,function(){var s,i,j,n,o,j,l,c,j,g,u,j,p,f,j,x,w,j,C,H,j;return Me(this,function(E){switch(E.label){case 0:if(ke(t.element.container.flags,16))debugger;return[4,this.renderNodeBackgroundAndBorders(t.element)];case 1:E.sent(),s=0,i=t.negativeZIndex,E.label=2;case 2:return s<i.length?(j=i[s],[4,this.renderStack(j)]):[3,5];case 3:E.sent(),E.label=4;case 4:return s++,[3,2];case 5:return[4,this.renderNodeContent(t.element)];case 6:E.sent(),n=0,o=t.nonInlineLevel,E.label=7;case 7:return n<o.length?(j=o[n],[4,this.renderNode(j)]):[3,10];case 8:E.sent(),E.label=9;case 9:return n++,[3,7];case 10:l=0,c=t.nonPositionedFloats,E.label=11;case 11:return l<c.length?(j=c[l],[4,this.renderStack(j)]):[3,14];case 12:E.sent(),E.label=13;case 13:return l++,[3,11];case 14:g=0,u=t.nonPositionedInlineLevel,E.label=15;case 15:return g<u.length?(j=u[g],[4,this.renderStack(j)]):[3,18];case 16:E.sent(),E.label=17;case 17:return g++,[3,15];case 18:p=0,f=t.inlineLevel,E.label=19;case 19:return p<f.length?(j=f[p],[4,this.renderNode(j)]):[3,22];case 20:E.sent(),E.label=21;case 21:return p++,[3,19];case 22:x=0,w=t.zeroOrAutoZIndexOrTransformedOrOpacity,E.label=23;case 23:return x<w.length?(j=w[x],[4,this.renderStack(j)]):[3,26];case 24:E.sent(),E.label=25;case 25:return x++,[3,23];case 26:C=0,H=t.positiveZIndex,E.label=27;case 27:return C<H.length?(j=H[C],[4,this.renderStack(j)]):[3,30];case 28:E.sent(),E.label=29;case 29:return C++,[3,27];case 30:return[2]}})})},A.prototype.mask=function(t){this.ctx.beginPath(),this.ctx.moveTo(0,0),this.ctx.lineTo(this.canvas.width,0),this.ctx.lineTo(this.canvas.width,this.canvas.height),this.ctx.lineTo(0,this.canvas.height),this.ctx.lineTo(0,0),this.formatPath(t.slice(0).reverse()),this.ctx.closePath()},A.prototype.path=function(t){this.ctx.beginPath(),this.formatPath(t),this.ctx.closePath()},A.prototype.formatPath=function(t){var s=this;t.forEach(function(i,n){var o=At(i)?i.start:i;n===0?s.ctx.moveTo(o.x,o.y):s.ctx.lineTo(o.x,o.y),At(i)&&s.ctx.bezierCurveTo(i.startControl.x,i.startControl.y,i.endControl.x,i.endControl.y,i.end.x,i.end.y)})},A.prototype.renderRepeat=function(t,s,i,n){this.path(t),this.ctx.fillStyle=s,this.ctx.translate(i,n),this.ctx.fill(),this.ctx.translate(-i,-n)},A.prototype.resizeImage=function(t,s,i){var n;if(t.width===s&&t.height===i)return t;var o=(n=this.canvas.ownerDocument)!==null&&n!==void 0?n:document,l=o.createElement("canvas");l.width=Math.max(1,s),l.height=Math.max(1,i);var c=l.getContext("2d");return c.drawImage(t,0,0,t.width,t.height,0,0,s,i),l},A.prototype.renderBackgroundImage=function(t){return Ve(this,void 0,void 0,function(){var s,i,n,o,l,c;return Me(this,function(g){switch(g.label){case 0:s=t.styles.backgroundImage.length-1,i=function(u){var p,f,x,$,N,M,m,b,_,w,$,N,M,m,b,C,H,j,E,V,T,I,Q,P,_,z,$,S,F,m,b,y,N,M,W,Y,ie,Ze,Vt,ht,Gt,ft;return Me(this,function(aA){switch(aA.label){case 0:if(u.type!==0)return[3,5];p=void 0,f=u.url,aA.label=1;case 1:return aA.trys.push([1,3,,4]),[4,n.context.cache.match(f)];case 2:return p=aA.sent(),[3,4];case 3:return aA.sent(),n.context.logger.error("Error loading background-image "+f),[3,4];case 4:return p&&(x=ui(t,s,[p.width,p.height,p.width/p.height]),$=x[0],N=x[1],M=x[2],m=x[3],b=x[4],_=n.ctx.createPattern(n.resizeImage(p,m,b),"repeat"),n.renderRepeat($,_,N,M)),[3,6];case 5:Hb(u)?(w=ui(t,s,[null,null,null]),$=w[0],N=w[1],M=w[2],m=w[3],b=w[4],C=Ub(u.angle,m,b),H=C[0],j=C[1],E=C[2],V=C[3],T=C[4],I=document.createElement("canvas"),I.width=m,I.height=b,Q=I.getContext("2d"),P=Q.createLinearGradient(j,V,E,T),ur(u.stops,H).forEach(function(FA){return P.addColorStop(FA.stop,Ue(FA.color))}),Q.fillStyle=P,Q.fillRect(0,0,m,b),m>0&&b>0&&(_=n.ctx.createPattern(I,"repeat"),n.renderRepeat($,_,N,M))):Lb(u)&&(z=ui(t,s,[null,null,null]),$=z[0],S=z[1],F=z[2],m=z[3],b=z[4],y=u.position.length===0?[Cn]:u.position,N=de(y[0],m),M=de(y[y.length-1],b),W=jb(u,N,M,m,b),Y=W[0],ie=W[1],Y>0&&ie>0&&(Ze=n.ctx.createRadialGradient(S+N,F+M,0,S+N,F+M,Y),ur(u.stops,Y*2).forEach(function(FA){return Ze.addColorStop(FA.stop,Ue(FA.color))}),n.path($),n.ctx.fillStyle=Ze,Y!==ie?(Vt=t.bounds.left+.5*t.bounds.width,ht=t.bounds.top+.5*t.bounds.height,Gt=ie/Y,ft=1/Gt,n.ctx.save(),n.ctx.translate(Vt,ht),n.ctx.transform(1,0,0,Gt,0,0),n.ctx.translate(-Vt,-ht),n.ctx.fillRect(S,ft*(F-ht)+ht,m,b*ft),n.ctx.restore()):n.ctx.fill())),aA.label=6;case 6:return s--,[2]}})},n=this,o=0,l=t.styles.backgroundImage.slice(0).reverse(),g.label=1;case 1:return o<l.length?(c=l[o],[5,i(c)]):[3,4];case 2:g.sent(),g.label=3;case 3:return o++,[3,1];case 4:return[2]}})})},A.prototype.renderSolidBorder=function(t,s,i){return Ve(this,void 0,void 0,function(){return Me(this,function(n){return this.path(Pr(i,s)),this.ctx.fillStyle=Ue(t),this.ctx.fill(),[2]})})},A.prototype.renderDoubleBorder=function(t,s,i,n){return Ve(this,void 0,void 0,function(){var o,l;return Me(this,function(c){switch(c.label){case 0:return s<3?[4,this.renderSolidBorder(t,i,n)]:[3,2];case 1:return c.sent(),[2];case 2:return o=Dv(n,i),this.path(o),this.ctx.fillStyle=Ue(t),this.ctx.fill(),l=Mv(n,i),this.path(l),this.ctx.fill(),[2]}})})},A.prototype.renderNodeBackgroundAndBorders=function(t){return Ve(this,void 0,void 0,function(){var s,i,n,o,l,c,g,u,p=this;return Me(this,function(f){switch(f.label){case 0:return this.applyEffects(t.getEffects(2)),s=t.container.styles,i=!Mt(s.backgroundColor)||s.backgroundImage.length,n=[{style:s.borderTopStyle,color:s.borderTopColor,width:s.borderTopWidth},{style:s.borderRightStyle,color:s.borderRightColor,width:s.borderRightWidth},{style:s.borderBottomStyle,color:s.borderBottomColor,width:s.borderBottomWidth},{style:s.borderLeftStyle,color:s.borderLeftColor,width:s.borderLeftWidth}],o=Xv(pA(s.backgroundClip,0),t.curves),i||s.boxShadow.length?(this.ctx.save(),this.path(o),this.ctx.clip(),Mt(s.backgroundColor)||(this.ctx.fillStyle=Ue(s.backgroundColor),this.ctx.fill()),[4,this.renderBackgroundImage(t.container)]):[3,2];case 1:f.sent(),this.ctx.restore(),s.boxShadow.slice(0).reverse().forEach(function(x){p.ctx.save();var w=is(t.curves),C=x.inset?0:_v,H=Nv(w,-C+(x.inset?1:-1)*x.spread.number,(x.inset?1:-1)*x.spread.number,x.spread.number*(x.inset?-2:2),x.spread.number*(x.inset?-2:2));x.inset?(p.path(w),p.ctx.clip(),p.mask(H)):(p.mask(w),p.ctx.clip(),p.path(H)),p.ctx.shadowOffsetX=x.offsetX.number+C,p.ctx.shadowOffsetY=x.offsetY.number,p.ctx.shadowColor=Ue(x.color),p.ctx.shadowBlur=x.blur.number,p.ctx.fillStyle=x.inset?Ue(x.color):"rgba(0,0,0,1)",p.ctx.fill(),p.ctx.restore()}),f.label=2;case 2:l=0,c=0,g=n,f.label=3;case 3:return c<g.length?(u=g[c],u.style!==0&&!Mt(u.color)&&u.width>0?u.style!==2?[3,5]:[4,this.renderDashedDottedBorder(u.color,u.width,l,t.curves,2)]:[3,11]):[3,13];case 4:return f.sent(),[3,11];case 5:return u.style!==3?[3,7]:[4,this.renderDashedDottedBorder(u.color,u.width,l,t.curves,3)];case 6:return f.sent(),[3,11];case 7:return u.style!==4?[3,9]:[4,this.renderDoubleBorder(u.color,u.width,l,t.curves)];case 8:return f.sent(),[3,11];case 9:return[4,this.renderSolidBorder(u.color,l,t.curves)];case 10:f.sent(),f.label=11;case 11:l++,f.label=12;case 12:return c++,[3,3];case 13:return[2]}})})},A.prototype.renderDashedDottedBorder=function(t,s,i,n,o){return Ve(this,void 0,void 0,function(){var l,c,g,u,p,f,x,w,C,H,j,E,V,T,I,Q,I,Q;return Me(this,function(P){return this.ctx.save(),l=Kv(n,i),c=Pr(n,i),o===2&&(this.path(c),this.ctx.clip()),At(c[0])?(g=c[0].start.x,u=c[0].start.y):(g=c[0].x,u=c[0].y),At(c[1])?(p=c[1].end.x,f=c[1].end.y):(p=c[1].x,f=c[1].y),i===0||i===2?x=Math.abs(g-p):x=Math.abs(u-f),this.ctx.beginPath(),o===3?this.formatPath(l):this.formatPath(c.slice(0,2)),w=s<3?s*3:s*2,C=s<3?s*2:s,o===3&&(w=s,C=s),H=!0,x<=w*2?H=!1:x<=w*2+C?(j=x/(2*w+C),w*=j,C*=j):(E=Math.floor((x+C)/(w+C)),V=(x-E*w)/(E-1),T=(x-(E+1)*w)/E,C=T<=0||Math.abs(C-V)<Math.abs(C-T)?V:T),H&&(o===3?this.ctx.setLineDash([0,w+C]):this.ctx.setLineDash([w,C])),o===3?(this.ctx.lineCap="round",this.ctx.lineWidth=s):this.ctx.lineWidth=s*2+1.1,this.ctx.strokeStyle=Ue(t),this.ctx.stroke(),this.ctx.setLineDash([]),o===2&&(At(c[0])&&(I=c[3],Q=c[0],this.ctx.beginPath(),this.formatPath([new R(I.end.x,I.end.y),new R(Q.start.x,Q.start.y)]),this.ctx.stroke()),At(c[1])&&(I=c[1],Q=c[2],this.ctx.beginPath(),this.formatPath([new R(I.end.x,I.end.y),new R(Q.start.x,Q.start.y)]),this.ctx.stroke())),this.ctx.restore(),[2]})})},A.prototype.render=function(t){return Ve(this,void 0,void 0,function(){var s;return Me(this,function(i){switch(i.label){case 0:return this.options.backgroundColor&&(this.ctx.fillStyle=Ue(this.options.backgroundColor),this.ctx.fillRect(this.options.x,this.options.y,this.options.width,this.options.height)),s=Tv(t),[4,this.renderStack(s)];case 1:return i.sent(),this.applyEffects([]),[2,this.canvas]}})})},A}(hc),Wv=function(e){return e instanceof Zl||e instanceof $l?!0:e instanceof kn&&e.type!==As&&e.type!==ts},Xv=function(e,A){switch(e){case 0:return is(A);case 2:return Ev(A);case 1:default:return ns(A)}},Yv=function(e){switch(e){case 1:return"center";case 2:return"right";case 0:default:return"left"}},Jv=["-apple-system","system-ui"],$v=function(e){return/iPhone OS 15_(0|1)/.test(window.navigator.userAgent)?e.filter(function(A){return Jv.indexOf(A)===-1}):e},Zv=function(e){lt(A,e);function A(t,s){var i=e.call(this,t,s)||this;return i.canvas=s.canvas?s.canvas:document.createElement("canvas"),i.ctx=i.canvas.getContext("2d"),i.options=s,i.canvas.width=Math.floor(s.width*s.scale),i.canvas.height=Math.floor(s.height*s.scale),i.canvas.style.width=s.width+"px",i.canvas.style.height=s.height+"px",i.ctx.scale(i.options.scale,i.options.scale),i.ctx.translate(-s.x,-s.y),i.context.logger.debug("EXPERIMENTAL ForeignObject renderer initialized ("+s.width+"x"+s.height+" at "+s.x+","+s.y+") with scale "+s.scale),i}return A.prototype.render=function(t){return Ve(this,void 0,void 0,function(){var s,i;return Me(this,function(n){switch(n.label){case 0:return s=Gi(this.options.width*this.options.scale,this.options.height*this.options.scale,this.options.scale,this.options.scale,t),[4,eC(s)];case 1:return i=n.sent(),this.options.backgroundColor&&(this.ctx.fillStyle=Ue(this.options.backgroundColor),this.ctx.fillRect(0,0,this.options.width*this.options.scale,this.options.height*this.options.scale)),this.ctx.drawImage(i,-this.options.x*this.options.scale,-this.options.y*this.options.scale),[2,this.canvas]}})})},A}(hc),eC=function(e){return new Promise(function(A,t){var s=new Image;s.onload=function(){A(s)},s.onerror=t,s.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(e))})},tC=function(){function e(A){var t=A.id,s=A.enabled;this.id=t,this.enabled=s,this.start=Date.now()}return e.prototype.debug=function(){for(var A=[],t=0;t<arguments.length;t++)A[t]=arguments[t];this.enabled&&(typeof window<"u"&&window.console&&typeof console.debug=="function"?console.debug.apply(console,ma([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},e.prototype.getTime=function(){return Date.now()-this.start},e.prototype.info=function(){for(var A=[],t=0;t<arguments.length;t++)A[t]=arguments[t];this.enabled&&typeof window<"u"&&window.console&&typeof console.info=="function"&&console.info.apply(console,ma([this.id,this.getTime()+"ms"],A))},e.prototype.warn=function(){for(var A=[],t=0;t<arguments.length;t++)A[t]=arguments[t];this.enabled&&(typeof window<"u"&&window.console&&typeof console.warn=="function"?console.warn.apply(console,ma([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},e.prototype.error=function(){for(var A=[],t=0;t<arguments.length;t++)A[t]=arguments[t];this.enabled&&(typeof window<"u"&&window.console&&typeof console.error=="function"?console.error.apply(console,ma([this.id,this.getTime()+"ms"],A)):this.info.apply(this,A))},e.instances={},e}(),AC=function(){function e(A,t){var s;this.windowBounds=t,this.instanceName="#"+e.instanceCount++,this.logger=new tC({id:this.instanceName,enabled:A.logging}),this.cache=(s=A.cache)!==null&&s!==void 0?s:new vv(this,A)}return e.instanceCount=1,e}(),aC=function(e,A){return A===void 0&&(A={}),sC(e,A)};typeof window<"u"&&cc.setContext(window);var sC=function(e,A){return Ve(void 0,void 0,void 0,function(){var t,s,i,n,o,l,c,g,u,p,f,x,w,C,H,j,E,V,T,I,P,Q,P,_,z,$,S,F,m,b,y,N,M,W,Y,ie,Ze,Vt,ht,Gt;return Me(this,function(ft){switch(ft.label){case 0:if(!e||typeof e!="object")return[2,Promise.reject("Invalid element provided as first argument")];if(t=e.ownerDocument,!t)throw new Error("Element is not attached to a Document");if(s=t.defaultView,!s)throw new Error("Document is not attached to a Window");return i={allowTaint:(_=A.allowTaint)!==null&&_!==void 0?_:!1,imageTimeout:(z=A.imageTimeout)!==null&&z!==void 0?z:15e3,proxy:A.proxy,useCORS:($=A.useCORS)!==null&&$!==void 0?$:!1},n=Ei({logging:(S=A.logging)!==null&&S!==void 0?S:!0,cache:A.cache},i),o={windowWidth:(F=A.windowWidth)!==null&&F!==void 0?F:s.innerWidth,windowHeight:(m=A.windowHeight)!==null&&m!==void 0?m:s.innerHeight,scrollX:(b=A.scrollX)!==null&&b!==void 0?b:s.pageXOffset,scrollY:(y=A.scrollY)!==null&&y!==void 0?y:s.pageYOffset},l=new yt(o.scrollX,o.scrollY,o.windowWidth,o.windowHeight),c=new AC(n,l),g=(N=A.foreignObjectRendering)!==null&&N!==void 0?N:!1,u={allowTaint:(M=A.allowTaint)!==null&&M!==void 0?M:!1,onclone:A.onclone,ignoreElements:A.ignoreElements,inlineImages:g,copyStyles:g},c.logger.debug("Starting document clone with size "+l.width+"x"+l.height+" scrolled to "+-l.left+","+-l.top),p=new Rr(c,e,u),f=p.clonedReferenceElement,f?[4,p.toIFrame(t,l)]:[2,Promise.reject("Unable to find element in cloned iframe")];case 1:return x=ft.sent(),w=Un(f)||iv(f)?Nx(f.ownerDocument):Qs(c,f),C=w.width,H=w.height,j=w.left,E=w.top,V=iC(c,f,A.backgroundColor),T={canvas:A.canvas,backgroundColor:V,scale:(Y=(W=A.scale)!==null&&W!==void 0?W:s.devicePixelRatio)!==null&&Y!==void 0?Y:1,x:((ie=A.x)!==null&&ie!==void 0?ie:0)+j,y:((Ze=A.y)!==null&&Ze!==void 0?Ze:0)+E,width:(Vt=A.width)!==null&&Vt!==void 0?Vt:Math.ceil(C),height:(ht=A.height)!==null&&ht!==void 0?ht:Math.ceil(H)},g?(c.logger.debug("Document cloned, using foreign object rendering"),P=new Zv(c,T),[4,P.render(f)]):[3,3];case 2:return I=ft.sent(),[3,5];case 3:return c.logger.debug("Document cloned, element located at "+j+","+E+" with size "+C+"x"+H+" using computed rendering"),c.logger.debug("Starting DOM parsing"),Q=Ac(c,f),V===Q.styles.backgroundColor&&(Q.styles.backgroundColor=Bt.TRANSPARENT),c.logger.debug("Starting renderer for element at "+T.x+","+T.y+" with size "+T.width+"x"+T.height),P=new qv(c,T),[4,P.render(Q)];case 4:I=ft.sent(),ft.label=5;case 5:return(!((Gt=A.removeContainer)!==null&&Gt!==void 0)||Gt)&&(Rr.destroy(x)||c.logger.error("Cannot detach cloned iframe as it is not in the DOM anymore")),c.logger.debug("Finished rendering"),[2,I]}})})},iC=function(e,A,t){var s=A.ownerDocument,i=s.documentElement?zA(e,getComputedStyle(s.documentElement).backgroundColor):Bt.TRANSPARENT,n=s.body?zA(e,getComputedStyle(s.body).backgroundColor):Bt.TRANSPARENT,o=typeof t=="string"?zA(e,t):t===null?Bt.TRANSPARENT:4294967295;return A===s.documentElement?Mt(i)?Mt(n)?o:n:i:o};class nC extends $e{constructor(t,s){super(t);r(this,"displayName",v("Changed font family"));r(this,"changes",{new:{family:""},old:{family:""}});this.changes.new=s,this.changes.old={family:B().getEditorWindow().getComputedStyle(t).fontFamily}}executeMutation(t){const s=this.findEl(t);return s?(Gr(s,this.changes.new),sd([this.changes.new],{id:Z(s)||Je(),document:t,weights:[400,500,600,700]}),!0):!1}undoMutation(t){const s=this.findEl(t);return s?(Gr(s,this.changes.old),!0):!1}}function Gr(e,A){e.style.fontFamily=A.family,A.google?e.dataset.fontType="google":delete e.dataset.fontType,A.category?e.dataset.fontCategory=A.category:delete e.dataset.fontCategory}function fc(){[B().getEditorDoc(),B().getActivePageDoc()].forEach(A=>{const t=new Set;A&&(A.querySelectorAll('[data-font-type="google"]').forEach(s=>{const i=s.style.fontFamily.replace(/['"]/g,"");t.add(i)}),A.head.querySelectorAll('[id^="be-fonts-"]').forEach(s=>{const i=s.href,n=/family=([^:]+)/,o=i.match(n);if(o&&o[1]){const l=decodeURIComponent(o[1]);t.has(l)||s.remove()}}))})}function AA(e){const{projectId:A}=en();return We({mutationFn:t=>rC(A,t,e),onSuccess:t=>{B().updateProject(t.project),G().setIsDirty(!1)},onError:t=>ro(t)})}async function rC(e,A,t){fc();const s=B().project,i={name:s.model.name,css:s.css,js:s.js,loader:"editor",...A,pages:s.pages.map(n=>({name:n.name,html:n.doc?n.doc.documentElement.outerHTML:n.html}))};return t!=null&&t.updateThumbnail&&await oC(e),Pe.put(`projects/${e}`,i).then(n=>n.data)}async function oC(e){const A=B().getEditorDoc(),t=A.documentElement.getBoundingClientRect(),s=await aC(A.documentElement,{height:t.height,width:t.width});return Pe.post(`projects/${e}/generate-thumbnail`,{dataUrl:s.toDataURL("image/png")}).then(i=>i.data)}function lC(){const e=J(A=>A.selectedBreakpoint);return a.jsxs($A,{placement:"top",selectionMode:"single",selectedValue:e,onSelectionChange:A=>{B().setSelectedBreakpoint(A)},children:[a.jsx(ee,{variant:"outline",size:null,className:"h-full flex-auto",border:"border-r",radius:"rounded-none",children:a.jsx(cC,{value:e})}),a.jsxs(ZA,{children:[a.jsx(k,{value:dt.mobile,startIcon:a.jsx(mn,{}),description:a.jsx(d,{message:":size and smaller",values:{size:"768px"}}),children:a.jsx(d,{message:"Mobile portrait"})}),a.jsx(k,{value:dt.tablet,startIcon:a.jsx(un,{}),description:a.jsx(d,{message:":size and smaller",values:{size:"992px"}}),children:a.jsx(d,{message:"Tablet portrait"})}),a.jsx(k,{value:dt.laptop,startIcon:a.jsx(gn,{}),description:a.jsx(d,{message:":size and smaller",values:{size:"1200px"}}),children:a.jsx(d,{message:"Small desktop"})}),a.jsx(k,{value:dt.desktop,startIcon:a.jsx(hn,{}),description:a.jsx(d,{message:":size and bigger",values:{size:"1201px"}}),children:a.jsx(d,{message:"Large desktop"})})]})]})}function cC({value:e}){switch(e){case dt.mobile:return a.jsx(mn,{});case dt.tablet:return a.jsx(un,{});case dt.laptop:return a.jsx(gn,{});case dt.desktop:return a.jsx(hn,{});default:return a.jsx(id,{})}}function dC({project:e}){const A=Ct(s=>s.canUndo),t=Ct(s=>s.canRedo);return a.jsxs("div",{className:"relative z-10 flex h-40 flex-shrink-0 items-center justify-between border-t text-muted",children:[a.jsx(gi,{label:a.jsx(d,{message:"Undo"}),onClick:()=>G().undo(),disabled:!A,children:a.jsx(Sd,{})}),a.jsx(gi,{label:a.jsx(d,{message:"Redo"}),onClick:()=>G().redo(),disabled:!t,children:a.jsx(Hd,{})}),a.jsx(lC,{}),a.jsx(gi,{label:a.jsx(d,{message:"Preview"}),elementType:BA,to:qd(e),target:"_blank",children:a.jsx(xo,{})}),a.jsx(uC,{})]})}function uC(){const e=AA({updateThumbnail:!0}),A=Ct(s=>s.isDirty),t=()=>e.isPending?a.jsx(d,{message:"Saving..."}):A?a.jsx(d,{message:"Save"}):a.jsx(d,{message:"Auto-save on"});return a.jsx(U,{variant:"flat",color:"primary",className:"min-h-full min-w-90",size:"xs",radius:"rounded-none",disabled:e.isPending||!A,onClick:()=>{e.mutate(void 0,{onSuccess:()=>K(v("Project saved"))})},children:t()})}function gi({children:e,label:A,...t}){return a.jsx(ea,{label:A,children:a.jsx(ee,{variant:"outline",size:null,className:"h-full flex-auto",border:"border-r",radius:"rounded-none",...t,children:e})})}function Va(e){return e.documentElement?e.documentElement.scrollTop||e.body.scrollTop:0}function oa(e){var n;if(B().dragState||B().isResizing)return;const A=typeof e=="object"?gC(e.pageX,e.pageY):Ee(e,B().getEditorDoc()),t=He().sessionIsActive&&((n=B().selectedContext)==null?void 0:n.nodeId)===Z(A),s=B().hoveredContext;if(s!=null&&s.isVisible&&(s==null?void 0:s.node)===A)return;const i=nt.match(A);i&&(B().setHoveredContext({...i,isVisible:!t,nodeId:Z(A)}),Oe.reposition(i))}function gC(e,A){return B().getEditorDoc().elementFromPoint(e,A-Va(B().getEditorDoc()))}const xc=""+new URL("website-builder-5c361936.svg",import.meta.url).href;function bc({value:e,onChange:A,disabled:t,name:s,height:i="h-30"}){return a.jsxs(Qe,{selectionMode:"single",size:"sm",selectedValue:e,onSelectionChange:n=>A(n),unstyled:!0,hideCaret:!0,inputClassName:X("border-r px-6 border-y focus-visible:ring rounded-r-input focus-visible:outline-none",i),floatingWidth:"auto",className:"text-[10px] text-muted",disabled:t,children:[a.jsx(k,{value:"px",children:"PX"}),s!=="borderWidth"&&a.jsx(k,{value:"%",children:"%"}),a.jsx(k,{value:"ch",children:"CH"}),a.jsx(k,{value:"em",children:"EM"}),a.jsx(k,{value:"rem",children:"REM"}),(s==="width"||s==="height")&&a.jsxs(h.Fragment,{children:[a.jsx(k,{value:"vw",children:"VW"}),a.jsx(k,{value:"vh",children:"VH"}),a.jsx(k,{value:"dvw",children:"DVW"}),a.jsx(k,{value:"dvh",children:"DVH"})]})]})}function pC({state:e}){return e.name==="borderRadius"?a.jsx(hC,{state:e}):a.jsx(mC,{state:e})}function mC({state:e}){return a.jsxs("div",{className:"grid grid-cols-3 gap-x-8 gap-y-14",children:[a.jsx("div",{}),a.jsx(Tt,{index:0,state:e}),a.jsx("div",{}),a.jsx(Tt,{index:1,state:e}),a.jsx(wc,{state:e}),a.jsx(Tt,{index:2,state:e}),a.jsx("div",{}),a.jsx(Tt,{index:3,state:e}),a.jsx("div",{})]})}function hC({state:e}){return a.jsxs("div",{className:"grid grid-cols-3 gap-x-8",children:[a.jsx(Tt,{index:0,state:e}),a.jsx("div",{}),a.jsx(Tt,{index:1,state:e}),a.jsx("div",{}),a.jsx(wc,{state:e}),a.jsx("div",{}),a.jsx(Tt,{index:2,state:e}),a.jsx("div",{}),a.jsx(Tt,{index:3,state:e})]})}function wc({state:e}){return a.jsx(ea,{label:e.isConnected?a.jsx(d,{message:"Unlink values"}):a.jsx(d,{message:"Link values together"}),children:a.jsx(ee,{className:"mx-auto",size:"sm",iconSize:"md",onClick:()=>{e.setIsConnected(!e.isConnected)},children:e.isConnected?a.jsx(zt,{}):a.jsx(Fo,{})})})}function Tt({index:e,state:A}){const t=a.jsx(bc,{value:A.value[e][1],onChange:s=>{A.setSingleUnit(e,s,{lastInSession:!0})},name:A.name,disabled:!A.enabledValues.includes(e)});return a.jsx(q,{inputClassName:"min-w-50",size:"xs",endAppend:t,pattern:"[0-9]{1,5}",value:A.value[e][0],onChange:s=>{A.setSingleValue(e,s.target.value,{partOfSession:!0})},onBlur:s=>{A.setSingleValue(e,s.target.value,{lastInSession:!0})},disabled:!A.enabledValues.includes(e)})}const fC={0:["topLeft","topRight"],1:["rightTop","rightBottom"],2:["bottomLeft","bottomRight"],3:["leftTop","leftBottom"]},xC={0:["leftTop","topLeft"],1:["topRight","rightTop"],2:["rightBottom","bottomRight"],3:["bottomLeft","leftBottom"]},bC={topLeft:wC,topRight:BC,rightTop:vC,rightBottom:CC,bottomLeft:yC,bottomRight:QC,leftTop:FC,leftBottom:kC};function SA({valueIndex:e,state:A,className:t}){const s=e==="all"?A.enabledValues.length===4:A.enabledValues.includes(e),i=A.name==="borderRadius"?xC:fC;return a.jsxs("label",{className:X("relative isolate block h-24 w-24 flex-shrink-0",t),children:[a.jsx("input",{className:"absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none",type:"checkbox",checked:s,onChange:n=>e==="all"?A.toggleAllValues(n.target.checked):A.toggleValue(e,n.target.checked)}),a.jsx("div",{className:"pointer-events-none relative h-full w-full",children:Object.entries(bC).map(([n,o])=>a.jsx(o,{isChecked:s,isVisible:e==="all"||i[e].includes(n)},n))})]})}function wC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute left-0 top-0 w-1/2",A?"h-2":"h-1",e&&A?"bg-primary":"bg-chip")})}function BC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute right-0 top-0 w-1/2",A?"h-2":"h-1",e&&A?"bg-primary":"bg-chip")})}function vC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute right-0 top-0 h-1/2",A?"w-2":"w-1",e&&A?"bg-primary":"bg-chip")})}function CC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute bottom-0 right-0 h-1/2",A?"w-2":"w-1",e&&A?"bg-primary":"bg-chip")})}function yC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute bottom-0 left-0 w-1/2",A?"h-2":"h-1",e&&A?"bg-primary":"bg-chip")})}function QC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute bottom-0 right-0 w-1/2",A?"h-2":"h-1",e&&A?"bg-primary":"bg-chip")})}function FC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute left-0 top-0 h-1/2",A?"w-2":"w-1",e&&A?"bg-primary":"bg-chip")})}function kC({isChecked:e,isVisible:A}){return a.jsx("div",{className:X("absolute bottom-0 left-0 h-1/2",A?"w-2":"w-1",e&&A?"bg-primary":"bg-chip")})}function Ns({state:e,children:A}){return a.jsxs("div",{children:[a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx(SA,{className:"mr-auto",valueIndex:"all",state:e}),a.jsx(SA,{valueIndex:0,state:e}),a.jsx(SA,{valueIndex:1,state:e}),a.jsx(SA,{valueIndex:2,state:e}),a.jsx(SA,{valueIndex:3,state:e})]}),a.jsx(UC,{state:e}),A&&a.jsx("div",{className:"mb-20",children:A}),a.jsx(pC,{state:e})]})}function UC({state:e}){const A=e.enabledValues[0];return a.jsx(mA,{size:"sm",trackColor:"neutral",showThumbOnHoverOnly:!1,thumbSize:"h-14 w-14",className:"mb-8",minValue:0,maxValue:100,value:e.isConnected&&A!=null?e.value[A][0]:1,onChange:t=>e.setConnectedValue(t,{partOfSession:!0}),onChangeEnd:t=>{e.setConnectedValue(t,{lastInSession:!0})},isDisabled:!e.isConnected||e.enabledValues.length===0})}function Ts({name:e,onMutate:A}){const t=nd(A),s=Ce(C=>C.currentConfig[e]),[i,n]=h.useState(!0),[o,l]=h.useState([0,1,2,3]),c=h.useCallback((C,H)=>{l(H?j=>[...j,C]:j=>j.filter(E=>E!==C))},[]),g=h.useCallback(C=>{l(C?[0,1,2,3]:[])},[]),u=h.useCallback((C,H)=>{var T;const j=ae().currentConfig[e],E=C(j).map(([I,Q],P)=>(o.includes(P)||(I=j[P][0],Q=j[P][1]),[Wo(I),Q]));ae().setValue(e,E);const V=(T=B().selectedContext)==null?void 0:T.node;if(V){const I=Ga(E);t(I,V,H)}},[t,o,e]),p=h.useCallback((C,H)=>{u(j=>j.map(([,E])=>[C,E]),H)},[u]),f=h.useCallback((C,H)=>{u(j=>j.map(([E])=>[E,C]),H)},[u]),x=h.useCallback((C,H,j)=>{i?p(H,j):u(E=>E.map((V,T)=>T===C?[H,V[1]]:V),j)},[i,p,u]),w=h.useCallback((C,H,j)=>{i?f(H,j):u(E=>E.map((V,T)=>T===C?[V[0],H]:V),j)},[i,f,u]);return{name:e,value:s,setConnectedValue:p,isConnected:i,setIsConnected:n,setSingleValue:x,setConnectedUnit:f,setSingleUnit:w,enabledValues:o,toggleValue:c,toggleAllValues:g}}function Ga(e){return e.map(([A,t])=>`${A||0}${t}`).join(" ")}const jC={backgroundRepeat:"repeat",backgroundPosition:"0% 0%",backgroundColor:"rgba(0, 0, 0, 0)",backgroundAttachment:"scroll",backgroundSize:"auto",backgroundImage:"none",color:"rgb(0, 0, 0)",fontStyle:"normal",textAlign:"start",textDecoration:"none solid rgba(0, 0, 0, 0.87)",textDecorationLine:"none",boxShadow:"none",textShadow:"none",borderColor:"rgba(0, 0, 0, 0.87)",borderStyle:"none",borderRadius:"0px",borderWidth:"0px"};function EC(e,A,t){return window.getComputedStyle(e)[A]===t}class Ut extends $e{constructor(t={},s){super(s);r(this,"changes",{new:{},old:{}});this.el=s,this.changes.new=t}onBeforeExecute(){if(this.pageDoc){const t=this.findEl(this.pageDoc);t&&(this.changes.old={},Object.keys(this.changes.new).forEach(s=>{const i=s;this.changes.old[i]=t.style[i]}))}}executeMutation(t){return this.setStyleProps(t,this.changes.new)}undoMutation(t){return this.setStyleProps(t,this.changes.old)}setStyleProps(t,s){const i=this.findEl(t);return i?Object.keys(s).map(n=>{const o=n,l=s[o]??"";return EC(i,o,l)?!1:(i.style[o]=this.isDefaultValue(o,l)?"":l,!0)}).some(n=>n):!1}isDefaultValue(t,s){return jC[t]===s}}class IC extends Ut{constructor(t,s){super({padding:t},s);r(this,"displayName",v("Changed padding"));this.padding=t}}function SC(){const e=Ts({name:"padding",onMutate:(A,t,s)=>{G().executeMutation(new IC(A,t),s)}});return a.jsx(Ns,{state:e})}class HC extends Ut{constructor(t,s){super({margin:t},s);r(this,"displayName",v("Changed margin"));this.margin=t}}function LC(){const e=Ts({name:"margin",onMutate:(A,t,s)=>{G().executeMutation(new HC(A,t),s)}});return a.jsx(Ns,{state:e})}class NC extends Ut{constructor(){super(...arguments);r(this,"displayName",v("Changed border style"))}}function TC(e){var i;const A=(i=B().selectedContext)==null?void 0:i.node,t=Ga(ae().currentConfig.borderWidth);if(!A)return;e.forceMinimumWidth&&t==="0px 0px 0px 0px"&&ae().setValue("borderWidth",[[1,"px"],[1,"px"],[1,"px"],[1,"px"]]);const s=Bc();G().executeMutation(new NC({...s,borderRadius:Ga(s.borderRadius),borderWidth:Ga(s.borderWidth)},A),e)}function Bc(){return{borderWidth:ae().currentConfig.borderWidth,borderColor:ae().currentConfig.borderColor,borderStyle:ae().currentConfig.borderStyle,borderRadius:ae().currentConfig.borderRadius}}function Ds(){return{applyValue:TC,getCurrentValue:Bc}}const DC=["transparent","none","rgba(0, 0, 0, 0)","hsla(0, 0%, 0%, 0)"];function $i(e){return!e||DC.includes(e)}function Ms({size:e="md",label:A,value:t,onChange:s,onChangeEnd:i,className:n,hideFooter:o,onOpenChange:l}){return a.jsxs("div",{className:X("flex-auto flex-shrink-0",n),children:[a.jsx("div",{className:X("pb-4",e==="sm"?"text-xs":"text-sm"),children:A}),a.jsxs(ue,{value:t,type:"popover",placement:"right",onOpenChange:l,onClose:(c,{valueChanged:g})=>{i(c,{valueChanged:g})},onValueChange:c=>s(c),children:[a.jsx(Ft,{className:X("h-30 w-full min-w-80 rounded-input border border-divider p-6",e==="sm"?"h-30":"h-36"),"aria-label":"Change border color",children:a.jsx("span",{className:X("block h-full w-full",$i(t)&&"transparent-texture"),style:{backgroundColor:t}})}),a.jsx(rn,{hideFooter:o})]})]})}function MC(){const e=Ds(),A=Ts({name:"borderWidth",onMutate:(t,s,i)=>{e.applyValue(i)}});return a.jsx(Ns,{state:A,children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(KC,{}),a.jsx(RC,{})]})})}function KC(){const e=Ds(),A=h.useRef(),t=Ce(i=>i.currentConfig.borderColor),s=(i,n)=>{ae().setValue("borderColor",i),e.applyValue({...n,forceMinimumWidth:n.setWidthIfZero})};return a.jsx(Ms,{size:"sm",label:a.jsx(d,{message:"Color"}),value:t,onChange:i=>{s(i,{partOfSession:!0,setWidthIfZero:!0})},onChangeEnd:(i,{valueChanged:n})=>{const o=A.current;!n&&o&&ae().setValues(o),s(i,{lastInSession:!0,skipHistory:!n,setWidthIfZero:!1}),A.current=void 0},onOpenChange:i=>{i&&(A.current=e.getCurrentValue())}})}function RC(){const e=Ds(),A=Ce(s=>s.currentConfig.borderStyle),t=s=>{ae().setValue("borderStyle",s),e.applyValue({lastInSession:!0,forceMinimumWidth:!0})};return a.jsxs(Qe,{selectionMode:"single",label:a.jsx(d,{message:"Style"}),selectedValue:A,onSelectionChange:s=>t(s),className:"flex-auto flex-shrink-0",size:"xs",children:[a.jsx(k,{value:"solid",children:a.jsx(d,{message:"Solid"})}),a.jsx(k,{value:"dashed",children:a.jsx(d,{message:"Dashed"})}),a.jsx(k,{value:"dotted",children:a.jsx(d,{message:"Dotted"})}),a.jsx(k,{value:"double",children:a.jsx(d,{message:"Double"})}),a.jsx(k,{value:"groove",children:a.jsx(d,{message:"Groove"})}),a.jsx(k,{value:"ridge",children:a.jsx(d,{message:"Ridge"})}),a.jsx(k,{value:"inset",children:a.jsx(d,{message:"Inset"})}),a.jsx(k,{value:"outset",children:a.jsx(d,{message:"Outset"})})]})}function zC(){const e=Ds(),A=Ts({name:"borderRadius",onMutate:(t,s,i)=>{e.applyValue({...i})}});return a.jsx(Ns,{state:A})}function OC({value:e}){const{close:A}=be();return a.jsxs(me,{size:"xl",children:[a.jsx(se,{children:a.jsx(d,{message:"Select font"})}),a.jsx(te,{className:"@container",children:a.jsx(Ld,{value:e,onChange:t=>A(t)})})]})}class la extends Ut{constructor(t={},s){super(t,s);r(this,"displayName",v("Changed text style"));this.newProps=t}executeMutation(t){return this.setStyleProps(t,this.changes.new)}undoMutation(t){return this.setStyleProps(t,this.changes.old)}}function PC(){return a.jsxs("div",{children:[a.jsx(VC,{}),a.jsxs("div",{className:"mb-14 flex items-center gap-10",children:[a.jsx(GC,{}),a.jsx(_C,{})]}),a.jsxs("div",{className:"mb-14 flex items-center gap-10",children:[a.jsx(_r,{label:a.jsx(d,{message:"Color"}),name:"color"}),a.jsx(_r,{label:a.jsx(d,{message:"Background"}),name:"backgroundColor"})]}),a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(qC,{}),a.jsx(WC,{})]})]})}function VC(){const e=Ce(A=>A.currentConfig.fontFamily);return a.jsxs("div",{className:"mb-14",children:[a.jsx("div",{className:"mb-4 text-xs",children:a.jsx(d,{message:"Font family"})}),a.jsxs(ue,{type:"modal",onClose:A=>{var s;const t=(s=B().selectedContext)==null?void 0:s.node;A&&t&&(ae().setValue("fontFamily",A),G().executeMutation(new nC(t,A),{lastInSession:!0}))},children:[a.jsxs(Ft,{className:"flex h-30 w-full items-center gap-12 rounded-input border px-12 text-sm shadow-sm",children:[a.jsx("span",{className:"min-w-0 flex-auto overflow-hidden overflow-ellipsis text-left font-normal",children:e.family||a.jsx(d,{message:"Default"})}),a.jsx(fs,{className:"text-muted"})]}),a.jsx(OC,{value:e})]})]})}function GC(){const[e,A]=Ce(s=>s.currentConfig.fontSize),t=(s,i)=>{var c;const n=s.value||e,o=s.unit||A,l=(c=B().selectedContext)==null?void 0:c.node;l&&(ae().setValue("fontSize",[n,o]),G().executeMutation(new la({fontSize:`${n}${o}`},l),i))};return a.jsx(q,{type:"number",size:"xs",label:a.jsx(d,{message:"Font size"}),min:1,value:e,onChange:s=>{t({value:s.target.value},{partOfSession:!0})},onBlur:s=>{t({value:s.target.value},{lastInSession:!0})},endAppend:a.jsx(bc,{name:"fontSize",value:A,height:"h-30",onChange:s=>t({unit:s},{lastInSession:!0})})})}function _C(){const e=Ce(A=>A.currentConfig.fontWeight);return a.jsxs(Qe,{size:"xs",selectionMode:"single",className:"flex-auto",selectedValue:e,onSelectionChange:A=>{var i;const t=(i=B().selectedContext)==null?void 0:i.node,s=A;t&&(ae().setValue("fontWeight",s),G().executeMutation(new la({fontWeight:s},t),{lastInSession:!0}))},label:a.jsx(d,{message:"Font weight"}),children:[a.jsx(k,{value:"100",children:"100"}),a.jsx(k,{value:"200",children:"200"}),a.jsx(k,{value:"300",children:"300"}),a.jsx(k,{value:"400",children:"400"}),a.jsx(k,{value:"500",children:"500"}),a.jsx(k,{value:"600",children:"600"}),a.jsx(k,{value:"700",children:"700"}),a.jsx(k,{value:"800",children:"800"}),a.jsx(k,{value:"900",children:"900"})]})}function _r({label:e,name:A}){const t=Ce(i=>i.currentConfig[A]),s=(i,n)=>{var l;const o=(l=B().selectedContext)==null?void 0:l.node;o&&(ae().setValue(A,i),G().executeMutation(new la({[A]:i},o),n))};return a.jsx(Ms,{size:"sm",label:e,value:t,onChangeEnd:(i,{valueChanged:n})=>{s(i,{lastInSession:!0,skipHistory:!n})},onChange:i=>s(i,{partOfSession:!0})})}function qC(){const e=Ce(i=>i.currentConfig.fontStyle==="italic"),A=Ce(i=>i.currentConfig.textDecorationLine==="underline"),t=Ce(i=>i.currentConfig.textDecorationLine==="line-through"),s=(i,n)=>{var l;const o=(l=B().selectedContext)==null?void 0:l.node;o&&(ae().setValue(i,n),G().executeMutation(new la({[i]:n},o),{lastInSession:!0}))};return a.jsxs("div",{children:[a.jsx("div",{className:"mb-4 text-xs",children:a.jsx(d,{message:"Font style"})}),a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(ee,{size:"xs",iconSize:"sm",color:e?"primary":void 0,variant:"outline",onClick:()=>s("fontStyle",e?"normal":"italic"),children:a.jsx(bo,{})}),a.jsx(ee,{size:"xs",iconSize:"sm",color:A?"primary":void 0,variant:"outline",onClick:()=>s("textDecorationLine",A?"none":"underline"),children:a.jsx(wo,{})}),a.jsx(ee,{size:"xs",iconSize:"sm",color:t?"primary":void 0,variant:"outline",onClick:()=>s("textDecorationLine",t?"none":"line-through"),children:a.jsx(Ru,{})})]})]})}function WC(){const e=Ce(A=>A.currentConfig.textAlign);return a.jsxs(Qe,{size:"xs",label:a.jsx(d,{message:"Align text"}),className:"ml-auto",selectionMode:"single",selectedValue:e,onSelectionChange:A=>{var i;const t=A,s=(i=B().selectedContext)==null?void 0:i.node;s&&(ae().setValue("textAlign",t),G().executeMutation(new la({textAlign:t},s),{lastInSession:!0}))},children:[a.jsx(k,{value:"left",startIcon:a.jsx(Nd,{size:"xs"}),children:a.jsx(d,{message:"Left"})}),a.jsx(k,{value:"center",startIcon:a.jsx(Td,{size:"xs"}),children:a.jsx(d,{message:"Center"})}),a.jsx(k,{value:"right",startIcon:a.jsx(Dd,{size:"xs"}),children:a.jsx(d,{message:"Right"})}),a.jsx(k,{value:"justify",startIcon:a.jsx(Md,{size:"xs"}),children:a.jsx(d,{message:"Justify"})})]})}const QA=h.forwardRef(({isActive:e,children:A,className:t,style:s,label:i,...n},o)=>a.jsxs("button",{type:"button",...n,ref:o,children:[a.jsx("span",{className:X("flex aspect-square items-center justify-center overflow-hidden rounded-panel border border-[#c3cbdc] outline-none focus-visible:ring",e&&"ring-2 ring-primary ring-offset-2",t),style:s,children:A}),a.jsx("span",{className:"mt-10 block overflow-hidden overflow-ellipsis text-xs",children:i})]}));function XC({value:e,onChange:A,className:t,isInsideDialog:s}){return a.jsxs("div",{className:t,children:[a.jsx(YC,{value:e,onChange:A,isInsideDialog:s}),Po.map(i=>a.jsx(QA,{label:a.jsx(d,{...i.label}),isActive:(e==null?void 0:e.id)===i.id,style:{backgroundColor:i.backgroundColor},onClick:()=>{A==null||A({...St,...i})}},i.id))]})}function YC({value:e,onChange:A,isInsideDialog:t}){const s=(e==null?void 0:e.id)===St.id;return a.jsxs(ue,{type:"popover",alwaysReturnCurrentValueOnClose:t,value:e==null?void 0:e.backgroundColor,onValueChange:i=>{A==null||A({...St,backgroundColor:i})},onClose:i=>{A==null||A({...St,backgroundColor:i})},children:[a.jsx(QA,{label:a.jsx(d,{...St.label}),className:"border-2 border-dashed",style:{backgroundColor:s?e==null?void 0:e.backgroundColor:void 0},children:a.jsx("span",{className:"inline-block rounded bg-black/20 p-10 text-white",children:a.jsx(Bo,{size:"lg"})})}),a.jsx(rn,{hideFooter:t})]})}function JC({value:e,onChange:A,className:t,isInsideDialog:s}){return a.jsxs("div",{className:t,children:[a.jsx($C,{value:e,onChange:A,isInsideDialog:s}),xn.map(i=>a.jsx(QA,{label:i.label&&a.jsx(d,{...i.label}),isActive:(e==null?void 0:e.id)===i.id,style:{backgroundImage:i.backgroundImage},onClick:()=>{A==null||A({...he,...i})}},i.backgroundImage))]})}function $C({value:e,onChange:A,isInsideDialog:t}){const s=(e==null?void 0:e.id)===he.id;return a.jsxs(ue,{type:"popover",value:e,onValueChange:i=>A==null?void 0:A(i),alwaysReturnCurrentValueOnClose:t,onOpenChange:i=>{i&&!e&&(A==null||A(xn[0]))},onClose:i=>A==null?void 0:A(i),children:[a.jsx(QA,{label:a.jsx(d,{...he.label}),className:"border-2 border-dashed",style:{backgroundImage:s?e==null?void 0:e.backgroundImage:void 0},children:a.jsx("span",{className:"inline-block rounded bg-black/20 p-10 text-white",children:a.jsx(No,{size:"lg"})})}),a.jsx(ZC,{hideFooter:t})]})}function ZC({hideFooter:e}){const{close:A,value:t,setValue:s}=be(),[i,n]=h.useState(()=>{var g;const c=((g=t==null?void 0:t.backgroundImage)==null?void 0:g.match(/\(([0-9]+deg),.?(.+?),.?(.+?)\)/))||[];return{angle:c[1]||"45deg",colorOne:c[2]||"#ff9a9e",colorTwo:c[3]||"#fad0c4"}}),o=c=>({...he,backgroundImage:`linear-gradient(${c.angle}, ${c.colorOne}, ${c.colorTwo})`}),l=h.useCallback(c=>{const g={...i,...c};n(g),s(o(g))},[i,s]);return a.jsxs(me,{size:"sm",children:[a.jsx(se,{children:a.jsx(d,{message:"Custom gradient"})}),a.jsxs(te,{children:[a.jsx("div",{className:"mb-6",children:a.jsx(d,{message:"Colors"})}),a.jsxs("div",{className:"mb-20 flex h-40 items-stretch",children:[a.jsx(qr,{className:"rounded-input",value:i.colorOne,onChange:c=>l({colorOne:c})}),a.jsx("div",{className:"flex-auto border-y border-[#c3cbdc]",style:{backgroundImage:o(i).backgroundImage}}),a.jsx(qr,{className:"rounded-r-input",value:i.colorTwo,onChange:c=>l({colorTwo:c})})]}),a.jsx("div",{className:"mb-6",children:a.jsx(d,{message:"Direction"})}),a.jsx(e1,{value:i.angle,onChange:c=>l({angle:c})})]}),!e&&a.jsxs(ne,{dividerTop:!0,children:[a.jsx(U,{onClick:()=>A(),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:()=>A(o(i)),children:a.jsx(d,{message:"Apply"})})]})]})}function qr({className:e,value:A,onChange:t}){return a.jsxs(ue,{type:"popover",value:A,onValueChange:t,alwaysReturnCurrentValueOnClose:!0,children:[a.jsx(ea,{label:a.jsx(d,{message:"Click to change color"}),children:a.jsx("button",{type:"button",className:X("w-40 flex-shrink-0 border border-[#c3cbdc]",e),style:{backgroundColor:A}})}),a.jsx(rn,{hideFooter:!0})]})}function e1({value:e,onChange:A}){const t="text-primary border-primary";return a.jsxs("div",{className:"flex flex-wrap items-center gap-8 text-muted",children:[a.jsx(ee,{variant:"outline",className:e==="0deg"?t:void 0,onClick:()=>A("0deg"),children:a.jsx(Ps,{})}),a.jsx(ee,{variant:"outline",className:e==="180deg"?t:void 0,onClick:()=>A("180deg"),children:a.jsx(zs,{})}),a.jsx(ee,{variant:"outline",className:e==="90deg"?t:void 0,onClick:()=>A("90deg"),children:a.jsx(zu,{})}),a.jsx(ee,{variant:"outline",className:e==="135deg"?t:void 0,onClick:()=>A("135deg"),children:a.jsx(zs,{className:"-rotate-45"})}),a.jsx(ee,{variant:"outline",className:e==="225deg"?t:void 0,onClick:()=>A("225deg"),children:a.jsx(zs,{className:"rotate-45"})}),a.jsx(ee,{variant:"outline",className:e==="45deg"?t:void 0,onClick:()=>A("45deg"),children:a.jsx(Ps,{className:"rotate-45"})}),a.jsx(ee,{variant:"outline",className:e==="325deg"?t:void 0,onClick:()=>A("325deg"),children:a.jsx(Ps,{className:"-rotate-45"})})]})}function os(e){if(e)return{backgroundImage:e.backgroundImage,backgroundColor:e.backgroundColor,backgroundAttachment:e.backgroundAttachment,backgroundSize:e.backgroundSize,backgroundRepeat:e.backgroundRepeat,backgroundPosition:e.backgroundPosition,color:e.color}}const t1={cover:{label:v("Stretch to fit"),bgConfig:{backgroundRepeat:"no-repeat",backgroundSize:"cover"}},contain:{label:v("Fit image"),bgConfig:{backgroundRepeat:"no-repeat",backgroundSize:"contain",backgroundPosition:"center top"}},repeat:{label:v("Repeat image"),bgConfig:{backgroundRepeat:"repeat",backgroundSize:void 0,backgroundPosition:"left top"}}};function A1({value:e,onChange:A}){const t=a1(e);return a.jsx("div",{className:"mt-20 border-t pt-14",children:a.jsx(us,{size:"sm",disabled:!e,children:Object.entries(t1).map(([s,i])=>a.jsx(gs,{name:"background-position",value:s,checked:s===t,onChange:n=>{e&&(A==null||A({...e,...i.bgConfig}))},children:a.jsx(d,{...i.label})},s))})})}function a1(e){return(e==null?void 0:e.backgroundSize)==="cover"?"cover":(e==null?void 0:e.backgroundSize)==="contain"?"contain":"repeat"}const ls=h.forwardRef((e,A)=>{const{children:t,autoFocus:s,size:i,invalid:n,isFirst:o,labelRef:l,isSelected:c,...g}=e,u=rd(A);od({autoFocus:s},u);const p=s1(i);return a.jsxs("label",{ref:l,className:X("relative z-20 inline-flex flex-auto cursor-pointer select-none items-center justify-center gap-8 whitespace-nowrap align-middle font-medium transition-colors hover:text-main",c?"text-main":"text-muted",!o&&"",p,e.disabled&&"pointer-events-none text-disabled",e.invalid&&"text-danger"),children:[a.jsx("input",{type:"radio",className:"pointer-events-none absolute left-0 top-0 h-full w-full appearance-none rounded focus-visible:outline",ref:u,...g}),t&&a.jsx("span",{children:t})]})});function s1(e){switch(e){case"xs":return"px-6 py-3 text-xs";case"sm":return"px-10 py-5 text-sm";case"lg":return"px-16 py-6 text-lg";default:return"px-16 py-8 text-sm"}}function i1({selectedValue:e,labelsRef:A}){const[t,s]=h.useState(null);return h.useEffect(()=>{if(e!=null&&A.current){const i=A.current[e];if(!i)return;s({width:i.offsetWidth,height:i.offsetHeight,left:i.offsetLeft})}},[s,e,A]),t?a.jsx(ld.div,{animate:t,initial:!1,className:"bg-paper shadow rounded absolute z-10 pointer-events-none"}):null}const vc=h.forwardRef((e,A)=>{const{children:t,size:s,className:i}=e,n=h.useId(),o=e.name||n,l=h.useRef({}),[c,g]=cd(e.value,e.defaultValue,e.onChange);return a.jsx("fieldset",{ref:A,className:X(i,e.width??"w-min"),children:a.jsxs("div",{className:"relative isolate flex rounded bg-chip p-4",children:[a.jsx(i1,{selectedValue:c,labelsRef:l}),h.Children.map(t,(u,p)=>{if(h.isValidElement(u))return h.cloneElement(u,{isFirst:p===0,name:o,size:s,onChange:f=>{var x,w;g(f.target.value),(w=(x=u.props).onChange)==null||w.call(x,f)},labelRef:f=>{f&&(l.current[u.props.value]=f)},isSelected:c===u.props.value})})]})})}),n1=[{value:"no-repeat",label:v("Don't repeat")},{value:"repeat-x",label:v("Horizontal")},{value:"repeat-y",label:v("Vertical")},{value:"repeat",label:v("Both")}],r1=[{value:"auto",label:v("Auto")},{value:"cover",label:v("Stretch to fit")},{value:"contain",label:v("Fit image")}],o1=["left top","center top","right top","left center","center center","right center","left bottom","center bottom","right bottom"];function l1({value:e,onChange:A}){return a.jsxs("div",{className:"mt-14 border-t pt-14",children:[a.jsxs("div",{className:"flex gap-60",children:[a.jsx(c1,{value:e,onChange:A}),a.jsx(d1,{value:e,onChange:A}),a.jsx(u1,{value:e,onChange:A})]}),a.jsxs(vc,{size:"xs",className:"mt-20",value:(e==null?void 0:e.backgroundAttachment)??"scroll",onChange:t=>{A==null||A({...e,backgroundAttachment:t})},children:[a.jsx(ls,{value:"fixed",children:a.jsx(d,{message:"Fixed"})}),a.jsx(ls,{value:"scroll",children:a.jsx(d,{message:"Not fixed"})})]})]})}function c1({value:e,onChange:A}){return a.jsxs("div",{children:[a.jsx("div",{className:"mb-10",children:a.jsx(d,{message:"Repeat"})}),a.jsx(us,{orientation:"vertical",size:"sm",disabled:!e,children:n1.map(({value:t,label:s})=>a.jsx(gs,{value:t,checked:(e==null?void 0:e.backgroundRepeat)===t,onChange:()=>{A==null||A({...e,backgroundRepeat:t})},children:a.jsx(d,{...s})},t))})]})}function d1({value:e,onChange:A}){return a.jsxs("div",{children:[a.jsx("div",{className:"mb-10",children:a.jsx(d,{message:"Size"})}),a.jsx(us,{orientation:"vertical",size:"sm",disabled:!e,children:r1.map(({value:t,label:s})=>a.jsx(gs,{value:t,checked:(e==null?void 0:e.backgroundSize)===t,onChange:()=>{A==null||A({...e,backgroundSize:t})},children:a.jsx(d,{...s})},t))})]})}function u1({value:e,onChange:A}){return a.jsxs("div",{children:[a.jsx("div",{className:"mb-10",children:a.jsx(d,{message:"Position"})}),a.jsx("div",{className:"grid grid-cols-3 gap-8",children:o1.map(t=>a.jsx(g1,{disabled:!e,value:e,onChange:A,position:t},t))})]})}function g1({value:e,onChange:A,position:t,disabled:s}){return a.jsx(Ft,{disabled:s,onClick:()=>{A({...e,backgroundPosition:t})},className:X("h-26 w-26 rounded border",(e==null?void 0:e.backgroundPosition)===t?"bg-primary":"bg-alt")})}function p1({value:e,onChange:A,className:t,positionSelector:s,diskPrefix:i,isInsideDialog:n}){return a.jsxs("div",{children:[a.jsxs("div",{className:t,children:[a.jsx(m1,{value:e,onChange:A,diskPrefix:i,hideFooter:n}),Vo.map(o=>a.jsx(QA,{onClick:()=>A==null?void 0:A({...pe,...o}),isActive:(e==null?void 0:e.id)===o.id,style:{...os(o),backgroundAttachment:"initial"},label:a.jsx(d,{...o.label})},o.id))]}),s==="advanced"?a.jsx(l1,{value:e,onChange:A}):a.jsx(A1,{value:e,onChange:A})]})}function m1({value:e,onChange:A,diskPrefix:t,hideFooter:s}){return e=(e==null?void 0:e.id)===pe.id?e:void 0,a.jsxs(ue,{type:"popover",onClose:i=>{A==null||A(i?{...pe,backgroundImage:`url(${i})`}:null)},children:[a.jsx(QA,{label:a.jsx(d,{...pe.label}),isActive:(e==null?void 0:e.id)===pe.id&&(e==null?void 0:e.backgroundImage)!=="none",className:"border-2 border-dashed",style:os(e),children:a.jsx("span",{className:"inline-block rounded bg-black/20 p-10 text-white",children:a.jsx(Ou,{size:"lg"})})}),a.jsx(h1,{value:e,diskPrefix:t,hideFooter:s})]})}function h1({value:e,diskPrefix:A,hideFooter:t}){const s=!(e!=null&&e.backgroundImage)||!e.backgroundImage.includes("url(")?void 0:Go(e.backgroundImage),i=Te({defaultValues:{imageUrl:s}}),{close:n,formId:o}=be();return a.jsxs(me,{size:"sm",children:[a.jsx(se,{children:a.jsx(d,{message:"Upload image"})}),a.jsx(te,{children:a.jsx(De,{id:o,form:i,onSubmit:l=>n(l.imageUrl),children:a.jsx(oo,{children:a.jsx(dd,{autoFocus:!0,name:"imageUrl",diskPrefix:A||"biolinks",showRemoveButton:!0,onChange:t?l=>n(l):void 0})})})}),!t&&a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>n(),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",type:"submit",form:o,children:a.jsx(d,{message:"Select"})})]})]})}const f1={color:XC,gradient:JC,image:p1};function x1({className:e,value:A,onChange:t,tabColWidth:s,isInsideDialog:i,positionSelector:n="simple",diskPrefix:o}){const[l,c]=h.useState(()=>(A==null?void 0:A.type)==="image"?"image":(A==null?void 0:A.type)==="gradient"?"gradient":"color"),g=f1[l];return a.jsxs("div",{className:e,children:[a.jsx(b1,{activeTab:l,onTabChange:c}),a.jsx(g,{value:A,onChange:t,isInsideDialog:i,positionSelector:n,diskPrefix:o,className:X("grid items-start gap-14",s||"grid-cols-[repeat(auto-fill,minmax(90px,1fr))]")})]})}function b1({activeTab:e,onTabChange:A}){return a.jsxs("div",{className:"mb-20 flex items-center gap-20 border-b pb-20",children:[a.jsx(pi,{isActive:e==="color",icon:a.jsx(Bo,{}),title:a.jsx(d,{message:"Flat color"}),onClick:()=>A("color")}),a.jsx(pi,{isActive:e==="gradient",icon:a.jsx(No,{}),title:a.jsx(d,{message:"Gradient"}),onClick:()=>A("gradient")}),a.jsx(pi,{isActive:e==="image",icon:a.jsx(ws,{}),title:a.jsx(d,{message:"Image"}),onClick:()=>A("image")})]})}function pi({isActive:e,icon:A,title:t,onClick:s}){return a.jsxs("div",{role:"button",className:"block",onClick:s,children:[a.jsx("div",{className:X("mx-auto mb-8 flex h-50 w-50 items-center justify-center rounded-panel border text-muted",e&&"border-primary ring"),children:A}),a.jsx("div",{className:"text-center text-sm text-primary",children:t})]})}function w1(){const{close:e,value:A,setValue:t,initialValue:s}=be();return a.jsxs(me,{size:"lg",children:[a.jsx(se,{children:a.jsx(d,{message:"Select a background"})}),a.jsx(te,{children:a.jsx(x1,{value:A,onChange:i=>t(i),isInsideDialog:!0,tabColWidth:"grid-cols-[repeat(auto-fill,minmax(80px,1fr))]",positionSelector:"advanced",diskPrefix:"project-assets"})}),a.jsxs(ne,{dividerTop:!0,children:[a.jsx(U,{onClick:()=>e(s),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:()=>e(A),children:a.jsx(d,{message:"Apply"})})]})]})}class jn extends Ut{constructor(){super(...arguments);r(this,"displayName",v("Changed background"))}setStyleProps(t,s){const i=this.findEl(t);if(i)for(const n in s)n==="backgroundClip"&&(s[n]==="text"?(i.dataset.arColorBeforeClip=i.style.color,s.color="transparent"):i.dataset.arColorBeforeClip&&(s.color=i.dataset.arColorBeforeClip,delete i.dataset.arColorBeforeClip)),n==="backgroundImage"&&(s[n]=B1(s[n]));return super.setStyleProps(t,s)}}function B1(e){if(e!=null&&e.includes("url(")){const A=Go(e);if(!An(A))return`url(${ms().settings.base_url}/${A})`}return e}function v1(){return a.jsxs("div",{children:[a.jsx(y1,{}),a.jsx(Q1,{}),a.jsx(C1,{})]})}function C1(){const e=Ce(t=>t.currentConfig.backgroundClip),A=t=>{var i;const s=(i=B().selectedContext)==null?void 0:i.node;s&&(ae().setValue("backgroundClip",t),G().executeMutation(new jn({backgroundClip:t},s),{lastInSession:!0}))};return a.jsxs(Qe,{selectedValue:e,selectionMode:"single",label:a.jsx(d,{message:"Clip"}),size:"xs",onSelectionChange:t=>A(t),children:[a.jsx(k,{value:"border-box",description:a.jsx(d,{message:"Any background added will extended to element's boundary."}),children:a.jsx(d,{message:"None"})}),a.jsx(k,{value:"padding-box",description:a.jsx(d,{message:"Clips background to the inside of the element's border, including any padding added to the element."}),children:a.jsx(d,{message:"Padding box"})}),a.jsx(k,{value:"content-box",description:a.jsx(d,{message:"Clips background to the edges of the content, excluding any padding added to the element."}),children:a.jsx(d,{message:"Content box"})}),a.jsx(k,{value:"text",description:a.jsx(d,{message:"Will fill element's text content with background image or gradient."}),children:a.jsx(d,{message:"Text"})})]})}function y1(){const e=Ce(t=>t.currentConfig.backgroundColor),A=(t,s)=>{var n;const i=(n=B().selectedContext)==null?void 0:n.node;i&&(ae().setValue("backgroundColor",t),G().executeMutation(new jn({backgroundColor:t},i),s))};return a.jsx(Ms,{size:"sm",className:"mb-12",label:a.jsx(d,{message:"Color"}),value:e,onChangeEnd:(t,{valueChanged:s})=>{A(t,{lastInSession:!0,skipHistory:!s})},onChange:t=>A(t,{partOfSession:!0})})}function Q1(){const e=Ce(s=>s.currentConfig.backgroundConfig),A=$i(e==null?void 0:e.backgroundColor)&&$i(e==null?void 0:e.backgroundImage),t=(s,i)=>{var o;const n=(o=B().selectedContext)==null?void 0:o.node;n&&(s||(s=ae().currentConfig.backgroundConfig,delete s.backgroundImage),ae().setValue("backgroundConfig",s),G().executeMutation(new jn(os(s),n),i))};return a.jsxs("div",{className:"mb-12 flex-auto flex-shrink-0",children:[a.jsx("div",{className:"pb-4 text-xs",children:a.jsx(d,{message:"Image & Gradient"})}),a.jsxs(ue,{value:e,type:"popover",placement:"right",onValueChange:s=>{t(s,{partOfSession:!0})},onClose:(s,{valueChanged:i})=>{i&&t(s,{lastInSession:!0})},children:[a.jsx(Ft,{className:"h-30 w-full min-w-80 rounded-input border border-divider p-6","aria-label":"Change background image",children:a.jsx("span",{className:X("block h-full w-full",A&&"transparent-texture"),style:A?void 0:os(e)})}),a.jsx(w1,{})]})]})}function Cc(){const{value:e,setValue:A,close:t}=be();return a.jsxs(me,{size:"xs",children:[a.jsx(se,{children:a.jsx(d,{message:"Adjust shadow"})}),a.jsxs(te,{children:[a.jsxs(Qe,{className:"mb-14",label:a.jsx(d,{message:"Type"}),selectionMode:"single",size:"xs",selectedValue:e.type,onSelectionChange:s=>A({...e,type:s}),children:[a.jsx(k,{value:"text",children:a.jsx(d,{message:"Text"})}),a.jsx(k,{value:"box",children:a.jsx(d,{message:"Box"})})]}),e.type==="box"&&a.jsxs(vc,{width:"w-full",className:"mb-14",size:"xs",value:e.inset?"inside":"outside",onChange:s=>{A({...e,inset:s==="inside"})},children:[a.jsx(ls,{value:"outside",children:a.jsx(d,{message:"Outside"})}),a.jsx(ls,{value:"inside",children:a.jsx(d,{message:"Inside"})})]}),a.jsx(Ms,{size:"sm",className:"mb-14",label:a.jsx(d,{message:"Color"}),value:e.color,onChange:s=>A({...e,color:s}),onChangeEnd:()=>{},hideFooter:!0}),a.jsx(mA,{size:"xs",label:a.jsx(d,{message:"Angle"}),value:e.angle,onChange:s=>A({...e,angle:s}),minValue:0,maxValue:360}),a.jsx(mA,{size:"xs",label:a.jsx(d,{message:"Distance"}),value:e.distance,onChange:s=>A({...e,distance:s}),minValue:0,maxValue:20}),a.jsx(mA,{size:"xs",label:a.jsx(d,{message:"Blur"}),value:e.blur,onChange:s=>A({...e,blur:s}),minValue:0,maxValue:20}),e.type==="box"&&a.jsx(mA,{size:"xs",label:a.jsx(d,{message:"Spread"}),value:e.spread,onChange:s=>A({...e,spread:s}),minValue:0,maxValue:20})]}),a.jsxs(ne,{children:[a.jsx(U,{size:"xs",onClick:()=>t(),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",size:"xs",onClick:()=>t(e),children:a.jsx(d,{message:"Save"})})]})]})}class yc extends Ut{constructor(t,s){super({boxShadow:t},s);r(this,"displayName",v("Changed box shadow"));this.shadow=t}}const mi={type:"box",color:"rgba(0,0,0,0.2)",angle:0,distance:2,blur:5,spread:0,inset:!1};class F1 extends Ut{constructor(t,s){super({textShadow:t},s);r(this,"displayName",v("Changed text shadow"));this.shadow=t}}function Qc(e,A){var s;const t=(s=B().selectedContext)==null?void 0:s.node;if(t){const i=ae().removeShadowValue(e);G().executeMutation(new yc(i.map(n=>Qi(n)).join(", "),t),A)}}const _a=(e,A,t)=>{var i;const s=(i=B().selectedContext)==null?void 0:i.node;if(s){const n=ae().setShadowValue(e,A),o=[],l=[];n.forEach(c=>{c.type==="text"?o.push(c):l.push(c)}),o.length&&G().executeMutation(new F1(o.map(c=>Qi(c)).join(", "),s),t),l.length&&G().executeMutation(new yc(l.map(c=>Qi(c)).join(", "),s),t)}};function k1(){return a.jsxs(h.Fragment,{children:[a.jsx(U1,{}),a.jsx(j1,{})]})}function U1(){const e=Ce(A=>A.currentConfig.shadows);return e.length?a.jsx("div",{className:"mb-10 text-xs text-muted",children:e.map((A,t)=>a.jsxs("div",{className:"flex items-center",children:[a.jsx("div",{className:"mr-4 h-14 w-14",style:{backgroundColor:A.color}}),a.jsx("div",{className:"overflow-hidden overflow-ellipsis whitespace-nowrap",children:A.type==="box"?a.jsx(d,{message:"Box shadow: :value",values:{value:`${A.angle}px ${A.blur}px ${A.distance}px ${A.spread}px`}}):a.jsx(d,{message:"Text shadow: :value",values:{value:`${A.angle}px ${A.blur}px ${A.distance}px`}})}),a.jsxs(ue,{type:"popover",value:A,onValueChange:s=>{_a(s,t,{partOfSession:!0})},children:[a.jsx(ee,{size:"xs",className:"ml-auto",children:a.jsx(rt,{})}),a.jsx(Cc,{})]}),a.jsx(ee,{size:"xs",onClick:()=>Qc(t,{lastInSession:!0}),children:a.jsx(vs,{})})]},t))}):null}function j1(){const[e,A]=h.useState(!1),[t,s]=h.useState({...mi});return a.jsxs(ue,{type:"popover",placement:"right",offset:10,value:t,isOpen:e,onOpenChange:i=>{i&&(s({...mi}),ae().setShadowValue(t),_a(t,ae().currentConfig.shadows.length-1,{partOfSession:!0,skipHistory:!0})),A(i)},onValueChange:i=>{s(i),_a(i,ae().currentConfig.shadows.length-1,{partOfSession:!0})},onClose:(i,{valueChanged:n})=>{i?_a(i,ae().currentConfig.shadows.length-1,{lastInSession:!0,skipHistory:!n}):Qc(ae().currentConfig.shadows.length-1,{lastInSession:!0,skipHistory:!0}),s({...mi})},children:[a.jsx(U,{variant:"outline",color:"primary",size:"2xs",startIcon:a.jsx(Ot,{}),children:a.jsx(d,{message:"Add shadow"})}),a.jsx(Cc,{})]})}const Ks=ds(a.jsx("path",{d:"M18.25 3.25C18.6642 3.25 19 3.58579 19 4C19 4.33152 19.1317 4.64946 19.3661 4.88388C19.6005 5.1183 19.9185 5.25 20.25 5.25C20.6642 5.25 21 5.58579 21 6C21 6.41421 20.6642 6.75 20.25 6.75C19.9185 6.75 19.6005 6.8817 19.3661 7.11612C19.1317 7.35054 19 7.66848 19 8C19 8.41421 18.6642 8.75 18.25 8.75C17.8358 8.75 17.5 8.41421 17.5 8C17.5 7.66848 17.3683 7.35054 17.1339 7.11612C16.8995 6.8817 16.5815 6.75 16.25 6.75C15.8358 6.75 15.5 6.41421 15.5 6C15.5 5.58579 15.8358 5.25 16.25 5.25C16.5815 5.25 16.8995 5.1183 17.1339 4.88388C17.3683 4.64946 17.5 4.33152 17.5 4C17.5 3.58579 17.8358 3.25 18.25 3.25ZM18.25 5.88746C18.2318 5.90673 18.2133 5.92576 18.1945 5.94454C18.1758 5.96333 18.1567 5.98182 18.1375 6C18.1567 6.01819 18.1758 6.03667 18.1945 6.05546C18.2133 6.07424 18.2318 6.09327 18.25 6.11254C18.2682 6.09327 18.2867 6.07424 18.3055 6.05546C18.3242 6.03667 18.3433 6.01819 18.3625 6C18.3433 5.98182 18.3242 5.96333 18.3055 5.94454C18.2867 5.92576 18.2682 5.90673 18.25 5.88746ZM9.25 5.25C9.66421 5.25 10 5.58579 10 6C10 7.39239 10.5531 8.72774 11.5377 9.71231C12.5223 10.6969 13.8576 11.25 15.25 11.25C15.6642 11.25 16 11.5858 16 12C16 12.4142 15.6642 12.75 15.25 12.75C13.8576 12.75 12.5223 13.3031 11.5377 14.2877C10.5531 15.2723 10 16.6076 10 18C10 18.4142 9.66421 18.75 9.25 18.75C8.83579 18.75 8.5 18.4142 8.5 18C8.5 16.6076 7.94688 15.2723 6.96231 14.2877C5.97774 13.3031 4.64239 12.75 3.25 12.75C2.83579 12.75 2.5 12.4142 2.5 12C2.5 11.5858 2.83579 11.25 3.25 11.25C4.64239 11.25 5.97774 10.6969 6.96231 9.71231C7.94688 8.72774 8.5 7.39239 8.5 6C8.5 5.58579 8.83579 5.25 9.25 5.25ZM9.25 9.09234C8.93321 9.70704 8.52103 10.2749 8.02297 10.773C7.52491 11.271 6.95704 11.6832 6.34234 12C6.95704 12.3168 7.52491 12.729 8.02297 13.227C8.52103 13.7251 8.93321 14.293 9.25 14.9077C9.56679 14.293 9.97897 13.7251 10.477 13.227C10.9751 12.729 11.543 12.3168 12.1577 12C11.543 11.6832 10.9751 11.271 10.477 10.773C9.97897 10.2749 9.56679 9.70704 9.25 9.09234ZM18.25 15.25C18.6642 15.25 19 15.5858 19 16C19 16.3315 19.1317 16.6495 19.3661 16.8839C19.6005 17.1183 19.9185 17.25 20.25 17.25C20.6642 17.25 21 17.5858 21 18C21 18.4142 20.6642 18.75 20.25 18.75C19.9185 18.75 19.6005 18.8817 19.3661 19.1161C19.1317 19.3505 19 19.6685 19 20C19 20.4142 18.6642 20.75 18.25 20.75C17.8358 20.75 17.5 20.4142 17.5 20C17.5 19.6685 17.3683 19.3505 17.1339 19.1161C16.8995 18.8817 16.5815 18.75 16.25 18.75C15.8358 18.75 15.5 18.4142 15.5 18C15.5 17.5858 15.8358 17.25 16.25 17.25C16.5815 17.25 16.8995 17.1183 17.1339 16.8839C17.3683 16.6495 17.5 16.3315 17.5 16C17.5 15.5858 17.8358 15.25 18.25 15.25ZM18.25 17.8875C18.2318 17.9067 18.2133 17.9258 18.1945 17.9445C18.1758 17.9633 18.1567 17.9818 18.1375 18C18.1567 18.0182 18.1758 18.0367 18.1945 18.0555C18.2133 18.0742 18.2318 18.0933 18.25 18.1125C18.2682 18.0933 18.2867 18.0742 18.3055 18.0555C18.3242 18.0367 18.3433 18.0182 18.3625 18C18.3433 17.9818 18.3242 17.9633 18.3055 17.9445C18.2867 17.9258 18.2682 17.9067 18.25 17.8875Z"}),"Ai");function E1(e){return We({mutationFn:A=>I1(A),onError:A=>an(A,e),onSuccess:()=>{Bs()}})}async function I1(e){return Pe.post("ai/generate-text",e).then(A=>A.data)}const S1=ds(a.jsx("path",{d:"m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"}),"PromptSuggestion","0 -960 960 960");var Xt=(e=>(e.Simplify="simplify",e.Shorten="shorten",e.Lengthen="lengthen",e.FixSpelling="fixSpelling",e.Translate="translate",e.ChangeTone="changeTone",e))(Xt||{}),Fc=(e=>(e.casual="casual",e.formal="formal",e.confident="confident",e.friendly="friendly",e.inspirational="inspirational",e.motivational="motivational",e.nostalgic="nostalgic",e.professional="professional",e.playful="playful",e.scientific="scientific",e.witty="witty",e.straightforward="straightforward",e))(Fc||{});function kc(e){return We({mutationKey:["modifyTextWithAi"],mutationFn:A=>H1(A),onError:A=>an(A,e),onSuccess:()=>{Bs()}})}async function H1(e){return Pe.post("ai/modify-text",e).then(A=>A.data)}function Uc(){return a.jsx(d,{message:"AI can make mistakes, so double-check that the results are accurate before using them."})}function jc({isVisible:e}){return a.jsxs("div",{className:X("pointer-events-none absolute top-0 w-full bg transition-opacity",!e&&"opacity-0"),children:[a.jsx(dA,{className:"max-w-[20%]"}),a.jsx(dA,{className:"max-w-[80%]"}),a.jsx(dA,{className:"max-w-[40%]"}),a.jsx(dA,{className:"max-w-[70%]"}),a.jsx(dA,{})]})}function Ec(){const{data:e}=kt();return(e==null?void 0:e.ai.text.failReason)!=="overQuota"?null:a.jsx(Ko,{size:"sm",className:"mt-14",message:a.jsx(d,{message:"Your plan has used all available AI text tokens. <a>Upgrade to get more.</a>",values:{a:A=>a.jsx(BA,{className:sn,to:"/pricing",children:A})}})})}function L1({originalText:e,onNewPrompt:A}){const{data:t}=kt(),s=!!(t!=null&&t.ai.text.failReason),{formId:i,close:n}=be(),o=h.useRef(null),l=Te({defaultValues:{text:e}}),c=kc(l),g=ig({filters:{mutationKey:["modifyTextWithAi"]},select:u=>u.state.status==="pending"}).some(Boolean);return a.jsxs(h.Fragment,{children:[a.jsx(te,{children:a.jsxs(De,{id:i,form:l,onSubmit:u=>n(u.text),children:[a.jsxs("div",{className:"relative",children:[a.jsx(Xe,{inputRef:o,className:X("transition-opacity",g&&"opacity-0"),name:"text",inputElementType:"textarea",rows:2,description:a.jsx(Uc,{}),autoFocus:!0}),a.jsx(jc,{isVisible:g})]}),a.jsx(Ec,{}),a.jsx(N1,{disabled:g||s,onModify:()=>{o.current.focus(),o.current.setSelectionRange(o.current.value.length,o.current.value.length)}})]})}),a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>A(),children:a.jsx(d,{message:"Discard"})}),a.jsx(U,{form:i,type:"submit",variant:"flat",color:"primary",disabled:c.isPending,children:a.jsx(d,{message:"Use text"})})]})]})}function N1({disabled:e,onModify:A}){const t=lo(),s=kc(t),i=n=>{s.mutate({instruction:n.instruction,text:t.getValues("text"),tone:n.tone,language:n.language},{onSuccess:o=>{t.setValue("text",o.content),t.clearErrors(),A()}})};return a.jsxs("div",{className:"mt-34 flex items-center gap-10",children:[a.jsx(D1,{disabled:e,onSelected:n=>i({instruction:n})}),a.jsx(T1,{disabled:e,onSelected:n=>{i({instruction:Xt.ChangeTone,tone:n})}}),a.jsx(M1,{disabled:e,onSelected:n=>{i({instruction:Xt.Translate,language:n})}})]})}function T1({onSelected:e,disabled:A}){return a.jsxs($A,{onItemSelected:t=>e(t),children:[a.jsx(U,{disabled:A,variant:"outline",size:"xs",endIcon:a.jsx(fs,{}),radius:"rounded-full",children:a.jsx(d,{message:"Change tone"})}),a.jsx(ZA,{children:Object.values(Fc).map(t=>a.jsx(k,{value:t,capitalizeFirst:!0,children:a.jsx(d,{message:t})},t))})]})}function D1({onSelected:e,disabled:A}){return a.jsxs($A,{onItemSelected:t=>e(t),children:[a.jsx(U,{disabled:A,variant:"outline",size:"xs",endIcon:a.jsx(fs,{}),radius:"rounded-full",children:a.jsx(d,{message:"Refine"})}),a.jsxs(ZA,{children:[a.jsx(k,{value:Xt.Simplify,children:a.jsx(d,{message:"Simplify language"})}),a.jsx(k,{value:Xt.Shorten,children:a.jsx(d,{message:"Shorten"})}),a.jsx(k,{value:Xt.Lengthen,children:a.jsx(d,{message:"Lenghten"})}),a.jsx(k,{value:Xt.FixSpelling,children:a.jsx(d,{message:"Fix spelling & grammar"})})]})]})}function M1({onSelected:e,disabled:A}){var s;const{data:t}=ud(["languages"]);return a.jsxs($A,{onItemSelected:i=>e(i),showSearchField:!0,children:[a.jsx(U,{disabled:A,variant:"outline",size:"xs",endIcon:a.jsx(fs,{}),radius:"rounded-full",children:a.jsx(d,{message:"Translate"})}),a.jsx(ZA,{children:(s=t==null?void 0:t.languages)==null?void 0:s.map(i=>a.jsx(k,{value:i.code,children:i.name},i.code))})]})}const K1=["Write a short landing page title for...","Create one paragraph product page description for...","Suggest a four word tagline for...","Create a two paragraph service description for...","Write a one sentence testimonial for...","Craft a short ad copy for..."];function YA({initialScreen:e}){kt();const[A,t]=h.useState(e||{name:"generate"});return a.jsxs(me,{size:"lg",children:[a.jsx(se,{showDivider:!0,titleTextSize:"text-sm",titleFontWeight:"font-bold",children:a.jsx(d,{message:"AI text writer"})}),A.name==="generate"&&a.jsx(R1,{onGenerated:s=>{t({name:"refine",originalText:s})}}),A.name==="refine"&&a.jsx(L1,{originalText:A.originalText,onNewPrompt:()=>{t({name:"generate"})}})]})}function R1({onGenerated:e}){const{data:A}=kt(),t=!!(A!=null&&A.ai.text.failReason),{formId:s,close:i}=be(),n=Te(),{trans:o}=Qt(),l=E1(n),c=h.useRef(null);return a.jsxs(h.Fragment,{children:[a.jsx(te,{children:a.jsxs(De,{id:s,form:n,onSubmit:g=>{l.mutate(g,{onSuccess:u=>e(u.content)})},children:[a.jsxs("div",{className:"relative",children:[a.jsx(Xe,{className:l.isPending?"opacity-0 transition-opacity":"",inputRef:c,name:"prompt",inputElementType:"textarea",rows:2,placeholder:o(v("Describe the text you want to create...")),autoFocus:!0,description:a.jsx(Uc,{})}),a.jsx(jc,{isVisible:l.isPending})]}),a.jsx(Ec,{}),a.jsx("div",{className:"mb-8 mt-34 text-sm font-semibold",children:a.jsx(d,{message:"Example prompts"})}),a.jsx("div",{className:"space-y-8 text-xs",children:K1.map(g=>a.jsxs(Ft,{onClick:()=>{var u,p;g=g.replace(/\.\.\.$/," "),n.setValue("prompt",g),(u=c.current)==null||u.setSelectionRange(g.length,g.length),(p=c.current)==null||p.focus()},display:"flex",className:"w-max items-center gap-6 rounded-full border px-8 py-4 hover:bg-hover",children:[a.jsx(S1,{size:"xs",className:"text-muted"}),a.jsx("span",{children:g})]},g))})]})}),a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>i(),children:a.jsx(d,{message:"Close"})}),a.jsx(U,{form:s,type:"submit",variant:"flat",color:"primary",disabled:l.isPending||t,endIcon:a.jsx(Ks,{}),children:a.jsx(d,{message:"Generate"})})]})]})}function z1(){return a.jsxs(h.Fragment,{children:[a.jsx(V1,{}),a.jsx(O1,{}),a.jsx(P1,{})]})}function O1(){const e=Ce(t=>t.currentConfig.classList),A=t=>{const s=B().selectedContext;s&&(ae().setValue("classList",t),G().executeMutation(new Tg(s.node,s.el,t),{lastInSession:!0}))};return a.jsx(Wd,{size:"xs",chipSize:"xs",value:e,onChange:t=>A(t.map(s=>s.id)),label:a.jsx(d,{message:"Class list"})})}function P1(){const e=Ce(t=>t.currentConfig.id),A=t=>{const s=B().selectedContext;s&&(ae().setValue("id",t),G().executeMutation(new ot(s.node,{id:t}),{lastInSession:!0}))};return a.jsx(q,{className:"mt-14",label:a.jsx(d,{message:"ID"}),size:"xs",value:e,onChange:t=>A(t.target.value)})}function V1(){var A;const e=J(t=>t.selectedContext);return Ce(t=>t.currentConfig),a.jsx(h.Fragment,{children:(A=e==null?void 0:e.el.controls)==null?void 0:A.map((t,s)=>{var n;const i=typeof t.defaultValue=="function"?t.defaultValue(B().selectedContext.node):t.defaultValue;if((n=t.shouldHide)!=null&&n.call(t,e==null?void 0:e.node))return null;switch(t.type){case"input":return a.jsx(G1,{control:t,value:i},`${e.nodeId}.${s}`);case"select":return a.jsx(_1,{control:t,value:i},`${e.nodeId}.${s}`)}})})}function G1({control:e,value:A}){const t=(i,n)=>{var l;const o=n?{lastInSession:!0}:{partOfSession:!0,forceSyncEditor:!0};(l=e.onChange)==null||l.call(e,B().selectedContext.node,i,o)},s=a.jsxs(ue,{type:"modal",onClose:i=>{i&&t(i,!0)},children:[a.jsx(ee,{size:null,className:"h-24 w-24",iconSize:"xs",color:"primary",children:a.jsx(Ks,{})}),a.jsx(YA,{initialScreen:A?()=>({name:"refine",originalText:`${A}`}):void 0})]});return a.jsx(q,{className:"mb-14",size:"xs",label:e.label,labelSuffix:e.showAiTextButton?s:void 0,value:A,type:e.inputType,min:e.min,max:e.max,onChange:i=>t(i.target.value,!1),onBlur:i=>t(i.target.value,!0)})}function _1({control:e,value:A}){var t;return a.jsx(Qe,{className:"mb-14",size:"xs",selectionMode:"single",selectedValue:A,label:a.jsx(d,{message:e.label}),onSelectionChange:s=>{var i;return(i=e.onChange)==null?void 0:i.call(e,B().selectedContext.node,`${s}`,{lastInSession:!0})},children:(t=e.options)==null?void 0:t.map((s,i)=>a.jsx(k,{value:s.value,children:a.jsx(d,{message:s.key})},i))})}class q1 extends $e{constructor(t,s){super(t);r(this,"displayName",v("Changed visibility"));r(this,"changes",{new:{sm:!1,md:!1,lg:!1,xl:!1},old:{sm:!1,md:!1,lg:!1,xl:!1}});r(this,"display","block");this.el=t,this.value=s,this.changes.new=s}onBeforeExecute(){this.changes.old=qo(Array.from(this.el.classList)),this.display=B().getEditorWindow().getComputedStyle(this.el).display||"block"}executeMutation(t){return this.syncClasses(t,this.changes.new)}undoMutation(t){return this.syncClasses(t,this.changes.old)}syncClasses(t,s){const i=this.findEl(t);if(i){const n=Array.from(i.classList).filter(c=>{const g=new RegExp("d-(sm|md|lg|xl)-[a-z-]+$");return c!=="d-none"&&!g.test(c)}),o=Dg(s,this.display),l=`${n.join(" ")} ${o.join(" ")}`;if(l!==i.className)return i.className=l,!0}return!1}}class W1 extends Ut{constructor(t,s){super({opacity:t},s);r(this,"displayName",v("Changed opacity"));this.opacity=t}}function X1(){return a.jsxs("div",{children:[a.jsx(Ma,{breakpoint:"sm",className:"mb-10",icon:a.jsx(mn,{}),children:a.jsx(d,{message:"Hide on mobile"})}),a.jsx(Ma,{breakpoint:"md",className:"mb-10",icon:a.jsx(un,{}),children:a.jsx(d,{message:"Hide on tablet"})}),a.jsx(Ma,{breakpoint:"lg",className:"mb-10",icon:a.jsx(gn,{}),children:a.jsx(d,{message:"Hide on small desktop"})}),a.jsx(Ma,{breakpoint:"xl",icon:a.jsx(hn,{}),className:"mb-14",children:a.jsx(d,{message:"Hide on large desktop"})}),a.jsx(Y1,{})]})}function Y1(){const e=Ce(t=>t.currentConfig.opacity),A=(t,s)=>{var n;const i=(n=B().selectedContext)==null?void 0:n.node;i&&(ae().setValue("opacity",`${t}`),G().executeMutation(new W1(`${t}`,i),s))};return a.jsx(mA,{size:"sm",trackColor:"neutral",label:a.jsx(d,{message:"Opacity"}),showThumbOnHoverOnly:!1,wrapperHeight:"h-18",thumbSize:"h-14 w-14",minValue:0,step:.1,maxValue:1,value:parseFloat(e),onChange:t=>{A(t,{partOfSession:!0})},onChangeEnd:t=>{A(t,{lastInSession:!0})}})}function Ma({breakpoint:e,children:A,icon:t,className:s}){const i=Ce(o=>o.currentConfig.responsiveHiddenOn),n=o=>{var c;const l=(c=B().selectedContext)==null?void 0:c.node;if(l){const g={...ae().currentConfig.responsiveHiddenOn,[e]:o};ae().setValue("responsiveHiddenOn",g),G().executeMutation(new q1(l,g),{lastInSession:!0})}};return a.jsx(Xd,{size:"sm",className:s,checked:i[e],iconRight:h.cloneElement(t,{size:"sm",className:"ml-auto text-muted"}),onChange:o=>{n(o.target.checked)},children:A})}function J1(e){return We({mutationKey:["aiGenerateImage"],mutationFn:A=>$1(A),onError:A=>an(A,e),onSuccess:()=>{Bs()}})}async function $1(e){return Pe.post("ai/generate-image",e).then(A=>A.data)}const Z1=""+new URL("photo-569cbfc7.svg",import.meta.url).href;function ey(){return We({mutationKey:["aiGenerateImage"],mutationFn:e=>ty(e),onError:e=>ro(e)})}async function ty(e){return Pe.post("ai/upload-generated-image",e).then(A=>A.data)}function Ay(){const{data:e}=kt();return(e==null?void 0:e.ai.images.failReason)!=="overQuota"?null:a.jsx(Ko,{size:"sm",className:"mt-14",message:a.jsx(d,{message:"Your plan has used all available AI image tokens. <a>Upgrade to get more.</a>",values:{a:A=>a.jsx(BA,{className:sn,to:"/pricing",children:A})}})})}const ay=["none","realistic","watercolor","photo","minimalist","dreamy","anime","psychedelic","vibrant","3d","color-pencil","playful"];function Ic(){var s;const{formId:e}=be(),A=Te({defaultValues:{style:"none",size:"1024x1024"}}),t=J1(A);return a.jsxs(me,{size:"fullscreen",className:"h-full w-full",children:[a.jsx(se,{showDivider:!0,titleTextSize:"text-sm",titleFontWeight:"font-bold",children:a.jsx(d,{message:"AI image creator"})}),a.jsx(te,{padding:"p-0",children:a.jsx(De,{className:"h-full",id:e,form:A,onSubmit:i=>{t.mutate(i)},children:a.jsxs("div",{className:"flex h-full items-center",children:[a.jsx(sy,{isGenerating:t.isPending,generatedImageUrl:(s=t.data)==null?void 0:s.url}),a.jsx(ry,{mutation:t})]})})})]})}function sy({generatedImageUrl:e,isGenerating:A}){const{close:t}=be(),{trans:s}=Qt(),{data:i}=kt(),n=ey(),o=()=>{e&&n.mutate({url:e},{onSuccess:l=>{t(l.fileEntry.url)}})};return a.jsxs("aside",{className:"flex h-full w-375 flex-shrink-0 flex-col overflow-y-auto border-r p-24",children:[a.jsxs("div",{className:"flex-auto",children:[a.jsx(Xe,{label:a.jsx(d,{message:"Describe your image"}),name:"prompt",inputElementType:"textarea",rows:6,placeholder:s(v("e.g., Beautiful abstract tech background")),autoFocus:!0}),a.jsx(iy,{}),a.jsx(ny,{}),a.jsx(Ay,{})]}),a.jsxs("div",{className:"mt-24 flex-shrink-0",children:[a.jsx(U,{color:"primary",variant:"outline",className:"mb-14 min-h-44 w-full",disabled:!e||n.isPending,onClick:()=>o(),children:a.jsx(d,{message:"Use image"})}),a.jsx(U,{type:"submit",startIcon:a.jsx(Ks,{}),color:"primary",variant:"flat",className:"min-h-44 w-full",disabled:A||!!(i!=null&&i.ai.images.failReason),children:a.jsx(d,{message:"Generate"})})]})]})}function iy(){const{base_url:e}=co(),A=lo(),t=A.watch("style");return a.jsxs("div",{className:"mt-24",children:[a.jsx("div",{className:"mb-4 text-sm",children:a.jsx(d,{message:"Choose a style"})}),a.jsx("div",{className:"grid grid-cols-4 gap-8",children:ay.map(s=>{const i=X("block h-full w-full rounded-panel border-2 object-cover",t===s&&"border-primary/90");return a.jsxs("div",{className:"cursor-pointer",onClick:()=>A.setValue("style",s),children:[a.jsx(Ft,{className:"aspect-square w-full",children:s==="none"?a.jsx("div",{className:X(i,"diagonal-lines")}):a.jsx("img",{className:i,src:`${e}/images/ai/${s}.webp`,alt:s})}),a.jsx("div",{className:X("mt-4 overflow-hidden overflow-ellipsis whitespace-nowrap text-center text-xs capitalize",t===s&&"text-primary"),children:s})]},s)})})]})}function ny(){return a.jsxs(ps,{name:"size",label:a.jsx(d,{message:"Aspect ratio"}),selectionMode:"single",className:"mt-24",children:[a.jsx(k,{value:"1024x1024",children:a.jsx(d,{message:"Square"})}),a.jsx(k,{value:"1792x1024",children:a.jsx(d,{message:"Landscape"})}),a.jsx(k,{value:"1024x1792",children:a.jsx(d,{message:"Portrait"})})]})}function ry({mutation:e}){var s;const t=`${(((s=e.data)==null?void 0:s.size)||"1024x1024").replace("x","/")}`;return a.jsxs("div",{className:"flex h-full flex-auto flex-col items-center justify-center bg-alt px-36 pb-6 pt-36",children:[a.jsx("div",{style:{aspectRatio:t},className:"flex flex-auto items-center justify-center overflow-hidden rounded-panel border-3 border-white shadow",children:a.jsx(oy,{mutation:e})}),a.jsx("div",{className:"flex-shrink-0 pt-24 text-center text-xs text-muted",children:a.jsx(d,{message:"Make sure you don’t enter any personal information and double-check that you have the right to use the content created by AI."})})]})}function oy({mutation:e}){var A;return e.isPending?a.jsx(dA,{variant:"rect",className:"rounded-panel"}):(A=e.data)!=null&&A.url?a.jsx("img",{src:e.data.url,alt:"Generated image",className:"overflow-hidden rounded-panel object-cover"}):a.jsx(xs,{src:Z1,height:"h-84"})}const ly=""+new URL("upgrade-1a8523e3.svg",import.meta.url).href;function cy({message:e,messageSuffix:A}){const{close:t}=be();return a.jsxs(me,{size:"sm",children:[a.jsx(se,{children:a.jsx(d,{message:"Join the PROs"})}),a.jsxs(te,{children:[a.jsx("div",{className:"mb-20 text-center",children:a.jsx(xs,{src:ly,className:"mx-auto",height:"h-100"})}),a.jsxs("div",{children:[e," ",A]})]}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",size:"xs",onClick:()=>{t()},children:a.jsx(d,{message:"Maybe later"})}),a.jsx(U,{autoFocus:!0,variant:"flat",size:"xs",color:"primary",elementType:BA,to:"/pricing",target:"_blank",onClick:()=>t(),children:a.jsx(d,{message:"Find out more"})})]})]})}const En=e=>{var t;const A=(t=B().selectedContext)==null?void 0:t.node;e&&A&&G().executeMutation(new fn(Z(A)||"",e),{lastInSession:!0})},Sc=e=>{var t;const A=(t=B().selectedContext)==null?void 0:t.node;if(e&&A){const s=An(e)?e:`${ms().settings.base_url}/${e}`;G().executeMutation(new ot(A,{src:s}),{lastInSession:!0}),Oe.hide()}},hi={replaceTextAction:En,replaceImageSrcAction:Sc};function dy({name:e}){return a.jsx(In,{name:e,permission:"ai.text",onSubmit:A=>En(A),children:a.jsx(YA,{})})}function uy({name:e}){return a.jsx(In,{name:e,permission:"ai.text",onSubmit:A=>En(A),children:a.jsx(YA,{initialScreen:()=>{var A;return{name:"refine",originalText:((A=B().selectedContext)==null?void 0:A.node.textContent)??""}}})})}function gy({name:e}){return a.jsx(In,{name:e,permission:"ai.image",onSubmit:A=>Sc(A),children:a.jsx(Ic,{})})}function In({name:e,permission:A,children:t,onSubmit:s}){const{data:i}=kt(),{billing:n,ai_setup:o}=co(),l=A==="ai.text"?i==null?void 0:i.ai.text.hasPermission:i==null?void 0:i.ai.images.hasPermission;return o?a.jsxs("div",{children:[a.jsxs(ue,{type:"modal",onClose:c=>{c&&s(c)},children:[a.jsx(U,{variant:"outline",color:"primary",disabled:!l,startIcon:a.jsx(Ks,{}),size:"xs",children:a.jsx(d,{message:e})}),t]}),!l&&n.enable&&a.jsx(py,{})]}):null}function py(){return a.jsxs(ue,{type:"popover",children:[a.jsx(ee,{className:"ml-2 text-muted",size:"xs",children:a.jsx(Wa,{})}),a.jsx(cy,{message:a.jsx(d,{message:"Upgrade to unlock AI and other features."})})]})}const my={[ce.Settings]:[{label:{message:"Settings"},component:z1}],[ce.Visibility]:[{label:{message:"Visibility"},component:X1}],[ce.Padding]:[{label:{message:"Padding"},component:SC}],[ce.Margin]:[{label:{message:"Margin"},component:LC}],[ce.Border]:[{label:{message:"Border"},component:MC},{label:{message:"Border radius"},component:zC}],[ce.Text]:[{label:{message:"Typography"},component:PC}],[ce.Background]:[{label:{message:"Background"},component:v1}],[ce.Shadow]:[{label:{message:"Shadow"},component:k1}]};function hy(){const e=J(A=>A.selectedContext);return a.jsxs("div",{children:[a.jsx(CA,{children:a.jsx(d,{message:"Inspector"})}),e?a.jsxs(h.Fragment,{children:[a.jsxs("div",{className:"px-12",children:[a.jsx(xy,{}),a.jsx(by,{})]}),a.jsx(vA,{mode:"multiple",defaultExpandedValues:[0],children:e.el.canEdit.map(A=>(my[A]??[]).map(({label:t,component:s},i)=>a.jsx(Fe,{label:a.jsx(d,{...t}),children:a.jsx(s,{})},`${A}:${i}`)))})]}):a.jsx(fy,{})]})}function fy(){return a.jsx("div",{className:"mt-140 px-12",children:a.jsx(tn,{size:"sm",image:a.jsx(xs,{src:xc}),title:a.jsx(d,{message:"Nothing selected"}),description:a.jsx(d,{message:"Click any element on the left to select it"})})})}function xy(){const e=J(A=>{var t;return((t=A.selectedContext)==null?void 0:t.path)??[]});return a.jsx("div",{className:"mb-24 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs",children:e.map((A,t)=>{const s=t===e.length-1;return a.jsxs(h.Fragment,{children:[a.jsx("button",{className:X("capitalize transition-colors hover:text-primary",s&&"font-bold"),onMouseEnter:()=>{A.nodeId&&oa(A.nodeId)},onMouseLeave:()=>{Oe.hide()},onClick:()=>{A.nodeId&&xe(A.nodeId)},children:A.name}),A.name&&A.nodeId&&!s&&a.jsx(Ag,{size:"xs"})]},t)})})}function by(){const e=J(A=>{var t;return(t=A.selectedContext)==null?void 0:t.el.editActions});return e?a.jsx("div",{className:"mb-24 flex flex-wrap items-center gap-8",children:e.map(A=>{const t=A.action;return t==="aiCreateText"?a.jsx(dy,{name:A.name},t):t==="aiEditText"?a.jsx(uy,{name:A.name},t):t==="aiCreateImage"?a.jsx(gy,{name:A.name},t):a.jsx(U,{variant:"outline",color:"primary",size:"xs",onClick:()=>{var i;const s=(i=B().selectedContext)==null?void 0:i.node;s&&t(s)},children:a.jsx(d,{message:A.name})},A.name)})}):null}function wy(){const e=Ct(t=>t.mutationStack),A=Ct(t=>t.pointer);return a.jsxs("div",{children:[a.jsx(CA,{children:a.jsx(d,{message:"History"})}),a.jsx("div",{className:"px-14",children:a.jsxs(uo,{className:"space-y-10",children:[a.jsx(wi,{className:X("border",A===-1&&"border-primary font-semibold text-primary"),onSelected:()=>G().goTo(-1),children:a.jsx(d,{message:"Initial"})}),e.map((t,s)=>a.jsx(wi,{onSelected:()=>G().goTo(s),className:X("border",A===s&&"border-primary font-semibold text-primary"),children:a.jsx(d,{...t.displayName})},t.uniqueId))]})})]})}function Hc(e,A){const t=new ResizeObserver(s=>{const i=s[0].contentRect;A({width:i.width,height:i.height})});return e.current&&t.observe(e.current),()=>{e.current&&t.unobserve(e.current)}}function cs({className:e,textClassName:A,onClick:t,children:s}){return a.jsx("button",{onClick:t,className:X("group relative isolate block w-full py-6 text-center text-xs before:absolute before:left-0 before:top-1/2 before:z-10 before:h-1 before:w-full before:border before:border-dashed",e),children:a.jsx("span",{className:X("relative z-20 bg px-4 transition-button",A),children:s})})}function By(){const{close:e,formId:A}=be(),[t,s]=h.useState(()=>{var l;return(((l=Ke().selectedRow)==null?void 0:l.columns)||[]).map(c=>c.span).join("+")}),[i,n]=h.useState(()=>Wr(t));return a.jsxs(me,{size:"xs",children:[a.jsx(se,{children:a.jsx(d,{message:"Customize row columns"})}),a.jsx(te,{children:a.jsx("form",{id:A,onSubmit:o=>{o.preventDefault(),e(t)},children:a.jsx(q,{autoFocus:!0,size:"sm",label:a.jsx(d,{message:"Columns"}),value:t,onChange:o=>{s(o.target.value),n(Wr(o.target.value))},errorMessage:i?void 0:a.jsx(d,{message:"Sum of all spans should equal 12."}),placeholder:"4+4+4",required:!0,minLength:3,pattern:"^(1[0-2]|[1-9])(\\+(1[0-2]|[1-9]))*$",description:"Enter spans (1-12) for each column separated by plus sign, total span should equal 12."})})}),a.jsxs(ne,{children:[a.jsx(U,{type:"button",onClick:()=>e(),size:"xs",children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{form:A,type:"submit",variant:"flat",color:"primary",size:"xs",disabled:!i,children:a.jsx(d,{message:"Save"})})]})]})}function Wr(e){return e.split("+").map(Number).reduce((t,s)=>t+s,0)===12}const Lc=[[12],[6,6],[4,8],[8,4],[4,4,4],[3,3,3,3],[2,2,2,2,2,2]];function vy(){return a.jsxs("div",{className:"grid grid-cols-4 gap-6",children:[Lc.map((e,A)=>a.jsx(Cy,{preset:e},A)),a.jsx(yy,{})]})}function Cy({preset:e}){const A=vt(t=>{var s;return(s=t.selectedRow)==null?void 0:s.columns.map(i=>i.span).join("+")});return a.jsx("button",{className:"group flex items-center gap-2",onClick:()=>{Ke().applyRowPreset(e)},children:e.map((t,s)=>a.jsx("span",{style:{flex:t},className:X("block h-28 rounded-sm transition-bg-color group-hover:bg-primary",A===e.join("+")?"bg-primary":"bg-primary-light")},s))})}function yy(){const e=vt(t=>{var s;return(s=t.selectedRow)==null?void 0:s.columns.map(i=>i.span).join("+")}),A=!Lc.some(t=>e===t.join("+"));return a.jsxs(ue,{type:"popover",onClose:t=>{t&&Ke().applyRowPreset(t.split("+"))},children:[a.jsx("button",{className:X("block h-28 rounded-sm text-xs font-bold text-on-primary transition-bg-color hover:bg-primary",A?"bg-primary":"bg-primary-light"),children:a.jsx(d,{message:"Custom"})}),a.jsx(By,{})]})}class eA extends $e{constructor(t){super(t.el);r(this,"displayName",v("Repositioned element"));r(this,"changes");this.options=t,this.changes={new:{index:t.newIndex,parentId:t.newParentId},old:{index:t.oldIndex,parentId:t.oldParentId}}}static canMoveNodeInto(t){return t&&!tA(t)&&t.nodeName!=="HTML"}executeMutation(t){var n,o;const s=this.findEl(t,this.changes.new.parentId),i=this.findEl(t);return!i||!s||!eA.canMoveNodeInto(s)?!1:(Fi(i,s,this.changes.new.index,!1),(o=(n=this.options).onMutate)==null||o.call(n),!0)}undoMutation(t){var n,o;const s=this.findEl(t,this.changes.old.parentId),i=this.findEl(t);return!i||!s||!eA.canMoveNodeInto(s)?!1:(Fi(i,s,this.changes.old.index,!1),(o=(n=this.options).onMutate)==null||o.call(n),!0)}}function Qy(){const e=vt(A=>A.selectedRow);if(e)return a.jsx("div",{className:"relative mt-14 flex gap-x-2 overflow-hidden rounded-sm",children:e.columns.map(A=>a.jsx(Fy,{column:A,columns:e.columns,onSortEnd:(t,s)=>{const i=Ee(A.id,B().getEditorDoc());i&&G().executeMutation(new eA({el:i,oldIndex:t,oldParentId:e.id,newIndex:s,newParentId:e.id,onMutate:()=>{Ja(B().selectedContext)}}),{lastInSession:!0})}},A.id))})}function Fy({className:e,column:A,columns:t,onSortEnd:s}){const[i,n]=h.useState(!1),o=J(g=>{var u;return((u=g.selectedContext)==null?void 0:u.nodeId)===A.id}),l=h.useRef(null),{sortableProps:c}=vo({ref:l,item:A,items:t,type:"layoutEditorColumnList",strategy:"moveNode",onSortEnd:s,onSortStart:()=>n(!0),onDragEnd:()=>n(!1)});return a.jsx("span",{...c,onClick:()=>{xe(A.id)},onMouseEnter:()=>{oa(A.id)},onMouseLeave:()=>{Oe.remove()},ref:l,style:{flex:A.span},className:X("flex h-40 cursor-ew-resize items-center justify-center border text-xs transition-colors hover:bg-hover",e,o&&!i&&"border-primary",i&&"opacity-30"),children:A.span})}class Rs extends $e{constructor(t){super(t);r(this,"displayName",v("Clone element"));r(this,"cloneId");r(this,"changes",{new:null,old:null});this.cloneId=Je(12)}executeMutation(t){const s=this.findEl(t);if(!s||!Rs.canClone(s))return!1;const i=s.cloneNode(!0);return i.dataset.arId=this.cloneId,s.after(i),t===this.previewDoc&&xe(this.cloneId),!0}undoMutation(t){const s=this.findEl(t,this.cloneId);return!s||!s.parentNode?!1:(s.parentNode.removeChild(s),!0)}static canClone(t){return t&&!tA(t)&&t.nodeName!=="HTML"}isGameElement(t){return["game-2048","snake-game","memory-game","tetris-game","breakout-game","tic-tac-toe-game","simon-says-game","minesweeper-game","hangman-game","rock-paper-scissors-game"].some(i=>t.classList.contains(i))}}class ca extends $e{constructor(t){super(t);r(this,"displayName",v("Deleted element"));r(this,"changes",{new:null,old:null});r(this,"parentId",null);r(this,"nodeIndex",0);r(this,"deletedEl");this.el=t}static canDelete(t){return t&&!tA(t)&&!(t.nodeName==="BODY"||t.nodeName==="HTML")}onBeforeExecute(){const t=this.findEl(this.pageDoc);t&&t.parentElement&&(this.deletedEl=t.cloneNode(!0),this.parentId=Z(t.parentElement),this.nodeIndex=Ye(t))}executeMutation(t){var i;const s=this.findEl(t);return!s||!ca.canDelete(s)?!1:(t===this.previewDoc&&((i=B().selectedContext)==null?void 0:i.nodeId)===this.nodeId&&xe(null),s.remove(),!0)}undoMutation(t){const s=this.findEl(t,this.parentId);if(s){const i=this.nodeIndex>0?this.nodeIndex-1:0,n=this.deletedEl.cloneNode(!0),o=s.children.item(i);return o?o.after(n):s.appendChild(n),t===this.previewDoc&&xe(this.nodeId),!0}return!1}}function Nc({nodeId:e,onAfterDelete:A}){return a.jsxs(h.Fragment,{children:[a.jsx(ee,{size:"sm",variant:"outline",radius:"rounded-none",border:"border-l",className:"text-muted",onClick:()=>{xe(e),B().setActivePanel(fe.STYLE)},children:a.jsx(rt,{})}),a.jsx(ee,{size:"sm",iconSize:"xs",variant:"outline",radius:"rounded-none",border:"border-l",className:"text-muted",onClick:()=>{Ee(e,B().getEditorDoc())&&G().executeMutation(new Rs(e),{lastInSession:!0})},children:a.jsx(Pu,{})}),a.jsx(ee,{size:"sm",variant:"outline",radius:"rounded-none",border:"border-l",className:"text-muted",onClick:()=>{const t=Ee(e,B().getEditorDoc());t&&G().executeMutation(new ca(t),{lastInSession:!0})&&(A==null||A())},children:a.jsx(bs,{})})]})}function ky({container:e}){const A=vt(t=>t.selectedRow);return a.jsxs("div",{children:[a.jsx(cs,{textClassName:"text-muted group-hover:text-primary",onClick:()=>{Ke().insertNewRow(e.id,e.rows[0],"before")},children:a.jsx(d,{message:"+ Add row"})}),e.rows.map((t,s)=>a.jsx(Uy,{container:e,rows:e.rows,rowId:t,index:s},t)),A&&a.jsxs(h.Fragment,{children:[a.jsx(vy,{}),a.jsx(Qy,{})]})]})}function Uy({container:e,rows:A,rowId:t,index:s}){const i=vt(u=>u.selectedRow),n=h.useRef(null),[o,l]=h.useState(!1),{sortableProps:c,dragHandleRef:g}=vo({type:"rowListSort",item:t,items:A,ref:n,strategy:"liveSort",onSortStart:()=>{l(!0)},onSortEnd:(u,p)=>{const f=Ee(t,B().getEditorDoc());f&&G().executeMutation(new eA({el:f,oldIndex:u,oldParentId:e.id,newIndex:p,newParentId:e.id,onMutate:()=>{Ja(B().selectedContext)}}),{lastInSession:!0}),l(!1)}});return a.jsxs(h.Fragment,{children:[a.jsxs("div",{...c,ref:n,onMouseEnter:()=>oa(t),onMouseLeave:()=>Oe.remove(),className:X("flex items-center rounded-button border",(i==null?void 0:i.id)===t&&!o&&"border-primary"),children:[a.jsx("button",{ref:g,className:"mr-auto block h-36 flex-auto cursor-move pl-10 text-left text-xs hover:bg-hover",onClick:()=>xe(t),children:a.jsx(d,{message:"Row :number",values:{number:s+1}})}),a.jsx(Nc,{nodeId:t,onAfterDelete:()=>{xe(e.id)}})]}),a.jsx(cs,{textClassName:"text-primary invisible group-hover:visible",onClick:()=>{Ke().insertNewRow(e.id,t,"after")},children:a.jsx(d,{message:"+ Add row"})})]})}function jy(){return a.jsxs("div",{children:[a.jsx(CA,{children:a.jsx(d,{message:"Layout"})}),a.jsx("div",{className:"px-14",children:a.jsx(Ey,{})})]})}function Ey(){const e=vt(A=>A.allContainers);return a.jsx("div",{children:a.jsxs(gd,{children:[a.jsx(cs,{textClassName:"text-muted group-hover:text-primary",onClick:()=>{var A;Ke().insertNewContainer((A=e[0])==null?void 0:A.id,"before")},children:a.jsx(d,{message:"+ Add container"})}),e.map((A,t)=>a.jsxs(h.Fragment,{children:[a.jsx(Iy,{container:A,index:t}),a.jsx(cs,{textClassName:"text-primary invisible group-hover:visible",onClick:()=>{Ke().insertNewContainer(A.id,"after")},children:a.jsx(d,{message:"+ Add container"})})]},t))]})})}function Iy({container:e,index:A}){const t=vt(i=>i.selectedContainer),s=vt(i=>i.allContainers);return a.jsx(Fe,{onHeaderMouseEnter:()=>oa(e.id),onHeaderMouseLeave:()=>Oe.remove(),expandedValues:t?[t]:[],value:e.id,mode:"single",footerContent:a.jsx("div",{className:"flex justify-end border-t",children:a.jsx(Nc,{nodeId:e.id,onAfterDelete:()=>{s[A-1]&&xe(s[A-1].id)}})}),setExpandedValues:i=>{var n;xe(i[0]),(n=Ee(i[0],B().getEditorDoc()))==null||n.scrollIntoView({behavior:"smooth",block:"center",inline:"center"})},variant:"outline",label:a.jsx(d,{message:"Container :number",values:{number:A+1}}),children:a.jsx(ky,{container:e})})}function Tc({isIndexPage:e}){return a.jsxs(h.Fragment,{children:[a.jsx(Xe,{size:"xs",name:"name",required:!0,label:a.jsx(d,{message:"Name"}),autoFocus:!0,className:"mb-14",disabled:e}),a.jsx(Xe,{size:"xs",name:"title",label:a.jsx(d,{message:"Title"}),className:"mb-14"}),a.jsx(Xe,{size:"xs",name:"description",label:a.jsx(d,{message:"Description"}),inputElementType:"textarea",rows:1,className:"mb-14"}),a.jsx(Xe,{size:"xs",name:"keywords",label:a.jsx(d,{message:"Keywords"}),inputElementType:"textarea",description:a.jsx(d,{message:"Separate each keyword with a comma."}),rows:1,className:"mb-14"}),a.jsx(vA,{mode:"single",className:"mb-14",children:a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Wa,{size:"sm"}),a.jsx(d,{message:"Access Control"})]}),children:a.jsxs("div",{className:"space-y-12 pt-12",children:[a.jsxs(ps,{size:"xs",name:"accessLevel",label:a.jsx(d,{message:"Page Access Level"}),description:a.jsx(d,{message:"Control who can view this page"}),defaultValue:"public",selectionMode:"single",children:[a.jsx(k,{value:"public",children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Vu,{size:"sm"}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:a.jsx(d,{message:"Public"})}),a.jsx("div",{className:"text-xs text-muted",children:a.jsx(d,{message:"Anyone can view this page"})})]})]})}),a.jsx(k,{value:"user",children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Wa,{size:"sm"}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:a.jsx(d,{message:"Authenticated Users"})}),a.jsx("div",{className:"text-xs text-muted",children:a.jsx(d,{message:"Only logged-in users can view"})})]})]})}),a.jsx(k,{value:"admin",children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Gu,{size:"sm"}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:a.jsx(d,{message:"Administrators"})}),a.jsx("div",{className:"text-xs text-muted",children:a.jsx(d,{message:"Only admins can view this page"})})]})]})})]}),a.jsx(Yd,{name:"requiresAuth",description:a.jsx(d,{message:"Redirect unauthenticated users to login page"}),children:a.jsx(d,{message:"Require Authentication"})}),a.jsx(Xe,{size:"xs",name:"allowedRoles",label:a.jsx(d,{message:"Allowed Roles (Optional)"}),description:a.jsx(d,{message:"Comma-separated list of custom roles that can access this page"}),placeholder:"editor, moderator, premium"})]})})})]})}function Sy(){const{trans:e}=Qt(),{close:A,formId:t}=be(),s=Te(),i=AA(),n=o=>{var g;if((g=B().project)==null?void 0:g.pages.find(u=>u.name.toLowerCase()===o.name.toLowerCase())){s.setError("name",{type:"manual",message:e(v("A page with this name already exists."))});return}const c={id:Je(10),...o,html:Jd($d,null,o),hiddenInPagesPanel:!0};B().addNewPage(c),i.mutate({},{onSuccess:()=>{B().setActivePage(c.id),A()}})};return a.jsxs(me,{size:"sm",children:[a.jsx(se,{children:a.jsx(d,{message:"New page"})}),a.jsx(te,{children:a.jsx(De,{id:t,form:s,onSubmit:n,children:a.jsx(Tc,{})})}),a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>A(),size:"xs",children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",type:"submit",size:"xs",form:t,disabled:i.isPending,children:a.jsx(d,{message:"Create"})})]})]})}function Hy({page:e}){const{trans:A}=Qt(),{close:t,formId:s}=be(),i=Te({defaultValues:{name:e.name,...e.doc?Zd(e.doc):{}}}),n=AA(),o=l=>{var g;if((g=B().project)==null?void 0:g.pages.find(u=>u.name.toLowerCase()===l.name.toLowerCase()&&u.id!==e.id)){i.setError("name",{type:"manual",message:A(v("A page with this name already exists."))});return}B().updatePage(e.id,l),Ly(l,e),n.mutate({},{onSuccess:()=>t()})};return a.jsxs(me,{size:"sm",children:[a.jsx(se,{children:a.jsx(d,{message:"Update page"})}),a.jsx(te,{children:a.jsx(De,{id:s,form:i,onSubmit:o,children:a.jsx(Tc,{isIndexPage:e.name.toLowerCase()==="index"})})}),a.jsxs(ne,{children:[a.jsx(U,{onClick:()=>t(),size:"xs",children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",type:"submit",size:"xs",form:s,disabled:n.isPending,children:a.jsx(d,{message:"Save"})})]})]})}function Ly(e,A){const t=[];A.doc&&t.push(A.doc),B().activePageId===A.id&&t.push(B().getEditorDoc()),t.forEach(s=>eu(e,s))}function Ny(){const e=J(A=>{var t;return((t=A.project)==null?void 0:t.pages)??[]});return a.jsxs("div",{children:[a.jsx(CA,{actions:a.jsxs(ue,{type:"popover",placement:"right",offset:14,children:[a.jsx(U,{variant:"outline",size:"xs",startIcon:a.jsx(Ot,{}),children:a.jsx(d,{message:"New page"})}),a.jsx(Sy,{})]}),children:a.jsx(d,{message:"Pages"})}),a.jsx("div",{className:"px-14",children:a.jsx(uo,{padding:"p-0",children:e.filter(A=>!A.hiddenInPagesPanel).map(A=>a.jsx(Ty,{page:A},A.id))})})]})}function Ty({page:e}){const A=J(u=>u.activePageId),t=h.useRef(null),[s,i]=h.useState(!1),n=AA(),o=J(u=>{var p;return((p=u.project)==null?void 0:p.pages.length)??0}),l=()=>{e.doc||(e.doc=Ro(e.html)),i(!0)},c=()=>{const u=B().addNewPage({...e,doc:void 0,id:Je(10),name:`${e.name}-copy`,hiddenInPagesPanel:!0});n.mutate({},{onSuccess:()=>{B().setActivePage(u.id)}})},g=()=>{Yt(pd,{isDanger:!0,title:a.jsx(d,{message:"Delete page"}),body:a.jsx(d,{message:"Are you sure you want to delete this page?"}),confirm:a.jsx(d,{message:"Delete"}),onConfirm:()=>{var u,p,f;if(md(),B().deletePage(e.id),A===e.id){const x=((u=B().project)==null?void 0:u.pages)??[],w=x.findIndex(C=>C.id===e.id);B().setActivePage(((p=x[w-1])==null?void 0:p.id)??((f=x[0])==null?void 0:f.id))}n.mutate({})}})};return a.jsxs(h.Fragment,{children:[a.jsx(wi,{onSelected:()=>{fc(),B().setActivePage(e.id)},padding:"pl-10 py-4 pr-2",className:X("mb-10 cursor-pointer rounded-panel border text-sm capitalize transition-colors hover:bg-hover",A===e.id&&"border-primary font-semibold text-primary"),endSection:a.jsx(h.Fragment,{children:a.jsxs($A,{ref:t,children:[a.jsx(ee,{size:"xs",disabled:n.isPending,onClick:u=>{u.stopPropagation(),s&&i(!1)},children:a.jsx(hs,{})}),a.jsxs(ZA,{children:[a.jsx(k,{value:"edit",onClick:u=>u.stopPropagation(),onSelected:l,children:a.jsx(d,{message:"Settings"})}),a.jsx(k,{value:"duplicate",onClick:u=>u.stopPropagation(),onSelected:c,children:a.jsx(d,{message:"Duplicate"})}),a.jsx(k,{value:"delete",onClick:u=>u.stopPropagation(),isDisabled:e.name.toLowerCase()==="index"||o<2,onSelected:g,children:a.jsx(d,{message:"Delete"})})]})]})}),children:e.name}),a.jsx(ue,{type:"popover",placement:"right",offset:14,triggerRef:t,isOpen:s,onOpenChange:i,children:a.jsx(Hy,{page:e})})]})}const Dy=[{id:"openai",name:"OpenAI",description:"Advanced AI models for chat, completion, and more",logo:"/images/api-logos/openai.png",category:"ai",authType:"apiKey",website:"https://openai.com",documentation:"https://platform.openai.com/docs",endpoints:[{id:"chat-completion",name:"Chat Completion",description:"Generate conversational responses using GPT models",method:"POST",url:"https://api.openai.com/v1/chat/completions",responseFormat:"json",parameters:[{name:"model",type:"string",required:!0,description:"The model to use",defaultValue:"gpt-3.5-turbo",options:["gpt-3.5-turbo","gpt-4","gpt-4-turbo"]},{name:"messages",type:"array",required:!0,description:"List of messages for the conversation"},{name:"max_tokens",type:"number",required:!1,description:"Maximum number of tokens to generate",defaultValue:150},{name:"temperature",type:"number",required:!1,description:"Creativity level (0-2)",defaultValue:.7}]},{id:"text-to-speech",name:"Text to Speech",description:"Convert text to natural speech",method:"POST",url:"https://api.openai.com/v1/audio/speech",responseFormat:"text",parameters:[{name:"model",type:"string",required:!0,description:"TTS model to use",defaultValue:"tts-1",options:["tts-1","tts-1-hd"]},{name:"input",type:"string",required:!0,description:"Text to convert to speech"},{name:"voice",type:"string",required:!0,description:"Voice to use",defaultValue:"alloy",options:["alloy","echo","fable","onyx","nova","shimmer"]}]}]},{id:"twilio",name:"Twilio",description:"SMS, voice, and video communication APIs",logo:"/images/api-logos/twilio.png",category:"communication",authType:"apiKey",website:"https://twilio.com",documentation:"https://www.twilio.com/docs",endpoints:[{id:"send-sms",name:"Send SMS",description:"Send text messages to phone numbers",method:"POST",url:"https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json",responseFormat:"json",parameters:[{name:"To",type:"string",required:!0,description:"Phone number to send to"},{name:"From",type:"string",required:!0,description:"Your Twilio phone number"},{name:"Body",type:"string",required:!0,description:"Message content"}]}]},{id:"sendgrid",name:"SendGrid",description:"Email delivery and marketing platform",logo:"/images/api-logos/sendgrid.png",category:"communication",authType:"apiKey",website:"https://sendgrid.com",documentation:"https://docs.sendgrid.com",endpoints:[{id:"send-email",name:"Send Email",description:"Send transactional emails",method:"POST",url:"https://api.sendgrid.com/v3/mail/send",responseFormat:"json",parameters:[{name:"to",type:"string",required:!0,description:"Recipient email address"},{name:"from",type:"string",required:!0,description:"Sender email address"},{name:"subject",type:"string",required:!0,description:"Email subject"},{name:"content",type:"string",required:!0,description:"Email content"}]}]},{id:"google-sheets",name:"Google Sheets",description:"Read and write data to Google Spreadsheets",logo:"/images/api-logos/google-sheets.png",category:"data",authType:"oauth",website:"https://sheets.google.com",documentation:"https://developers.google.com/sheets/api",endpoints:[{id:"append-row",name:"Append Row",description:"Add a new row to a spreadsheet",method:"POST",url:"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append",responseFormat:"json",parameters:[{name:"spreadsheetId",type:"string",required:!0,description:"ID of the spreadsheet"},{name:"range",type:"string",required:!0,description:"Range to append to (e.g., Sheet1!A1)",defaultValue:"Sheet1!A1"},{name:"values",type:"array",required:!0,description:"Array of values to append"}]}]},{id:"nhtsa",name:"NHTSA Vehicle API",description:"Vehicle information and safety data",logo:"/images/api-logos/nhtsa.png",category:"data",authType:"none",website:"https://vpic.nhtsa.dot.gov",documentation:"https://vpic.nhtsa.dot.gov/api/",endpoints:[{id:"decode-vin",name:"Decode VIN",description:"Get vehicle information from VIN number",method:"GET",url:"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}",responseFormat:"json",parameters:[{name:"vin",type:"string",required:!0,description:"17-character VIN number"}]}]},{id:"openweather",name:"OpenWeatherMap",description:"Weather data and forecasts",logo:"/images/api-logos/openweather.png",category:"free",authType:"apiKey",website:"https://openweathermap.org",documentation:"https://openweathermap.org/api",endpoints:[{id:"current-weather",name:"Current Weather",description:"Get current weather for a location",method:"GET",url:"https://api.openweathermap.org/data/2.5/weather",responseFormat:"json",parameters:[{name:"q",type:"string",required:!0,description:"City name (e.g., London,UK)"},{name:"units",type:"string",required:!1,description:"Temperature units",defaultValue:"metric",options:["metric","imperial","kelvin"]}]}]},{id:"quotable",name:"Quotable",description:"Inspirational quotes and sayings",logo:"/images/api-logos/quotable.png",category:"free",authType:"none",website:"https://quotable.io",documentation:"https://github.com/lukePeavey/quotable",endpoints:[{id:"random-quote",name:"Random Quote",description:"Get a random inspirational quote",method:"GET",url:"https://api.quotable.io/random",responseFormat:"json",parameters:[{name:"minLength",type:"number",required:!1,description:"Minimum quote length"},{name:"maxLength",type:"number",required:!1,description:"Maximum quote length"},{name:"tags",type:"string",required:!1,description:"Quote categories (comma-separated)"}]}]},{id:"exchangerate",name:"Exchange Rate API",description:"Currency exchange rates",logo:"/images/api-logos/exchangerate.png",category:"free",authType:"none",website:"https://exchangerate-api.com",documentation:"https://www.exchangerate-api.com/docs",endpoints:[{id:"latest-rates",name:"Latest Rates",description:"Get latest currency exchange rates",method:"GET",url:"https://api.exchangerate-api.com/v4/latest/{base}",responseFormat:"json",parameters:[{name:"base",type:"string",required:!0,description:"Base currency code",defaultValue:"USD",options:["USD","EUR","GBP","JPY","CAD","AUD"]}]}]},{id:"qrserver",name:"QR Server",description:"Generate QR codes",logo:"/images/api-logos/qrserver.png",category:"free",authType:"none",website:"https://qr-server.com",documentation:"https://qr-server.com/api/",endpoints:[{id:"generate-qr",name:"Generate QR Code",description:"Create QR codes from text",method:"GET",url:"https://api.qrserver.com/v1/create-qr-code/",responseFormat:"text",parameters:[{name:"data",type:"string",required:!0,description:"Text to encode in QR code"},{name:"size",type:"string",required:!1,description:"QR code size (e.g., 200x200)",defaultValue:"200x200"}]}]}];function Dc(e){return Dy.filter(A=>A.category===e)}function My({onEndpointSelect:e,onBack:A}){var C;const[t,s]=h.useState("categories"),[i,n]=h.useState(""),[o,l]=h.useState(null),[c,g]=h.useState(""),u=[{id:"ai",name:"AI & Machine Learning",icon:a.jsx(_u,{}),color:"text-purple-500"},{id:"communication",name:"Communication",icon:a.jsx(bA,{}),color:"text-blue-500"},{id:"data",name:"Data & Storage",icon:a.jsx(Kt,{}),color:"text-green-500"},{id:"free",name:"Free APIs",icon:a.jsx(qu,{}),color:"text-orange-500"},{id:"productivity",name:"Productivity",icon:a.jsx(Wu,{}),color:"text-indigo-500"}],p=i?Dc(i).filter(H=>H.name.toLowerCase().includes(c.toLowerCase())||H.description.toLowerCase().includes(c.toLowerCase())):[],f=H=>{n(H),s("providers")},x=H=>{l(H),s("endpoints")},w=()=>{t==="providers"?(s("categories"),n("")):t==="endpoints"?(s("providers"),l(null)):A()};return a.jsxs("div",{className:"h-full flex flex-col",children:[a.jsxs("div",{className:"flex items-center gap-12 p-16 border-b",children:[a.jsx(ee,{size:"sm",onClick:w,children:a.jsx(Kd,{})}),a.jsxs("div",{className:"flex-1",children:[a.jsxs("h3",{className:"font-semibold",children:[t==="categories"&&a.jsx(d,{message:"API Integrations"}),t==="providers"&&a.jsx(d,{message:"{{category}} APIs",values:{category:(C=u.find(H=>H.id===i))==null?void 0:C.name}}),t==="endpoints"&&(o==null?void 0:o.name)]}),t!=="categories"&&a.jsxs("p",{className:"text-xs text-muted mt-4",children:[t==="providers"&&a.jsx(d,{message:"Choose an API provider to integrate"}),t==="endpoints"&&a.jsx(d,{message:"Select an endpoint to configure"})]})]})]}),t==="providers"&&a.jsx("div",{className:"p-16 border-b",children:a.jsx(q,{size:"sm",placeholder:"Search APIs...",value:c,onChange:H=>g(H.target.value),startAdornment:a.jsx(nn,{size:"sm"})})}),a.jsxs("div",{className:"flex-1 overflow-auto p-16",children:[t==="categories"&&a.jsx(Ky,{categories:u,onSelect:f}),t==="providers"&&a.jsx(Ry,{providers:p,onSelect:x}),t==="endpoints"&&o&&a.jsx(zy,{provider:o,onSelect:H=>e(o,H)})]})]})}function Ky({categories:e,onSelect:A}){return a.jsx("div",{className:"grid grid-cols-1 gap-12",children:e.map(t=>a.jsxs("button",{onClick:()=>A(t.id),className:"flex items-center gap-16 p-16 rounded-lg border hover:bg-hover transition-colors text-left",children:[a.jsx("div",{className:`text-2xl ${t.color}`,children:t.icon}),a.jsxs("div",{className:"flex-1",children:[a.jsx("div",{className:"font-medium",children:t.name}),a.jsxs("div",{className:"text-sm text-muted",children:[Dc(t.id).length," providers available"]})]})]},t.id))})}function Ry({providers:e,onSelect:A}){return e.length===0?a.jsxs("div",{className:"text-center py-32",children:[a.jsx(To,{className:"mx-auto text-muted mb-16",size:"xl"}),a.jsx("p",{className:"text-muted",children:a.jsx(d,{message:"No APIs found matching your search"})})]}):a.jsx("div",{className:"grid grid-cols-1 gap-12",children:e.map(t=>a.jsxs("button",{onClick:()=>A(t),className:"flex items-start gap-16 p-16 rounded-lg border hover:bg-hover transition-colors text-left",children:[a.jsxs("div",{className:"w-48 h-48 rounded-lg bg-chip flex items-center justify-center flex-shrink-0",children:[a.jsx("img",{src:t.logo,alt:t.name,className:"w-32 h-32 object-contain",onError:s=>{var n;const i=s.target;i.style.display="none",(n=i.nextElementSibling)==null||n.removeAttribute("hidden")}}),a.jsx("span",{className:"text-xs font-bold text-muted hidden",children:t.name.slice(0,2).toUpperCase()})]}),a.jsxs("div",{className:"flex-1 min-w-0",children:[a.jsxs("div",{className:"flex items-center gap-8 mb-4",children:[a.jsx("h4",{className:"font-semibold",children:t.name}),t.authType==="none"&&a.jsx("span",{className:"px-6 py-2 bg-positive/10 text-positive text-xs rounded-full",children:"Free"})]}),a.jsx("p",{className:"text-sm text-muted mb-8",children:t.description}),a.jsxs("div",{className:"flex items-center gap-16 text-xs text-muted",children:[a.jsxs("span",{children:[t.endpoints.length," endpoints"]}),t.website&&a.jsxs("button",{onClick:s=>{s.stopPropagation(),window.open(t.website,"_blank")},className:"flex items-center gap-4 hover:text-primary",children:[a.jsx(Mo,{size:"xs"}),"Website"]})]})]})]},t.id))})}function zy({provider:e,onSelect:A}){return a.jsxs("div",{className:"space-y-12",children:[a.jsxs("div",{className:"flex items-start gap-16 p-16 rounded-lg bg-chip",children:[a.jsxs("div",{className:"w-48 h-48 rounded-lg bg-background flex items-center justify-center flex-shrink-0",children:[a.jsx("img",{src:e.logo,alt:e.name,className:"w-32 h-32 object-contain",onError:t=>{var i;const s=t.target;s.style.display="none",(i=s.nextElementSibling)==null||i.removeAttribute("hidden")}}),a.jsx("span",{className:"text-xs font-bold text-muted hidden",children:e.name.slice(0,2).toUpperCase()})]}),a.jsxs("div",{className:"flex-1",children:[a.jsx("h4",{className:"font-semibold mb-4",children:e.name}),a.jsx("p",{className:"text-sm text-muted mb-8",children:e.description}),e.documentation&&a.jsx(U,{size:"xs",variant:"outline",onClick:()=>window.open(e.documentation,"_blank"),endIcon:a.jsx(Mo,{}),children:a.jsx(d,{message:"Documentation"})})]})]}),a.jsxs("div",{className:"space-y-8",children:[a.jsx("h5",{className:"font-medium",children:a.jsx(d,{message:"Available Endpoints"})}),e.endpoints.map(t=>a.jsxs("button",{onClick:()=>A(t),className:"w-full flex items-start gap-12 p-12 rounded-lg border hover:bg-hover transition-colors text-left",children:[a.jsx("div",{className:`px-6 py-2 rounded text-xs font-medium ${t.method==="GET"?"bg-blue-100 text-blue-700":t.method==="POST"?"bg-green-100 text-green-700":t.method==="PUT"?"bg-orange-100 text-orange-700":"bg-red-100 text-red-700"}`,children:t.method}),a.jsxs("div",{className:"flex-1",children:[a.jsx("h6",{className:"font-medium mb-4",children:t.name}),a.jsx("p",{className:"text-sm text-muted",children:t.description})]})]},t.id))]})]})}const Oy=[{id:"element-click",name:"Element Clicked",description:"When a specific element is clicked by the user",category:"user",icon:"TouchApp",parameters:[{name:"elementId",type:"string",required:!0,description:"The element to watch for clicks"}]},{id:"form-submit",name:"Form Submitted",description:"When a form is submitted with data",category:"user",icon:"Send",parameters:[{name:"formId",type:"string",required:!0,description:"The form to watch for submissions"}]},{id:"page-load",name:"Page Loaded",description:"When the page finishes loading",category:"user",icon:"Refresh",parameters:[]},{id:"scroll-position",name:"Scroll Position",description:"When user scrolls to a specific position",category:"user",icon:"SwipeVertical",parameters:[{name:"position",type:"number",required:!0,description:"Scroll percentage (0-100)",validation:{min:0,max:100}}]},{id:"schedule-daily",name:"Daily Schedule",description:"Run at a specific time every day",category:"timer",icon:"Schedule",parameters:[{name:"time",type:"string",required:!0,description:"Time in HH:MM format",validation:{pattern:"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}},{name:"timezone",type:"select",required:!0,description:"Timezone for execution",defaultValue:"UTC",options:["UTC","America/New_York","America/Los_Angeles","Europe/London","Asia/Tokyo"]}]},{id:"schedule-weekly",name:"Weekly Schedule",description:"Run on specific days of the week",category:"timer",icon:"CalendarToday",parameters:[{name:"days",type:"select",required:!0,description:"Days of the week",options:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]},{name:"time",type:"string",required:!0,description:"Time in HH:MM format"}]},{id:"interval",name:"Time Interval",description:"Run every X minutes/hours",category:"timer",icon:"Timer",parameters:[{name:"interval",type:"number",required:!0,description:"Interval duration",validation:{min:1}},{name:"unit",type:"select",required:!0,description:"Time unit",options:["minutes","hours","days"]}]},{id:"data-created",name:"Data Created",description:"When new data is added to a table",category:"data",icon:"Add",parameters:[{name:"tableName",type:"data-field",required:!0,description:"Database table to monitor"}]},{id:"data-updated",name:"Data Updated",description:"When existing data is modified",category:"data",icon:"Edit",parameters:[{name:"tableName",type:"data-field",required:!0,description:"Database table to monitor"},{name:"fieldName",type:"string",required:!1,description:"Specific field to watch (optional)"}]},{id:"data-deleted",name:"Data Deleted",description:"When data is removed from a table",category:"data",icon:"Delete",parameters:[{name:"tableName",type:"data-field",required:!0,description:"Database table to monitor"}]},{id:"data-threshold",name:"Data Threshold",description:"When a numeric field reaches a specific value",category:"data",icon:"TrendingUp",parameters:[{name:"tableName",type:"data-field",required:!0,description:"Database table to monitor"},{name:"fieldName",type:"string",required:!0,description:"Numeric field to monitor"},{name:"operator",type:"select",required:!0,description:"Comparison operator",options:["greater_than","less_than","equals"]},{name:"value",type:"number",required:!0,description:"Threshold value"}]},{id:"webhook-received",name:"Webhook Received",description:"When an external service sends data via webhook",category:"api",icon:"Webhook",parameters:[{name:"webhookUrl",type:"string",required:!0,description:"Unique webhook URL endpoint"},{name:"method",type:"select",required:!0,description:"HTTP method to accept",defaultValue:"POST",options:["GET","POST","PUT","DELETE"]}]},{id:"api-response",name:"API Response",description:"When an API call returns specific data",category:"api",icon:"Api",parameters:[{name:"apiConnectionId",type:"string",required:!0,description:"API connection to monitor"},{name:"responseField",type:"string",required:!1,description:"Specific response field to check"}]},{id:"user-login",name:"User Login",description:"When a user logs into the application",category:"system",icon:"Login",parameters:[]},{id:"user-logout",name:"User Logout",description:"When a user logs out of the application",category:"system",icon:"Logout",parameters:[]},{id:"error-occurred",name:"Error Occurred",description:"When an error happens in the application",category:"system",icon:"Error",parameters:[{name:"errorType",type:"select",required:!1,description:"Type of error to watch for",options:["api_error","validation_error","system_error","user_error"]}]}];function fi(e){return Oy.filter(A=>A.category===e)}function Py(e){const A=[],t=e.getAttribute("href");if(t)if(t.startsWith("mailto:")){const s=t.replace("mailto:","").split("?")[0];A.push({type:"email",label:"Open Email",value:s})}else if(t.startsWith("tel:")){const s=t.replace("tel:","");A.push({type:"phone",label:"Make Phone Call",value:s})}else A.push({type:"navigate",label:"Navigate to URL",value:t,target:e.getAttribute("target")||"_self"});if(e.nodeName==="FORM"){const s=e.getAttribute("action");s&&A.push({type:"form",label:"Form Submission",value:s})}return A}function Vy(){const e=J(A=>A.selectedContext);return a.jsxs("div",{children:[a.jsx(CA,{children:a.jsx(d,{message:"Actions"})}),e?a.jsxs("div",{className:"px-12",children:[a.jsx(Gy,{}),a.jsxs(vA,{mode:"multiple",defaultExpandedValues:[0,1],children:[a.jsx(Fe,{label:a.jsx(d,{message:"Click Actions"}),children:a.jsx(_y,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"Hover Actions"}),children:a.jsx(qy,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"Form Actions"}),children:a.jsx(Wy,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"Animation Actions"}),children:a.jsx(Xy,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"API Actions"}),children:a.jsx(Yy,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"Automation Triggers"}),children:a.jsx(Jy,{})}),a.jsx(Fe,{label:a.jsx(d,{message:"Smart Navigation"}),children:a.jsx($y,{})})]})]}):a.jsx(t2,{})]})}function Gy(){const e=J(A=>A.selectedContext);return e?a.jsxs("div",{className:"mb-20 rounded border bg-chip p-12",children:[a.jsx("div",{className:"mb-8 text-sm font-medium",children:a.jsx(d,{message:"Selected Element"})}),a.jsx("div",{className:"text-xs text-muted",children:e.el.name}),a.jsx("div",{className:"mt-8 text-xs text-muted",children:a.jsx(d,{message:"Configure actions and behaviors for this element"})})]}):null}function _y(){const e=J(g=>g.selectedContext),[A,t]=h.useState(!1),[s,i]=h.useState(""),n=Te(),o=g=>{i(g),t(!0)},l=g=>{console.log("Saving action:",s,g),t(!1),n.reset()},c=e?Py(e.node):[];return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Define what happens when the element is clicked"})}),c.length>0&&a.jsxs("div",{className:"space-y-8",children:[a.jsx("div",{className:"text-xs font-medium text-muted",children:a.jsx(d,{message:"Current Actions"})}),c.map((g,u)=>a.jsx(e2,{action:g,onEdit:()=>{i(g.type),t(!0)},onDelete:()=>{console.log("Delete action:",g)}},u))]}),a.jsxs("div",{className:"space-y-8",children:[a.jsx("div",{className:"text-xs font-medium text-muted",children:a.jsx(d,{message:"Add New Actions"})}),a.jsx(je,{icon:a.jsx(zt,{size:"sm"}),title:"Navigate to URL",description:"Redirect to another page or website",onAdd:()=>o("navigate")}),a.jsx(je,{icon:a.jsx(bA,{size:"sm"}),title:"Open Email",description:"Open default email client",onAdd:()=>o("email")}),a.jsx(je,{icon:a.jsx(Do,{size:"sm"}),title:"Make Phone Call",description:"Initiate phone call on mobile devices",onAdd:()=>o("phone")}),a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Trigger Animation",description:"Play a custom animation",onAdd:()=>o("animation")})]}),a.jsx(ue,{type:"modal",isOpen:A,onClose:()=>t(!1),children:a.jsxs(me,{children:[a.jsx(se,{children:a.jsx(d,{message:"Configure Action"})}),a.jsx(te,{children:a.jsx(De,{form:n,onSubmit:l,children:a.jsx(Zy,{actionType:s})})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:()=>t(!1),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:n.handleSubmit(l),children:a.jsx(d,{message:"Save Action"})})]})]})})]})}function qy(){const[e,A]=h.useState(!1),[t,s]=h.useState(""),i=Te(),n=l=>{s(l),A(!0)},o=l=>{console.log("Saving hover action:",t,l),A(!1),i.reset()};return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Define what happens when the element is hovered"})}),a.jsxs("div",{className:"space-y-8",children:[a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Show Tooltip",description:"Display additional information on hover",onAdd:()=>n("tooltip")}),a.jsx(je,{icon:a.jsx(rt,{size:"sm"}),title:"Change Style",description:"Modify appearance on hover",onAdd:()=>n("style")}),a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Scale Effect",description:"Grow or shrink element on hover",onAdd:()=>n("scale")})]}),a.jsx(ue,{type:"modal",isOpen:e,onClose:()=>A(!1),children:a.jsxs(me,{children:[a.jsx(se,{children:a.jsx(d,{message:"Configure Hover Action"})}),a.jsx(te,{children:a.jsx(De,{form:i,onSubmit:o,children:a.jsx(A2,{actionType:t})})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:()=>A(!1),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:i.handleSubmit(o),children:a.jsx(d,{message:"Save Action"})})]})]})})]})}function Wy(){const[e,A]=h.useState(!1),[t,s]=h.useState(""),i=Te(),n=l=>{s(l),A(!0)},o=l=>{console.log("Saving form action:",t,l),A(!1),i.reset()};return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Configure form submission and validation"})}),a.jsxs("div",{className:"space-y-8",children:[a.jsx(je,{icon:a.jsx(bA,{size:"sm"}),title:"Email Submission",description:"Send form data via email",onAdd:()=>n("email")}),a.jsx(je,{icon:a.jsx(zt,{size:"sm"}),title:"Webhook URL",description:"POST data to external service",onAdd:()=>n("webhook")}),a.jsx(je,{icon:a.jsx(rt,{size:"sm"}),title:"Form Validation",description:"Add client-side validation rules",onAdd:()=>n("validation")})]}),a.jsx(ue,{type:"modal",isOpen:e,onClose:()=>A(!1),children:a.jsxs(me,{children:[a.jsx(se,{children:a.jsx(d,{message:"Configure Form Action"})}),a.jsx(te,{children:a.jsx(De,{form:i,onSubmit:o,children:a.jsx(a2,{actionType:t})})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:()=>A(!1),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:i.handleSubmit(o),children:a.jsx(d,{message:"Save Action"})})]})]})})]})}function Xy(){const[e,A]=h.useState(!1),[t,s]=h.useState(""),i=Te(),n=l=>{s(l),A(!0)},o=l=>{console.log("Saving animation action:",t,l),A(!1),i.reset()};return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Add animations and transitions"})}),a.jsxs("div",{className:"space-y-8",children:[a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Fade In",description:"Element fades in when scrolled into view",onAdd:()=>n("fade")}),a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Slide Animation",description:"Element slides in from specified direction",onAdd:()=>n("slide")}),a.jsx(je,{icon:a.jsx(Jt,{size:"sm"}),title:"Bounce Effect",description:"Element bounces when triggered",onAdd:()=>n("bounce")})]}),a.jsx(ue,{type:"modal",isOpen:e,onClose:()=>A(!1),children:a.jsxs(me,{children:[a.jsx(se,{children:a.jsx(d,{message:"Configure Animation"})}),a.jsx(te,{children:a.jsx(De,{form:i,onSubmit:o,children:a.jsx(s2,{actionType:t})})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:()=>A(!1),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:i.handleSubmit(o),children:a.jsx(d,{message:"Save Animation"})})]})]})})]})}function Yy(){const[e,A]=h.useState(!1);h.useState(null);const t=(s,i)=>{console.log("Selected API:",s,i),A(!1)};return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Connect to external APIs and services"})}),e?a.jsx(My,{onEndpointSelect:t,onBack:()=>A(!1)}):a.jsx("div",{className:"space-y-8",children:a.jsx(je,{icon:a.jsx(To,{size:"sm"}),title:"Browse API Integrations",description:"Connect to OpenAI, Twilio, Weather APIs and more",onAdd:()=>A(!0)})})]})}function Jy(){const[e,A]=h.useState(null),t=fi("user"),s=fi("timer"),i=fi("data"),n=o=>{A(o),console.log("Adding trigger:",o)};return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Set up automation triggers for this element"})}),a.jsxs("div",{children:[a.jsxs("div",{className:"mb-8 flex items-center gap-8 text-xs font-medium text-muted",children:[a.jsx(xA,{size:"xs"}),a.jsx(d,{message:"User Interactions"})]}),a.jsx("div",{className:"space-y-6",children:t.slice(0,2).map(o=>a.jsx(je,{icon:a.jsx(xA,{size:"sm"}),title:o.name,description:o.description,onAdd:()=>n(o)},o.id))})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"mb-8 flex items-center gap-8 text-xs font-medium text-muted",children:[a.jsx(Tn,{size:"xs"}),a.jsx(d,{message:"Scheduled Events"})]}),a.jsx("div",{className:"space-y-6",children:s.slice(0,2).map(o=>a.jsx(je,{icon:a.jsx(Tn,{size:"sm"}),title:o.name,description:o.description,onAdd:()=>n(o)},o.id))})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"mb-8 flex items-center gap-8 text-xs font-medium text-muted",children:[a.jsx(Kt,{size:"xs"}),a.jsx(d,{message:"Data Events"})]}),a.jsx("div",{className:"space-y-6",children:i.slice(0,2).map(o=>a.jsx(je,{icon:a.jsx(Kt,{size:"sm"}),title:o.name,description:o.description,onAdd:()=>n(o)},o.id))})]}),a.jsx(U,{variant:"outline",size:"sm",startIcon:a.jsx(Ot,{}),className:"w-full",children:a.jsx(d,{message:"Add Custom Trigger"})})]})}function $y(){const[e,A]=h.useState(!1),[t,s]=h.useState(""),i=Te(),n=c=>{s(c),A(!0)},o=c=>{console.log("Saving navigation action:",t,c),A(!1),i.reset()},l=[{id:"data-driven-navigation",title:"Data-Driven Navigation",description:"Navigate with data - like clicking a list item to see its details",icon:a.jsx(Kt,{})},{id:"user-driven-navigation",title:"User-Driven Navigation",description:"Navigate based on who the user is - bring their personal data along",icon:a.jsx(no,{})}];return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm text-muted",children:a.jsx(d,{message:"Create smart navigation that carries data and user context between pages"})}),a.jsx("div",{className:"grid gap-8",children:l.map(c=>a.jsx(je,{icon:c.icon,title:c.title,description:c.description,onAdd:()=>n(c.id)},c.id))}),a.jsx(ue,{type:"modal",isOpen:e,onOpenChange:A,children:a.jsxs(me,{size:"lg",children:[a.jsx(se,{children:a.jsx(d,{message:"Configure Navigation Action"})}),a.jsx(te,{children:a.jsxs(De,{form:i,onSubmit:o,children:[t==="data-driven-navigation"&&a.jsx(i2,{onSubmit:o}),t==="user-driven-navigation"&&a.jsx(n2,{onSubmit:o})]})})]})})]})}function Zy({actionType:e}){switch(e){case"navigate":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"url",label:a.jsx(d,{message:"URL"}),placeholder:"https://example.com",required:!0}),a.jsx(q,{name:"target",label:a.jsx(d,{message:"Open in"}),placeholder:"_self or _blank"})]});case"email":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"email",label:a.jsx(d,{message:"Email address"}),placeholder:"contact@example.com",required:!0}),a.jsx(q,{name:"subject",label:a.jsx(d,{message:"Subject (optional)"}),placeholder:"Subject line"})]});case"phone":return a.jsx(q,{name:"phone",label:a.jsx(d,{message:"Phone number"}),placeholder:"+1234567890",required:!0});case"animation":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"animation",label:a.jsx(d,{message:"Animation type"}),placeholder:"fadeIn, slideUp, bounce"}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Duration (ms)"}),placeholder:"300",type:"number"})]});default:return null}}function e2({action:e,onEdit:A,onDelete:t}){const s=i=>{switch(i){case"navigate":return a.jsx(zt,{size:"sm"});case"email":return a.jsx(bA,{size:"sm"});case"phone":return a.jsx(Do,{size:"sm"});case"form":return a.jsx(bA,{size:"sm"});default:return a.jsx(Jt,{size:"sm"})}};return a.jsxs("div",{className:"flex items-start gap-8 rounded border border-primary/20 bg-primary/5 p-8",children:[a.jsx("div",{className:"mt-2 flex-shrink-0 text-primary",children:s(e.type)}),a.jsxs("div",{className:"min-w-0 flex-1",children:[a.jsx("div",{className:"text-sm font-medium",children:e.label}),a.jsxs("div",{className:"text-xs text-muted",children:[e.value,e.target&&e.target!=="_self"&&a.jsxs("span",{className:"ml-1",children:["(",e.target,")"]})]})]}),a.jsxs("div",{className:"flex gap-4",children:[a.jsx(ee,{size:"xs",onClick:A,children:a.jsx(rt,{size:"xs"})}),a.jsx(ee,{size:"xs",onClick:t,children:a.jsx(bs,{size:"xs"})})]})]})}function je({icon:e,title:A,description:t,onEdit:s,onDelete:i,onAdd:n}){return a.jsxs("div",{className:"flex items-start gap-8 rounded border p-8 hover:bg-hover",children:[a.jsx("div",{className:"mt-2 flex-shrink-0 text-muted",children:e}),a.jsxs("div",{className:"min-w-0 flex-1",children:[a.jsx("div",{className:"text-sm font-medium",children:A}),a.jsx("div",{className:"text-xs text-muted",children:t})]}),a.jsxs("div",{className:"flex gap-4",children:[n&&a.jsx(U,{size:"xs",variant:"outline",onClick:n,children:a.jsx(d,{message:"Add"})}),s&&a.jsx(ee,{size:"xs",onClick:s,children:a.jsx(rt,{size:"xs"})}),i&&a.jsx(ee,{size:"xs",onClick:i,children:a.jsx(bs,{size:"xs"})})]})]})}function t2(){return a.jsx("div",{className:"flex h-full items-center justify-center p-20",children:a.jsx(tn,{size:"xs",image:a.jsx(xs,{src:xc}),title:a.jsx(d,{message:"No element selected"}),description:a.jsx(d,{message:"Select an element to configure its actions and behaviors"})})})}function A2({actionType:e}){switch(e){case"tooltip":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"text",label:a.jsx(d,{message:"Tooltip Text"}),placeholder:"Enter tooltip content",required:!0}),a.jsxs(Qe,{name:"position",label:a.jsx(d,{message:"Position"}),selectionMode:"single",children:[a.jsx(k,{value:"top",children:"Top"}),a.jsx(k,{value:"bottom",children:"Bottom"}),a.jsx(k,{value:"left",children:"Left"}),a.jsx(k,{value:"right",children:"Right"})]})]});case"style":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"property",label:a.jsx(d,{message:"CSS Property"}),placeholder:"background-color, transform, etc.",required:!0}),a.jsx(q,{name:"value",label:a.jsx(d,{message:"Hover Value"}),placeholder:"red, scale(1.1), etc.",required:!0}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Transition Duration"}),placeholder:"0.3s",defaultValue:"0.3s"})]});case"scale":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"scale",label:a.jsx(d,{message:"Scale Factor"}),placeholder:"1.1 for 10% larger",type:"number",step:"0.1",defaultValue:"1.1"}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Duration"}),placeholder:"0.3s",defaultValue:"0.3s"})]});default:return null}}function a2({actionType:e}){switch(e){case"email":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"recipient",label:a.jsx(d,{message:"Recipient Email"}),placeholder:"admin@example.com",type:"email",required:!0}),a.jsx(q,{name:"subject",label:a.jsx(d,{message:"Email Subject"}),placeholder:"New form submission",required:!0}),a.jsx(q,{name:"template",label:a.jsx(d,{message:"Email Template"}),placeholder:"Custom email template (optional)"})]});case"webhook":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"url",label:a.jsx(d,{message:"Webhook URL"}),placeholder:"https://api.example.com/webhook",type:"url",required:!0}),a.jsxs(Qe,{name:"method",label:a.jsx(d,{message:"HTTP Method"}),selectionMode:"single",children:[a.jsx(k,{value:"POST",children:"POST"}),a.jsx(k,{value:"PUT",children:"PUT"}),a.jsx(k,{value:"PATCH",children:"PATCH"})]}),a.jsx(q,{name:"headers",label:a.jsx(d,{message:"Custom Headers (JSON)"}),placeholder:'{"Authorization": "Bearer token"}'})]});case"validation":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"field",label:a.jsx(d,{message:"Field Name"}),placeholder:"email, name, etc.",required:!0}),a.jsxs(Qe,{name:"rule",label:a.jsx(d,{message:"Validation Rule"}),selectionMode:"single",children:[a.jsx(k,{value:"required",children:"Required"}),a.jsx(k,{value:"email",children:"Email Format"}),a.jsx(k,{value:"minLength",children:"Minimum Length"}),a.jsx(k,{value:"maxLength",children:"Maximum Length"}),a.jsx(k,{value:"pattern",children:"Custom Pattern"})]}),a.jsx(q,{name:"value",label:a.jsx(d,{message:"Rule Value"}),placeholder:"Depends on rule type"}),a.jsx(q,{name:"message",label:a.jsx(d,{message:"Error Message"}),placeholder:"This field is required"})]});default:return null}}function s2({actionType:e}){switch(e){case"fade":return a.jsxs("div",{className:"space-y-16",children:[a.jsxs(Qe,{name:"trigger",label:a.jsx(d,{message:"Trigger"}),selectionMode:"single",children:[a.jsx(k,{value:"scroll",children:"On Scroll Into View"}),a.jsx(k,{value:"load",children:"On Page Load"}),a.jsx(k,{value:"click",children:"On Click"})]}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Duration (ms)"}),placeholder:"1000",type:"number",defaultValue:"1000"}),a.jsx(q,{name:"delay",label:a.jsx(d,{message:"Delay (ms)"}),placeholder:"0",type:"number",defaultValue:"0"})]});case"slide":return a.jsxs("div",{className:"space-y-16",children:[a.jsxs(Qe,{name:"direction",label:a.jsx(d,{message:"Direction"}),selectionMode:"single",children:[a.jsx(k,{value:"up",children:"Slide Up"}),a.jsx(k,{value:"down",children:"Slide Down"}),a.jsx(k,{value:"left",children:"Slide Left"}),a.jsx(k,{value:"right",children:"Slide Right"})]}),a.jsx(q,{name:"distance",label:a.jsx(d,{message:"Distance (px)"}),placeholder:"100",type:"number",defaultValue:"100"}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Duration (ms)"}),placeholder:"800",type:"number",defaultValue:"800"})]});case"bounce":return a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{name:"intensity",label:a.jsx(d,{message:"Bounce Intensity"}),placeholder:"1.2 for 20% bounce",type:"number",step:"0.1",defaultValue:"1.2"}),a.jsx(q,{name:"duration",label:a.jsx(d,{message:"Duration (ms)"}),placeholder:"600",type:"number",defaultValue:"600"}),a.jsx(q,{name:"repeat",label:a.jsx(d,{message:"Repeat Count"}),placeholder:"1",type:"number",defaultValue:"1"})]});default:return null}}function i2({onSubmit:e}){const[A,t]=h.useState(""),[s,i]=h.useState(""),[n,o]=h.useState(""),[l,c]=h.useState("click"),g=()=>{e({type:"data-driven-navigation",config:{targetPage:A,dataSource:s,dataField:n,trigger:l}})};return a.jsxs("div",{className:"space-y-20",children:[a.jsxs("div",{className:"rounded-lg bg-primary/5 p-16",children:[a.jsx("h4",{className:"mb-8 font-medium text-primary",children:a.jsx(d,{message:"How Data-Driven Navigation Works"})}),a.jsxs("div",{className:"space-y-8 text-sm text-muted",children:[a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium",children:"1"}),a.jsx("div",{children:a.jsx(d,{message:"User clicks on this element (like a list item or card)"})})]}),a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium",children:"2"}),a.jsx("div",{children:a.jsx(d,{message:"The data from that item gets picked up (like the contact's name, ID, etc.)"})})]}),a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium",children:"3"}),a.jsx("div",{children:a.jsx(d,{message:"Navigate to the target page with that data available to use"})})]})]})]}),a.jsxs("div",{className:"grid grid-cols-2 gap-16",children:[a.jsx(q,{label:a.jsx(d,{message:"What triggers the navigation?"}),value:l,onChange:u=>c(u.target.value),placeholder:"click, double-click, hover"}),a.jsx(q,{label:a.jsx(d,{message:"Which page to go to?"}),value:A,onChange:u=>t(u.target.value),placeholder:"contact-details, product-page, user-profile"})]}),a.jsxs("div",{className:"grid grid-cols-2 gap-16",children:[a.jsx(q,{label:a.jsx(d,{message:"What data to bring along?"}),value:s,onChange:u=>i(u.target.value),placeholder:"contacts, products, users"}),a.jsx(q,{label:a.jsx(d,{message:"Which field identifies the item?"}),value:n,onChange:u=>o(u.target.value),placeholder:"id, slug, email"})]}),A&&s&&a.jsxs("div",{className:"rounded-lg border bg-background p-12",children:[a.jsx("h5",{className:"mb-8 font-medium",children:a.jsx(d,{message:"Preview"})}),a.jsx("p",{className:"text-sm text-muted",children:a.jsx(d,{message:"When someone :trigger this element, they'll go to ':page' with the :data data loaded and ready to use.",values:{trigger:l==="click"?"clicks":l+"s",page:A,data:s}})})]}),a.jsx("div",{className:"flex justify-end gap-8",children:a.jsx(U,{variant:"flat",color:"primary",onClick:g,children:a.jsx(d,{message:"Add Navigation Action"})})})]})}function n2({onSubmit:e}){const[A,t]=h.useState(""),[s,i]=h.useState([]),[n,o]=h.useState("click"),[l,c]=h.useState("user-specific"),g=[{id:"profile",name:"Profile Info",description:"Name, email, avatar"},{id:"preferences",name:"User Preferences",description:"Settings, theme, language"},{id:"activity",name:"User Activity",description:"Recent actions, history"},{id:"relationships",name:"User Relationships",description:"Friends, contacts, teams"}],u=()=>{e({type:"user-driven-navigation",config:{targetPage:A,userDataToInclude:s,trigger:n,filterType:l}})};return a.jsxs("div",{className:"space-y-20",children:[a.jsxs("div",{className:"rounded-lg bg-positive/5 p-16",children:[a.jsx("h4",{className:"mb-8 font-medium text-positive",children:a.jsx(d,{message:"How User-Driven Navigation Works"})}),a.jsxs("div",{className:"space-y-8 text-sm text-muted",children:[a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium",children:"1"}),a.jsx("div",{children:a.jsx(d,{message:"User clicks this element (like 'My Dashboard' or 'My Orders')"})})]}),a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium",children:"2"}),a.jsx("div",{children:a.jsx(d,{message:"The system knows who the user is and grabs their personal data"})})]}),a.jsxs("div",{className:"flex items-start gap-8",children:[a.jsx("div",{className:"mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium",children:"3"}),a.jsx("div",{children:a.jsx(d,{message:"Navigate to the page with only their data showing (like only their orders)"})})]})]})]}),a.jsxs("div",{className:"grid grid-cols-2 gap-16",children:[a.jsx(q,{label:a.jsx(d,{message:"What triggers the navigation?"}),value:n,onChange:p=>o(p.target.value),placeholder:"click, double-click"}),a.jsx(q,{label:a.jsx(d,{message:"Which page to go to?"}),value:A,onChange:p=>t(p.target.value),placeholder:"my-dashboard, my-orders, my-profile"})]}),a.jsxs("div",{children:[a.jsx("label",{className:"mb-8 block text-sm font-medium",children:a.jsx(d,{message:"What user data should be available on the target page?"})}),a.jsx("div",{className:"grid grid-cols-2 gap-8",children:g.map(p=>a.jsxs("label",{className:"flex items-start gap-8 rounded border p-12 hover:bg-hover cursor-pointer",children:[a.jsx("input",{type:"checkbox",checked:s.includes(p.id),onChange:f=>{f.target.checked?i([...s,p.id]):i(s.filter(x=>x!==p.id))},className:"mt-2"}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:p.name}),a.jsx("div",{className:"text-xs text-muted",children:p.description})]})]},p.id))})]}),a.jsxs("div",{children:[a.jsx("label",{className:"mb-8 block text-sm font-medium",children:a.jsx(d,{message:"How should the data be filtered?"})}),a.jsxs("div",{className:"space-y-8",children:[a.jsxs("label",{className:"flex items-center gap-8 cursor-pointer",children:[a.jsx("input",{type:"radio",name:"filterType",value:"user-specific",checked:l==="user-specific",onChange:p=>c(p.target.value)}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:a.jsx(d,{message:"Show only this user's data"})}),a.jsx("div",{className:"text-xs text-muted",children:a.jsx(d,{message:"Like showing only their orders, their contacts, their files"})})]})]}),a.jsxs("label",{className:"flex items-center gap-8 cursor-pointer",children:[a.jsx("input",{type:"radio",name:"filterType",value:"personalized",checked:l==="personalized",onChange:p=>c(p.target.value)}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:a.jsx(d,{message:"Show personalized content"})}),a.jsx("div",{className:"text-xs text-muted",children:a.jsx(d,{message:"Like recommendations, suggested content, customized dashboard"})})]})]})]})]}),A&&s.length>0&&a.jsxs("div",{className:"rounded-lg border bg-background p-12",children:[a.jsx("h5",{className:"mb-8 font-medium",children:a.jsx(d,{message:"Preview"})}),a.jsx("p",{className:"text-sm text-muted",children:a.jsx(d,{message:"When someone clicks this, they'll go to ':page' with their :data loaded and :filter.",values:{page:A,data:s.join(", "),filter:l==="user-specific"?"showing only their personal data":"showing personalized content"}})})]}),a.jsx("div",{className:"flex justify-end gap-8",children:a.jsx(U,{variant:"flat",color:"primary",onClick:u,disabled:!A||s.length===0,children:a.jsx(d,{message:"Add User Navigation Action"})})})]})}function r2(e){return Pe.get(`projects/${e}/automation`).then(A=>A.data)}function o2(e,A){return Pe.post(`projects/${e}/automation`,{automation:A}).then(t=>t.data)}function l2(e,A){return Pe.post(`projects/${e}/automation/triggers`,A).then(t=>t.data)}function c2(e,A){return Pe.post(`projects/${e}/automation/data-tables`,A).then(t=>t.data)}function d2(e,A){return Pe.delete(`projects/${e}/automation/data-tables/${A}`).then(t=>t.data)}function u2(e,A){return Pe.post(`projects/${e}/automation/data-bindings`,A).then(t=>t.data)}function g2(e,A){return Pe.post(`projects/${e}/automation/external-connections`,A).then(t=>t.data)}function p2(e,A,t){return Pe.post(`projects/${e}/automation/test-connection`,{type:A,config:t}).then(s=>s.data)}function m2(e){return Pe.post(`projects/${e}/automation/setup-database`).then(A=>A.data)}function Mc(){var p,f;const e=J(x=>{var w,C;return(C=(w=x.project)==null?void 0:w.model)==null?void 0:C.id}),A=so(),t=io({queryKey:["automation",e],queryFn:()=>r2(e),enabled:!!e,staleTime:5*60*1e3}),s=We({mutationFn:x=>o2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Automation data saved successfully"))},onError:x=>{K(v("Failed to save automation data: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),i=We({mutationFn:x=>l2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Trigger saved successfully"))},onError:x=>{K(v("Failed to save trigger: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),n=We({mutationFn:x=>c2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Data table created successfully"))},onError:x=>{K(v("Failed to create data table: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),o=We({mutationFn:x=>d2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Data table deleted successfully"))},onError:x=>{K(v("Failed to delete data table: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),l=We({mutationFn:x=>u2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Data binding created successfully"))},onError:x=>{K(v("Failed to create data binding: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),c=We({mutationFn:x=>g2(e,x),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("External connection saved successfully"))},onError:x=>{K(v("Failed to save connection: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),g=We({mutationFn:({type:x,config:w})=>p2(e,x,w),onError:x=>{K(v("Connection test failed: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}}),u=We({mutationFn:()=>m2(e),onSuccess:()=>{A.invalidateQueries({queryKey:["automation",e]}),K(v("Automation database setup completed"))},onError:x=>{K(v("Failed to setup database: :error",{values:{error:(x==null?void 0:x.message)||"Unknown error"}}))}});return{data:(p=t.data)==null?void 0:p.automation,isLoading:t.isLoading,error:t.error,saveAutomation:s.mutate,isSaving:s.isPending,addTrigger:i.mutate,isAddingTrigger:i.isPending,addDataTable:n.mutate,isAddingTable:n.isPending,deleteDataTable:o.mutate,isDeletingTable:o.isPending,addDataBinding:l.mutate,isAddingBinding:l.isPending,addConnection:c.mutate,isAddingConnection:c.isPending,testConnection:g.mutate,isTestingConnection:g.isPending,connectionTestResult:(f=g.data)==null?void 0:f.result,setupDatabase:u.mutate,isSettingUpDatabase:u.isPending}}const h2=[{id:"users",name:"users",displayName:"Users",description:"User accounts and profiles",isSystem:!0,createdAt:new Date,updatedAt:new Date,fields:[{id:"id",name:"id",type:"decimal",description:"Unique identifier"},{id:"name",name:"name",type:"text",description:"Full name"},{id:"email",name:"email",type:"email",description:"Email address"},{id:"avatar",name:"avatar",type:"image",description:"Profile picture"},{id:"role",name:"role",type:"select",description:"User role"},{id:"created_at",name:"created_at",type:"datetime",description:"Registration date"},{id:"last_login",name:"last_login",type:"datetime",description:"Last login time"}]},{id:"contacts",name:"contacts",displayName:"Contacts",description:"Contact information and details",isSystem:!0,createdAt:new Date,updatedAt:new Date,fields:[{id:"id",name:"id",type:"decimal",description:"Unique identifier"},{id:"first_name",name:"first_name",type:"text",description:"First name"},{id:"last_name",name:"last_name",type:"text",description:"Last name"},{id:"email",name:"email",type:"email",description:"Email address"},{id:"phone",name:"phone",type:"phone",description:"Phone number"},{id:"company",name:"company",type:"text",description:"Company name"},{id:"position",name:"position",type:"text",description:"Job position"},{id:"notes",name:"notes",type:"textarea",description:"Additional notes"}]},{id:"products",name:"products",displayName:"Products",description:"Product catalog and inventory",isSystem:!0,createdAt:new Date,updatedAt:new Date,fields:[{id:"id",name:"id",type:"decimal",description:"Unique identifier"},{id:"name",name:"name",type:"text",description:"Product name"},{id:"description",name:"description",type:"textarea",description:"Product description"},{id:"price",name:"price",type:"decimal",description:"Product price"},{id:"category",name:"category",type:"select",description:"Product category"},{id:"image",name:"image",type:"image",description:"Product image"},{id:"stock",name:"stock",type:"decimal",description:"Stock quantity"},{id:"featured",name:"featured",type:"boolean",description:"Featured product"}]},{id:"orders",name:"orders",displayName:"Orders",description:"Customer orders and transactions",isSystem:!0,createdAt:new Date,updatedAt:new Date,fields:[{id:"id",name:"id",type:"decimal",description:"Order ID"},{id:"customer_name",name:"customer_name",type:"text",description:"Customer name"},{id:"customer_email",name:"customer_email",type:"email",description:"Customer email"},{id:"total",name:"total",type:"decimal",description:"Order total"},{id:"status",name:"status",type:"select",description:"Order status"},{id:"order_date",name:"order_date",type:"datetime",description:"Order date"},{id:"shipping_address",name:"shipping_address",type:"textarea",description:"Shipping address"}]},{id:"blog_posts",name:"blog_posts",displayName:"Blog Posts",description:"Blog articles and content",isSystem:!0,createdAt:new Date,updatedAt:new Date,fields:[{id:"id",name:"id",type:"decimal",description:"Post ID"},{id:"title",name:"title",type:"text",description:"Post title"},{id:"content",name:"content",type:"textarea",description:"Post content"},{id:"author",name:"author",type:"text",description:"Author name"},{id:"published_at",name:"published_at",type:"datetime",description:"Publication date"},{id:"featured_image",name:"featured_image",type:"image",description:"Featured image"},{id:"tags",name:"tags",type:"text",description:"Post tags"}]}],Kc=[{id:"contact_form",name:"Contact Form",fields:[{name:"name",type:"text",required:!0},{name:"email",type:"email",required:!0},{name:"message",type:"textarea",required:!0}]},{id:"product_catalog",name:"Product Catalog",fields:[{name:"name",type:"text",required:!0},{name:"price",type:"decimal",required:!0},{name:"description",type:"textarea",required:!1},{name:"image",type:"image",required:!1}]}],GA={getAll:()=>[{id:1,name:"Element Clicked",description:"When user clicks on element",category:"user",parameters:[]},{id:2,name:"Form Submitted",description:"When form is submitted",category:"user",parameters:[]},{id:3,name:"Daily Schedule",description:"Run at specific time every day",category:"schedule",parameters:[]},{id:4,name:"Data Created",description:"When new data is added",category:"data",parameters:[]}],getByCategory:e=>GA.getAll().filter(A=>A.category===e)},f2=[{value:"text",label:"Text"},{value:"textarea",label:"Long Text"},{value:"decimal",label:"Number"},{value:"boolean",label:"True/False"},{value:"date",label:"Date"},{value:"datetime",label:"Date & Time"},{value:"email",label:"Email"},{value:"url",label:"URL"},{value:"phone",label:"Phone"},{value:"select",label:"Select"},{value:"multiselect",label:"Multi Select"},{value:"image",label:"Image"},{value:"file",label:"File"},{value:"json",label:"JSON"},{value:"reference",label:"Reference"}];function x2(){const[e,A]=h.useState(""),[t,s]=h.useState(null),[i,n]=h.useState(null);h.useState("tables");const[o,l]=h.useState(null);h.useState(!1),h.useState(!1);const[c,g]=h.useState(!1);J(m=>{var b;return(b=m.selectedContext)==null?void 0:b.node});const{data:u,addDataTable:p,deleteDataTable:f,addTrigger:x,isAddingTable:w,isAddingTrigger:C,isDeletingTable:H}=Mc(),j=h.useMemo(()=>{const b=((u==null?void 0:u.dataSchema)||[]).map(y=>{var N;return{id:y.id||y.name,name:y.name,displayName:y.displayName||y.name,description:y.description||"",isSystem:!1,fields:((N=y.fields)==null?void 0:N.map(M=>({id:M.id||M.name,name:M.name,type:M.type,required:M.required||!1})))||[]}});return[...h2,...b]},[u==null?void 0:u.dataSchema]),E={mutateAsync:async m=>await p(m),isPending:w},V={mutateAsync:async m=>await f(m),mutate:m=>{f(m)},isPending:H},T=h.useCallback((m,b)=>{(b==null?void 0:b.mode)==="edit-fields"?(s("edit-fields"),n(b)):(s(m),n(b))},[]),I=h.useCallback(()=>{s(null),n(null)},[]),Q=h.useCallback(async m=>{try{const b=m.name.toLowerCase().replace(/\s+/g,"_");if(!b.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)){K(v("Table name must start with a letter or underscore and contain only letters, numbers, and underscores"));return}const y={name:b,displayName:m.name,description:m.description||`Custom table: ${m.name}`,fields:[{name:"id",type:"decimal",required:!0},{name:"title",type:"text",required:!0},{name:"content",type:"textarea",required:!1},{name:"status",type:"text",required:!0},{name:"created_at",type:"datetime",required:!0}]};await E.mutateAsync(y),K(v("Custom table created successfully!")),I()}catch(b){console.error("Failed to create table:",b),K(v("Failed to create table: :error",{values:{error:String(b)||"Unknown error"}}))}},[E,I]),P=h.useCallback(async m=>{try{const b=m.name.toLowerCase().replace(/\s+/g,"_");if(!b.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)){K(v("Table name must start with a letter or underscore and contain only letters, numbers, and underscores"));return}const y={name:b,displayName:m.name,description:`Table created from ${m.name} template`,fields:m.fields.map(N=>({name:N.name,type:N.type==="number"?"decimal":N.type,required:N.required??!0}))};await E.mutateAsync(y),K(v("Table created successfully")),I()}catch(b){console.error("Failed to create table from template:",b),K(v("Failed to create table: :error",{values:{error:String(b)||"Unknown error"}}))}},[E,I]),_=h.useCallback(async(m,b)=>{if(!b.name||!b.type){K(v("Field name and type are required"));return}if(!b.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)){K(v("Field name must start with a letter or underscore and contain only letters, numbers, and underscores"));return}try{const y={...m,id:m.id||m.name,fields:[...m.fields,{name:b.name,type:b.type,required:b.required||!1}]};await E.mutateAsync(y),K(v("Field added successfully")),n(y)}catch(y){console.error("Failed to add field:",y),K(v("Failed to add field: :error",{values:{error:String(y)||"Unknown error"}}))}},[E]),z=h.useCallback(async(m,b)=>{if(b<2){K(v("Cannot delete core fields"));return}try{const y=[...m.fields];y.splice(b,1);const N={...m,id:m.id||m.name,fields:y};await E.mutateAsync(N),K(v("Field deleted successfully")),n(N)}catch(y){console.error("Failed to delete field:",y),K(v("Failed to delete field: :error",{values:{error:String(y)||"Unknown error"}}))}},[E]),$=h.useCallback(()=>{try{const m=/^[\+]?[1-9][\d]{0,15}$/,y="+1234567890".replace(/[\s\-()]/g,"");m.test(y)&&(console.log("✅ Test button clicked! Modal system working"),console.log("✅ Regex fixed successfully"),console.log("✅ Phone validation passed:",y),K(v("Data integration test passed!")))}catch(m){console.error("❌ Test failed:",m),K(v("Test failed: :error",{values:{error:String(m)||"Unknown error"}}))}},[]);h.useCallback(async m=>{if(m.status==="coming-soon"){K(v("This integration is coming soon!"));return}if(m.id==="google_sheets"){S();return}if(m.id==="airtable"){n({...m,type:"airtable_setup"}),s("connection");return}try{console.log(`Attempted to connect to ${m.name}`),K(v("Connection setup opened"))}catch(b){K(v("Failed to connect to :provider: :error",{values:{provider:m.name,error:String(b)||"Unknown error"}}))}},[]);const S=h.useCallback(async()=>{try{const b=await(await fetch("/api/v1/oauth/google_sheets/config")).json();if(!b.success||!b.config.enabled){K(v("Google OAuth not configured. Please set up Google credentials in the backend."));return}const y=b.config,N=encodeURIComponent(JSON.stringify({provider:"google_sheets",timestamp:Date.now()})),M=`${y.authUrl}?client_id=${y.clientId}&redirect_uri=${encodeURIComponent(y.redirectUri)}&scope=${encodeURIComponent(y.scopes.join(" "))}&response_type=code&access_type=offline&state=${N}`,W=window.open(M,"google-oauth","width=500,height=600,scrollbars=yes,resizable=yes");if(!W){K(v("Popup blocked. Please allow popups for this site."));return}const Y=setInterval(()=>{W.closed&&(clearInterval(Y),n({id:"google_sheets",name:"Google Sheets",type:"google_sheets_oauth",authenticated:!0}),s("connection"),K(v("Google Sheets authorization completed. Select your spreadsheet.")))},1e3);setTimeout(()=>{clearInterval(Y),W.closed||(W.close(),K(v("Authorization timeout. Please try again.")))},3e5)}catch(m){console.error("Google OAuth error:",m),K(v("Failed to start Google authorization: :error",{values:{error:String(m)||"Unknown error"}}))}},[]);h.useCallback(async(m,b)=>{const y=[{pageId:"home",pageName:"Home Page",elementId:"contact-list",elementType:"List Component",bindingType:"display",tableId:m,fieldId:"name"},{pageId:"contact-form",pageName:"Contact Form",elementId:"form-1",elementType:"Form Component",bindingType:"form",tableId:m,fieldId:"email"}],N=[{id:"rel-1",fromTable:"users",toTable:m,fromField:"id",toField:"user_id",type:"one-to-many",description:"User owns multiple contacts"}],M=y.length>0,W=N.length>0;return{tableId:m,tableName:b,pageBindings:y,relationships:N,canDelete:!M&&!W,warnings:[...M?["This table has data bindings on pages that will be broken"]:[],...W?["This table has relationships with other tables"]:[]]}},[]);const F=h.useCallback(async m=>{if(m.isSystem){K(v("Cannot delete system tables"));return}const b=m.id||m.name;if(confirm(`Are you sure you want to delete the table "${m.displayName||m.name}"?`))try{await V.mutateAsync(b),K(v("Table deleted successfully"))}catch(y){console.error("Failed to delete table:",y),K(v("Failed to delete table: :error",{values:{error:String(y)||"Unknown error"}}))}},[V]);return h.useCallback(m=>{V.mutate(m),s(null),n(null)},[V]),h.useCallback(m=>{n(m),s("connection")},[]),h.useCallback(m=>{n(m),s("table-details")},[]),h.useCallback(()=>{s("create-table")},[]),h.useCallback(m=>{n(m),s("template")},[]),h.useCallback(m=>{n(m),s("trigger")},[]),h.useCallback(()=>{s("create-trigger")},[]),h.useCallback(m=>{n(m),s("connection")},[]),h.useCallback(m=>{n(m),s("binding")},[]),a.jsxs("div",{className:"flex h-full flex-col",children:[a.jsxs("div",{className:"p-14",children:[a.jsx(q,{placeholder:"Search data features...",value:e,onChange:m=>A(m.target.value),className:"mb-14",startAdornment:a.jsx(nn,{})}),a.jsx(U,{variant:"outline",size:"xs",className:"w-full mb-14",onClick:$,title:"Test Data Integration",children:"🧪"}),a.jsxs(vA,{variant:"outline",mode:"multiple",defaultExpandedValues:["data-management","system-tables","relationships","templates","triggers"],children:[a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(ta,{className:"text-primary"}),a.jsx(d,{message:"Data Management"}),a.jsx("span",{className:"ml-auto text-xs text-muted bg-primary/10 text-primary px-8 py-4 rounded",children:"New"})]}),value:"data-management",children:a.jsx(L2,{tables:j,onViewTableData:m=>T("table-data",m),onImportCSV:m=>T("csv-import",m),onAddRow:m=>T("add-row",m)})}),a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Kt,{className:"text-primary"}),a.jsx(d,{message:"Tables & Schema"}),a.jsx("span",{className:"ml-auto text-xs text-muted",children:j.length})]}),value:"system-tables",children:a.jsx(b2,{tables:j,onViewTable:m=>T("table-details",m),onCreateTable:()=>T("create-table"),onDeleteTable:F})}),a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(vi,{className:"text-primary"}),a.jsx(d,{message:"Table Relationships"}),a.jsx("span",{className:"ml-auto text-xs text-muted",children:"Visual Designer"})]}),value:"relationships",children:a.jsx(S2,{tables:j,onOpenVisualDesigner:()=>T("relationships")})}),a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Io,{className:"text-primary"}),a.jsx(d,{message:"Quick Start Templates"}),a.jsx("span",{className:"ml-auto text-xs text-muted",children:Kc.length})]}),value:"templates",children:a.jsx(w2,{onSelectTemplate:m=>T("template",m)})}),a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(xA,{className:"text-primary"}),a.jsx(d,{message:"Automation Triggers"}),a.jsx("span",{className:"ml-auto text-xs text-muted",children:GA.getAll().length})]}),value:"triggers",children:a.jsx(B2,{searchQuery:e,onSelectTrigger:m=>T("trigger",m),onCreateTrigger:()=>T("create-trigger")})}),a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(zt,{className:"text-primary"}),a.jsx(d,{message:"External Connections"}),a.jsx("span",{className:"ml-auto text-xs text-muted",children:"0"})]}),value:"external",children:a.jsx(j2,{onSelectConnection:m=>T("connection",m)})}),o&&a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(rt,{className:"text-primary"}),a.jsx(d,{message:"Data Binding"})]}),value:"binding",children:a.jsx(E2,{node:o,onSelectBinding:m=>T("binding",{option:m,node:o})})}),!o&&a.jsxs("div",{className:"p-12 text-center text-muted text-sm border rounded",children:[a.jsx(rt,{className:"mx-auto mb-8"}),a.jsx("div",{children:a.jsx(d,{message:"Select an element to see data binding options"})})]})]})]}),a.jsx(ue,{type:"modal",isOpen:t==="connection",onOpenChange:()=>s(null),children:a.jsxs(me,{size:"lg",children:[a.jsx(se,{children:a.jsx(d,{message:"Connection Details"})}),a.jsx(te,{children:a.jsx(Xr,{connection:i,onSelectConnection:()=>s(null)})})]})}),a.jsx(ue,{type:"modal",isOpen:t!==null,onClose:I,children:a.jsxs(me,{size:t==="edit-fields"?"lg":t==="relationships"?"w-[60vw] h-[90vh]":"md",children:[t==="table-details"&&i&&a.jsx(C2,{data:i,onClose:I}),t==="create-table"&&a.jsx(y2,{onClose:I,onSave:Q}),t==="template"&&i&&a.jsx(Q2,{template:i,onClose:I,onCreate:P,isCreating:c}),t==="edit-fields"&&i&&a.jsx(F2,{tableData:i,onClose:I,onAddField:_,onDeleteField:z}),t==="trigger"&&i&&a.jsx(k2,{trigger:i,onClose:I}),t==="create-trigger"&&a.jsx(U2,{onClose:I,onSave:async m=>{try{await E.mutateAsync(m),K(v("Trigger created successfully")),I()}catch{K(v("Failed to create trigger"))}}}),t==="connection"&&i&&a.jsx(Xr,{connection:i,onSelectConnection:()=>s(null)}),t==="binding"&&i&&a.jsx(I2,{binding:i,onClose:I}),t==="relationships"&&a.jsx(H2,{tables:j,onClose:I}),t==="table-data"&&i&&a.jsx(N2,{table:i,onClose:I}),t==="csv-import"&&i&&a.jsx(T2,{table:i,onClose:I}),t==="add-row"&&i&&a.jsx(D2,{table:i,onClose:I})]})})]})}function b2({tables:e,onViewTable:A,onCreateTable:t,onDeleteTable:s}){const i=n=>{A({...n,mode:"edit-fields"})};return a.jsxs("div",{className:"space-y-8",children:[e.map(n=>{var o,l;return a.jsx("div",{className:"border rounded-lg p-12 hover:bg-hover transition-colors",children:a.jsx("div",{className:"flex items-start justify-between",children:a.jsxs("div",{className:"flex-1 min-w-0",children:[a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx("h4",{className:"font-medium text-sm truncate",children:n.displayName||n.name}),a.jsxs("span",{className:"text-xs bg-primary/10 text-primary px-6 py-2 rounded whitespace-nowrap",children:[((o=n.fields)==null?void 0:o.length)||0," fields"]})]}),a.jsx("p",{className:"text-xs text-muted mb-8 truncate",children:n.description||`${((l=n.fields)==null?void 0:l.length)||0} fields • ${n.isSystem?"System table":"Custom table"}`}),a.jsxs("div",{className:"flex gap-6 flex-wrap",children:[a.jsxs(U,{variant:"outline",size:"xs",onClick:()=>A(n),children:[a.jsx(xo,{size:"xs"}),a.jsx(d,{message:"View"})]}),a.jsxs(U,{variant:"outline",size:"xs",onClick:()=>i(n),children:[a.jsx(rt,{size:"xs"}),a.jsx(d,{message:"Edit Fields"})]}),!n.isSystem&&a.jsxs(U,{variant:"outline",size:"xs",color:"danger",onClick:()=>s(n),children:[a.jsx(vs,{size:"xs"}),a.jsx(d,{message:"Delete"})]})]})]})})},n.id)}),a.jsxs(U,{variant:"outline",size:"sm",className:"w-full border-dashed",onClick:t,children:[a.jsx(Ot,{}),a.jsx(d,{message:"Create Custom Table"})]})]})}function w2({onSelectTemplate:e}){return a.jsx("div",{className:"grid grid-cols-1 gap-8",children:Kc.map(A=>a.jsx("div",{className:"rounded border p-12 hover:bg-hover cursor-pointer transition-colors",onClick:()=>e(A),children:a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:A.name}),a.jsxs("div",{className:"text-xs text-muted",children:[A.fields.length," fields"]})]}),a.jsx(Ot,{className:"text-muted"})]})},A.id))})}function B2({searchQuery:e,onSelectTrigger:A,onCreateTrigger:t}){const i=[{key:"user",label:"User Interactions",icon:xA,triggers:GA.getByCategory("user")},{key:"schedule",label:"Scheduled & Timed",icon:Xu,triggers:GA.getByCategory("schedule")},{key:"data",label:"Data Changes",icon:Kt,triggers:GA.getByCategory("data")}].map(n=>({...n,triggers:n.triggers.filter(o=>!e||o.name.toLowerCase().includes(e.toLowerCase())||o.description.toLowerCase().includes(e.toLowerCase()))}));return a.jsxs("div",{className:"space-y-12",children:[a.jsx(U,{variant:"outline",size:"xs",className:"w-full mb-12",startIcon:a.jsx(Ot,{}),onClick:t,children:a.jsx(d,{message:"Create New Trigger"})}),a.jsx(vA,{variant:"outline",mode:"multiple",defaultExpandedValues:["user","schedule","data"],children:i.map(n=>a.jsx(Fe,{label:a.jsxs("div",{className:"flex items-center gap-8 text-xs font-medium",children:[a.jsx(n.icon,{size:"sm"}),a.jsx(d,{message:n.label}),a.jsxs("span",{className:"ml-auto",children:["(",n.triggers.length,")"]})]}),value:n.key,children:a.jsx("div",{className:"space-y-4",children:n.triggers.map(o=>a.jsx(v2,{trigger:o,onSelectTrigger:A},o.id))})},n.key))})]})}function v2({trigger:e,onSelectTrigger:A}){return a.jsxs("div",{className:"flex items-center justify-between p-8 rounded border hover:bg-hover cursor-pointer transition-colors",onClick:()=>A(e),children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium",children:e.name}),a.jsx("div",{className:"text-xs text-muted",children:e.description})]}),a.jsx(ee,{size:"xs",children:a.jsx(rt,{})})]})}function C2({data:e,onClose:A}){return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Table Details: :name",values:{name:e.name}})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Description"})}),a.jsx("div",{className:"text-sm text-muted",children:e.description})]}),a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Fields"})}),a.jsx("div",{className:"space-y-8",children:e.fields.map(t=>a.jsxs("div",{className:"flex justify-between border rounded p-8",children:[a.jsx("span",{className:"font-medium",children:t.name}),a.jsx("span",{className:"text-xs bg-primary/10 text-primary px-8 py-4 rounded",children:t.type})]},t.name))})]})]})}),a.jsx(ne,{children:a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})})})]})}function y2({onClose:e,onSave:A}){const[t,s]=h.useState(""),[i,n]=h.useState("");return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Create Custom Table"})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{label:"Table Name",value:t,onChange:o=>s(o.target.value),placeholder:"e.g., my_custom_table"}),a.jsx(q,{label:"Description",value:i,onChange:o=>n(o.target.value),placeholder:"Describe what this table will store"}),a.jsx("div",{className:"bg-primary/10 p-12 rounded",children:a.jsx("div",{className:"text-xs text-primary",children:a.jsx(d,{message:"After creating the table, you can add custom fields using the edit button."})})})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:e,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:()=>{t.trim()&&A({name:t.trim(),description:i.trim()})},disabled:!t.trim(),children:a.jsx(d,{message:"Create Table"})})]})]})}function Q2({template:e,onClose:A,onCreate:t,isCreating:s}){return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Create :name Table",values:{name:e.name}})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Template Fields"})}),a.jsx("div",{className:"space-y-8",children:e.fields.map(i=>a.jsxs("div",{className:"flex justify-between border rounded p-8",children:[a.jsx("span",{className:"font-medium",children:i.name}),a.jsx("span",{className:"text-xs bg-primary/10 text-primary px-8 py-4 rounded",children:i.type})]},i.name))})]}),a.jsx("div",{className:"bg-primary/10 p-12 rounded",children:a.jsx("div",{className:"text-xs text-primary",children:a.jsx(d,{message:"This will create a new table with these fields in your project database."})})})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:()=>t(e),disabled:s,children:a.jsx(d,{message:s?"Creating...":"Create Table"})})]})]})}function F2({tableData:e,onClose:A,onAddField:t,onDeleteField:s}){const[i,n]=h.useState(""),[o,l]=h.useState("text"),[c,g]=h.useState(!1),u=()=>{i.trim()&&(t(e,{name:i.trim(),type:o,required:c}),n(""),l("text"),g(!1))};return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Edit Table Fields: :name",values:{name:e.name}})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Current Fields"})}),a.jsx("div",{className:"space-y-8",children:e.fields.map((p,f)=>a.jsxs("div",{className:"flex items-center justify-between border rounded p-8",children:[a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx("span",{className:"font-medium",children:p.name}),a.jsx("span",{className:"text-xs bg-primary/10 text-primary px-8 py-4 rounded",children:p.type}),p.required&&a.jsx("span",{className:"text-xs bg-warning/10 text-warning px-6 py-2 rounded",children:"Required"})]}),a.jsx("div",{className:"flex gap-4",children:a.jsx(ee,{size:"xs",onClick:()=>s(e,f),disabled:f<2,title:f<2?"Cannot delete core fields":"Delete field",children:a.jsx(vs,{})})})]},p.name))})]}),a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Add New Field"})}),a.jsxs("div",{className:"space-y-8",children:[a.jsx(q,{label:"Field Name",value:i,onChange:p=>n(p.target.value),placeholder:"e.g., phone_number",size:"sm"}),a.jsxs("div",{className:"grid grid-cols-2 gap-8",children:[a.jsx(Qe,{defaultSelectedValue:o,onSelectionChange:p=>l(p),label:"Field Type",size:"sm",selectionMode:"single",children:f2.map(p=>a.jsx(k,{value:p.value,children:p.label},p.value))}),a.jsxs("div",{className:"flex items-center gap-8 pt-6",children:[a.jsx("input",{type:"checkbox",id:"required",checked:c,onChange:p=>g(p.target.checked),className:"rounded"}),a.jsx("label",{htmlFor:"required",className:"text-sm",children:"Required"})]})]}),a.jsx(U,{size:"sm",variant:"outline",startIcon:a.jsx(Ot,{}),onClick:u,disabled:!i.trim(),className:"w-full",children:a.jsx(d,{message:"Add Field"})})]})]}),a.jsx("div",{className:"bg-warning/10 p-12 rounded",children:a.jsx("div",{className:"text-xs text-warning",children:a.jsx(d,{message:"⚠️ Adding/removing fields will update your database schema. Existing data may be affected."})})})]})}),a.jsx(ne,{children:a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Done"})})})]})}function k2({trigger:e,onClose:A}){const[t,s]=h.useState(e.name),[i,n]=h.useState(""),[o,l]=h.useState("show_alert"),[c,g]=h.useState(""),u=async()=>{const p={type:e.name.toLowerCase().replace(/\s+/g,"_"),name:t,elementId:i,actions:[{type:o,value:c}],enabled:!0};try{console.log("Creating trigger:",p),K(v("Trigger created successfully")),A()}catch{K(v("Failed to create trigger"))}};return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Setup Trigger: :name",values:{name:e.name}})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium mb-8",children:a.jsx(d,{message:"Description"})}),a.jsx("div",{className:"text-sm text-muted",children:e.description})]}),a.jsx(q,{label:"Trigger Name",value:t,onChange:p=>s(p.target.value)}),a.jsx(q,{label:"Target Element (CSS Selector or ID)",placeholder:"e.g., #submit-btn or .my-button",value:i,onChange:p=>n(p.target.value)}),a.jsxs(Qe,{label:"Action to Perform",selectedValue:o,onSelectionChange:p=>l(p),selectionMode:"single",children:[a.jsx(k,{value:"show_alert",children:"Show Alert"}),a.jsx(k,{value:"redirect",children:"Redirect to URL"}),a.jsx(k,{value:"show_element",children:"Show Element"}),a.jsx(k,{value:"hide_element",children:"Hide Element"}),a.jsx(k,{value:"submit_form",children:"Submit Form"})]}),a.jsx(q,{label:"Action Value",placeholder:o==="show_alert"?"Alert message":o==="redirect"?"URL to redirect to":"Element selector",value:c,onChange:p=>g(p.target.value)})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:u,disabled:!t||!i||!c,children:a.jsx(d,{message:"Create Trigger"})})]})]})}function U2({onClose:e,onSave:A}){const[t,s]=h.useState(""),[i,n]=h.useState("element-click"),[o,l]=h.useState(""),[c,g]=h.useState("show_alert"),[u,p]=h.useState(""),f=()=>{t.trim()&&o.trim()&&u.trim()&&A({name:t.trim(),type:i,elementId:o.trim(),actions:[{type:c,value:u.trim()}],enabled:!0})};return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Create Custom Trigger"})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsx(q,{label:"Trigger Name",value:t,onChange:x=>s(x.target.value),placeholder:"e.g., Contact Form Submit"}),a.jsxs(Qe,{selectedValue:i,onSelectionChange:x=>n(x),label:"Trigger Type",selectionMode:"single",children:[a.jsx(k,{value:"element-click",children:"Element Click"}),a.jsx(k,{value:"form-submit",children:"Form Submit"}),a.jsx(k,{value:"page-load",children:"Page Load"}),a.jsx(k,{value:"data-change",children:"Data Change"})]}),a.jsx(q,{label:"Target Element (CSS Selector or ID)",placeholder:"e.g., #contact-form or .submit-button",value:o,onChange:x=>l(x.target.value)}),a.jsxs(Qe,{label:"Action to Perform",selectedValue:c,onSelectionChange:x=>g(x),selectionMode:"single",children:[a.jsx(k,{value:"show_alert",children:"Show Alert"}),a.jsx(k,{value:"redirect",children:"Redirect to URL"}),a.jsx(k,{value:"show_element",children:"Show Element"}),a.jsx(k,{value:"hide_element",children:"Hide Element"}),a.jsx(k,{value:"submit_form",children:"Submit Form"}),a.jsx(k,{value:"save_data",children:"Save to Database"})]}),a.jsx(q,{label:"Action Value",placeholder:c==="show_alert"?"Alert message":c==="redirect"?"URL to redirect to":c==="save_data"?"Table name to save to":"Element selector or value",value:u,onChange:x=>p(x.target.value)})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:e,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:f,disabled:!t.trim()||!o.trim()||!u.trim(),children:a.jsx(d,{message:"Create Trigger"})})]})]})}function j2({onSelectConnection:e}){const A=[{id:"airtable",name:"Airtable",description:"Connect to Airtable bases and tables",icon:"🗂️",status:"available",authUrl:"https://airtable.com/oauth2/v1/authorize",scopes:["data.records:read","data.records:write","schema.bases:read"]},{id:"google_sheets",name:"Google Sheets",description:"Connect to Google Sheets documents",icon:"📊",status:"available",authUrl:"https://accounts.google.com/oauth2/v2/auth",scopes:["https://www.googleapis.com/auth/spreadsheets"]},{id:"notion",name:"Notion",description:"Connect to Notion databases",icon:"📝",status:"coming-soon"}],[t,s]=h.useState(A),i=h.useCallback(async n=>{if(n.status==="coming-soon"){K(v("This integration is coming soon!"));return}if(n.id==="google_sheets"){K(v("Starting Google OAuth...")),setTimeout(()=>{e({...n,type:"google_sheets_oauth"})},1e3);return}if(n.id==="airtable"){e({...n,type:"airtable_setup"});return}try{console.log(`Attempted to connect to ${n.name}`),K(v("Connection setup opened"))}catch(o){K(v("Failed to connect to :provider: :error",{values:{provider:n.name,error:String(o)||"Unknown error"}}))}},[e]);return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm text-muted",children:a.jsx(d,{message:"Connect to external data sources"})}),a.jsx("div",{className:"space-y-8",children:t.map(n=>a.jsxs("div",{className:"flex items-center justify-between p-12 rounded border hover:bg-hover",children:[a.jsxs("div",{className:"flex items-center gap-12",children:[a.jsx("div",{className:"text-2xl",children:n.icon}),a.jsxs("div",{children:[a.jsx("div",{className:"text-sm font-medium",children:n.name}),a.jsx("div",{className:"text-xs text-muted",children:n.description}),n.status==="connected"&&a.jsxs("div",{className:"text-xs text-primary mt-4",children:["✅ Connected ",n.connectedAt&&new Date(n.connectedAt).toLocaleDateString()]})]})]}),a.jsx("div",{className:"flex items-center gap-8",children:n.status==="connected"?a.jsxs("div",{children:[a.jsx(U,{variant:"outline",size:"xs",onClick:()=>e(n),children:a.jsx(d,{message:"Manage"})}),a.jsx(U,{variant:"text",size:"xs",className:"text-danger ml-8",children:a.jsx(d,{message:"Disconnect"})})]}):n.status==="coming-soon"?a.jsx(U,{variant:"outline",size:"xs",disabled:!0,children:a.jsx(d,{message:"Coming Soon"})}):a.jsx(U,{variant:"flat",color:"primary",size:"xs",onClick:()=>i(n),children:a.jsx(d,{message:"Connect"})})})]},n.id))}),a.jsx(U,{variant:"outline",size:"xs",className:"w-full",startIcon:a.jsx(Ot,{}),children:a.jsx(d,{message:"Request New Integration"})})]})}function E2({node:e,onSelectBinding:A}){var s;const t=[{value:"text",label:"Text Content"},{value:"attribute",label:"Element Attribute"},{value:"style",label:"CSS Style"},{value:"visibility",label:"Show/Hide"}];return a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"text-sm",children:a.jsx(d,{message:"Bind data to the selected element:"})}),a.jsxs("div",{className:"rounded bg-hover p-8 text-xs",children:[((s=e.tagName)==null?void 0:s.toLowerCase())||"element",e.id&&`#${e.id}`,e.className&&`.${e.className.split(" ")[0]}`]}),a.jsx("div",{className:"space-y-8",children:t.map(i=>a.jsx(U,{variant:"outline",size:"xs",className:"w-full justify-start",onClick:()=>A(i),children:a.jsx(d,{message:i.label})},i.value))})]})}function Xr({connection:e,onSelectConnection:A}){var $,S;const[t,s]=h.useState("");h.useState("");const[i,n]=h.useState("A1:Z1000"),[o,l]=h.useState(""),[c,g]=h.useState(""),[u,p]=h.useState(""),[f,x]=h.useState(""),[w,C]=h.useState([]),[H,j]=h.useState([]),[E,V]=h.useState(!1),[T,I]=h.useState(!1);ut.useEffect(()=>{e.type==="google_sheets_oauth"&&e.authenticated&&Q()},[e]);const Q=async()=>{V(!0);try{C([{id:"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",name:"Customer Database"},{id:"1mJQiBMRdcM8V2WQjXKQVpQlY0rJ8Nf6JzZlH7k5vYNs",name:"Sales Reports 2024"},{id:"1kJd8VmE3fQ2HxNcPl9RkY8tGvBhMzLaE4WuI5oP7rTg",name:"Inventory Tracking"},{id:"1pRtY6EuI8OvM4nKcS2FjB9xWqZ7HgL1NmA5VdCfGhJk",name:"Contact List"}])}catch(F){K(v("Failed to load spreadsheets: :error",{values:{error:String(F)||"Unknown error"}}))}finally{V(!1)}},P=async F=>{I(!0);try{j([{id:0,name:"Sheet1",title:"Customer Data"},{id:1,name:"Sheet2",title:"Analytics"},{id:2,name:"Sheet3",title:"Raw Data"}])}catch(m){K(v("Failed to load sheets: :error",{values:{error:String(m)||"Unknown error"}}))}finally{I(!1)}},_=F=>{p(F),x(""),j([]),F&&P()},z=()=>{var F,m;if(e.type==="google_sheets_oauth"){if(!u||!f){K(v("Please select a spreadsheet and sheet"));return}const b={type:"google_sheets",name:`Google Sheet: ${(F=w.find(y=>y.id===u))==null?void 0:F.name}`,spreadsheetId:u,sheetName:(m=H.find(y=>y.id.toString()===f))==null?void 0:m.name,range:i};console.log("Saving Google Sheets connection:",b),K(v("Google Sheets connection saved successfully"))}else if(e.type==="airtable_setup"){if(!t||!o||!c){K(v("Please fill in all required fields"));return}console.log("Saving Airtable connection:",{apiKey:t,baseId:o,tableId:c}),K(v("Airtable connection saved successfully"))}A()};return e.type==="google_sheets_oauth"?a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Select Google Spreadsheet"})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsx("div",{className:"bg-success/10 p-12 rounded",children:a.jsxs("div",{className:"text-sm text-success",children:["✅ ",a.jsx(d,{message:"Successfully connected to Google Sheets! Select your spreadsheet below."})]})}),a.jsx(Qe,{label:"Select Spreadsheet",placeholder:"Choose a spreadsheet...",selectedValue:u,onSelectionChange:F=>_(F),isLoading:E,selectionMode:"single",children:w.map(F=>a.jsx(k,{value:F.id,children:a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:F.name}),a.jsxs("div",{className:"text-xs text-muted",children:["ID: ",F.id]})]})},F.id))}),u&&a.jsx(Qe,{label:"Select Sheet/Tab",placeholder:"Choose a sheet...",selectedValue:f,onSelectionChange:F=>x(F),isLoading:T,selectionMode:"single",children:H.map(F=>a.jsx(k,{value:F.id.toString(),children:a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:F.name}),a.jsx("div",{className:"text-xs text-muted",children:F.title})]})},F.id))}),a.jsx(q,{label:"Data Range (optional)",value:i,onChange:F=>n(F.target.value),placeholder:"A1:Z1000",description:"Specify which cells to sync (e.g., A1:Z1000 for all data)"}),u&&f&&a.jsx("div",{className:"bg-primary/10 p-12 rounded",children:a.jsxs("div",{className:"text-sm text-primary",children:["🔗 ",a.jsx(d,{message:"Preview: This will sync data from '{name}' sheet '{sheetName}'",values:{name:(($=w.find(F=>F.id===u))==null?void 0:$.name)||"Unknown",sheetName:((S=H.find(F=>F.id.toString()===f))==null?void 0:S.name)||"Unknown"}})]})})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:z,disabled:!u||!f,children:a.jsx(d,{message:"Connect to Sheet"})})]})]}):e.type==="airtable_setup"?a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Setup Airtable Connection"})}),a.jsx(te,{children:a.jsxs("div",{className:"space-y-16",children:[a.jsx("div",{className:"bg-primary/10 p-12 rounded",children:a.jsx("div",{className:"text-sm text-primary",children:a.jsx(d,{message:"To connect to Airtable, you need a Personal Access Token from your Airtable account."})})}),a.jsx(q,{label:"Airtable Personal Access Token",type:"password",value:t,onChange:F=>s(F.target.value),placeholder:"pat..."}),a.jsx(q,{label:"Base ID",value:o,onChange:F=>l(F.target.value),placeholder:"app...",description:"Found in the URL: https://airtable.com/[BASE_ID]/..."}),a.jsx(q,{label:"Table ID or Name",value:c,onChange:F=>g(F.target.value),placeholder:"tbl... or Table Name"})]})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"flat",color:"primary",onClick:z,children:a.jsx(d,{message:"Save Connection"})})]})]}):a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Connection Details"})}),a.jsx(te,{children:a.jsx("div",{className:"text-sm text-muted",children:a.jsx(d,{message:"Connection setup"})})}),a.jsx(ne,{children:a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})})})]})}function I2({binding:e,onClose:A}){return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsx(d,{message:"Setup Data Binding"})}),a.jsx(te,{children:a.jsx("div",{className:"text-sm text-muted",children:a.jsx(d,{message:"Data binding configuration coming soon."})})}),a.jsx(ne,{children:a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})})})]})}function S2({tables:e,onOpenVisualDesigner:A}){const t=[{id:"rel-1",fromTable:"users",toTable:"contacts",fromField:"id",toField:"user_id",type:"one-to-many",description:"User can have multiple contacts"},{id:"rel-2",fromTable:"users",toTable:"orders",fromField:"id",toField:"customer_id",type:"one-to-many",description:"User can have multiple orders"}];return a.jsxs("div",{className:"space-y-12",children:[a.jsxs(U,{variant:"outline",size:"sm",className:"w-full",onClick:A,children:[a.jsx(vi,{}),a.jsx(d,{message:"Open Visual Designer"})]}),a.jsxs("div",{className:"space-y-8",children:[a.jsx("div",{className:"text-sm font-medium",children:a.jsx(d,{message:"Current Relationships"})}),t.length===0?a.jsxs("div",{className:"text-center p-16 text-muted text-sm border rounded border-dashed",children:[a.jsx(vi,{className:"mx-auto mb-8"}),a.jsx("div",{children:a.jsx(d,{message:"No relationships defined yet"})}),a.jsx("div",{className:"text-xs mt-4",children:a.jsx(d,{message:"Use the visual designer to create table relationships"})})]}):a.jsx("div",{className:"space-y-8",children:t.map(s=>{var i,n;return a.jsxs("div",{className:"border rounded p-8 hover:bg-hover transition-colors",children:[a.jsxs("div",{className:"flex items-center justify-between mb-4",children:[a.jsxs("div",{className:"text-sm font-medium",children:[((i=e.find(o=>o.id===s.fromTable))==null?void 0:i.displayName)||s.fromTable,a.jsx("span",{className:"mx-8 text-muted",children:"→"}),((n=e.find(o=>o.id===s.toTable))==null?void 0:n.displayName)||s.toTable]}),a.jsx("span",{className:`text-xs px-6 py-2 rounded ${s.type==="one-to-one"?"bg-green-100 text-green-800":s.type==="one-to-many"?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`,children:s.type.replace("-",":")})]}),a.jsxs("div",{className:"text-xs text-muted",children:[s.fromField," → ",s.toField]}),s.description&&a.jsx("div",{className:"text-xs text-muted mt-4",children:s.description})]},s.id)})})]})]})}function H2({tables:e,onClose:A}){var _,z,$,S,F;const[t,s]=h.useState({}),[i,n]=h.useState(null),[o,l]=h.useState(null),[c,g]=h.useState(!1),[u,p]=h.useState(null),[f,x]=h.useState({x:0,y:0}),[w,C]=h.useState([{id:"rel-1",fromTable:"users",toTable:"contacts",fromField:"id",toField:"user_id",type:"one-to-many"}]),[H,j]=h.useState(null);ut.useEffect(()=>{const m={};e.forEach((b,y)=>{const N=Math.floor(y/4),M=y%4;m[b.id]={x:80+M*320,y:80+N*280}}),s(m)},[e]);const E=(m,b)=>{c&&i&&i!==m?(j({isOpen:!0,fromTable:i,fromField:o||"id",toTable:m}),g(!1),n(null),l(null)):b?(n(m),l(b),c||g(!0)):(n(m),c||g(!0))},V=(m,b)=>{var M;b.stopPropagation();const y=b.currentTarget.getBoundingClientRect();((M=b.currentTarget.closest(".canvas-container"))==null?void 0:M.getBoundingClientRect())&&(p(m),x({x:b.clientX-y.left,y:b.clientY-y.top}))},T=m=>{if(u){const b=m.currentTarget.getBoundingClientRect(),y=m.clientX-b.left-f.x,N=m.clientY-b.top-f.y;s(M=>({...M,[u]:{x:Math.max(0,Math.min(y,b.width-280)),y:Math.max(0,Math.min(N,b.height-120))}}))}},I=()=>{p(null),x({x:0,y:0})},Q=(m,b,y)=>{if(H){const N={id:`rel-${Date.now()}`,fromTable:H.fromTable,toTable:H.toTable,fromField:m,toField:b,type:y};C([...w,N]),j(null)}},P=m=>{switch(m){case"one-to-one":return"#10b981";case"one-to-many":return"#3b82f6";case"many-to-one":return"#f59e0b";case"many-to-many":return"#8b5cf6";default:return"#6b7280"}};return a.jsxs(a.Fragment,{children:[a.jsx(se,{className:"pb-16",children:a.jsxs("div",{className:"flex items-center justify-between w-full",children:[a.jsxs("div",{className:"flex items-center gap-12",children:[a.jsx(d,{message:"Visual Database Designer"}),a.jsx("span",{className:"text-xs text-muted bg-gray-100 px-6 py-2 rounded",children:"Drag tables • Click fields to link"})]}),a.jsx("div",{className:"flex gap-8",children:a.jsxs(U,{variant:"outline",size:"xs",onClick:()=>g(!c),color:c?"primary":void 0,children:[a.jsx(zt,{}),a.jsx(d,{message:c?"Cancel Link":"Link Tables"})]})})]})}),a.jsxs(te,{className:"flex-1 overflow-hidden p-0",children:[a.jsxs("div",{className:"canvas-container relative w-full h-full bg-gray-50 rounded border overflow-auto cursor-default",onMouseMove:T,onMouseUp:I,onMouseLeave:I,children:[a.jsxs("svg",{className:"absolute inset-0 w-full h-full pointer-events-none",children:[w.map(m=>{const b=t[m.fromTable],y=t[m.toTable];if(!b||!y)return null;const N=(b.x+y.x)/2+140,M=(b.y+y.y)/2+60;return a.jsxs("g",{children:[a.jsx("line",{x1:b.x+140,y1:b.y+60,x2:y.x+140,y2:y.y+60,stroke:P(m.type),strokeWidth:"3",markerEnd:"url(#arrowhead)"}),a.jsx("rect",{x:N-70,y:M-20,width:"140",height:"40",fill:"white",stroke:P(m.type),strokeWidth:"2",rx:"4",className:"pointer-events-auto cursor-pointer hover:fill-gray-50",onClick:()=>{confirm("Delete this relationship?")&&C(w.filter(W=>W.id!==m.id))}}),a.jsxs("text",{x:N,y:M-5,textAnchor:"middle",fontSize:"10",fill:P(m.type),fontWeight:"bold",className:"pointer-events-none select-none",children:[m.fromField," → ",m.toField]}),a.jsxs("text",{x:N,y:M+8,textAnchor:"middle",fontSize:"8",fill:"#666",className:"pointer-events-none select-none",children:[m.type.replace("-",":")," (click to delete)"]})]},m.id)}),a.jsx("defs",{children:a.jsx("marker",{id:"arrowhead",markerWidth:"10",markerHeight:"7",refX:"9",refY:"3.5",orient:"auto",children:a.jsx("polygon",{points:"0 0, 10 3.5, 0 7",fill:"#6b7280"})})})]}),e.map(m=>{var y,N,M;const b=t[m.id];return b?a.jsxs("div",{className:`absolute bg-white border rounded-lg shadow-sm transition-all ${i===m.id?"ring-2 ring-primary":c?"hover:ring-2 hover:ring-blue-300":"hover:shadow-md"} ${u===m.id?"shadow-xl z-10":""}`,style:{left:b.x,top:b.y,width:280,minHeight:120,cursor:u===m.id?"grabbing":"grab"},children:[a.jsx("div",{className:"p-12 border-b cursor-move bg-gray-50 rounded-t-lg",onMouseDown:W=>V(m.id,W),children:a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("h4",{className:"font-medium text-sm select-none",children:m.displayName||m.name}),a.jsx("span",{className:"text-xs bg-primary/10 text-primary px-6 py-2 rounded select-none",children:((y=m.fields)==null?void 0:y.length)||0})]})}),a.jsx("div",{className:"p-8",children:a.jsxs("div",{className:"space-y-2",children:[(N=m.fields)==null?void 0:N.slice(0,6).map(W=>{const Y=i===m.id&&o===W.id,ie=i===m.id;return a.jsxs("div",{className:`text-xs flex justify-between p-2 rounded cursor-pointer transition-all duration-200 border ${Y?"bg-blue-500 border-blue-600 text-white shadow-md transform scale-105":c&&!ie?"hover:bg-green-50 hover:border-green-300 border-transparent hover:scale-102":c?"hover:bg-blue-50 hover:border-blue-200 border-transparent":"hover:bg-gray-50 border-transparent"}`,onClick:Ze=>{Ze.stopPropagation(),E(m.id,W.id)},children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("div",{className:`w-2 h-2 rounded-full transition-colors ${Y?"bg-white":W.required?"bg-red-400":"bg-gray-300"}`}),a.jsx("span",{className:`font-mono transition-colors ${Y?"text-white font-medium":"text-gray-900"}`,children:W.name}),Y&&a.jsx("span",{className:"text-xs bg-white text-blue-500 px-2 py-1 rounded font-medium",children:"SELECTED"})]}),a.jsx("span",{className:`px-2 py-1 rounded text-xs transition-colors ${Y?"bg-white text-blue-500 font-medium":"text-primary bg-gray-100"}`,children:W.type})]},W.id)}),((M=m.fields)==null?void 0:M.length)>6&&a.jsxs("div",{className:"text-xs text-muted text-center py-2 border-t",children:["+",m.fields.length-6," more fields (scroll to see all)"]})]})})]},m.id):null})]}),c&&i&&a.jsx("div",{className:"absolute top-4 left-4 right-4 p-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded border border-blue-300 z-20 shadow-lg",children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsx("div",{className:"w-3 h-3 bg-blue-500 rounded-full animate-pulse"}),a.jsx("span",{className:"text-sm font-medium text-blue-900",children:"Linking Mode Active"})]}),a.jsxs("div",{className:"text-sm text-blue-800",children:["Selected: ",a.jsxs("span",{className:"font-mono bg-blue-200 px-2 py-1 rounded text-blue-900",children:[(_=e.find(m=>m.id===i))==null?void 0:_.displayName,".",o||"id"]}),"→ Click a field in another table to complete the relationship"]})]})}),(H==null?void 0:H.isOpen)&&a.jsx("div",{className:"absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30",children:a.jsxs("div",{className:"bg-white rounded-lg p-24 max-w-md w-full mx-16",children:[a.jsx("h3",{className:"text-lg font-medium mb-16",children:"Create Relationship"}),a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{children:[a.jsx("label",{className:"block text-sm font-medium mb-8",children:"From Table"}),a.jsxs("div",{className:"p-12 bg-gray-50 rounded border",children:[a.jsx("div",{className:"font-medium",children:(z=e.find(m=>m.id===H.fromTable))==null?void 0:z.displayName}),a.jsxs("div",{className:"text-sm text-muted",children:["Field: ",H.fromField]})]})]}),a.jsxs("div",{children:[a.jsx("label",{className:"block text-sm font-medium mb-8",children:"To Table"}),a.jsx("div",{className:"p-12 bg-gray-50 rounded border",children:a.jsx("div",{className:"font-medium",children:($=e.find(m=>m.id===H.toTable))==null?void 0:$.displayName})})]}),a.jsxs("div",{children:[a.jsx("label",{className:"block text-sm font-medium mb-8",children:"Target Field"}),a.jsxs("select",{className:"w-full p-8 border rounded",onChange:m=>{const[b,y]=m.target.value.split("|");b&&y&&Q(H.fromField,b,y)},defaultValue:"",children:[a.jsx("option",{value:"",children:"Select target field..."}),(F=(S=e.find(m=>m.id===H.toTable))==null?void 0:S.fields)==null?void 0:F.map(m=>a.jsxs("option",{value:`${m.name}|one-to-many`,children:[m.name," (",m.type,") - One to Many"]},m.id))]})]})]}),a.jsx("div",{className:"flex gap-8 mt-20",children:a.jsx(U,{variant:"outline",onClick:()=>j(null),children:"Cancel"})})]})}),a.jsxs("div",{className:"absolute bottom-4 left-4 flex flex-wrap gap-12 bg-white p-8 rounded border shadow z-10",children:[a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx("div",{className:"w-16 h-2 bg-green-500 rounded"}),a.jsx("span",{className:"text-xs text-muted",children:"One-to-One"})]}),a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx("div",{className:"w-16 h-2 bg-blue-500 rounded"}),a.jsx("span",{className:"text-xs text-muted",children:"One-to-Many"})]}),a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx("div",{className:"w-16 h-2 bg-orange-500 rounded"}),a.jsx("span",{className:"text-xs text-muted",children:"Many-to-One"})]}),a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx("div",{className:"w-16 h-2 bg-purple-500 rounded"}),a.jsx("span",{className:"text-xs text-muted",children:"Many-to-Many"})]})]})]}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})}),a.jsx(U,{onClick:()=>{K(v("Relationships saved successfully!")),A()},children:a.jsx(d,{message:"Save Relationships"})})]})]})}function L2({tables:e,onViewTableData:A,onImportCSV:t,onAddRow:s}){const[i,n]=h.useState(""),o=e.filter(l=>{var c,g;return((c=l.displayName)==null?void 0:c.toLowerCase().includes(i.toLowerCase()))||((g=l.name)==null?void 0:g.toLowerCase().includes(i.toLowerCase()))});return a.jsxs("div",{className:"space-y-12",children:[a.jsx(q,{placeholder:"Search tables...",value:i,onChange:l=>n(l.target.value),size:"sm",startAdornment:a.jsx(nn,{})}),a.jsxs("div",{className:"space-y-8",children:[o.map(l=>{var c;return a.jsxs("div",{className:"border rounded-lg p-12 hover:bg-hover transition-colors",children:[a.jsx("div",{className:"flex items-start justify-between mb-8",children:a.jsxs("div",{className:"flex-1 min-w-0",children:[a.jsxs("div",{className:"flex items-center gap-8 mb-4",children:[a.jsx(Xa,{className:"text-primary",size:"sm"}),a.jsx("h4",{className:"font-medium text-sm truncate",children:l.displayName||l.name}),a.jsxs("span",{className:"text-xs bg-primary/10 text-primary px-6 py-2 rounded whitespace-nowrap",children:[((c=l.fields)==null?void 0:c.length)||0," fields"]})]}),a.jsx("p",{className:"text-xs text-muted mb-8 truncate",children:l.description||`Manage data for ${l.displayName||l.name}`})]})}),a.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-6",children:[a.jsx(U,{variant:"outline",size:"xs",onClick:()=>A(l),className:"w-full",title:"View Data",children:a.jsx(ta,{size:"xs"})}),a.jsx(U,{variant:"outline",size:"xs",onClick:()=>s(l),className:"w-full",title:"Add Row",children:a.jsx(pn,{size:"xs"})}),a.jsx(U,{variant:"outline",size:"xs",onClick:()=>t(l),className:"w-full",title:"",children:a.jsx(Ci,{size:"xs"})})]})]},l.id)}),o.length===0&&a.jsxs("div",{className:"text-center py-16 text-muted",children:[a.jsx(Xa,{size:"lg",className:"mx-auto mb-8 opacity-50"}),a.jsx("div",{className:"text-sm",children:i?"No tables match your search":"No tables available"}),!i&&a.jsx("div",{className:"text-xs mt-4",children:'Create tables in the "Tables & Schema" section below'})]})]})]})}function N2({table:e,onClose:A}){const[t,s]=h.useState([]),[i,n]=h.useState(!0),[o,l]=h.useState(null),[c,g]=h.useState(null),[u,p]=h.useState(1),[f,x]=h.useState(0),w=10,C=h.useCallback(async()=>{var Q;if(e){n(!0),l(null);try{const _=await fetch(`/api/projects/1/database/tables/${e.name}/data?page=${u}&limit=${w}`);if(!_.ok)throw new Error("Failed to fetch table data");const z=await _.json();s(z.data||[]),x(((Q=z.pagination)==null?void 0:Q.total)||0)}catch(P){l(P.message),s([{id:1,name:"John Doe",email:"john@example.com",created_at:"2024-01-15"},{id:2,name:"Jane Smith",email:"jane@example.com",created_at:"2024-01-16"}]),x(2)}finally{n(!1)}}},[e,u]),H=async Q=>{if(confirm("Are you sure you want to delete this row?"))try{K(v("Row deleted successfully")),C()}catch(P){K(v("Failed to delete row: :error",{values:{error:P.message}}))}},j=Q=>{g({...Q})},E=async()=>{if(c)try{K(v("Row updated successfully")),g(null),C()}catch(Q){K(v("Failed to update row: :error",{values:{error:Q.message}}))}},V=()=>{if(t.length===0)return;const Q=Object.keys(t[0]),P=[Q.join(","),...t.map(S=>Q.map(F=>`"${S[F]||""}"`).join(","))].join(`
`),_=new Blob([P],{type:"text/csv"}),z=window.URL.createObjectURL(_),$=document.createElement("a");$.href=z,$.download=`${e.name}_export.csv`,$.click(),window.URL.revokeObjectURL(z),K(v("Data exported successfully"))};ut.useEffect(()=>{C()},[C]);const T=e.fields||[],I=Math.ceil(f/w);return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsxs("div",{className:"flex items-center justify-between w-full",children:[a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Xa,{}),a.jsxs("div",{children:[a.jsx(d,{message:"Table Data: :name",values:{name:e.displayName||e.name}}),a.jsxs("div",{className:"text-xs text-muted",children:[f," total rows"]})]})]}),a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx(U,{variant:"outline",size:"xs",onClick:V,disabled:t.length===0,title:"Export CSV",children:a.jsx(Yu,{size:"xs"})}),a.jsx(U,{variant:"outline",size:"xs",onClick:()=>C(),disabled:i,title:"Refresh",children:a.jsx(Ju,{size:"xs"})})]})]})}),a.jsxs(te,{className:"min-h-[400px] max-h-[600px] overflow-y-auto",children:[i&&a.jsx("div",{className:"flex items-center justify-center py-32",children:a.jsxs("div",{className:"text-center",children:[a.jsx("div",{className:"animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"}),a.jsx("div",{className:"mt-12 text-sm text-muted",children:"Loading table data..."})]})}),o&&a.jsx("div",{className:"bg-red-50 border border-red-200 rounded-lg p-12",children:a.jsxs("div",{className:"flex items-center gap-8 text-red-700",children:[a.jsx(hd,{}),a.jsxs("div",{children:[a.jsx("div",{className:"font-medium",children:"Error loading data"}),a.jsx("div",{className:"text-sm",children:o})]})]})}),!i&&!o&&t.length===0&&a.jsxs("div",{className:"text-center py-32",children:[a.jsx(Xa,{size:"lg",className:"mx-auto text-muted opacity-50 mb-12"}),a.jsx("div",{className:"text-sm text-muted",children:"No data in this table"}),a.jsx("div",{className:"text-xs text-muted mt-4",children:'Use "" to add data'})]}),!i&&!o&&t.length>0&&a.jsxs("div",{className:"space-y-12",children:[a.jsx("div",{className:"overflow-x-auto",children:a.jsxs("table",{className:"w-full border-collapse border border-gray-200 text-xs",children:[a.jsx("thead",{children:a.jsxs("tr",{className:"bg-gray-50",children:[T.map(Q=>a.jsxs("th",{className:"border border-gray-200 px-8 py-6 text-left font-medium",children:[Q.displayName||Q.name,a.jsx("div",{className:"text-xs text-muted font-normal",children:Q.type})]},Q.name)),a.jsx("th",{className:"border border-gray-200 px-8 py-6 text-left font-medium",children:"Actions"})]})}),a.jsx("tbody",{children:t.map((Q,P)=>a.jsxs("tr",{className:"hover:bg-gray-50",children:[T.map(_=>a.jsx("td",{className:"border border-gray-200 px-8 py-6",children:c&&c.id===Q.id?a.jsx("input",{type:"text",value:c[_.name]||"",onChange:z=>g({...c,[_.name]:z.target.value}),className:"w-full px-6 py-4 text-xs border rounded"}):a.jsx("span",{className:"truncate max-w-[150px] block",children:String(Q[_.name]||"")})},_.name)),a.jsx("td",{className:"border border-gray-200 px-8 py-6",children:a.jsx("div",{className:"flex items-center gap-4",children:c&&c.id===Q.id?a.jsxs(a.Fragment,{children:[a.jsx(U,{variant:"outline",size:"xs",onClick:E,children:"Save"}),a.jsx(U,{variant:"outline",size:"xs",onClick:()=>g(null),children:"Cancel"})]}):a.jsxs(a.Fragment,{children:[a.jsx(ee,{size:"xs",onClick:()=>j(Q),children:a.jsx(rt,{})}),a.jsx(ee,{size:"xs",onClick:()=>H(),className:"text-red-500 hover:text-red-700",children:a.jsx(vs,{})})]})})})]},Q.id||P))})]})}),I>1&&a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsxs("div",{className:"text-xs text-muted",children:["Showing ",(u-1)*w+1," to ",Math.min(u*w,f)," of ",f," rows"]}),a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(U,{variant:"outline",size:"xs",onClick:()=>p(Q=>Math.max(1,Q-1)),disabled:u===1,children:"Previous"}),a.jsxs("span",{className:"text-xs text-muted",children:["Page ",u," of ",I]}),a.jsx(U,{variant:"outline",size:"xs",onClick:()=>p(Q=>Math.min(I,Q+1)),disabled:u===I,children:"Next"})]})]})]})]}),a.jsx(ne,{children:a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})})})]})}function T2({table:e,onClose:A}){const[t,s]=h.useState(null),[i,n]=h.useState([]),[o,l]=h.useState([]),[c,g]=h.useState({}),[u,p]=h.useState(!1),[f,x]=h.useState([]),[w,C]=h.useState("upload"),H=async T=>{var $;const I=($=T.target.files)==null?void 0:$[0];if(!I||!I.name.endsWith(".csv")){K(v("Please select a valid CSV file"));return}s(I);const P=(await I.text()).split(`
`),_=P[0].split(",").map(S=>S.trim().replace(/"/g,"")),z=P.slice(1).filter(S=>S.trim()).map(S=>{const F=S.split(",").map(m=>m.trim().replace(/"/g,""));return _.reduce((m,b,y)=>(m[b]=F[y]||"",m),{})});l(_),n(z),x(z.slice(0,5)),C("map")},j=()=>{if(Object.keys(c).length===0){K(v("Please map at least one field"));return}C("preview")},E=async()=>{p(!0);try{const T=i.map(I=>{const Q={};return Object.entries(c).forEach(([P,_])=>{_&&I[P]!==void 0&&(Q[_]=I[P])}),Q});K(v("Successfully imported :count rows",{values:{count:T.length}})),C("complete")}catch(T){K(v("Import failed: :error",{values:{error:T.message}}))}finally{p(!1)}},V=e.fields||[];return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(Ci,{}),a.jsxs("div",{children:[a.jsx(d,{message:"Import CSV Data"}),a.jsxs("div",{className:"text-xs text-muted",children:["Import data into ",e.displayName||e.name]})]})]})}),a.jsxs(te,{className:"min-h-[400px]",children:[w==="upload"&&a.jsxs("div",{className:"space-y-16",children:[a.jsx("div",{className:"text-center",children:a.jsxs("div",{className:"border-2 border-dashed border-gray-300 rounded-lg p-32",children:[a.jsx(Ci,{size:"lg",className:"mx-auto text-muted mb-12"}),a.jsx("div",{className:"text-sm font-medium mb-8",children:"Choose CSV file to import"}),a.jsx("div",{className:"text-xs text-muted mb-16",children:"File should have headers matching your table fields"}),a.jsx("input",{type:"file",accept:".csv",onChange:H,className:"block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"})]})}),a.jsxs("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-12",children:[a.jsx("div",{className:"text-sm font-medium text-blue-900 mb-8",children:"CSV Format Requirements"}),a.jsxs("ul",{className:"text-xs text-blue-700 space-y-4",children:[a.jsx("li",{children:"• First row should contain column headers"}),a.jsx("li",{children:"• Fields should be comma-separated"}),a.jsx("li",{children:"• Text fields with commas should be quoted"}),a.jsx("li",{children:"• Date fields should be in YYYY-MM-DD format"})]})]})]}),w==="map"&&a.jsxs("div",{className:"space-y-16",children:[a.jsx("div",{className:"text-sm font-medium",children:"Map CSV columns to table fields"}),a.jsxs("div",{className:"grid grid-cols-2 gap-16",children:[a.jsxs("div",{children:[a.jsxs("div",{className:"text-xs font-medium text-muted mb-8",children:["CSV Columns (",o.length,")"]}),a.jsx("div",{className:"space-y-6 max-h-[300px] overflow-y-auto",children:o.map(T=>a.jsx("div",{className:"bg-gray-50 rounded px-8 py-6 text-sm",children:T},T))})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"text-xs font-medium text-muted mb-8",children:["Table Fields (",V.length,")"]}),a.jsx("div",{className:"space-y-8",children:o.map(T=>a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx("div",{className:"text-sm min-w-[100px] truncate",children:T}),a.jsx("div",{className:"text-xs text-muted",children:"→"}),a.jsxs(Qe,{selectedValue:c[T]||"",selectionMode:"single",onSelectionChange:I=>g(Q=>({...Q,[T]:I})),placeholder:"Select field",size:"xs",className:"flex-1",children:[a.jsx(k,{value:"",children:a.jsx(d,{message:"Skip this column"})}),V.map(I=>a.jsxs(k,{value:I.name,children:[I.displayName||I.name," (",I.type,")"]},I.name))]})]},T))})]})]}),a.jsx("div",{className:"bg-yellow-50 border border-yellow-200 rounded-lg p-12",children:a.jsxs("div",{className:"text-xs text-yellow-700",children:[a.jsx("strong",{children:"Note:"})," Unmapped columns will be ignored during import. Make sure to map all required fields."]})})]}),w==="preview"&&a.jsxs("div",{className:"space-y-16",children:[a.jsxs("div",{className:"text-sm font-medium",children:["Preview import (",i.length," rows)"]}),a.jsx("div",{className:"overflow-x-auto",children:a.jsxs("table",{className:"w-full border-collapse border border-gray-200 text-xs",children:[a.jsx("thead",{children:a.jsx("tr",{className:"bg-gray-50",children:Object.values(c).filter(Boolean).map(T=>a.jsx("th",{className:"border border-gray-200 px-8 py-6 text-left font-medium",children:T},T))})}),a.jsx("tbody",{children:f.map((T,I)=>a.jsx("tr",{className:"hover:bg-gray-50",children:Object.entries(c).filter(([Q,P])=>P).map(([Q,P])=>a.jsx("td",{className:"border border-gray-200 px-8 py-6",children:T[Q]||""},Q))},I))})]})}),i.length>5&&a.jsxs("div",{className:"text-xs text-muted text-center",children:["... and ",i.length-5," more rows"]})]}),w==="complete"&&a.jsxs("div",{className:"text-center py-32",children:[a.jsx("div",{className:"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-16",children:a.jsx("svg",{className:"w-8 h-8 text-green-600",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:a.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 13l4 4L19 7"})})}),a.jsx("div",{className:"text-sm font-medium mb-8",children:"Import Completed Successfully!"}),a.jsxs("div",{className:"text-xs text-muted",children:[i.length," rows have been imported into ",e.displayName||e.name]})]})]}),a.jsx(ne,{children:a.jsxs("div",{className:"flex items-center justify-between w-full",children:[a.jsx("div",{className:"flex items-center gap-8",children:w!=="upload"&&w!=="complete"&&a.jsx(U,{variant:"text",onClick:()=>{w==="map"&&C("upload"),w==="preview"&&C("map")},children:a.jsx(d,{message:"Back"})})}),a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Close"})}),w==="map"&&a.jsx(U,{onClick:j,children:a.jsx(d,{message:"Next: Preview"})}),w==="preview"&&a.jsx(U,{onClick:E,disabled:u,children:u?a.jsx(d,{message:"Importing..."}):a.jsx(d,{message:"Import Data"})})]})]})})]})}function D2({table:e,onClose:A}){const[t,s]=h.useState({}),[i,n]=h.useState(!1),o=async()=>{n(!0);try{K(v("Row added successfully")),A()}catch(c){K(v("Failed to add row: :error",{values:{error:c.message}}))}finally{n(!1)}},l=e.fields||[];return a.jsxs(a.Fragment,{children:[a.jsx(se,{children:a.jsxs("div",{className:"flex items-center gap-8",children:[a.jsx(pn,{}),a.jsxs("div",{children:[a.jsx(d,{message:"Add New Row"}),a.jsxs("div",{className:"text-xs text-muted",children:["Add data to ",e.displayName||e.name]})]})]})}),a.jsx(te,{className:"max-h-[500px] overflow-y-auto",children:a.jsx("div",{className:"space-y-16",children:l.map(c=>a.jsxs("div",{children:[a.jsxs("label",{className:"block text-sm font-medium mb-6",children:[c.displayName||c.name,c.required&&a.jsx("span",{className:"text-red-500 ml-4",children:"*"})]}),c.type==="textarea"?a.jsx("textarea",{value:t[c.name]||"",onChange:g=>s(u=>({...u,[c.name]:g.target.value})),className:"w-full px-12 py-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm",rows:3,placeholder:`Enter ${c.displayName||c.name}`}):c.type==="select"&&c.options?a.jsx(Qe,{selectedValue:t[c.name]||"",selectionMode:"single",onSelectionChange:g=>s(u=>({...u,[c.name]:g})),placeholder:`Select ${c.displayName||c.name}`,children:c.options.map(g=>a.jsx(k,{value:g.value,children:g.label},g.value))}):c.type==="boolean"?a.jsxs("div",{className:"flex items-center gap-12",children:[a.jsxs("label",{className:"flex items-center gap-6 cursor-pointer",children:[a.jsx("input",{type:"radio",name:c.name,value:"true",checked:t[c.name]===!0,onChange:()=>s(g=>({...g,[c.name]:!0})),className:"form-radio text-primary"}),a.jsx("span",{className:"text-sm",children:"True"})]}),a.jsxs("label",{className:"flex items-center gap-6 cursor-pointer",children:[a.jsx("input",{type:"radio",name:c.name,value:"false",checked:t[c.name]===!1,onChange:()=>s(g=>({...g,[c.name]:!1})),className:"form-radio text-primary"}),a.jsx("span",{className:"text-sm",children:"False"})]})]}):a.jsx("input",{type:c.type==="email"?"email":c.type==="decimal"?"number":c.type==="date"?"date":c.type==="datetime"?"datetime-local":"text",value:t[c.name]||"",onChange:g=>s(u=>({...u,[c.name]:g.target.value})),className:"w-full px-12 py-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm",placeholder:`Enter ${c.displayName||c.name}`,step:c.type==="decimal"?"0.01":void 0}),c.description&&a.jsx("div",{className:"text-xs text-muted mt-4",children:c.description})]},c.name))})}),a.jsxs(ne,{children:[a.jsx(U,{variant:"text",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{onClick:o,disabled:i,children:i?a.jsx(d,{message:"Saving..."}):a.jsx(d,{message:"Add Row"})})]})]})}function M2({children:e,color:A,variant:t,radius:s="rounded-button",size:i,className:n,value:o,onChange:l,multiple:c,disabled:g}){const u=x=>o===void 0?!1:c?o.includes(x):x===o,p=x=>{const w=[...o],C=o.indexOf(x);return C>-1?w.splice(C,1):w.push(x),w},f=ut.Children.map(e,(x,w)=>{if(ut.isValidElement(x)){const C=u(x.props.value),H=C?"primary":A;return ut.cloneElement(x,{color:C?"primary":A,variant:t,size:i,radius:null,disabled:x.props.disabled||g,...x.props,onClick:j=>{x.props.onClick&&x.props.onClick(j),l&&(c?l==null||l(p(x.props.value)):l==null||l(x.props.value))},className:X(x.props.className,C?"z-20":"z-10",K2(w,e,s,H))})}});return a.jsx("div",{className:X(s,"isolate inline-flex",n),children:f})}function K2(e,A,t,s){return e===0?X(t,"rounded-tr-none rounded-br-none",!s&&"border-r-transparent disabled:border-r-transparent"):e===A.length-1?X(t,"rounded-tl-none rounded-bl-none -ml-1"):X("rounded-none -ml-1",!s&&"border-r-transparent disabled:border-r-transparent")}const R2=ut.lazy(()=>fd(()=>import("./ace-editor-8be828d7.js"),["./ace-editor-8be828d7.js","./main-337de3ae.js","./main-4e1a3ce1.css","./index-5763e716.js"],import.meta.url));function z2(){const{close:e}=be(),A=AA(),[t,s]=h.useState("css"),[i,n]=h.useState(!0),o=h.createRef(),{data:l}=kt(),[c,g]=h.useState(()=>{var f,x;return{css:((f=B().project)==null?void 0:f.css)??"",js:((x=B().project)==null?void 0:x.js)??""}}),u=()=>{var x;const f={...c,[t]:(x=o.current)==null?void 0:x.editor.getValue()};A.mutate(f,{onSuccess:()=>{O2(),e(),K(v("Custom code saved"))}})},p=f=>{var C,H;const x=(C=o.current)==null?void 0:C.editor.getValue(),w=c[f];g({...c,[t]:x}),x!==w&&((H=o.current)==null||H.editor.setValue(w,-1)),s(f)};return a.jsxs(me,{size:"fullscreen",className:"h-full w-full",children:[a.jsx(se,{actions:a.jsxs(M2,{variant:"outline",radius:"rounded-md",size:"xs",value:t,onChange:p,className:"mr-auto",children:[a.jsx(U,{value:"css",children:a.jsx(d,{message:"CSS"})}),a.jsx(U,{value:"js",children:a.jsx(d,{message:"JavaScript"})})]}),children:a.jsx(d,{message:"Custom code"})}),a.jsxs(te,{className:"relative flex-auto",padding:"p-0",children:[(l==null?void 0:l.projects.customCode)===!1&&a.jsx(ag,{className:"absolute inset-0 z-10 m-auto h-max w-max shadow",description:a.jsxs("div",{className:"flex items-center gap-6",children:[a.jsx(Wa,{className:"text-primary",size:"sm"}),a.jsx(d,{message:"To unlock custom code for this site <a>upgrade your plan.</a>",values:{a:f=>a.jsx(BA,{className:sn,to:"/pricing",children:f})}})]})}),a.jsx(h.Suspense,{fallback:a.jsx("div",{className:"flex h-400 w-full items-center justify-center",children:a.jsx(xd,{"aria-label":"Loading editor...",isIndeterminate:!0,size:"md"})}),children:a.jsx(R2,{beautify:!1,mode:t==="js"?"javascript":t,onChange:()=>{},defaultValue:c[t]||"",onIsValidChange:n,editorRef:o})})]}),a.jsxs(ne,{dividerTop:!0,children:[a.jsx(U,{onClick:()=>e(),children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{disabled:!(l!=null&&l.projects.customCode)||!i||A.isPending,variant:"flat",color:"primary",onClick:()=>u(),children:a.jsx(d,{message:"Save"})})]})]})}function O2(){const e=B().getEditorDoc().querySelector("#custom-css"),A=new URL(e.href);e.href=`${A.origin}${A.pathname}?${Je(8)}`;const t=B().getEditorDoc().querySelector("#custom-js"),s=new URL(t.src);t.src=`${s.origin}${s.pathname}?${Je(8)}`}function P2({project:e}){const A=h.useRef(null),t=J(i=>i.sidebarIsVisible),s=J(i=>i.sidebarWidth);return h.useEffect(()=>Hc(A,()=>{B().syncIframeRect()}),[]),a.jsxs("div",{ref:A,className:"relative z-20 flex w-350 flex-shrink-0 bg-background shadow-xl transition-[margin]",style:{marginLeft:t?void 0:`-${s}`},children:[a.jsx(Ft,{className:"absolute bottom-1/2 left-full top-1/2 z-10 h-40 w-14 -translate-y-1/2 items-center rounded-r border-y border-r bg shadow-[3px_1px_3px_rgba(0,0,0,.05)]",onClick:()=>{B().setSidebarIsVisible(!t)},children:t?a.jsx(Hn,{size:"xs"}):a.jsx(tu,{size:"xs"})}),a.jsxs("nav",{className:"flex flex-shrink-0 flex-col items-center gap-8 border-r pt-8",children:[a.jsx(ea,{label:a.jsx(d,{message:"Dashboard"}),delay:300,placement:"right",children:a.jsx(ee,{elementType:BA,to:"/dashboard",display:"flex",radius:"rounded-none",className:"mb-18 text-muted",children:a.jsx(Hn,{})})}),a.jsx(wt,{icon:a.jsx(dn,{}),panel:fe.ELEMENTS,children:a.jsx(d,{message:"Elements"})}),a.jsx(wt,{icon:a.jsx($u,{}),panel:fe.LAYOUT,children:a.jsx(d,{message:"Layout"})}),a.jsx(wt,{icon:a.jsx(Zu,{}),panel:fe.STYLE,children:a.jsx(d,{message:"Style"})}),a.jsx(wt,{icon:a.jsx(xA,{}),panel:fe.ACTIONS,children:a.jsx(d,{message:"Actions"})}),a.jsx(wt,{icon:a.jsx(Kt,{}),panel:fe.DATA,children:a.jsx(d,{message:"Data"})}),a.jsx(wt,{icon:a.jsx(Lo,{}),panel:fe.PAGES,children:a.jsx(d,{message:"Pages"})}),e&&a.jsxs(ue,{type:"modal",children:[a.jsx(wt,{icon:a.jsx(hs,{}),panel:fe.SETTINGS,children:a.jsx(d,{message:"Settings"})}),a.jsx(sg,{project:e})]}),a.jsxs(ue,{type:"modal",children:[a.jsx(wt,{icon:a.jsx(Rd,{}),children:a.jsx(d,{message:"Code"})}),a.jsx(z2,{})]}),a.jsx(wt,{icon:a.jsx(eg,{}),panel:fe.HISTORY,children:a.jsx(d,{message:"History"})})]}),a.jsxs("aside",{className:"relative flex h-full min-w-0 flex-auto flex-col",children:[a.jsx("div",{className:"compact-scrollbar flex-auto overflow-y-auto",children:a.jsx(V2,{})}),e&&a.jsx(dC,{project:e})]})]})}function V2(){switch(J(A=>A.activePanel)){case fe.ELEMENTS:return a.jsx(Sx,{});case fe.STYLE:return a.jsx(hy,{});case fe.ACTIONS:return a.jsx(Vy,{});case fe.DATA:return a.jsx(x2,{});case fe.HISTORY:return a.jsx(wy,{});case fe.LAYOUT:return a.jsx(jy,{});case fe.PAGES:return a.jsx(Ny,{})}}const wt=h.forwardRef(({icon:e,children:A,panel:t,...s},i)=>{const n=J(o=>o.activePanel);return a.jsx(ea,{label:A,delay:300,placement:"right",children:a.jsx(ee,{ref:i,size:null,className:"h-48 w-48",radius:"rounded-none",color:n===t?"primary":void 0,onClick:t?()=>B().setActivePanel(t):void 0,...s,children:e})})});function G2(){const e=J(s=>s.dragState!==!1),A=h.useRef(null),{droppableProps:t}=zd({id:"drag-overlay",types:["element-panel"],ref:A,onDragEnter:()=>{B().setDragState("dragging")},onDragLeave:()=>{B().setDragState("outOfBounds")}});return a.jsx("div",{className:"dropzone-overlay absolute inset-0 m-auto",inert:e?void 0:"",ref:A,...t})}function _2(e){const A=h.useRef(e),t=h.useId();h.useEffect(()=>(Nn.set(t,A.current),()=>{Nn.delete(t)}),[t])}function q2(e,A,t){if(e.nodeName==="#text")return!1;const s=e.getBoundingClientRect();return t<s.bottom?t<s.top||A<s.left:!1}function W2(e,A,t){if(!e)return null;for(let o=0,l=e.children.length;o<l;o++){const c=e.children[o];if(nt.canInsertElInto(e,A.el)&&q2(c,t.x,t.y))return{...Ka(c,A,"above"),newParent:Z(e)}}const s=e.getBoundingClientRect(),i=t.y-s.top,n=i>5&&i<s.height-5;if((e.childElementCount===0||e.nodeName==="BODY")&&n&&nt.canInsertElInto(e,A.el))return{...Ka(e,A,"inside"),newParent:Z(e)};if(e.parentElement&&nt.canInsertElInto(e.parentElement,A.el)){const o=Z(e.parentElement);return i<s.height/2?{...Ka(e,A,"above"),newParent:o}:{...Ka(e,A,"below"),newParent:o}}return null}function Ka(e,A,t){const s=e.getBoundingClientRect(),i=e.parentElement,n={left:s.left,width:s.width,top:0,arrow:"top",newIndex:null,newParent:null};t==="inside"?(n.top=s.top+s.height/2,n.arrow="both",n.newIndex=0):t==="above"?(n.top=s.top,n.arrow="top",n.newIndex=Ye(e)):(n.top=s.top+s.height,n.arrow="bottom",n.newIndex=Ye(e)+1),Al(e)&&cl(e,n);const o=A.node;return o&&(o===e||o===i||o.contains(i))&&(n.newIndex=null,n.newParent=null),n}function X2(e,A){var n;const t=A.querySelector(e),i=`${(n=t.getAttribute("href"))==null?void 0:n.split("?")[0]}?=${Je(8)}`;t.setAttribute("href",i)}const Yr=e=>{B().getEditorDoc().documentElement.scrollTop+=e.deltaY},xi=new class{constructor(){r(this,"scrollDownTimeout");r(this,"scrollUpTimeout");r(this,"editorHeight",0)}start(){this.editorHeight=B().getEditorDoc().documentElement.offsetHeight,B().getEditorWindow().addEventListener("wheel",Yr)}scroll(e){const A=Va(B().getEditorDoc()),t=e+A;t-A<=80?this.scrollUp():t>A+this.editorHeight-80?this.scrollDown():this.stopScrolling()}stop(){this.editorHeight=0,B().getEditorWindow().removeEventListener("wheel",Yr),this.stopScrolling()}scrollUp(){clearInterval(this.scrollUpTimeout),this.scrollUpTimeout=setInterval(()=>{this.setScrollTop(Va(B().getEditorDoc())-40)},40)}scrollDown(){clearInterval(this.scrollDownTimeout),this.scrollDownTimeout=setInterval(()=>{this.setScrollTop(Va(B().getEditorDoc())+40)},40)}stopScrolling(){clearInterval(this.scrollDownTimeout),clearInterval(this.scrollUpTimeout)}setScrollTop(e){e=Math.max(0,e),B().getEditorDoc().documentElement.scrollTop=e}};let Be=null;function Y2(){const e=h.useRef(null),A=J(i=>i.dragState),t=AA(),s=i=>{const n=B().getEditorDoc(),o=Je(8),l=n.createElement("style");l.id=o,l.textContent=i,n.head.appendChild(l),t.mutate({custom_element_css:i},{onSuccess:()=>{X2("#custom-elements-css",n),requestAnimationFrame(()=>l.remove())}})};return _2({type:"element-panel",onDragStart:(i,n)=>{xi.start();const o=n.getData();Ux(),o.node&&(o.node.style.opacity="0.5"),Be={},o.node&&o.node.parentElement&&(Be.oldIndex=Ye(o.node),Be.oldParent=Z(o.node.parentElement))},onDragMove:(i,n)=>{const o=n.getData();if(i.x<=B().iframeRect.left||i.y<=B().iframeRect.top||i.x>=B().iframeRect.width+B().iframeRect.left||i.y>=B().iframeRect.height+B().iframeRect.top)return;xi.scroll(i.y);const l={x:i.x-B().iframeRect.left,y:i.y-B().iframeRect.top},c=B().getEditorDoc().elementFromPoint(l.x,l.y);Be={...Be,...W2(c,o,l)},e.current.style.top=`${Be.top}px`,e.current.style.left=`${Be.left}px`,e.current.style.width=`${Be.width}px`,J2(e.current,Be.arrow)},onDragEnd:(i,n,o)=>{xi.stop();const l=n.getData();if(l.node&&(l.node.style.opacity=""),o==="dropSuccess"&&Be!=null&&l.el.html!=null&&Be.newIndex!=null&&Be.newParent!=null){l.el.css&&s(l.el.css);const c=l.node&&Be.oldIndex!=null&&Be.oldParent!=null?new eA({el:l.node,oldIndex:Be.oldIndex,oldParentId:Be.oldParent,newIndex:Be.newIndex,newParentId:Be.newParent}):new sa(l.node??gg(l.el.html),Be.newIndex,Be.newParent);G().executeMutation(c,{lastInSession:!0}),l.node&&xe(l.node)}Be=null}}),a.jsx("div",{className:X("drop-placeholder pointer-events-none absolute z-20 h-3 select-none bg-primary",(!A||A==="outOfBounds")&&"hidden"),ref:e})}function J2(e,A){A==="top"?(e.classList.remove("arrow-bottom"),e.classList.add("arrow-top")):A==="bottom"?(e.classList.remove("arrow-top"),e.classList.add("arrow-bottom")):A==="both"?(e.classList.add("arrow-top"),e.classList.add("arrow-bottom")):(e.classList.remove("arrow-top"),e.classList.remove("arrow-bottom"))}function $2(e){return e||(e=document),e.activeElement?["INPUT","TEXTAREA"].includes(e.activeElement.tagName)||e.activeElement.isContentEditable:!1}function Z2(){const e=B().getEditorDoc();e&&(e.addEventListener("mousemove",A=>{var i;if($2()||He().sessionIsActive)return;const t=A.target,s=(i=B().selectedContext)==null?void 0:i.node;(!s||!s.contains(t))&&oa(A)}),e.addEventListener("click",A=>{tA(A.target)||(A.preventDefault(),A.stopPropagation(),He().sessionIsActive||xe(A.target))}),e.addEventListener("contextmenu",A=>{A.preventDefault()}),e.addEventListener("scroll",()=>{var A;(A=B().selectedContext)!=null&&A.node&&gt.reposition(),Oe.reposition()}),e.addEventListener("selectionchange",()=>{ul()}),J.setState({iframeLoading:!1}),e.addEventListener("mouseleave",()=>Oe.hide()))}function eQ(){return a.jsx("div",{className:"fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background",children:a.jsxs("div",{className:"w-max",children:[a.jsx("div",{className:"flex h-128 w-128 items-center justify-center rounded-full border border-divider/4 bg-background shadow",children:a.jsx("div",{className:"loader-grid grid grid-cols-3 gap-8",children:Array.from({length:9}).map((e,A)=>a.jsx(tQ,{},A))})}),a.jsx("div",{className:"mt-14 text-center text-sm font-semibold uppercase text-muted",children:a.jsx(d,{message:"Loading..."})})]})})}function tQ(){return a.jsx("div",{className:"h-16 w-16 animate-pulse rounded-full bg-primary-light"})}const Jr=e=>{const A={x:e.x,y:e.y,top:e.top,left:e.left,bottom:e.bottom,right:e.right,width:e.width,height:e.height};return A.left+=B().iframeRect.left,A.top+=B().iframeRect.top,A};function AQ(){var A;const e=B().getEditorWindow().getSelection();if(e!=null&&e.anchorNode&&((A=e.anchorNode.parentNode)==null?void 0:A.nodeName)==="A"){const t=e.anchorNode.parentNode;if(t)return{href:t.getAttribute("href"),target:t.getAttribute("target"),download:t.getAttribute("download")}}return null}function aQ(){var c;const e=_A(g=>g.hasInlineSelection),A=_A(g=>g.activeCommands),t=J(g=>g.iframeLoading),{refs:s,floatingStyles:i,update:n,middlewareData:o}=go({placement:"top",middleware:[bd(6),po({mainAxis:!0,crossAxis:!1}),mo({mainAxis:!0,crossAxis:!0}),wd()],whileElementsMounted:ho}),l=h.useCallback(()=>{var p;const g=(p=B().getEditorDoc())==null?void 0:p.getSelection(),u=g==null?void 0:g.getRangeAt(0);if(u){const f={getBoundingClientRect:()=>Jr(u.getBoundingClientRect()),getClientRects:()=>[...u.getClientRects()].map(Jr)};s.setReference(f)}},[s]);return h.useEffect(()=>{He().setRepositionToolbar(l)},[l]),h.useEffect(()=>{var g;if(!t){const u=()=>n();(g=B().getEditorDoc())==null||g.addEventListener("scroll",u,{passive:!0})}return()=>{var u;(u=B().getEditorDoc())==null||u.removeEventListener("scroll",n)}},[n,t]),a.jsx("div",{ref:s.setFloating,style:{...i,visibility:(c=o.hide)!=null&&c.referenceHidden?"hidden":"visible"},className:X("content-editable-toolbar absolute flex items-center gap-4 rounded-panel border bg",e?"z-20":"pointer-events-none invisible -z-20"),children:a.jsxs("div",{className:"flex items-center",children:[a.jsx(ee,{size:"sm",onClick:()=>He().execCommand("bold"),color:A.includes("bold")?"primary":void 0,children:a.jsx(Od,{})}),a.jsx(ee,{size:"sm",onClick:()=>He().execCommand("underline"),value:"underline",color:A.includes("underline")?"primary":void 0,children:a.jsx(wo,{})}),a.jsx(ee,{size:"sm",value:"italic",onClick:()=>He().execCommand("italic"),color:A.includes("italic")?"primary":void 0,children:a.jsx(bo,{})}),a.jsx(ee,{size:"sm",color:A.includes("createLink")?"primary":void 0,onClick:async()=>{const g=await Zo(AQ());g==="unlink"?He().execCommand("unlink"):g&&He().execCommand("createLink",g)},value:"createLink",children:a.jsx(zt,{})}),a.jsx(ee,{size:"sm",color:A.includes("createLink")?"primary":void 0,onClick:async()=>{var u;const g=await Yt(zo);g&&((u=B().getEditorDoc().getSelection())==null||u.collapseToStart(),He().execCommand("insertHTML",`<i class="${g}"/>`),He().setHasInlineSelection(!1))},value:"selectIcon",children:a.jsx(Qo,{})})]})})}function Rc({isVisible:e,children:A,className:t,overlayRef:s,...i}){return a.jsx("div",{ref:s,className:X(t,e?"visible":"invisible","element-overlay pointer-events-none absolute left-0 top-0 text-primary-light after:absolute after:inset-1 after:outline"),...i,children:A})}function sQ(e,A,t){let s=A,i=t;return e&&(t*e>A?i=A/e:s=t*e),{width:Math.floor(s),height:Math.floor(i)}}function iQ(e,A){const t={...e};t.left=Math.max(0,t.left);const s=t.left-e.left;s>0&&(t.width-=s),t.top=Math.max(0,t.top);const i=t.top-e.top;return i>0&&(t.height-=i),t.width=Math.min(t.width,A.width-t.left),t.height=Math.min(t.height,A.height-t.top),t}var zc=(e=>(e.topLeft="topLeft",e.topRight="topRight",e.bottomLeft="bottomLeft",e.bottomRight="bottomRight",e))(zc||{});let re={};const $r=(e={})=>{Co(null),re=e};function nQ({aspectRatio:e,boundaryRef:A,boundaryRect:t,restrictWithinBoundary:s=!0,minWidth:i=50,minHeight:n=50,...o}){const l={onMoveStart:(g,u)=>{var f;const p=g.target;if(!p.dataset.resizeHandle||Vd||($r({currentRect:Bi(u.getBoundingClientRect()),resizeDir:p.dataset.resizeHandle}),!re.currentRect))return!1;Co("resize"),t?re.boundaryRect=t:A!=null&&A.current&&(re.boundaryRect=Bi(A.current.getBoundingClientRect())),re.currentRect&&re.boundaryRect&&(re.currentRect.left-=re.boundaryRect.left,re.currentRect.top-=re.boundaryRect.top),re.initialAspectRatio=re.currentRect.width/re.currentRect.height,(f=o.onResizeStart)==null||f.call(o,Os({rect:re.currentRect,e:g}))},onMove:(g,u,p)=>{var C;if(!re.resizeDir||!re.currentRect)return;const f=e==="initial"?re.initialAspectRatio:e,x=rQ(re.currentRect,u,p,f),w=oQ(x,i,n,f);(C=o.onResize)==null||C.call(o,Os({rect:w,e:g,deltaX:u,deltaY:p})),re.currentRect=x},onMoveEnd:g=>{var u;re.currentRect&&((u=o.onResizeEnd)==null||u.call(o,Os({rect:re.currentRect,e:g}))),$r()}},{domProps:c}=Pd(l);return{resizeProps:c}}function rQ(e,A,t,s){const i={...e},n={...e};return re.resizeDir==="topRight"?(n.width=Math.floor(n.width+A),s?n.height=Math.floor(n.width/s):n.height=Math.floor(n.height-t),n.top=Math.floor(n.top+(i.height-n.height))):re.resizeDir==="bottomRight"?(n.width=Math.floor(n.width+A),s?n.height=Math.floor(n.width/s):n.height=Math.floor(n.height+t)):re.resizeDir==="topLeft"?(n.width=Math.floor(n.width-A),s?n.height=Math.floor(n.width/s):n.height=Math.floor(n.height-t),n.left=Math.floor(n.left+(i.width-n.width)),n.top=Math.floor(n.top+(i.height-n.height))):re.resizeDir==="bottomLeft"&&(n.width=Math.floor(n.width-A),s?n.height=Math.floor(n.width/s):n.height=Math.floor(n.height+t),n.left=Math.floor(n.left+A)),n}function oQ(e,A,t,s){const i=re.resizeDir==="bottomLeft"||re.resizeDir==="topLeft",n=re.resizeDir==="topRight"||re.resizeDir==="topLeft";let o={...e};o.width=Math.max(A,e.width),o.height=Math.max(t,e.height);const l=o.width-e.width;i&&l>0&&(o.left-=l);const c=o.height-e.height;if(n&&c>0&&(o.top-=c),re.boundaryRect&&(o=iQ(o,re.boundaryRect)),s){const g=o.width,u=o.height,p=sQ(s,o.width,o.height);o.width=p.width,o.height=p.height,n&&(o.top+=u-o.height),i&&(o.left+=g-o.width)}return o}class Zr extends Ut{constructor(t,s){super(t,s);r(this,"displayName",v("Changed size"));this.newProps=t}onBeforeExecute(){this.newProps.maxHeight="none",this.newProps.maxWidth="none",super.onBeforeExecute()}}async function lQ(e){var t,s;if(!((s=(t=e==null?void 0:e.el)==null?void 0:t.editActions)!=null&&s[0]))return;const A=e.el.editActions[0].action;if(A==="aiCreateText"){const i=await Yt(YA);i&&hi.replaceTextAction(i);return}if(A==="aiEditText"){const i=await Yt(YA,{initialScreen:()=>({name:"refine",originalText:e.node.textContent})});i&&hi.replaceTextAction(i);return}if(A==="aiCreateImage"){const i=await Yt(Ic);i&&hi.replaceImageSrcAction(i);return}A(e.node)}function cQ({elementId:e,onClose:A}){const t=J(b=>b.project),[s,i]=h.useState([]),[n,o]=h.useState(""),[l,c]=h.useState("single"),[g,u]=h.useState(null),[p,f]=h.useState([]),[x,w]=h.useState(!1),C=[{name:"users",fields:["name","email","avatar","role"]},{name:"products",fields:["name","description","price","image","category"]},{name:"blog_posts",fields:["title","excerpt","featured_image","author","date"]},{name:"team",fields:["name","position","bio","photo"]}];h.useEffect(()=>{H(),j()},[e]);const H=async()=>{var b;if(!t){i(C);return}try{const y=await fetch(`/api/v1/projects/${t.model.id}/database/schema`);if(!y.ok)throw new Error(`HTTP ${y.status}: ${y.statusText}`);const M=((b=(await y.json()).schema)==null?void 0:b.map(W=>{var Y;return{name:W.name,fields:((Y=W.columns)==null?void 0:Y.map(ie=>ie.name))||[]}}))||[];i(M.length>0?M:C)}catch(y){console.error("Failed to load tables:",y),i(C)}},j=()=>{const b=Ee(e,B().getEditorDoc());if(!b)return;const y=E(b);y?(u(y),c("repeating"),T(y)):(c("single"),I(b))},E=b=>{const y=b.parentElement;if(!y)return null;const M=Array.from(y.children).filter(W=>W!==b&&V(W,b));if(M.length>0){let W="cards";return y.tagName==="UL"||y.tagName==="OL"?W="list":(y.classList.contains("grid")||window.getComputedStyle(y).display==="grid")&&(W="grid"),{container:y,items:[b,...M],pattern:W}}return null},V=(b,y)=>{const N=Array.from(b.classList),M=Array.from(y.classList);return N.filter(Y=>M.includes(Y)).length>0||b.tagName===y.tagName&&Math.abs(b.children.length-y.children.length)<=1},T=b=>{const y=[],N=b.items[0];N.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, div, img, a").forEach((W,Y)=>{const ie=W,Ze=Q(ie);Ze&&y.push({elementSelector:P(ie,N),field:"",elementLabel:Ze})}),f(y)},I=b=>{f([{elementSelector:"",field:"",elementLabel:Q(b)}])},Q=b=>{const y=b.className.toLowerCase(),N=b.tagName.toLowerCase();return N.match(/h[1-6]/)?"Title/Heading":N==="img"?"Image":N==="a"?"Link":y.includes("title")?"Title":y.includes("name")?"Name":y.includes("description")?"Description":y.includes("price")?"Price":y.includes("category")?"Category":N==="p"?"Text":"Content"},P=(b,y)=>{if(b.id)return`#${b.id}`;if(b.className)return`.${b.className.split(" ")[0]}`;const N=b.tagName.toLowerCase(),W=Array.from(y.querySelectorAll(N)).indexOf(b);return W>0?`${N}:nth-of-type(${W+1})`:N},_=(b,y)=>{const N=[...p];N[b].field=y,f(N)},z=async()=>{if(!(!n||p.some(b=>!b.field))){w(!0);try{l==="single"?await $():await S(),A()}catch(b){console.error("Failed to apply binding:",b)}finally{w(!1)}}},$=async()=>{const b=Ee(e,B().getEditorDoc());if(!b)return;const y=m(n);if(y.length>0){const N=y[0][p[0].field];b.tagName==="IMG"?b.src=N:b.textContent=N}},S=async()=>{if(!g)return;const b=m(n),y=g.items.length,N=b.length;if(N>y){const W=g.items[0];for(let Y=y;Y<N;Y++){const ie=W.cloneNode(!0);ie.id&&(ie.id=`${ie.id}-${Y}`),g.container.appendChild(ie)}}Array.from(g.container.children).forEach((W,Y)=>{b[Y]&&F(W,b[Y])})},F=(b,y)=>{p.forEach(N=>{if(!N.field)return;const M=b.querySelector(N.elementSelector);if(M){const W=y[N.field];M.tagName==="IMG"?M.src=W:M.textContent=W}})},m=b=>({users:[{name:"John Doe",email:"john@example.com",avatar:"/images/avatar1.jpg",role:"Admin"},{name:"Jane Smith",email:"jane@example.com",avatar:"/images/avatar2.jpg",role:"User"},{name:"Bob Johnson",email:"bob@example.com",avatar:"/images/avatar3.jpg",role:"Editor"}],products:[{name:"Product 1",description:"Amazing product",price:"$29.99",image:"/images/product1.jpg",category:"Electronics"},{name:"Product 2",description:"Great quality",price:"$39.99",image:"/images/product2.jpg",category:"Gadgets"},{name:"Product 3",description:"Best seller",price:"$19.99",image:"/images/product3.jpg",category:"Accessories"}],blog_posts:[{title:"How to Build Apps",excerpt:"Learn the basics...",featured_image:"/images/blog1.jpg",author:"John Doe",date:"2024-01-15"},{title:"Design Patterns",excerpt:"Best practices...",featured_image:"/images/blog2.jpg",author:"Jane Smith",date:"2024-01-20"},{title:"Advanced Tips",excerpt:"Pro techniques...",featured_image:"/images/blog3.jpg",author:"Bob Johnson",date:"2024-01-25"}],team:[{name:"Alice Wilson",position:"CEO",bio:"Leading with vision",photo:"/images/team1.jpg"},{name:"Charlie Brown",position:"CTO",bio:"Tech innovator",photo:"/images/team2.jpg"},{name:"Diana Prince",position:"Designer",bio:"Creating beauty",photo:"/images/team3.jpg"}]})[b]||[];return a.jsx(ue,{type:"modal",isOpen:!0,onClose:A,children:a.jsxs(me,{size:"md",children:[a.jsx(se,{children:a.jsx(d,{message:"Connect Data"})}),a.jsxs(te,{children:[a.jsxs("div",{className:"mb-4 p-3 bg-blue-50 rounded-lg",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx("div",{className:"w-2 h-2 bg-blue-500 rounded-full"}),a.jsx("span",{className:"text-blue-800 font-medium",children:l==="single"?"Single Element Binding":`Repeating Pattern Detected (${g==null?void 0:g.items.length} items)`})]}),l==="repeating"&&a.jsx("p",{className:"text-sm text-blue-600 mt-1",children:"Elements will be duplicated to match your data records"})]}),a.jsxs("div",{className:"mb-4",children:[a.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:a.jsx(d,{message:"Choose Data Source"})}),a.jsxs("select",{value:n,onChange:b=>o(b.target.value),className:"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500",children:[a.jsx("option",{value:"",children:"Select a table..."}),s.map(b=>a.jsxs("option",{value:b.name,children:[b.name," (",b.fields.length," fields)"]},b.name))]})]}),n&&a.jsxs("div",{className:"mb-4",children:[a.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:a.jsx(d,{message:"Map Fields to Elements"})}),a.jsx("div",{className:"space-y-3",children:p.map((b,y)=>{var N;return a.jsxs("div",{className:"border rounded-lg p-3 bg-gray-50",children:[a.jsx("div",{className:"text-sm font-medium text-gray-600 mb-1",children:b.elementLabel}),a.jsxs("select",{value:b.field,onChange:M=>_(y,M.target.value),className:"w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500",children:[a.jsx("option",{value:"",children:"Select field..."}),(N=s.find(M=>M.name===n))==null?void 0:N.fields.map(M=>a.jsx("option",{value:M,children:M},M))]})]},y)})})]})]}),a.jsxs(ne,{children:[a.jsx(U,{variant:"outline",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{onClick:z,disabled:!n||p.some(b=>!b.field)||x,children:x?"Connecting...":l==="single"?"Connect Data":"Connect & Duplicate"})]})]})})}function dQ({elementId:e,onClose:A}){var $;const t=J(S=>S.project),[s,i]=h.useState([]),[n,o]=h.useState(""),[l,c]=h.useState([]),[g,u]=h.useState({}),[p,f]=h.useState({itemsPerPage:12,columns:3,rows:4,showPagination:!0});h.useState(!1);const{addDataBinding:x,isAddingBinding:w}=Mc(),C=[{name:"vehicles",fields:["id","name","description","image","price","category","year"]},{name:"products",fields:["id","name","description","price","image","category","stock"]},{name:"blog_posts",fields:["id","title","excerpt","featured_image","author","date","category"]},{name:"team_members",fields:["id","name","position","bio","photo","email"]},{name:"portfolio",fields:["id","title","description","image","category","link"]}];h.useEffect(()=>{H(),j()},[e]);const H=async()=>{var S;if(!t){i(C);return}try{const F=await fetch(`/api/v1/projects/${t.model.id}/database/schema`);if(!F.ok)throw new Error(`HTTP ${F.status}: ${F.statusText}`);const b=((S=(await F.json()).schema)==null?void 0:S.map(y=>{var N;return{name:y.name,fields:((N=y.columns)==null?void 0:N.map(M=>M.name))||[]}}))||[];i(b.length>0?b:C)}catch(F){console.error("Failed to load tables:",F),i(C)}},j=()=>{const S=Ee(e,B().getEditorDoc());if(!S)return;const F=E(S);if(!F)return;const m=[];F.querySelectorAll("img").forEach((Y,ie)=>{m.push({type:"image",selector:`img:nth-of-type(${ie+1})`,element:Y,suggestedField:V(Y,"image")})}),F.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((Y,ie)=>{m.push({type:"heading",selector:`h1:nth-of-type(${ie+1}), h2:nth-of-type(${ie+1}), h3:nth-of-type(${ie+1}), h4:nth-of-type(${ie+1}), h5:nth-of-type(${ie+1}), h6:nth-of-type(${ie+1})`,element:Y,suggestedField:V(Y,"text")})}),F.querySelectorAll("p").forEach((Y,ie)=>{m.push({type:"text",selector:`p:nth-of-type(${ie+1})`,element:Y,suggestedField:V(Y,"text")})}),F.querySelectorAll("button, a").forEach((Y,ie)=>{m.push({type:Y.tagName.toLowerCase()==="button"?"button":"link",selector:`${Y.tagName.toLowerCase()}:nth-of-type(${ie+1})`,element:Y,suggestedField:V(Y,"link")})}),c(m);const W={};m.forEach((Y,ie)=>{Y.suggestedField&&(W[`pattern_${ie}`]=Y.suggestedField)}),u(W)},E=S=>{const F=[".product-item",".blog-card",".content-card",".team-member",".card",".item",".post",".member",".product",".col-sm-3",".col-md-4",".col-lg-3",".col-xl-3",'[class*="col-"]','[class*="item"]','[class*="card"]'];for(const b of F){const y=S.querySelectorAll(b);if(y.length>1)return y[0]}const m=Array.from(S.children);return m.length>1?m[0]:null},V=(S,F)=>{var b;const m=S.className.toLowerCase();return(b=S.id)!=null&&b.toLowerCase(),F==="image"?m.includes("product")?"image":m.includes("photo")||m.includes("avatar")?"photo":m.includes("featured")?"featured_image":"image":F==="text"?m.includes("title")||S.tagName.match(/H[1-6]/)?"name":m.includes("description")||m.includes("excerpt")?"description":m.includes("price")?"price":m.includes("category")?"category":"description":F==="link"?"link":"name"},T=async()=>{if(!(!n||!e))try{const S=l.map((F,m)=>{const b=g[`pattern_${m}`];if(!b||b==="none")return Promise.resolve();const y={elementId:e,property:I(F.type),dataSource:n,field:b,template:F.type==="image"?void 0:`{{${b}}}`,query:{limit:parseInt(p.itemsPerPage.toString()),offset:0}};return x(y)});await Promise.all(S.filter(Boolean)),await Q(),K("Data binding configuration saved successfully! This will work in your exported project."),A()}catch(S){console.error("Failed to save data binding configuration:",S),K("Failed to save data binding configuration")}},I=S=>{switch(S){case"image":return"src";case"link":return"href";case"input":case"textarea":case"select":return"value";default:return"textContent"}},Q=async()=>{const S=Ee(e,B().getEditorDoc());if(!S)return;let F=Array.from(S.children);for(;F.length>p.itemsPerPage;){const m=F.pop();m&&m!==S.children[0]&&m.remove()}for(;F.length<p.itemsPerPage;){const m=S.children[0].cloneNode(!0);m.querySelectorAll("[id]").forEach((y,N)=>{y.id&&(y.id=`${y.id}-clone-${F.length}-${N}`)}),S.appendChild(m),F.push(m)}F=Array.from(S.children),F.forEach((m,b)=>{P(m,b)})},P=(S,F=0)=>{l.forEach((m,b)=>{const y=g[`pattern_${b}`];if(!y)return;let N=null;if(N=S.querySelector(m.selector),!N&&m.element.className){const W=m.element.className.split(" ")[0];N=S.querySelector(`.${W}`)}if(!N){const W=m.element.tagName.toLowerCase();N=S.querySelector(W)}if(!N){console.warn(`Could not find element with selector: ${m.selector} in item`);return}let M=_(y,F+1);m.type==="image"?(N.src=M,N.alt=M):m.type==="link"?(N.href=M,(!N.textContent||N.textContent.includes("Learn More"))&&(N.textContent=M)):N.textContent=M})},_=(S,F)=>{const m=S.toLowerCase();if(m.includes("image")||m.includes("photo")||m.includes("picture"))return`/images/builder/sample-${F%8+1}.jpg`;if(m.includes("name")||m.includes("title"))return`Sample ${S} ${F}`;if(m.includes("description")||m.includes("excerpt")||m.includes("content"))return`This is sample ${S.toLowerCase()} content for item ${F}. Lorem ipsum dolor sit amet.`;if(m.includes("price")||m.includes("cost"))return`$${(Math.random()*100+10).toFixed(2)}`;if(m.includes("category")||m.includes("type")){const b=["Category A","Category B","Category C","Premium","Standard","Basic"];return b[F%b.length]}else{if(m.includes("email"))return`sample${F}@example.com`;if(m.includes("phone"))return`+1-555-${String(F).padStart(4,"0")}`;if(m.includes("url")||m.includes("link"))return`https://example.com/item-${F}`;if(m.includes("date")){const b=new Date;return b.setDate(b.getDate()+F),b.toLocaleDateString()}else return`Sample ${S} ${F}`}},z=(($=s.find(S=>S.name===n))==null?void 0:$.fields)||[];return a.jsx(ue,{type:"modal",isOpen:!0,onClose:A,children:a.jsxs(me,{size:"fullscreen",className:"h-screen max-h-screen",children:[a.jsx(se,{children:a.jsx(d,{message:"Connect Repeating Data"})}),a.jsxs(te,{className:"flex-1 overflow-y-auto p-6",children:[a.jsxs("div",{className:"mb-6 p-4 bg-blue-50 rounded-lg",children:[a.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[a.jsx("div",{className:"w-3 h-3 bg-blue-500 rounded-full"}),a.jsx("span",{className:"text-blue-800 font-medium",children:"Detected Repeating Pattern"})]}),a.jsxs("p",{className:"text-sm text-blue-600 mb-2",children:["Found ",l.length," elements in the repeating pattern:"]}),a.jsx("div",{className:"flex flex-wrap gap-2",children:l.map((S,F)=>a.jsxs("span",{className:"px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded",children:[S.type,": ",S.element.tagName.toLowerCase(),S.element.className&&` .${S.element.className.split(" ")[0]}`]},F))})]}),a.jsxs("div",{className:"mb-6",children:[a.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:a.jsx(d,{message:"Choose Data Source"})}),a.jsxs("select",{value:n,onChange:S=>{S.stopPropagation(),o(S.target.value)},onClick:S=>S.stopPropagation(),className:"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-50",children:[a.jsx("option",{value:"",children:"Select a table..."}),s.map(S=>a.jsxs("option",{value:S.name,children:[S.name," (",S.fields.length," fields)"]},S.name))]})]}),n&&a.jsxs("div",{className:"mb-6",children:[a.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-3",children:a.jsx(d,{message:"Map Elements to Database Fields"})}),a.jsx("div",{className:"space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto pr-2",children:l.map((S,F)=>a.jsxs("div",{className:"border rounded-lg p-3 bg-gray-50",children:[a.jsxs("div",{className:"flex items-center justify-between mb-2",children:[a.jsxs("span",{className:"text-sm font-medium text-gray-700",children:[S.type," (",S.element.tagName.toLowerCase(),")"]}),a.jsx("span",{className:"text-xs text-gray-500",children:S.element.className&&`.${S.element.className.split(" ")[0]}`})]}),a.jsxs("select",{value:g[`pattern_${F}`]||"",onChange:m=>{m.stopPropagation(),u(b=>({...b,[`pattern_${F}`]:m.target.value}))},onClick:m=>m.stopPropagation(),className:"w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 relative z-40",children:[a.jsx("option",{value:"",children:"Select field..."}),z.map(m=>a.jsx("option",{value:m,children:m},m))]})]},F))})]}),n&&a.jsxs("div",{className:"mb-6",children:[a.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-3",children:a.jsx(d,{message:"Pagination Settings"})}),a.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[a.jsx(q,{label:"Items per Page",type:"number",value:p.itemsPerPage,onChange:S=>f(F=>({...F,itemsPerPage:parseInt(S.target.value)||12})),min:1,max:100}),a.jsx(q,{label:"Columns",type:"number",value:p.columns,onChange:S=>f(F=>({...F,columns:parseInt(S.target.value)||3})),min:1,max:12})]}),a.jsx("div",{className:"mt-3",children:a.jsxs("label",{className:"flex items-center",children:[a.jsx("input",{type:"checkbox",checked:p.showPagination,onChange:S=>f(F=>({...F,showPagination:S.target.checked})),className:"mr-2"}),a.jsx("span",{className:"text-sm text-gray-700",children:"Show pagination controls"})]})})]})]}),a.jsxs(ne,{children:[a.jsx(U,{variant:"outline",onClick:A,children:a.jsx(d,{message:"Cancel"})}),a.jsx(U,{variant:"outline",onClick:Q,disabled:!n||Object.values(g).every(S=>!S||S==="none"),children:"Preview with Sample Data"}),a.jsx(U,{onClick:T,disabled:!n||Object.values(g).every(S=>!S||S==="none")||w,children:w?"Saving...":"Save & Apply Configuration"})]})]})})}function uQ(){const e=J(o=>{var l;return!!((l=o.hoveredContext)!=null&&l.isVisible)}),A=J(o=>{var l;return((l=o.hoveredContext)==null?void 0:l.el)instanceof tl}),{refs:t,floatingStyles:s,placement:i}=go({placement:"top",middleware:[po({mainAxis:!0,crossAxis:!1}),mo({mainAxis:!0,crossAxis:!0})],whileElementsMounted:ho}),{resizeProps:n}=nQ({boundaryRect:B().iframeRect,aspectRatio:A?"initial":null,onResizeStart:o=>{gt.hide(),B().setIsResizing(!0)},onResize:o=>{var c;const l=(c=B().hoveredContext)==null?void 0:c.node;l&&(G().executeMutation(new Zr({width:`${o.rect.width}px`,height:`${o.rect.height}px`},l),{partOfSession:!0}),Oe.reposition())},onResizeEnd:o=>{var c;const l=(c=B().hoveredContext)==null?void 0:c.node;l&&G().executeMutation(new Zr({width:`${o.rect.width}px`,height:`${o.rect.height}px`},l),{lastInSession:!0}),gt.reposition(),gt.show(),B().setIsResizing(!1)}});return h.useEffect(()=>{t.reference.current&&(Oe.overlayNode=t.reference.current)},[t]),a.jsxs(Rc,{className:X("hover-element-overlay after:outline-2 after:outline-primary"),overlayRef:t.setReference,isVisible:e,...n,children:[a.jsx(pQ,{toolbarRef:t.setFloating,styles:s,placement:i}),a.jsx(gQ,{})]})}function gQ(){return a.jsx("button",{"data-resize-handle":zc.bottomRight,onMouseEnter:()=>Oe.show(),className:"pointer-events-auto absolute -bottom-4 -right-8 z-10 h-10 w-10 cursor-nwse-resize before:absolute before:right-6 before:top-2 before:h-6 before:w-6 before:border before:border-primary before:bg"})}function pQ({toolbarRef:e,styles:A,placement:t}){const s=J(w=>!!w.hoveredContext),i=J(w=>{var C;return(C=w.selectedContext)==null?void 0:C.nodeId}),n=J(w=>{var C;return(C=w.hoveredContext)==null?void 0:C.nodeId}),o=J(w=>{var C;return(C=w.hoveredContext)==null?void 0:C.el}),l=_A(w=>w.sessionIsActive),c=i===n&&l,g=J(w=>w.hoveredContext&&(w.hoveredContext.el instanceof ia||w.hoveredContext.el instanceof Bn)),u=o&&(o instanceof sl||o instanceof ll||o instanceof ol||o instanceof rl||o instanceof il||o instanceof nl||n&&(()=>{const w=Ee(n,B().getEditorDoc());return w&&(w.querySelector("img")||w.querySelector("h1, h2, h3, h4, h5, h6")||w.querySelector("p")||w.classList.contains("card")||w.classList.contains("blog")||w.classList.contains("product")||w.classList.contains("team")||w.classList.contains("testimonial"))})()),p=n&&(()=>{const w=Ee(n,B().getEditorDoc());if(!w)return!1;if(["products-grid","blog-grid","content-grid","image-grid","ecommerce-simple-grid","blog-simple","content-bordered","content-large-images","content-small-images","content-details","grid","cards","items","list","gallery","portfolio","blog-horizontal","blog-container","product-grid","team-grid"].some(E=>w.classList.contains(E)))return!0;const H=[".product-item",".blog-card",".content-card",".team-member",".card",".item",".post",".member",".product",".col-sm-3",".col-md-4",".col-lg-3",".col-xl-3",'[class*="col-"]','[class*="item"]','[class*="card"]'];for(const E of H)if(w.querySelectorAll(E).length>1)return!0;return Array.from(w.children).length>=2})(),[f,x]=h.useState(!1);return a.jsxs(h.Fragment,{children:[a.jsxs("div",{onMouseEnter:()=>Oe.show(),ref:e,style:A,className:X(c?"pointer-events-none invisible":"pointer-events-auto","element-overlay-toolbar absolute left-0 top-full z-10 flex select-none items-center justify-center overflow-hidden bg-primary",t==="bottom"?"rounded-b":"rounded-t"),children:[a.jsx(Zi,{children:a.jsx(hs,{size:"h-16 w-16"})}),s&&a.jsx(mQ,{}),u&&a.jsx("button",{onClick:w=>{w.stopPropagation(),x(!0)},title:p?"Connect Repeating Data":"Connect Data",className:"flex h-26 w-26 items-center justify-center bg-primary text-white transition-colors hover:bg-primary-dark",children:a.jsx(Kt,{size:"h-16 w-16"})}),a.jsx(Zi,{disabled:!!g,onClick:()=>{const w=Ee(n,B().getEditorDoc());w&&G().executeMutation(new ca(w),{lastInSession:!0})},children:a.jsx(bs,{size:"h-18 w-18"})})]}),f&&n&&(p?a.jsx(dQ,{elementId:n,onClose:()=>x(!1)}):a.jsx(cQ,{elementId:n,onClose:()=>x(!1)}))]})}function mQ(){const e=h.useRef(null),A=h.useRef(null),{draggableProps:t}=fo({id:"element-overlay",type:"element-panel",ref:e,preview:A,getData:()=>B().hoveredContext,onDragStart:()=>B().setDragState("dragging"),onDragEnd:()=>B().setDragState(!1)});return a.jsxs(h.Fragment,{children:[a.jsx(Zi,{buttonRef:e,...t,className:"cursor-move",children:a.jsx(Gd,{className:"rotate-90",size:"h-22 w-22"})}),a.jsx(gl,{ref:A,element:B().hoveredContext.el})]})}function Zi({children:e,className:A,buttonRef:t,disabled:s,...i}){return a.jsx("button",{disabled:s,onClick:()=>{lQ(B().hoveredContext)},ref:t,className:X("flex h-26 w-26 items-center justify-center bg-primary text-white transition-colors",!s&&"hover:bg-primary",s&&"pointer-events-none opacity-50",A),...i,children:e})}function hQ(){const e=h.useRef(null),A=J(n=>{var o;return!!((o=n.selectedContext)!=null&&o.isVisible)}),t=_A(n=>n.sessionIsActive),s=J(n=>{var o;return(o=n.selectedContext)==null?void 0:o.nodeId}),i=h.useRef(null);return h.useEffect(()=>{e.current&&(gt.overlayNode=e.current)},[]),h.useEffect(()=>{var n;if(i.current||(i.current=new ResizeObserver(([o])=>{e.current.style.width=`${o.contentRect.width}px`,e.current.style.height=`${o.contentRect.height}px`})),s&&t){const o=(n=B().selectedContext)==null?void 0:n.node;o&&i.current.observe(o)}return()=>{var o;(o=i.current)==null||o.disconnect()}},[s,t]),a.jsx(Rc,{className:X(t?"after:outline-black":"after:outline-primary",t?"after:outline-2":"after:outline-1"),overlayRef:e,isVisible:A})}let qa=null;const Oc=e=>{e&&delete e.dataset.arId,B().setHasCopiedNode(!!e),qa=e},eo=()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node;e&&e.nodeName!=="BODY"&&Oc(e.cloneNode(!0))},to=()=>{const e=B().selectedContext;e&&G().executeMutation(new ca(e.node),{lastInSession:!0})},Ao=e=>{var c,g;const A=B().selectedContext;if(!A)return;const{node:t,el:s}=A,i=Ye(t),n=Z(t.parentElement);let o=-1,l=null;if(e==="down"){const u=t.nextElementSibling;if(u)nt.canInsertElInto(u,s)?(o=0,l=Z(u)):(o=Ye(u),l=Z(u.parentElement));else{const p=(c=t.parentElement)==null?void 0:c.parentElement;p&&nt.canInsertElInto(p,s)&&(o=Ye(t.parentElement)+1,l=Z(p))}}else if(e==="up"){const u=t.previousElementSibling;if(u)nt.canInsertElInto(u,s)?(o=u.childElementCount,l=Z(u)):(o=Ye(u),l=Z(u.parentElement));else{const p=(g=t.parentElement)==null?void 0:g.parentElement;p&&nt.canInsertElInto(p,s)&&(o=Ye(t.parentElement),l=Z(p))}}l&&n&&o>-1&&G().executeMutation(new eA({el:t,oldIndex:i,oldParentId:n,newIndex:o,newParentId:l}),{lastInSession:!0})},ao={cut:()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node;e&&e.nodeName!=="BODY"&&(eo(),to())},copy:eo,paste:()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node;if(e&&qa){let t,s;e.nodeName==="BODY"?(t=Z(e),s=0):(t=Z(e.parentElement),s=Ye(e)+1),t&&s>-1&&(G().executeMutation(new sa(qa,s,t),{lastInSession:!0}),Oc(null),xe(qa))}},duplicate:()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node;e&&G().executeMutation(new Rs(Z(e)||""),{lastInSession:!0})},moveUp:()=>Ao("up"),moveDown:()=>Ao("down"),delete:to,undo:()=>G().undo(),redo:()=>G().redo(),selectParent:()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node.parentElement;e&&xe(e)},selectChild:()=>{var A;const e=(A=B().selectedContext)==null?void 0:A.node.firstElementChild;e&&xe(e)}};function fQ(){const e=J(n=>n.contextMenuPosition),A=J(n=>n.hasCopiedNode),t=Ct(n=>n.canUndo),s=Ct(n=>n.canRedo),i=J(n=>{var o;return(((o=n.selectedContext)==null?void 0:o.path.length)??0)>1});return a.jsxs(Bd,{floatingMinWidth:"min-w-280",position:e,onOpenChange:n=>{n||B().setContextMenuPosition(null)},onItemSelected:n=>{const o=n;ao[o]&&ao[o]()},children:[a.jsx(k,{value:"selectParent",isDisabled:!i,children:a.jsx(d,{message:"Select parent"})}),a.jsx(k,{value:"selectChild",className:"border-b",children:a.jsx(d,{message:"Select child"})}),a.jsx(k,{value:"cut",endSection:a.jsx("span",{className:"text-xs",children:"ctrl+shift+x"}),children:a.jsx(d,{message:"Cut"})}),a.jsx(k,{value:"copy",endSection:a.jsx("span",{className:"text-xs",children:"ctrl+shift+c"}),children:a.jsx(d,{message:"Copy"})}),a.jsx(k,{isDisabled:!A,value:"paste",endSection:a.jsx("span",{className:"text-xs",children:"ctrl+shift+v"}),children:a.jsx(d,{message:"Paste"})}),a.jsx(k,{value:"delete",endSection:a.jsx("span",{className:"text-xs",children:"del"}),children:a.jsx(d,{message:"Delete"})}),a.jsx(k,{value:"duplicate",children:a.jsx(d,{message:"Duplicate"})}),a.jsx(k,{value:"moveUp",endSection:a.jsx("span",{className:"text-xs",children:a.jsx(d,{message:"arrow up"})}),children:a.jsx(d,{message:"Move up"})}),a.jsx(k,{value:"moveDown",endSection:a.jsx("span",{className:"text-xs",children:a.jsx(d,{message:"arrow down"})}),children:a.jsx(d,{message:"Move down"})}),a.jsx(k,{className:"border-t",isDisabled:!t,value:"undo",endSection:a.jsx("span",{className:"text-xs",children:"ctrl+z"}),children:a.jsx(d,{message:"Undo"})}),a.jsx(k,{isDisabled:!s,value:"redo",endSection:a.jsx("span",{className:"text-xs",children:"ctrl+y"}),children:a.jsx(d,{message:"Redo"})})]})}function xQ(){const e=J(A=>A.isResizing);return a.jsx("div",{className:"resize-overlay absolute inset-0 m-auto",inert:e?void 0:""})}function bQ(){const{projectId:e}=en(),A=AA(),t=Ct(o=>o.isDirty),s=h.useRef(null),i=h.useRef(Date.now()),n=h.useRef(!1);return h.useEffect(()=>{if(!e)return;const o=async()=>{if(!(!t||A.isPending||n.current||Date.now()-i.current<3e4))try{n.current=!0,await A.mutateAsync(void 0,{onSuccess:()=>{i.current=Date.now(),K(v("Auto-saved"),{type:"positive",duration:2e3})}})}catch(l){console.warn("Auto-save failed:",l)}finally{n.current=!1}};return s.current=setInterval(()=>{o()},3e4),()=>{s.current&&(clearInterval(s.current),s.current=null)}},[e,t,A,i]),h.useEffect(()=>{!t&&!n.current&&(i.current=Date.now())},[t]),h.useEffect(()=>{const o=l=>{if(t&&!A.isPending)return A.mutate(void 0),l.preventDefault(),l.returnValue="You have unsaved changes. Are you sure you want to leave?","You have unsaved changes. Are you sure you want to leave?"};return window.addEventListener("beforeunload",o),()=>{window.removeEventListener("beforeunload",o)}},[t,A]),{isAutoSaveActive:!!s.current,lastSaveTime:i.current,isAutoSaving:n.current}}function IQ(){kt();const{user:e,hasPermission:A}=vd(),t=Cd(),{data:s,isLoading:i}=ng(),n=h.useRef(null),o=J(u=>u.iframeLoading),l=J(u=>u.elementsLoading),c=o||l||i,g=J(u=>u.selectedBreakpoint);return bQ(),h.useEffect(()=>()=>{B().project&&B().reset()},[]),h.useEffect(()=>Hc(n,()=>{B().syncIframeRect()}),[]),h.useEffect(()=>{var u;s!=null&&s.project&&((u=B().project)==null?void 0:u.model.id)!==s.project.model.id&&(!A("projects.update")&&s.project.model.user_id!==(e==null?void 0:e.id)?t("/dashboard"):B().init(s.project,n.current))},[s==null?void 0:s.project,A,t,e]),a.jsxs(h.Fragment,{children:[a.jsx(yd,{children:a.jsx(d,{message:"Editor"})}),c&&a.jsx(eQ,{},"initialLoadingIndicator"),a.jsx(oo,{children:a.jsxs("div",{className:"flex h-screen w-screen overflow-hidden transition-opacity delay-75 duration-500",style:{opacity:c?0:1},children:[a.jsx(P2,{project:s==null?void 0:s.project.model}),a.jsx("div",{className:"relative flex-auto bg-[#404040] transition-width",children:a.jsxs("div",{className:X("breakpoint-wrapper relative mx-auto h-full w-full overflow-hidden bg-transparent transition-width",g&&`breakpoint-active breakpoint-${g}`),children:[a.jsx("iframe",{ref:n,className:"h-full w-full",onLoad:()=>Z2()}),a.jsx(G2,{}),a.jsx(xQ,{}),a.jsx(Y2,{}),a.jsx(uQ,{}),a.jsx(hQ,{}),a.jsx(aQ,{}),a.jsx(fQ,{})]})})]})})]})}export{IQ as default};
//# sourceMappingURL=editor-page-b01122b5.js.map
