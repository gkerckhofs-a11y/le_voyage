type Week={show?:boolean;status?:string;eligible?:boolean;myAnswers?:number[]|null;absent?:boolean;week?:{id:string;start:string;endExclusive:string};questions?:string[]};
let loading=false;
export async function openWeeklyPopup(csrf:string,manual=false){
 if(loading||document.querySelector('dialog[open]')||location.pathname==='/semaine.html')return;
 loading=true;
 try{
  const r=manual?await fetch('/api/my-week'):await fetch('/api/my-week/prompt',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:'{}'});
  if(!r.ok)return;const w:Week=await r.json();
  if(!manual&&!w.show)return;
  const dialog=document.createElement('dialog');dialog.className='weekly-popup';dialog.setAttribute('aria-labelledby','weekly-popup-title');
  const close=document.createElement('button');close.className='dialog-close';close.type='button';close.setAttribute('aria-label','Fermer Ma semaine');close.textContent='×';close.addEventListener('click',()=>dialog.close());
  const title=document.createElement('h2');title.id='weekly-popup-title';title.textContent='Ma semaine';
  const intro=document.createElement('p');intro.textContent='Trois questions pour faire avancer notre voyage. Vos réponses restent privées.';
  const status=document.createElement('p');status.setAttribute('role','status');
  dialog.append(close,title,intro);
  if((manual&&(w.status!=='open'||!w.eligible||w.myAnswers||w.absent))||!w.week||w.questions?.length!==3){
   status.textContent=w.myAnswers?'Vos réponses sont déjà enregistrées.':w.absent?'Votre absence est enregistrée.':'Aucun questionnaire à compléter actuellement.';
  }else{
   const form=document.createElement('form');form.className='weekly-popup-form';
   for(const [i,q] of w.questions.entries()){
    const field=document.createElement('fieldset'),legend=document.createElement('legend'),row=document.createElement('div');legend.textContent=q;row.className='answer-scale';field.append(legend,row);
    for(let value=1;value<=5;value++){const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='popup-q'+i;input.value=String(value);input.required=true;label.append(input,document.createTextNode(String(value)));row.append(label);}form.append(field);
   }
   const scale=document.createElement('p');scale.textContent='De 1 « Pas du tout » à 5 « Tout à fait ».';form.prepend(scale);
   const submit=document.createElement('button');submit.textContent='Valider mes trois réponses';submit.type='submit';form.append(submit);
   const absent=document.createElement('button');absent.type='button';absent.textContent='Je suis absent cette semaine';form.append(absent);
   let busy=false;
   async function send(action:string,data:unknown){
    if(busy)return;busy=true;submit.disabled=true;absent.disabled=true;
    try{const response=await fetch('/api/my-week/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});if(!response.ok)throw Error();form.hidden=true;status.textContent=action==='answer'?'Vos trois réponses sont enregistrées. Merci !':'Votre absence est enregistrée, sans motif.';}
    catch{status.textContent='Enregistrement non confirmé. Reprenez vos réponses dans Nos choix pour vérifier votre statut.';}
    finally{busy=false;submit.disabled=false;absent.disabled=false;}
   }
   form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);void send('answer',{weekId:w.week!.id,answers:[0,1,2].map(i=>Number(data.get('popup-q'+i)))});});
   absent.addEventListener('click',()=>void send('absence',{weekId:w.week!.id,absent:true}));dialog.append(form);
  }
  const help=document.createElement('p');help.textContent='Vous pouvez fermer ce popup et reprendre vos réponses dans Nos choix. Il ne s’ouvrira pas automatiquement une seconde fois pour cette semaine.';
  dialog.append(status,help);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }finally{loading=false;}
}
