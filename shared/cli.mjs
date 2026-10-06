import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { prepareArtifact, permittedPath, uploadArtifact, unlinkedPath } from './artifacts.mjs'
import { rm, lstat } from 'node:fs/promises'
import { CredentialStore } from './credentials.mjs'
import { BridgeAuth, ISSUER } from './oauth.mjs'
import { connectRemote, serve } from './bridge.mjs'
import {downloadGameSource} from './source.mjs'

export async function main(argv=process.argv.slice(2)) {
  if(Number(process.versions.node.split('.')[0])<22)throw Error('node_22_required')
  const command=argv.shift(),options={roots:[],profile:'default'},positional=[]
  for(let i=0;i<argv.length;i++){
    const item=argv[i]
    if(item==='--allow-root'){if(!argv[i+1])throw Error('allowed_game_directory_required');options.roots.push(resolve(argv[++i]))}
    else if(item==='--profile'){options.profile=argv[++i]}
    else if(item==='--purpose'){options.purpose=argv[++i]}
    else if(item==='--no-open'){options.noOpen=true}
    else if(item.startsWith('--'))throw Error('unknown_option')
    else positional.push(item)
  }
  const directory=resolve(process.env.LOCALAPPDATA??process.env.XDG_CONFIG_HOME??resolve(homedir(),'.config'),'totop-agent')
  const credentials=new CredentialStore(directory,options.profile),auth=new BridgeAuth(credentials)
  const outputDirectory=resolve(directory,'artifacts',options.profile)
  const clearArtifacts=async()=>{try{await unlinkedPath(outputDirectory);await rm(outputDirectory,{recursive:true,force:true})}catch(error){if(error.code!=='ENOENT')throw error}}
  const print=value=>process.stdout.write(JSON.stringify(value)+'\n')
  if(command==='prepare')return print(await prepareArtifact({path:positional[0],purpose:options.purpose??'game',roots:options.roots,outputDirectory}))
  if(command==='download-source'){
    const remote=await connectRemote(auth)
    try{return print(await downloadGameSource({remote,auth,gameId:positional[0],releaseId:positional[1],destination:positional[2],roots:options.roots}))}finally{await remote.close()}
  }
  if(command==='upload'){
    const generated=await lstat(outputDirectory).then(()=>[outputDirectory],error=>{if(error.code==='ENOENT')return [];throw error})
    const path=await permittedPath(positional[0],[...options.roots,...generated])
    const chunks=[];let size=0
    for await(const chunk of process.stdin){size+=chunk.length;if(size>32768)throw Error('receipt_too_large');chunks.push(chunk)}
    return print(await uploadArtifact(path,JSON.parse(Buffer.concat(chunks).toString('utf8'))))
  }
  if(command==='login'){await clearArtifacts();await auth.login({openBrowser:!options.noOpen});return print({status:'connected',profile:options.profile})}
  if(command==='logout'){
    const tokens=await auth.tokens();let revoked=!tokens
    if(tokens){try{const response=await fetch(ISSUER+'/oauth/revoke',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:'mcp:totop-bridge',token:tokens.refresh_token??tokens.access_token,token_type_hint:tokens.refresh_token?'refresh_token':'access_token'}),signal:AbortSignal.timeout(10000)});revoked=response.ok}catch{}}
    await credentials.clear()
    // Only our private profile's generated files, never a user game directory.
    await clearArtifacts()
    return print({status:'signed_out',remoteRevoked:revoked,next:revoked?null:'Revoke the connection in https://creator.totop.ai/agents'})
  }
  if(command==='status'){
    if(!await auth.tokens())return print({status:'signed_out',profile:options.profile})
    const client=await connectRemote(auth);try{const response=await client.callTool({name:'get_account',arguments:{}});if(response.isError)throw Error('account_unavailable');const data=JSON.parse(response.content.find(x=>x.type==='text').text);print({status:'connected',profile:options.profile,accountId:data.accountId,creatorReady:data.creatorReady})}finally{await client.close()}return
  }
  if(command==='serve'){if(!options.roots.length)throw Error('allowed_game_directory_required');return serve({auth,roots:options.roots,outputDirectory})}
  if(command==='--version'||command==='version')return print({helper:'0.2.0',plugins:'0.4.0'})
  process.stderr.write('ToTop Agent 0.2.0 (Node 22+)\nCommands: prepare DIRECTORY --allow-root GAME_DIR [--purpose game|cover|source]; download-source GAME_ID RELEASE_ID NEW_DIRECTORY --allow-root APPROVED_PARENT; upload FILE < private-receipt.json; login; logout; status; serve --allow-root GAME_DIR. Optional: --profile NAME.\n')
}
