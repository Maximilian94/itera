/**
 * Gera `api/src/geo/municipios.json` (centroides dos ~5.570 municípios, base
 * pública IBGE via kelvins/municipios-brasileiros) — insumo da estimativa de
 * tempo de viagem do matching de concursos (city-distance.ts).
 *
 * Rodar uma vez (ou para atualizar a base):
 *   node api/scripts/build-municipios.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW =
  'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv';

const norm = (s) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

async function csv(name) {
  const res = await fetch(`${RAW}/${name}`);
  if (!res.ok) throw new Error(`Falha ao baixar ${name}: ${res.status}`);
  const text = (await res.text()).replace(/^﻿/, '').trim();
  const [, ...rows] = text.split('\n');
  return rows.map((l) => l.split(','));
}

const estados = await csv('estados.csv');
const ufByCode = Object.fromEntries(estados.map((r) => [r[0], r[1]]));

const municipios = await csv('municipios.csv');
const out = municipios.map((r) => ({
  u: ufByCode[r[5]],
  n: norm(r[1]),
  lat: Number(r[2]),
  lng: Number(r[3]),
}));

const dir = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(dir, '..', 'src', 'geo', 'municipios.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out));
console.log(`${out.length} municípios → ${target}`);
