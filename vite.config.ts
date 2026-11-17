import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import type {Plugin} from 'vite'

function computerOfflineShell():Plugin{
  let base='/calendar/'
  return {
    name:'computer-offline-shell',enforce:'post',apply:'build',
    configResolved(config){base=config.base},
    generateBundle(_,bundle){
      if(process.env.VITE_COMPUTER_SYNC!=='1')return
      const template=readFileSync(new URL('./tools/offline-worker.js',import.meta.url),'utf8')
      const hash=createHash('sha256').update(template)
      for(const [name,item] of Object.entries(bundle).sort(([a],[b])=>a.localeCompare(b))){
        hash.update(name).update(item.type==='chunk'?item.code:item.source)
      }
      const files=[base,...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name)).map(name=>base+name),base+'favicon.svg',base+'lunar-javascript-LICENSE.txt']
      const prefix=`calendar182-shell:${base}:`
      const build={base,prefix,cache:prefix+hash.digest('hex').slice(0,16),files}
      this.emitFile({type:'asset',fileName:'offline-worker.js',source:template.replace('const BUILD = null;',`const BUILD = ${JSON.stringify(build)};`)})
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/calendar182/',
  plugins: [react(),computerOfflineShell()],
})
