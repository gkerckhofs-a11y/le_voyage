let csrf='';
export async function startDemo(){
  const response=await fetch('/api/demo/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw new Error('Demo unavailable');
  const result=await response.json();csrf=result.csrf;
}
export async function readDemo<T>(surface:'team'|'collective'):Promise<T>{
  const response=await fetch(`/api/demo/${surface}`);if(!response.ok)throw new Error('Demo unavailable');return response.json();
}
export async function sendDemo<T>(action:'advance'|'claim',data:unknown):Promise<T>{
  const response=await fetch(`/api/demo/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});
  if(!response.ok)throw new Error('Demo command unconfirmed');return response.json();
}
