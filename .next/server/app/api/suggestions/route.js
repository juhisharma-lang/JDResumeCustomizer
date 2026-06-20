"use strict";(()=>{var e={};e.id=152,e.ids=[152],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7718:e=>{e.exports=require("node:child_process")},6005:e=>{e.exports=require("node:crypto")},7561:e=>{e.exports=require("node:fs")},3977:e=>{e.exports=require("node:fs/promises")},9411:e=>{e.exports=require("node:path")},1747:e=>{e.exports=require("node:readline")},4492:e=>{e.exports=require("node:stream")},6402:e=>{e.exports=require("node:stream/promises")},7261:e=>{e.exports=require("node:util")},5185:(e,t,i)=>{i.r(t),i.d(t,{originalPathname:()=>h,patchFetch:()=>m,requestAsyncStorage:()=>g,routeModule:()=>p,serverHooks:()=>d,staticGenerationAsyncStorage:()=>c});var s={};i.r(s),i.d(s,{POST:()=>l});var r=i(9303),n=i(8716),o=i(670),a=i(7070);let u=new(i(3037)).ZP;async function l(e){var t,i;let s,r,n,o;try{let t=await e.json();if(s=t.jdText,r=t.resume,n=t.verdict,o=t.verdictReasoning,!s||!r||!n||null==o)throw Error("missing fields")}catch{return a.NextResponse.json({error:"invalid_request",message:"Missing required fields in request body."},{status:400})}let l=r.sections.map(e=>{if("data"in e){let t=e.data;return["SECTION: Header",`Name: ${t.name}`,t.title?`Current Title: ${t.title}`:null,t.location?`Location: ${t.location}`:null,t.email?`Email: ${t.email}`:null].filter(Boolean).join("\n")}return`SECTION: ${e.title}
${e.content}`}).join("\n\n---\n\n"),p=r.sections.map(e=>"data"in e?"Header":e.title).join(", "),g=(t=n,i=o,"apply"===t?`The verdict is "apply" — this is already a strong match.
Generate 2–4 suggestions at most. Focus only on ATS keyword alignment: surface language from the JD that the candidate's existing experience already supports but isn't yet reflected in their resume wording. Do not rewrite bullet points for narrative impact; the resume is already well-positioned. Do not pad the list.

Verdict reasoning (for context): ${i}`:"apply_conditionally"===t?`The verdict is "apply_conditionally" — there is meaningful overlap but real gaps to address.
Generate 4–8 suggestions. This is where the substantive editing work happens. Prioritise the positioning gaps and framing mismatches explicitly identified in the verdict reasoning below. Help the candidate's existing experience speak more directly to what this role requires. Suggestions should reflect genuine improvements, not cosmetic changes.

Verdict reasoning (for context): ${i}`:`The verdict is "skip" — this is a weak match.
Generate 1–3 suggestions at most — minimal surface-level edits only. Do not manufacture a longer list to justify using this feature. If you cannot identify genuinely useful edits without fabricating experience the candidate doesn't have, return fewer suggestions or an empty array. Each rationale must be honest about the limited scope of what editing can achieve here.

Verdict reasoning (for context): ${i}`),c=`You are reviewing a candidate's resume against a specific job description to generate targeted edit suggestions.

CRITICAL CONSTRAINT: You may only reword, reposition, or re-emphasise content already present in the resume. Never introduce facts, metrics, tool names, technologies, dates, job titles, or any claim that does not already appear somewhere in the resume's text. If the strongest suggestion for a section would require inventing a number or skill not in the resume, skip that suggestion entirely rather than fabricating the missing piece.

The resume has these sections: ${p}
The "section" field in each suggestion must be one of these exact section names.
The "original" field must be a verbatim excerpt from the resume text above that you are targeting — not a paraphrase.

---
JOB DESCRIPTION:
${s.slice(0,8e3)}

---
CANDIDATE RESUME:
${l.slice(0,8e3)}

---
EDITING GUIDANCE:
${g}

Use the "type" field to classify each suggestion:
- "positioning": the candidate has the relevant experience but the current wording targets a different framing than this JD requires — fixable by reframing or repositioning existing content.
- "substantive": the resume's language misses a specific technical skill or keyword the JD requires that IS already present elsewhere in the resume, and surfacing it more explicitly would strengthen the application.

Call submit_suggestions with your array of suggestions.`;try{let e=(await u.messages.create({model:"claude-sonnet-4-6",max_tokens:2048,system:"You are a senior resume editor. Your sole job is to suggest precise, targeted edits that align a candidate's resume with a specific job description, without ever inventing facts. You only work with what is already on the page.",tools:[{name:"submit_suggestions",description:"Submit the array of resume edit suggestions.",input_schema:{type:"object",properties:{suggestions:{type:"array",items:{type:"object",properties:{section:{type:"string",description:"The exact section title from the resume this suggestion targets."},original:{type:"string",description:"The verbatim text from the resume being replaced."},proposed:{type:"string",description:"The replacement text. Must only use facts, tools, and metrics already present in the resume."},rationale:{type:"string",description:"One or two sentences explaining why this edit helps align the resume to the JD."},type:{type:"string",enum:["positioning","substantive"],description:'"positioning" = framing mismatch fixable by reframing existing content; "substantive" = surfaces a keyword or skill already in the resume that the JD explicitly requires.'}},required:["section","original","proposed","rationale","type"]}}},required:["suggestions"]}}],tool_choice:{type:"tool",name:"submit_suggestions"},messages:[{role:"user",content:c}]})).content.find(e=>"tool_use"===e.type);if(!e||"tool_use"!==e.type)throw Error("No tool use in response");let t=e.input;return a.NextResponse.json({suggestions:t.suggestions})}catch{return a.NextResponse.json({error:"claude_error",message:"Something went wrong while generating suggestions. Please try again."},{status:500})}}let p=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/suggestions/route",pathname:"/api/suggestions",filename:"route",bundlePath:"app/api/suggestions/route"},resolvedPagePath:"/Users/juhisharma/Documents/GitHub/JDResumeCustomizer/src/app/api/suggestions/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:g,staticGenerationAsyncStorage:c,serverHooks:d}=p,h="/api/suggestions/route";function m(){return(0,o.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:c})}}};var t=require("../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),s=t.X(0,[948,91],()=>i(5185));module.exports=s})();