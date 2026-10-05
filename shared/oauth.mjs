import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { auth } from '@modelcontextprotocol/sdk/client/auth.js'

export const ENDPOINT='https://api.totop.ai/mcp',ISSUER='https://auth.totop.ai'
export const SCOPES='totop:developer:read totop:draft:write totop:upload:write totop:submission:write'
const safeFetch=async(input,init={})=>{const url=new URL(input instanceof Request?input.url:String(input));if(![ENDPOINT,ISSUER].some(origin=>url.origin===new URL(origin).origin))throw Error('untrusted_oauth_endpoint');return fetch(input,{...init,redirect:'error',signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}
export class BridgeAuth {
  constructor(store){this.store=store;this.stateValue=randomBytes(32).toString('hex');this.memory=null;this.verifier=null;this.redirect='http://127.0.0.1/totop/callback'}
  get redirectUrl(){return this.redirect}
  get clientMetadata(){return {client_name:'ToTop local bridge',redirect_uris:[this.redirect],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:SCOPES}}
  clientInformation(){return {client_id:'mcp:totop-bridge',issuer:ISSUER}}
  async tokens(){return this.memory??(this.memory=await this.store.load())}
  async saveTokens(tokens){if(tokens.issuer&&tokens.issuer!==ISSUER)throw Error('untrusted_oauth_issuer');this.memory={...tokens,issuer:ISSUER};await this.store.save(this.memory)}
  state(){return this.stateValue}
  saveCodeVerifier(value){this.verifier=value}
  codeVerifier(){if(!this.verifier)throw Error('pkce_verifier_missing');return this.verifier}
  async invalidateCredentials(scope){if(scope==='all'||scope==='tokens'){this.memory=null;await this.store.clear()}if(scope==='all'||scope==='verifier')this.verifier=null}
  async redirectToAuthorization(url){if(url.origin!==ISSUER||url.pathname!=='/oauth/authorize')throw Error('untrusted_oauth_endpoint');this.authorizationUrl=url}
  async login({openBrowser=true}={}){
    // Login always represents an explicit account switch and starts a fresh authorization.
    await this.invalidateCredentials('all');this.stateValue=randomBytes(32).toString('hex')
    const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
    this.redirect=`http://127.0.0.1:${server.address().port}/totop/callback`
    let timer
    try{
      const completion=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('authorization_timeout')),300000);timer.unref();server.on('request',(req,res)=>{
        const url=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'||url.pathname!=='/totop/callback'||url.searchParams.getAll('state').length!==1||url.searchParams.get('state')!==this.stateValue){res.writeHead(400).end('Invalid authorization callback');return}
        if(url.searchParams.has('iss')&&(url.searchParams.getAll('iss').length!==1||url.searchParams.get('iss')!==ISSUER)){res.writeHead(400).end('Invalid authorization issuer');return}
        const code=url.searchParams.get('code');if(!code||url.searchParams.getAll('code').length!==1||url.searchParams.has('error')){res.writeHead(400).end('Authorization declined');clearTimeout(timer);reject(Error('authorization_declined'));return}
        clearTimeout(timer);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'"}).end('<h1>ToTop authorization received</h1><p>Return to your Agent to confirm the connection result. You can close this tab.</p>');resolve(code)
      })});completion.catch(()=>{})
      const result=await auth(this,{serverUrl:ENDPOINT,scope:SCOPES,fetchFn:safeFetch})
      if(result!=='REDIRECT'||!this.authorizationUrl)throw Error('authorization_start_failed')
      if(openBrowser){const command=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';const args=process.platform==='win32'?['url.dll,FileProtocolHandler',this.authorizationUrl.href]:[this.authorizationUrl.href];const child=spawn(command,args,{stdio:'ignore'});child.on('error',()=>{});child.unref()}
      // Authorization URL contains state but no credentials; only stderr, never protocol stdout.
      process.stderr.write(`Authorize ToTop in your browser: ${this.authorizationUrl.href}\n`)
      if(await auth(this,{serverUrl:ENDPOINT,authorizationCode:await completion,scope:SCOPES,fetchFn:safeFetch})!=='AUTHORIZED')throw Error('authorization_failed')
    }finally{clearTimeout(timer);server.closeAllConnections();server.close();this.verifier=null;this.authorizationUrl=null}
  }
}
export { safeFetch }
