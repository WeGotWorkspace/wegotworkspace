import{j as a}from"./jsx-runtime-D_zvdyIk.js";import{r as p}from"./index-D8PXNGfl.js";import{c as $}from"./index-ioAsJxKM.js";import{P as y}from"./index-3B7fq2Si.js";import{c as I}from"./utils-BQHNewu7.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-BnYtgYWu.js";import"./index-CW_VbtLN.js";import"./index-JduySVp6.js";import"./index-CUBR4z_z.js";var u="Progress",m=100,[O]=$(u),[M,R]=O(u),P=p.forwardRef((r,e)=>{const{__scopeProgress:i,value:o=null,max:t,getValueLabel:_=A,...w}=r;(t||t===0)&&!f(t)&&console.error(V(`${t}`,"Progress"));const s=f(t)?t:m;o!==null&&!v(o,s)&&console.error(W(`${o}`,"Progress"));const n=v(o,s)?o:null,S=d(n)?_(n,s):void 0;return a.jsx(M,{scope:i,value:n,max:s,children:a.jsx(y.div,{"aria-valuemax":s,"aria-valuemin":0,"aria-valuenow":d(n)?n:void 0,"aria-valuetext":S,role:"progressbar","data-state":j(n,s),"data-value":n??void 0,"data-max":s,...w,ref:e})})});P.displayName=u;var b="ProgressIndicator",N=p.forwardRef((r,e)=>{const{__scopeProgress:i,...o}=r,t=R(b,i);return a.jsx(y.div,{"data-state":j(t.value,t.max),"data-value":t.value??void 0,"data-max":t.max,...o,ref:e})});N.displayName=b;function A(r,e){return`${Math.round(r/e*100)}%`}function j(r,e){return r==null?"indeterminate":r===e?"complete":"loading"}function d(r){return typeof r=="number"}function f(r){return d(r)&&!isNaN(r)&&r>0}function v(r,e){return d(r)&&!isNaN(r)&&r<=e&&r>=0}function V(r,e){return`Invalid prop \`max\` of value \`${r}\` supplied to \`${e}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${m}\`.`}function W(r,e){return`Invalid prop \`value\` of value \`${r}\` supplied to \`${e}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${m} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}var E=P,B=N;const c=p.forwardRef(({className:r,value:e,...i},o)=>a.jsx(E,{ref:o,className:I("relative h-2 w-full overflow-hidden rounded-full bg-primary/20",r),...i,children:a.jsx(B,{className:"h-full w-full flex-1 bg-primary transition-all",style:{transform:`translateX(-${100-(e||0)}%)`}})}));c.displayName=E.displayName;c.__docgenInfo={description:"",methods:[]};const C=Object.freeze(Object.defineProperty({__proto__:null,Progress:c},Symbol.toStringTag,{value:"Module"})),q={title:"ui/progress",parameters:{docs:{description:{component:"Auto-generated export inventory story for `progress`."}}}},l={render:()=>a.jsxs("div",{style:{minWidth:320,maxWidth:680},children:[a.jsx("h3",{style:{fontWeight:600,marginBottom:8},children:"progress"}),a.jsx("p",{style:{marginBottom:8},children:"Exported symbols in this module:"}),a.jsx("pre",{style:{whiteSpace:"pre-wrap"},children:JSON.stringify(Object.keys(C),null,2)})]})};var g,x,h;l.parameters={...l.parameters,docs:{...(g=l.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => <div style={{
    minWidth: 320,
    maxWidth: 680
  }}>
      <h3 style={{
      fontWeight: 600,
      marginBottom: 8
    }}>progress</h3>
      <p style={{
      marginBottom: 8
    }}>Exported symbols in this module:</p>
      <pre style={{
      whiteSpace: "pre-wrap"
    }}>{JSON.stringify(Object.keys(ModuleExports), null, 2)}</pre>
    </div>
}`,...(h=(x=l.parameters)==null?void 0:x.docs)==null?void 0:h.source}}};const H=["Exports"];export{l as Exports,H as __namedExportsOrder,q as default};
