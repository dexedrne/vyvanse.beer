import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('controller navigation and Back follow lightbox, gallery, then background details', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url),'utf8');
  const closed = [];
  const lightbox = {hidden:false};
  const sheet = {hidden:false};
  let galleryOpen = true;
  const gallery = {close() { galleryOpen = false; closed.push('gallery'); }};
  const context = vm.createContext({lightbox,sheet,ask:null,pwa:{card:{hidden:true}},os:null,
    $:() => galleryOpen ? gallery : null,
    closeLightbox() {lightbox.hidden = true; closed.push('picture');},
    closeSheet() {if (sheet.hidden) return false; sheet.hidden = true; closed.push('details'); return true;},
  });
  vm.runInContext(source.slice(source.indexOf('function back()'),source.indexOf('// ---- fullscreen:')),context);
  vm.runInContext(source.slice(source.indexOf('function openModal()'),source.indexOf('function walk(')),context);
  assert.equal(context.openModal(),gallery);
  context.back();
  assert.deepEqual(closed,['picture']);
  assert.equal(context.openModal(),gallery);
  context.back();
  assert.equal(context.openModal(),sheet);
  context.back();
  assert.deepEqual(closed,['picture','gallery','details']);
});
