/**
 * Browser polyfills for Node-flavored dependencies (e.g. gray-matter).
 * Must be imported before any module that touches `Buffer`.
 */

import { Buffer } from 'buffer';

const g = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
};

g.Buffer = g.Buffer ?? Buffer;
// Some Node libs reference `global` instead of `globalThis`.
g.global = g.global ?? globalThis;
