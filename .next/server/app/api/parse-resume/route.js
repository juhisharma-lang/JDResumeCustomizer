"use strict";(()=>{var e={};e.id=310,e.ids=[310],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4193:e=>{e.exports=require("pdf-parse")},4300:e=>{e.exports=require("buffer")},2361:e=>{e.exports=require("events")},7147:e=>{e.exports=require("fs")},7718:e=>{e.exports=require("node:child_process")},6005:e=>{e.exports=require("node:crypto")},7561:e=>{e.exports=require("node:fs")},3977:e=>{e.exports=require("node:fs/promises")},9411:e=>{e.exports=require("node:path")},1747:e=>{e.exports=require("node:readline")},4492:e=>{e.exports=require("node:stream")},6402:e=>{e.exports=require("node:stream/promises")},7261:e=>{e.exports=require("node:util")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},2781:e=>{e.exports=require("stream")},7310:e=>{e.exports=require("url")},3837:e=>{e.exports=require("util")},7606:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>c,routeModule:()=>u,serverHooks:()=>m,staticGenerationAsyncStorage:()=>d});var a={};r.r(a),r.d(a,{POST:()=>p});var n=r(9303),s=r(8716),o=r(670),i=r(7070);let l=new(r(3037)).ZP;async function p(e){let t,a,n,s;try{let r=(await e.formData()).get("file");if(!r||"string"==typeof r)throw Error("no file");t=r}catch{return i.NextResponse.json({error:"invalid_request",message:"No file was received."},{status:400})}let o=t.name.split(".").pop()?.toLowerCase(),p="pdf"===o||"application/pdf"===t.type,u="docx"===o||"application/vnd.openxmlformats-officedocument.wordprocessingml.document"===t.type;if(!p&&!u)return i.NextResponse.json({error:"unsupported_type",message:"Only .pdf and .docx files are supported."},{status:422});let c=1;try{let e=Buffer.from(await t.arrayBuffer());if(p){let{PDFParse:t}=await Promise.resolve().then(r.t.bind(r,4193,23)),n=new t({data:e}),s=await n.getText();if(a=s.text??"",c=s.numpages??1,a.trim().length<30)return i.NextResponse.json({error:"scanned_pdf",message:"This PDF appears to be a scanned image rather than a text-based PDF, so we can't extract the text. Try uploading a .docx version or a text-based PDF instead."},{status:422})}else{let t=await r.e(699).then(r.t.bind(r,7699,19)),o=(await t.convertToHtml({buffer:e})).value??"",l=(a=o.replace(/<li[^>]*>/gi,"\n- ").replace(/<\/li>/gi,"").replace(/<\/p>|<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/&#(\d+);/g,(e,t)=>String.fromCharCode(Number(t))).replace(/\n{3,}/g,"\n\n").trim()).trim().split(/\s+/).filter(Boolean).length;c=Math.max(1,Math.round(l/500)),s=function(e){let t;let r=[],a=/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;for(;null!==(t=a.exec(e));){let a=e.slice(0,t.index).match(/<(h[1-6]|p|li)[>\s]/gi)??[],n=t[2].replace(/<[^>]+>/g,"").trim();n&&r.push({sectionHeading:n,paragraphIndex:a.length})}return r}(o);let p=o.search(/<h[2-6][\s>]/i),u=p>0?o.slice(0,p):o.slice(0,3e3);if(n=(function(e){let t;let r=[],a=/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;for(;null!==(t=a.exec(e));){let e=t[1].trim(),a=t[2].replace(/<[^>]+>/g,"").trim();e&&a&&r.push({label:a,url:e})}return r})(u).filter(e=>!e.url.toLowerCase().startsWith("mailto:")),a.trim().length<30)return i.NextResponse.json({error:"empty_file",message:"This file appears to be empty or couldn't be read. Please try a different file."},{status:422})}}catch{return i.NextResponse.json({error:"parse_failed",message:"This file couldn't be read. It may be corrupted or in an unexpected format. Please try a different file."},{status:422})}try{let e=await l.messages.create({model:"claude-sonnet-4-6",max_tokens:4096,system:function(e){let t=e&&e.length>0?`- "links": an array of { "label": string, "url": string | null } objects for contact/social links only (LinkedIn, Portfolio, GitHub, personal website, etc.). The following hyperlinks were extracted directly from the document source and their URLs are exact — use them verbatim for this field only:
${e.map(e=>`  { "label": "${e.label}", "url": "${e.url}" }`).join("\n")}
  Match each contact/social link label (e.g. "LinkedIn", "Portfolio", "GitHub") to the closest entry above and use that url value. Only set "url" to null for a contact link type that does not appear in this list at all. Do NOT use this list to modify or append URL text to any other section's content — all section content must be taken from the raw extracted text verbatim.`:`- "links": an array of { "label": string, "url": string | null } objects, one per link found (LinkedIn, portfolio, GitHub, personal website, etc.). Use the actual URL from the source text. The source text may contain markdown-style links in the form [Label](https://...) — when you see this pattern, use the text inside the square brackets as the label and the URL inside the parentheses as the url value. Only set "url" to null when no URL genuinely exists anywhere in the source text for that link — never write an explanatory phrase in place of a URL.`;return`You are a resume parser. You receive raw text extracted from a resume file.
Organize the content into clearly labeled, standard ATS-friendly sections.

Always capture a "Header" section first, before anything else. The Header uses a structured "data" field instead of a freeform "content" string. It must contain:
- "name": the candidate's full name
- "title": their professional title or tagline if one appears, otherwise null
- "phone": phone number as a plain string if present, otherwise null
- "email": email address if present, otherwise null
- "location": city, state, or location string if present, otherwise null
${t}

All other sections use a freeform "content" string as before. Never drop header information.

Standard section names to use (after Header):
- "Summary" (covers: objective, profile, about me, professional summary, etc.)
- "Work Experience" (covers: experience, professional history, my journey, career history, etc.)
- "Education"
- "Skills" (covers: technical skills, competencies, tools, what I know, etc.)
- "Certifications" (if present)
- "Projects" (if present)
- "Volunteer Work" (if present)
- "Publications" (if present)
- "Awards & Honors" (if present)

Map any creative or unconventional section headers to the closest standard equivalent.
For example, "My Journey" → "Work Experience", "What I Know" → "Skills".
Only include sections that are genuinely present in the resume.
Preserve all detail — do not summarize or omit content.

Respond with a valid JSON object in exactly this format with no preamble or explanation:
{
  "sections": [
    {
      "title": "Header",
      "data": {
        "name": "Jane Smith",
        "title": "Senior Product Designer",
        "phone": "+1 555-123-4567",
        "email": "jane@example.com",
        "location": "San Francisco, CA",
        "links": [
          { "label": "LinkedIn", "url": "https://linkedin.com/in/janesmith" },
          { "label": "Portfolio", "url": "https://janesmith.com" },
          { "label": "GitHub", "url": null }
        ]
      }
    },
    { "title": "Summary", "content": "..." },
    { "title": "Work Experience", "content": "..." }
  ]
}`}(n),messages:[{role:"user",content:a.slice(0,1e5)}]}),t=("text"===e.content[0].type?e.content[0].text.trim():"").replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"").trim(),r=JSON.parse(t);return i.NextResponse.json({structured:r,fileType:p?"pdf":"docx",pageCount:c,paragraphPositions:s})}catch{return i.NextResponse.json({error:"claude_error",message:"Something went wrong while analyzing your resume. Please try again."},{status:500})}}let u=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/parse-resume/route",pathname:"/api/parse-resume",filename:"route",bundlePath:"app/api/parse-resume/route"},resolvedPagePath:"/Users/juhisharma/Documents/GitHub/JDResumeCustomizer/src/app/api/parse-resume/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:c,staticGenerationAsyncStorage:d,serverHooks:m}=u,h="/api/parse-resume/route";function f(){return(0,o.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:d})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[948,91],()=>r(7606));module.exports=a})();