import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import manifest from '../src/carPack.json' with { type: 'json' };
import gallery from '../src/packGallery.json' with { type: 'json' };
import { crew } from '../src/projects.js';

test('released car archive, catalogue and studio gallery describe the same inventory', () => {
  const pack = crew.assets.packs.find(p => p.id === 'cars');
  assert.equal(manifest.models.length, 46);
  assert.equal(manifest.modelCount, manifest.models.length);
  assert.equal(manifest.fileCount, manifest.models.length + 3);
  assert.equal(pack.big, String(manifest.modelCount));
  assert.equal(pack.download.files, manifest.fileCount);
  assert.equal(pack.download.href.split('/').at(-1), manifest.archive);
  assert.match(manifest.archive, /^cars-all-\d{4}-\d{2}-\d{2}(?:-materials-r2)?\.zip$/);
  assert.deepEqual(gallery.cars.map(x => x.name).sort(), manifest.models.map(x => x.file).sort());
  assert.equal(new Set(manifest.models.map(x => x.id)).size, manifest.models.length);
  assert.equal(new Set(manifest.models.map(x => x.file)).size, manifest.models.length);
  assert.ok(gallery.cars.some(x => x.thumb === pack.cover.src));
  for (const item of gallery.cars) {
    assert.ok(existsSync(new URL(`../public${item.thumb}`, import.meta.url)), item.thumb);
    assert.deepEqual([item.w, item.h], [1000, 750]);
    const thumbnail = readFileSync(new URL(`../public${item.thumb}`, import.meta.url));
    assert.equal(thumbnail.toString('ascii', 0, 4), 'RIFF');
    assert.equal(thumbnail.toString('ascii', 8, 12), 'WEBP');
    const frame = thumbnail.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
    assert.ok(frame > 0, item.thumb);
    assert.deepEqual([thumbnail.readUInt16LE(frame + 3) & 0x3fff, thumbnail.readUInt16LE(frame + 5) & 0x3fff], [item.w, item.h]);
  }
});

test('standalone car files retain source credits and exclude unapproved or non-road models', () => {
  for (const id of ['accord93', 'x3e83', 'crv99', 'crv99ex', 'is300', 'saltlift', 'broadacre', 'sn95', ...manifest.withheld]) {
    assert.ok(!manifest.models.some(x => x.id === id), id);
  }
  for (const car of manifest.models) {
    assert.match(car.file, /^[a-z0-9-]+\.glb$/);
    assert.ok(car.bytes > 0);
    assert.match(car.sha256, /^[a-f0-9]{64}$/);
    assert.match(car.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(car.credits.length > 0, car.id);
    for (const source of car.credits) {
      assert.ok(source.title && source.author && source.licence, car.id);
      assert.match(source.sourceUrl, /^https:\/\//);
      assert.match(source.licenceUrl, /^https:\/\//);
      assert.doesNotMatch(source.licence, /VPL|CC0|BY-NC-ND/);
    }
  }
});
