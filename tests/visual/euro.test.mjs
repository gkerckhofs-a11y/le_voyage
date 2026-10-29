import test from 'node:test';import assert from 'node:assert/strict';import {euroCents,euroInput,euroLabel} from '../../src/web/euro.ts';
test('euro parsing preserves cents exactly and rejects silent rounding',()=>{
 for(const [value,cents] of [['125,50',12550],['0.01',1],['12,5',1250],['0',0],[' 999.99 ',99999],['90071992547409.91',Number.MAX_SAFE_INTEGER]]){assert.equal(euroCents(value),cents);assert.equal(euroCents(euroInput(cents)),cents);}
 for(const value of ['', '-1','1,234','1e3','1 000','Infinity','90071992547409.92'])assert.throws(()=>euroCents(value));
 assert.equal(euroLabel(12550),'125,50 €');
});
