import {createCitePrototypeServer} from '../src/server/cite-prototype.mjs';
const port=Number(process.env.PORT??4175);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local prototype port');const server=createCitePrototypeServer();server.listen(port,'127.0.0.1',()=>console.log(`La Cité — prototype fictif local : http://127.0.0.1:${port}/`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close();server.closeAllConnections();});
