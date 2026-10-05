import { mkdir, copyFile, rm } from 'node:fs/promises';

const files = [
  'index.html',
  'agni-action-demo-fires.json',
  'data-credibility.js',
  'map-enhancements.js',
  'map-enhancements.css',
  'nasa-firms.js'
];
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of files) await copyFile(file, 'dist/' + file);
