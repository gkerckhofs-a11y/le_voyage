import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',timeout:30000,fullyParallel:true,workers:2,retries:0,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  projects:[
    {name:'desktop-1440',use:{viewport:{width:1440,height:900}}},
    {name:'desktop-1920',use:{viewport:{width:1920,height:1080}}},
    {name:'mobile-390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
});
