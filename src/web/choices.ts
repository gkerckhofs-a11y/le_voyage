import {startDemo} from './demo-client.js';
import {openWeeklyPopup} from './weekly-popup.js';
void startDemo().then(session=>{
 document.getElementById('resume-week')?.addEventListener('click',()=>void openWeeklyPopup(session.csrf,true));
}).catch(()=>{document.getElementById('choices-status')!.textContent='Connectez-vous pour retrouver vos choix.';});
