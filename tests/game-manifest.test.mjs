import test from 'node:test'
import assert from 'node:assert/strict'
import {validateGameManifest} from '../shared/game-manifest.mjs'
const manifest={schemaVersion:1,sdkVersion:'1.0.0',engine:'html5',orientation:'any',locales:['en'],capabilities:['lifecycle','device','cloudSave']}
test('fixed SDK manifest rejects unsupported capability, orientation, duplicate locales and unknown fields',()=>{
 assert.equal(validateGameManifest(manifest).valid,true)
 for(const change of [{capabilities:['unknown']},{orientation:'diagonal'},{locales:['en','en']},{secret:'not-public'},{sdkVersion:'latest'}])assert.equal(validateGameManifest({...manifest,...change}).valid,false)
})

test('display declares a bounded fixed canvas or explicit responsive layout',()=>{
 const base={schemaVersion:1,sdkVersion:'1.0.0',engine:'html5',orientation:'landscape',locales:['en']}
 for(const display of [{mode:'fixed',width:1440,height:900},{mode:'responsive'}])assert.equal(validateGameManifest({...base,display}).valid,true)
 for(const display of [{mode:'fixed',width:0,height:900},{mode:'fixed',width:10000,height:900},{mode:'responsive',width:1440}])assert.equal(validateGameManifest({...base,display}).valid,false)
})
