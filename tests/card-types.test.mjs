import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,validateData} from '../core.mjs';
import {cardArt} from '../card-art.mjs';
test('chosen artwork survives renaming and backup restoration',()=>{const d=initialData();d.cards[0].cardType='canara';d.cards[0].bank='Custom bank label';d.cards[0].nickname='Everyday';const restored=validateData(JSON.parse(JSON.stringify(d)));assert.equal(cardArt(restored.cards[0]).key,'canara');});
test('older backups infer known cards without altering ownership or IDs',()=>{const d=initialData();d.cards.forEach(c=>delete c.cardType);const restored=validateData(d);assert.deepEqual(restored.cards.map(c=>c.cardType),['boi','canara','utkarsh','bob','bob']);assert.deepEqual(restored.cards.map(c=>[c.id,c.holder]),d.cards.map(c=>[c.id,c.holder]));});
test('Other selection stays generic and invalid product IDs are rejected',()=>{const d=initialData();d.cards[0].cardType='other';assert.equal(cardArt(validateData(d).cards[0]),null);d.cards[0].cardType='invalid';assert.throws(()=>validateData(d),/Invalid card type/);});
