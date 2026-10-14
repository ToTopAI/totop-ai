import test from 'node:test'
import assert from 'node:assert/strict'
import {validateGameManifest} from '../shared/game-manifest.mjs'
const manifest={schemaVersion:1,sdkVersion:'1.0.0',engine:'html5',orientation:'any',locales:['en'],capabilities:['lifecycle','device','cloudSave']}
test('fixed SDK manifest rejects unsupported capability, orientation, duplicate locales and unknown fields',()=>{
 assert.equal(validateGameManifest(manifest).valid,true)
 for(const change of [{capabilities:['unknown']},{orientation:'diagonal'},{locales:['en','en']},{secret:'not-public'},{sdkVersion:'latest'}])assert.equal(validateGameManifest({...manifest,...change}).valid,false)
})
