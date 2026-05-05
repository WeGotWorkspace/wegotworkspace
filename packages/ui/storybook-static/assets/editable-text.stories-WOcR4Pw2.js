import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{r as a}from"./index-D8PXNGfl.js";import"./_commonjsHelpers-Cpj98o6Y.js";function c({value:s,onChange:m,as:u,className:y,style:x,singleLine:h,placeholder:f}){const r=a.useRef(null);a.useEffect(()=>{r.current&&r.current.textContent!==s&&(r.current.textContent=s)},[]);const i={ref:r,contentEditable:!0,suppressContentEditableWarning:!0,spellCheck:!0,"data-placeholder":f,onBlur:()=>{var o;const e=((o=r.current)==null?void 0:o.textContent)??"";e!==s&&m(e)},onKeyDown:e=>{h&&e.key==="Enter"&&(e.preventDefault(),e.target.blur())},className:y,style:x};return u==="h1"?t.jsx("h1",{...i}):t.jsx("p",{...i})}c.__docgenInfo={description:"",methods:[],displayName:"EditableText",props:{value:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(v: string) => void",signature:{arguments:[{type:{name:"string"},name:"v"}],return:{name:"void"}}},description:""},as:{required:!0,tsType:{name:"union",raw:'"h1" | "p"',elements:[{name:"literal",value:'"h1"'},{name:"literal",value:'"p"'}]},description:""},className:{required:!1,tsType:{name:"string"},description:""},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:""},singleLine:{required:!1,tsType:{name:"boolean"},description:""},placeholder:{required:!1,tsType:{name:"string"},description:""}}};const g=Object.freeze(Object.defineProperty({__proto__:null,EditableText:c},Symbol.toStringTag,{value:"Module"})),S={title:"notes/editable-text",parameters:{docs:{description:{component:"Auto-generated export inventory story for `editable-text`."}}}},n={render:()=>t.jsxs("div",{style:{minWidth:320,maxWidth:680},children:[t.jsx("h3",{style:{fontWeight:600,marginBottom:8},children:"editable-text"}),t.jsx("p",{style:{marginBottom:8},children:"Exported symbols in this module:"}),t.jsx("pre",{style:{whiteSpace:"pre-wrap"},children:JSON.stringify(Object.keys(g),null,2)})]})};var p,l,d;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <div style={{
    minWidth: 320,
    maxWidth: 680
  }}>
      <h3 style={{
      fontWeight: 600,
      marginBottom: 8
    }}>editable-text</h3>
      <p style={{
      marginBottom: 8
    }}>Exported symbols in this module:</p>
      <pre style={{
      whiteSpace: "pre-wrap"
    }}>{JSON.stringify(Object.keys(ModuleExports), null, 2)}</pre>
    </div>
}`,...(d=(l=n.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};const T=["Exports"];export{n as Exports,T as __namedExportsOrder,S as default};
