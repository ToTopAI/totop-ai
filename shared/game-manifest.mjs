import {readFileSync} from 'node:fs'
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv'
// This schema only uses draft-7-compatible validation keywords. The public
// schema remains 2020-12; discard metadata for the MCP SDK's default validator.
const {$schema,$id,...schema}=JSON.parse(readFileSync(new URL('./game-assets/totop.game.schema.json',import.meta.url),'utf8'))
const validate=new AjvJsonSchemaValidator().getValidator(schema)
export const validateGameManifest=value=>validate(value)
