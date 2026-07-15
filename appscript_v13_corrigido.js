// PLAYBOOK VENDAS V13 CORRIGIDO - BACKEND OTIMIZADO
const CFG={USERS:'Users',SESSIONS:'Sessions',LEADS:'Leads',CALLS:'Calls_v2',LOGS:'Logs',SESSION_HOURS:168,INVITE_HOURS:48,HASH_ROUNDS:4000};
const UH=['id','createdAt','updatedAt','name','email','emailNormalized','passwordHash','passwordSalt','role','status','inviteTokenHash','inviteExpiresAt','inviteUsedAt','passwordSetAt','lastLoginAt','deletedAt'];
const SH=['id','userId','tokenHash','createdAt','expiresAt','revokedAt','lastSeenAt','userAgent'];
const LH=['id','createdAt','updatedAt','ownerUserId','ownerEmail','ownerName','leadName','normalizedLeadName','sdrName','firstMeetingDate','lastMeetingDate','currentStatus','totalMeetings','deletedAt'];
const CH=['id','leadId','ownerUserId','ownerEmail','ownerName','version','createdAt','updatedAt','leadName','sdrName','date','meetingType','isSao','status','statusNote','statusHistory_json','preCallNotes_json','finalObservation','motivoPerdido','scoreTotal','scorePercent','scoreEvaluated','scoreMax','cl_json','sc_json','deletedAt'];
const LOGH=['timestamp','level','action','userId','email','details'];
function ss_(){return SpreadsheetApp.getActiveSpreadsheet()}function sh_(n){const s=ss_().getSheetByName(n);if(!s)throw new Error('Aba ausente: '+n);return s}function iso_(){return new Date().toISOString()}function str_(v){return v==null?'':String(v)}function id_(p){return p+'_'+Date.now()+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,10)}function row_(h,o){return h.map(k=>o[k]==null?'':o[k])}function obj_(h,r){const o={};h.forEach((k,i)=>o[k]=r[i]);return o}function read_(n,h){const s=sh_(n),lr=s.getLastRow();return lr<2?[]:s.getRange(2,1,lr-1,h.length).getValues().map(r=>obj_(h,r))}function find_(n,h,k,v){const s=sh_(n),i=h.indexOf(k),lr=s.getLastRow();if(lr<2)return null;const a=s.getRange(2,1,lr-1,h.length).getValues();for(let x=0;x<a.length;x++)if(str_(a[x][i])===str_(v))return{row:x+2,obj:obj_(h,a[x])};return null}function write_(n,h,r,o){sh_(n).getRange(r,1,1,h.length).setValues([row_(h,o)])}function json_(v,d){try{return typeof v==='object'?v:JSON.parse(v||JSON.stringify(d))}catch(e){return d}}function res_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}function body_(e){try{return JSON.parse(e.postData.contents||'{}')}catch(e){return null}}function lock_(fn){const l=LockService.getScriptLock();l.waitLock(15000);try{return fn()}finally{l.releaseLock()}}
function setupV13(){[[CFG.USERS,UH],[CFG.SESSIONS,SH],[CFG.LEADS,LH],[CFG.CALLS,CH],[CFG.LOGS,LOGH],['Config',['key','value']]].forEach(x=>{let s=ss_().getSheetByName(x[0]);if(!s)s=ss_().insertSheet(x[0]);if(!s.getLastRow())s.getRange(1,1,1,x[1].length).setValues([x[1]])});pep_();return'OK'}
function pep_(){const p=PropertiesService.getScriptProperties();if(!p.getProperty('PASSWORD_PEPPER'))p.setProperty('PASSWORD_PEPPER',id_('pep'));if(!p.getProperty('SESSION_PEPPER'))p.setProperty('SESSION_PEPPER',id_('ses'))}
function sha_(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,str_(v),Utilities.Charset.UTF_8).map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('')}function hp_(p,s){pep_();let v=p+':'+s+':'+PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER');for(let i=0;i<CFG.HASH_ROUNDS;i++)v=sha_(v+':'+i);return v}function ht_(t){pep_();return sha_(t+':'+PropertiesService.getScriptProperties().getProperty('SESSION_PEPPER'))}function token_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')}function validPass_(p){if(str_(p).length<10||!/[A-Za-z]/.test(p)||!/[0-9]/.test(p))throw new Error('A senha deve ter 10 caracteres, letras e números.');return p}
function bootstrapAdminV13(){setupV13();const p=PropertiesService.getScriptProperties(),email=str_(p.getProperty('ADMIN_EMAIL')).trim().toLowerCase(),name=p.getProperty('ADMIN_NAME')||'Administrador',pw=validPass_(p.getProperty('ADMIN_INITIAL_PASSWORD'));if(!email)throw new Error('Defina ADMIN_EMAIL');if(find_(CFG.USERS,UH,'emailNormalized',email))throw new Error('Admin já existe');const now=iso_(),salt=token_(),u={id:id_('user'),createdAt:now,updatedAt:now,name,email,emailNormalized:email,passwordHash:hp_(pw,salt),passwordSalt:salt,role:'ADMIN',status:'active',inviteTokenHash:'',inviteExpiresAt:'',inviteUsedAt:'',passwordSetAt:now,lastLoginAt:'',deletedAt:''};sh_(CFG.USERS).appendRow(row_(UH,u));p.deleteProperty('ADMIN_INITIAL_PASSWORD');return u.id}
function pub_(u){return{id:u.id,name:u.name,email:u.email,role:u.role,status:u.status,lastLoginAt:u.lastLoginAt||''}}function auth_(t){if(!t)return{ok:false,error:'unauthorized'};const se=find_(CFG.SESSIONS,SH,'tokenHash',ht_(t));if(!se||se.obj.revokedAt)return{ok:false,error:'unauthorized'};if(new Date(se.obj.expiresAt)<=new Date())return{ok:false,error:'session_expired'};const ue=find_(CFG.USERS,UH,'id',se.obj.userId);if(!ue||ue.obj.status!=='active')return{ok:false,error:'user_disabled'};return{ok:true,user:ue.obj,session:se.obj,sessionRow:se.row}}
function login_(b){const email=str_(b.email).trim().toLowerCase(),e=find_(CFG.USERS,UH,'emailNormalized',email);if(!e||e.obj.status!=='active'||hp_(str_(b.password),e.obj.passwordSalt)!==e.obj.passwordHash){Utilities.sleep(250);return{ok:false,error:'invalid_credentials',message:'E-mail ou senha inválidos.'}}const t=token_(),now=iso_(),exp=new Date(Date.now()+CFG.SESSION_HOURS*3600000).toISOString();sh_(CFG.SESSIONS).appendRow(row_(SH,{id:id_('session'),userId:e.obj.id,tokenHash:ht_(t),createdAt:now,expiresAt:exp,revokedAt:'',lastSeenAt:now,userAgent:str_(b.userAgent).slice(0,300)}));e.obj.lastLoginAt=now;e.obj.updatedAt=now;write_(CFG.USERS,UH,e.row,e.obj);return{ok:true,sessionToken:t,expiresAt:exp,user:pub_(e.obj)}}
function owner_(c,u){return u.role==='ADMIN'||c.ownerUserId===u.id}function callClient_(c){return{id:c.id,leadId:c.leadId,ownerUserId:c.ownerUserId,ownerEmail:c.ownerEmail,ownerName:c.ownerName,version:Number(c.version||1),createdAt:c.createdAt,updatedAt:c.updatedAt,leadName:c.leadName,sdrName:c.sdrName,date:c.date,meetingType:c.meetingType,isSao:c.isSao===true||str_(c.isSao).toUpperCase()==='TRUE',status:c.status,statusNote:c.statusNote||'',statusHistory:json_(c.statusHistory_json,[]),preCallNotes:json_(c.preCallNotes_json,{text:'',updatedAt:'',locked:false}),finalObservation:c.finalObservation||'',motivoPerdido:c.motivoPerdido||'',scoreTotal:Number(c.scoreTotal||0),scorePercent:Number(c.scorePercent||0),scoreEvaluated:Number(c.scoreEvaluated||0),scoreMax:Number(c.scoreMax||24),cl:json_(c.cl_json,{}),sc:json_(c.sc_json,{}),deletedAt:c.deletedAt||''}}
function calls_(u,ownerId){return read_(CFG.CALLS,CH).filter(c=>!c.deletedAt&&owner_(c,u)&&(!ownerId||c.ownerUserId===ownerId)).map(callClient_)}function leads_(u,ownerId){return read_(CFG.LEADS,LH).filter(l=>!l.deletedAt&&owner_(l,u)&&(!ownerId||l.ownerUserId===ownerId))}
function stats_(sc){let total=0,evaluated=0;for(let i=0;i<12;i++){const v=sc['sc-12-'+i];if(v!==undefined&&v!==null&&v!==''){evaluated++;total+=Number(v)||0}}return{total,evaluated,max:24,percent:Math.round(total/24*100)}}function norm_(v){return str_(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function newLead_(s,u,id){const now=iso_(),l={id:id||id_('lead'),createdAt:now,updatedAt:now,ownerUserId:u.id,ownerEmail:u.email,ownerName:u.name,leadName:s.leadName||'',normalizedLeadName:norm_(s.leadName),sdrName:s.sdrName||'',firstMeetingDate:s.date||'',lastMeetingDate:s.date||'',currentStatus:s.status||'Em andamento',totalMeetings:1,deletedAt:''};sh_(CFG.LEADS).appendRow(row_(LH,l));return l}
function newCall_(s,u){let leadId=s.leadId;if(!leadId||!find_(CFG.LEADS,LH,'id',leadId))leadId=newLead_(s,u,leadId).id;const now=iso_(),sc=s.sc||{},st=stats_(sc),c={id:s.id||id_('call'),leadId,ownerUserId:u.id,ownerEmail:u.email,ownerName:u.name,version:1,createdAt:s.createdAt||now,updatedAt:now,leadName:s.leadName||'',sdrName:s.sdrName||'',date:s.date||'',meetingType:s.meetingType||'Primeira reunião',isSao:!!s.isSao,status:s.status||'Em andamento',statusNote:s.statusNote||'',statusHistory_json:JSON.stringify(s.statusHistory||[{at:now,from:'',to:s.status||'Em andamento',note:'',source:'create'}]),preCallNotes_json:JSON.stringify(s.preCallNotes||{text:'',updatedAt:'',locked:false}),finalObservation:s.finalObservation||'',motivoPerdido:s.motivoPerdido||'',scoreTotal:st.total,scorePercent:st.percent,scoreEvaluated:st.evaluated,scoreMax:24,cl_json:JSON.stringify(s.cl||{}),sc_json:JSON.stringify(sc),deletedAt:s.deletedAt||''};sh_(CFG.CALLS).appendRow(row_(CH,c));return callClient_(c)}
function mutate_(b,u,fn){const e=find_(CFG.CALLS,CH,'id',b.id);if(!e)return{ok:false,error:'call_not_found'};if(!owner_(e.obj,u))return{ok:false,error:'forbidden'};const v=Number(e.obj.version||1);if(Number(b.expectedVersion)!==v)return{ok:false,error:'conflict',currentVersion:v,message:'Registro atualizado em outro lugar.'};fn(e.obj);e.obj.version=v+1;e.obj.updatedAt=iso_();write_(CFG.CALLS,CH,e.row,e.obj);return{ok:true,call:callClient_(e.obj)}}
function publicRead_(a,p,u){if(a==='getCurrentUser')return{ok:true,user:pub_(u)};if(a==='getCalls'){const owner=u.role==='ADMIN'?str_(p.ownerUserId):u.id;return{ok:true,calls:calls_(u,owner),leads:leads_(u,owner)}}if(a==='listUsers'&&u.role==='ADMIN')return{ok:true,users:read_(CFG.USERS,UH).filter(x=>!x.deletedAt).map(pub_)};return{ok:false,error:'unknown_action'}}
function writeAction_(a,b,u,ctx){if(a==='logout'){ctx.session.revokedAt=iso_();write_(CFG.SESSIONS,SH,ctx.sessionRow,ctx.session);return{ok:true}}if(a==='createCall')return{ok:true,call:newCall_(b.call||b,u)};if(a==='updateChecklist')return mutate_(b,u,c=>c.cl_json=JSON.stringify(b.cl||{}));if(a==='updateScorecard')return mutate_(b,u,c=>{const s=stats_(b.sc||{});c.sc_json=JSON.stringify(b.sc||{});c.scoreTotal=s.total;c.scorePercent=s.percent;c.scoreEvaluated=s.evaluated;c.scoreMax=24});if(a==='updatePreCall')return mutate_(b,u,c=>c.preCallNotes_json=JSON.stringify(b.preCallNotes||{}));if(a==='updateStatus')return mutate_(b,u,c=>{const from=c.status||'',to=b.status||from,n=b.note||'',h=json_(c.statusHistory_json,[]);if(from!==to||n)h.push({at:iso_(),from,to,note:n});c.status=to;c.statusNote=n;c.isSao=to==='No-Show'?false:!!b.isSao;c.motivoPerdido=to==='Perdido'?n:'';c.statusHistory_json=JSON.stringify(h)});if(a==='updateCall')return mutate_(b,u,c=>['leadName','sdrName','date','meetingType','isSao'].forEach(k=>{if(b[k]!==undefined)c[k]=b[k]}));if(a==='deleteCall')return mutate_(b,u,c=>c.deletedAt=iso_());if(a==='importCalls'&&u.role==='ADMIN'){let inserted=0,skipped=0;(b.calls||[]).forEach(c=>{if(c.id&&find_(CFG.CALLS,CH,'id',c.id)){skipped++;return}newCall_(c,u);inserted++});return{ok:true,inserted,skipped}}if(u.role==='ADMIN'&&a==='createUser')return createUser_(b);if(u.role==='ADMIN'&&a==='resendInvite')return resend_(b.userId);if(u.role==='ADMIN'&&['disableUser','enableUser','revokeUserSessions'].includes(a))return manageUser_(a,b.userId,u.id);return{ok:false,error:'unknown_action'}}
function createUser_(b){const email=str_(b.email).trim().toLowerCase();if(find_(CFG.USERS,UH,'emailNormalized',email))return{ok:false,error:'email_already_exists'};const now=iso_(),t=token_(),u={id:id_('user'),createdAt:now,updatedAt:now,name:b.name,email:b.email,emailNormalized:email,passwordHash:'',passwordSalt:'',role:b.role==='ADMIN'?'ADMIN':'CLOSER',status:'pending',inviteTokenHash:ht_(t),inviteExpiresAt:new Date(Date.now()+CFG.INVITE_HOURS*3600000).toISOString(),inviteUsedAt:'',passwordSetAt:'',lastLoginAt:'',deletedAt:''};sh_(CFG.USERS).appendRow(row_(UH,u));sendInvite_(u,t);return{ok:true,user:pub_(u)}}function resend_(uid){const e=find_(CFG.USERS,UH,'id',uid);if(!e)return{ok:false,error:'user_not_found'};const t=token_();e.obj.inviteTokenHash=ht_(t);e.obj.inviteExpiresAt=new Date(Date.now()+CFG.INVITE_HOURS*3600000).toISOString();e.obj.status='pending';write_(CFG.USERS,UH,e.row,e.obj);sendInvite_(e.obj,t);return{ok:true}}function sendInvite_(u,t){const base=PropertiesService.getScriptProperties().getProperty('FRONTEND_URL');if(!base)throw new Error('Defina FRONTEND_URL');MailApp.sendEmail({to:u.email,subject:'Convite para o Playbook de Vendas',htmlBody:'<p>Olá, '+u.name+'.</p><p><a href="'+base.replace(/\/$/,'')+'/set-password.html?token='+encodeURIComponent(t)+'">Definir minha senha</a></p>'})}
function manageUser_(a,uid,self){const e=find_(CFG.USERS,UH,'id',uid);if(!e)return{ok:false,error:'user_not_found'};if(a==='disableUser'&&uid===self)return{ok:false,error:'cannot_disable_self'};if(a!=='revokeUserSessions'){e.obj.status=a==='enableUser'?(e.obj.passwordHash?'active':'pending'):'disabled';write_(CFG.USERS,UH,e.row,e.obj)}if(a!=='enableUser'){const s=sh_(CFG.SESSIONS),all=read_(CFG.SESSIONS,SH);all.forEach((x,i)=>{if(x.userId===uid&&!x.revokedAt){x.revokedAt=iso_();s.getRange(i+2,1,1,SH.length).setValues([row_(SH,x)])}})}return{ok:true}}
function invite_(t){const e=find_(CFG.USERS,UH,'inviteTokenHash',ht_(t));if(!e||e.obj.inviteUsedAt)return{ok:false,error:'invalid_invite'};if(new Date(e.obj.inviteExpiresAt)<=new Date())return{ok:false,error:'invite_expired'};return{ok:true,name:e.obj.name,email:e.obj.email}}
function setPass_(b){return lock_(()=>{const e=find_(CFG.USERS,UH,'inviteTokenHash',ht_(b.token));if(!e||e.obj.inviteUsedAt)return{ok:false,error:'invalid_invite'};if(new Date(e.obj.inviteExpiresAt)<=new Date())return{ok:false,error:'invite_expired'};const pw=validPass_(b.password),salt=token_(),now=iso_();e.obj.passwordSalt=salt;e.obj.passwordHash=hp_(pw,salt);e.obj.passwordSetAt=now;e.obj.inviteUsedAt=now;e.obj.inviteTokenHash='';e.obj.inviteExpiresAt='';e.obj.status='active';write_(CFG.USERS,UH,e.row,e.obj);return{ok:true}})}
function doGet(e){try{const a=e.parameter.action||'health';if(a==='health')return res_({ok:true,version:'13.1'});if(a==='validateInvite')return res_(invite_(e.parameter.token));const x=auth_(e.parameter.sessionToken);if(!x.ok)return res_(x);return res_(publicRead_(a,e.parameter,x.user))}catch(er){return res_({ok:false,error:'server_error',message:str_(er.message)})}}
function doPost(e){try{const b=body_(e);if(!b)return res_({ok:false,error:'invalid_json'});if(b.action==='login')return res_(login_(b));if(b.action==='validateInvite')return res_(invite_(b.token));if(b.action==='setPassword')return res_(setPass_(b));const x=auth_(b.sessionToken);if(!x.ok)return res_(x);return res_(lock_(()=>writeAction_(b.action,b,x.user,x)))}catch(er){return res_({ok:false,error:'server_error',message:str_(er.message)})}}

/* ============================================================
   PATCH ADMINISTRACAO DE USUARIOS
   Adiciona: filtros/listagem de excluidos, edicao, redefinicao de
   senha e exclusao logica. Nao altera a estrutura da aba Users.
   ============================================================ */
function pub_(u){
  return {
    id:u.id,
    name:u.name,
    email:u.email,
    role:u.role,
    status:u.status,
    lastLoginAt:u.lastLoginAt||'',
    passwordSetAt:u.passwordSetAt||'',
    deletedAt:u.deletedAt||''
  };
}

function publicRead_(a,p,u){
  if(a==='getCurrentUser')return{ok:true,user:pub_(u)};
  if(a==='getCalls'){
    const owner=u.role==='ADMIN'?str_(p.ownerUserId):u.id;
    return{ok:true,calls:calls_(u,owner),leads:leads_(u,owner)};
  }
  if(a==='listUsers'&&u.role==='ADMIN'){
    const includeDeleted=str_(p.includeDeleted).toLowerCase()==='true';
    return{
      ok:true,
      users:read_(CFG.USERS,UH)
        .filter(x=>includeDeleted||!x.deletedAt)
        .map(pub_)
    };
  }
  return{ok:false,error:'unknown_action'};
}

function revokeUserSessions_(userId){
  const sheet=sh_(CFG.SESSIONS);
  const sessions=read_(CFG.SESSIONS,SH);
  let revoked=0;
  sessions.forEach((session,index)=>{
    if(session.userId===userId&&!session.revokedAt){
      session.revokedAt=iso_();
      sheet.getRange(index+2,1,1,SH.length).setValues([row_(SH,session)]);
      revoked++;
    }
  });
  return revoked;
}

function activeAdminCount_(){
  return read_(CFG.USERS,UH).filter(user=>
    !user.deletedAt&&user.status==='active'&&user.role==='ADMIN'
  ).length;
}

function updateUser_(b,currentUser){
  const entry=find_(CFG.USERS,UH,'id',b.userId);
  if(!entry||entry.obj.deletedAt){
    return{ok:false,error:'user_not_found',message:'Usuario nao encontrado.'};
  }

  const name=str_(b.name).trim();
  const email=str_(b.email).trim();
  const emailNormalized=email.toLowerCase();
  const role=str_(b.role).toUpperCase();

  if(!name){
    return{ok:false,error:'invalid_name',message:'Informe o nome do usuario.'};
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)){
    return{ok:false,error:'invalid_email',message:'Informe um e-mail valido.'};
  }
  if(role!=='ADMIN'&&role!=='CLOSER'){
    return{ok:false,error:'invalid_role',message:'Perfil invalido.'};
  }

  const duplicate=find_(CFG.USERS,UH,'emailNormalized',emailNormalized);
  if(duplicate&&duplicate.obj.id!==entry.obj.id&&!duplicate.obj.deletedAt){
    return{ok:false,error:'email_already_exists',message:'Este e-mail ja esta em uso.'};
  }

  if(
    entry.obj.id===currentUser.id&&
    entry.obj.role==='ADMIN'&&
    role!=='ADMIN'&&
    activeAdminCount_()<=1
  ){
    return{ok:false,error:'last_admin',message:'O ultimo administrador ativo nao pode perder o perfil ADMIN.'};
  }

  entry.obj.name=name;
  entry.obj.email=email;
  entry.obj.emailNormalized=emailNormalized;
  entry.obj.role=role;
  entry.obj.updatedAt=iso_();
  write_(CFG.USERS,UH,entry.row,entry.obj);

  return{ok:true,user:pub_(entry.obj)};
}

function deleteUser_(b,currentUser){
  const entry=find_(CFG.USERS,UH,'id',b.userId);
  if(!entry||entry.obj.deletedAt){
    return{ok:false,error:'user_not_found',message:'Usuario nao encontrado ou ja excluido.'};
  }
  if(entry.obj.id===currentUser.id){
    return{ok:false,error:'cannot_delete_self',message:'Voce nao pode excluir o proprio usuario.'};
  }
  if(entry.obj.role==='ADMIN'&&entry.obj.status==='active'&&activeAdminCount_()<=1){
    return{ok:false,error:'last_admin',message:'O ultimo administrador ativo nao pode ser excluido.'};
  }

  const now=iso_();
  entry.obj.status='disabled';
  entry.obj.deletedAt=now;
  entry.obj.updatedAt=now;
  entry.obj.inviteTokenHash='';
  entry.obj.inviteExpiresAt='';
  revokeUserSessions_(entry.obj.id);
  write_(CFG.USERS,UH,entry.row,entry.obj);

  return{ok:true,user:pub_(entry.obj)};
}

function sendPasswordReset_(b){
  const entry=find_(CFG.USERS,UH,'id',b.userId);
  if(!entry||entry.obj.deletedAt){
    return{ok:false,error:'user_not_found',message:'Usuario nao encontrado.'};
  }
  if(entry.obj.status==='disabled'){
    return{ok:false,error:'user_disabled',message:'Ative o usuario antes de enviar a redefinicao de senha.'};
  }

  const resetToken=token_();
  entry.obj.inviteTokenHash=ht_(resetToken);
  entry.obj.inviteExpiresAt=new Date(
    Date.now()+CFG.INVITE_HOURS*3600000
  ).toISOString();
  entry.obj.inviteUsedAt='';
  entry.obj.updatedAt=iso_();

  // Usuario ativo permanece ativo. Somente quem ainda nao criou senha fica pending.
  if(!entry.obj.passwordHash)entry.obj.status='pending';

  write_(CFG.USERS,UH,entry.row,entry.obj);
  revokeUserSessions_(entry.obj.id);
  sendInvite_(entry.obj,resetToken);

  return{
    ok:true,
    message:'Link de definicao/redefinicao de senha enviado.',
    user:pub_(entry.obj)
  };
}

function resend_(uid){
  const entry=find_(CFG.USERS,UH,'id',uid);
  if(!entry||entry.obj.deletedAt){
    return{ok:false,error:'user_not_found',message:'Usuario nao encontrado.'};
  }
  if(entry.obj.passwordHash){
    return{
      ok:false,
      error:'user_already_active',
      message:'Este usuario ja possui senha. Use Redefinir senha.'
    };
  }

  const inviteToken=token_();
  entry.obj.inviteTokenHash=ht_(inviteToken);
  entry.obj.inviteExpiresAt=new Date(
    Date.now()+CFG.INVITE_HOURS*3600000
  ).toISOString();
  entry.obj.inviteUsedAt='';
  entry.obj.status='pending';
  entry.obj.updatedAt=iso_();
  write_(CFG.USERS,UH,entry.row,entry.obj);
  sendInvite_(entry.obj,inviteToken);
  return{ok:true,message:'Convite reenviado.'};
}

function writeAction_(a,b,u,ctx){
  if(a==='logout'){
    ctx.session.revokedAt=iso_();
    write_(CFG.SESSIONS,SH,ctx.sessionRow,ctx.session);
    return{ok:true};
  }
  if(a==='createCall')return{ok:true,call:newCall_(b.call||b,u)};
  if(a==='updateChecklist')return mutate_(b,u,c=>c.cl_json=JSON.stringify(b.cl||{}));
  if(a==='updateScorecard')return mutate_(b,u,c=>{
    const s=stats_(b.sc||{});
    c.sc_json=JSON.stringify(b.sc||{});
    c.scoreTotal=s.total;c.scorePercent=s.percent;c.scoreEvaluated=s.evaluated;c.scoreMax=24;
  });
  if(a==='updatePreCall')return mutate_(b,u,c=>c.preCallNotes_json=JSON.stringify(b.preCallNotes||{}));
  if(a==='updateStatus')return mutate_(b,u,c=>{
    const from=c.status||'',to=b.status||from,n=b.note||'',h=json_(c.statusHistory_json,[]);
    if(from!==to||n)h.push({at:iso_(),from,to,note:n});
    c.status=to;c.statusNote=n;c.isSao=to==='No-Show'?false:!!b.isSao;
    c.motivoPerdido=to==='Perdido'?n:'';c.statusHistory_json=JSON.stringify(h);
  });
  if(a==='updateCall')return mutate_(b,u,c=>
    ['leadName','sdrName','date','meetingType','isSao'].forEach(k=>{
      if(b[k]!==undefined)c[k]=b[k];
    })
  );
  if(a==='deleteCall')return mutate_(b,u,c=>c.deletedAt=iso_());
  if(a==='importCalls'&&u.role==='ADMIN'){
    let inserted=0,skipped=0;
    (b.calls||[]).forEach(c=>{
      if(c.id&&find_(CFG.CALLS,CH,'id',c.id)){skipped++;return;}
      newCall_(c,u);inserted++;
    });
    return{ok:true,inserted,skipped};
  }

  if(u.role==='ADMIN'&&a==='createUser')return createUser_(b);
  if(u.role==='ADMIN'&&a==='resendInvite')return resend_(b.userId);
  if(u.role==='ADMIN'&&a==='updateUser')return updateUser_(b,u);
  if(u.role==='ADMIN'&&a==='deleteUser')return deleteUser_(b,u);
  if(u.role==='ADMIN'&&a==='sendPasswordReset')return sendPasswordReset_(b);
  if(u.role==='ADMIN'&&['disableUser','enableUser','revokeUserSessions'].includes(a)){
    return manageUser_(a,b.userId,u.id);
  }
  return{ok:false,error:'unknown_action'};
}
