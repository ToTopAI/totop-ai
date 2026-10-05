import { mkdir, lstat, readFile, open, rename, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { unlinkedPath } from './artifacts.mjs'
const execute=promisify(execFile)
async function restrictWindows(path) {
  if(process.platform!=='win32')return
  const {stdout}=await execute('whoami',['/user','/fo','csv','/nh'],{windowsHide:true,timeout:10000})
  const sid=stdout.match(/S-1-5-[0-9-]+/)?.[0]
  if(!sid)throw Error('credential_acl_unavailable')
  // Remove inherited AND explicit grants. /grant:r alone leaves other users' ACLs.
  const literal=path.replaceAll("'","''")
  // Use Windows PowerShell's .NET Framework ACL APIs directly. A parent pwsh
  // process can supply a PSModulePath that prevents legacy Get-Acl autoloading.
  const script=`$ErrorActionPreference='Stop'; $target='${literal}'; $sid=[System.Security.Principal.SecurityIdentifier]::new('${sid}'); $dir=[System.IO.Directory]::Exists($target); if($dir){$acl=[System.IO.Directory]::GetAccessControl($target)}else{$acl=[System.IO.File]::GetAccessControl($target)}; $acl.SetAccessRuleProtection($true,$false); foreach($rule in @($acl.Access)){[void]$acl.RemoveAccessRuleAll($rule)}; $acl.SetOwner($sid); $inherit=[System.Security.AccessControl.InheritanceFlags]::None; if($dir){$inherit=[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'}; $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,'None','Allow'); [void]$acl.AddAccessRule($rule); if($dir){[System.IO.Directory]::SetAccessControl($target,$acl); $check=[System.IO.Directory]::GetAccessControl($target)}else{[System.IO.File]::SetAccessControl($target,$acl); $check=[System.IO.File]::GetAccessControl($target)}; foreach($entry in $check.Access){if($entry.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value){throw 'Unexpected credential ACL'}}`
  try{await execute('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:10000})}catch{throw Error('credential_acl_unavailable')}
}

export class CredentialStore {
  constructor(directory,profile,{entryFactory}={}){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(profile))throw Error('invalid_profile');this.directory=directory;this.profile=profile;this.file=resolve(directory,profile+'.json');this.block=resolve(directory,profile+'.logged-out');this.entryFactory=entryFactory}
  async systemEntry(){if(this.entryFactory)return this.entryFactory();try{const {Entry}=await import('@napi-rs/keyring');return new Entry('totop-agent',this.profile,{linux:{store:'secret-service'}})}catch{return null}}
  async load(){try{await unlinkedPath(this.block);await lstat(this.block);return null}catch(error){if(error.code!=='ENOENT')throw Error('credentials_unavailable')}
    // A fallback written while the keyring is locked supersedes any stale
    // keyring value. Successful keyring saves remove that fallback atomically.
    try{await unlinkedPath(this.file);await restrictWindows(this.file);const info=await lstat(this.file);if(process.platform!=='win32'&&(info.mode&0o077))throw Error('unsafe_credential_permissions');return JSON.parse(await readFile(this.file,'utf8'))}catch(error){if(error.code!=='ENOENT')throw Error('credentials_unavailable')}
    const entry=await this.systemEntry();try{const secret=entry?.getPassword();if(secret)return JSON.parse(secret)}catch{}return null}
  async save(value){const entry=await this.systemEntry();let stored=false;try{entry?.setPassword(JSON.stringify(value));stored=!!entry}catch{}
    if(stored){await this.removeFallback();await this.removeBlock();return 'system'}
    await this.writeRestricted(this.file,JSON.stringify(value));await this.removeBlock();return 'restricted_file'}
  async writeRestricted(destination,value){
    await mkdir(this.directory,{recursive:true,mode:0o700});await unlinkedPath(this.directory)
    await restrictWindows(this.directory)
    if(process.platform!=='win32'&&((await lstat(this.directory)).mode&0o077))throw Error('unsafe_credential_permissions')
    const temp=resolve(this.directory,this.profile+'.'+randomUUID()+'.tmp'),handle=await open(temp,'wx',0o600)
    try{await restrictWindows(temp);await handle.writeFile(value)}finally{await handle.close()}
    await rename(temp,destination)}
  async removeBlock(){try{await unlink(this.block)}catch(error){if(error.code!=='ENOENT')throw Error('credential_cleanup_failed')}}
  async removeFallback(){try{await unlink(this.file)}catch(error){if(error.code!=='ENOENT')throw Error('credential_cleanup_failed')}}
  // A durable tombstone prevents an unavailable keyring from resurrecting tokens
  // after logout. Only an explicit successful save removes it.
  async clear(){await this.writeRestricted(this.block,'logged-out');try{(await this.systemEntry())?.deletePassword()}catch{}await this.removeFallback()}
}
