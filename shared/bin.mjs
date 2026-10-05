#!/usr/bin/env node
import { main } from './cli.mjs'
main().catch(()=>{process.stderr.write('ToTop operation failed or is unconfirmed. Check directory permissions, connection status and the same upload/submission before retrying. No credentials are printed.\n');process.exitCode=1})
