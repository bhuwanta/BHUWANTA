import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/whatsapp/evidence.ts', import.meta.url),'utf8')
const {outputText} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}})
const {verifyWhatsAppSignature,incomingEvidence} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('only the exact signed body is accepted',()=>{
 const body='{"text":"hello"}', secret='test-only-secret'
 const sig='sha256='+createHmac('sha256',secret).update(body).digest('hex')
 assert.equal(verifyWhatsAppSignature(body,sig,secret),true)
 for(const [b,s,k] of [[body+' ',sig,secret],[body,null,secret],[body,'sha256=abc',secret],[body,sig,'wrong'],[body,sig,'']]) assert.equal(verifyWhatsAppSignature(b,s,k),false)
})
test('retains original message and referral evidence without inventing attribution',()=>{
 const evidence=incomingEvidence({id:'wamid.test',timestamp:'123',type:'text',text:{body:'I did not enquire'},referral:{source_id:'ad123',source_type:'ad',ctwa_clid:'click123'}})
 assert.match(evidence,/I did not enquire/)
 assert.match(evidence,/wamid.test/)
 assert.match(evidence,/ad123/)
 assert.doesNotMatch(evidence,/Google Ads/)
})
test('handles interactive and non-text input and bounds saved fields',()=>{
 assert.match(incomingEvidence({interactive:{button_reply:{id:'callback',title:'Call me'}}}),/Selection: callback/)
 assert.match(incomingEvidence({type:'image'}),/no text content/)
 assert.ok(incomingEvidence({text:{body:'a'.repeat(100000)}}).length<4500)
})
