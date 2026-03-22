/**
 * Headless scoring tests for Spades Tracker.
 *
 * Run: node test-scoring.js
 *
 * Extracts the pure scoring functions from index.html's IIFE
 * and exercises them without a DOM.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Extract scoring functions from index.html ──
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No <script> block found in index.html');

// The IIFE exposes scoring functions on window.__spades.
// We simulate that by providing a minimal window/document stub.
const stubDOM = `
  const _stubEl = () => ({
    textContent: '', innerText: '', innerHTML: '', value: '',
    checked: false, disabled: false,
    style: new Proxy({}, { get(){ return ''; }, set(){ return true; } }),
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset: {},
    addEventListener(){},
    removeEventListener(){},
    querySelectorAll(){ return []; },
    querySelector(){ return _stubEl(); },
    appendChild(){}, removeChild(){}, replaceChildren(){},
    closest(){ return null; },
    scrollTo(){}, scrollIntoView(){},
    focus(){}, blur(){},
    dispatchEvent(){ return true; },
    parentElement: null,
    children: [],
    offsetHeight: 0, offsetWidth: 0,
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; },
  });
  const document = {
    getElementById: () => _stubEl(),
    querySelectorAll() { const a = []; a.forEach = ()=>{}; return a; },
    querySelector() { return _stubEl(); },
    createElement() { return _stubEl(); },
    createTextNode() { return _stubEl(); },
    body: _stubEl(),
    documentElement: _stubEl(),
  };
  const localStorage = { getItem(){ return null; }, setItem(){} };
  const navigator = { serviceWorker: null };
  const window = { addEventListener(){}, removeEventListener(){} };
  const matchMedia = () => ({ matches: false, addEventListener(){} });
  const setTimeout = (fn) => { /* skip */ };
  const setInterval = () => 0;
  const clearTimeout = () => {};
  const clearInterval = () => {};
  const requestAnimationFrame = () => 0;
  const location = { origin: 'http://localhost' };
`;

// Execute in a Function scope to extract __spades
const fn = new Function(stubDOM + scriptMatch[1] + '\n; return window.__spades;');
let spades;
try {
  spades = fn();
} catch (e) {
  console.error('Failed to load scoring functions:', e.message);
  process.exit(1);
}

const { scoreTeam, scoreContract, applyBagPenalty, computeTotals } = spades;

// ── Test harness ──
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.error(`  FAIL: ${msg}`);
  }
}

function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, ok ? msg : `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ═══════════════════════════════════════════════
//  scoreContract
// ═══════════════════════════════════════════════
section('scoreContract — make');

eq(scoreContract(4, 4), { delta: 40, bagsGained: 0, note: '' },
  'Exact bid: 4 bid, 4 tricks → +40, 0 bags');

eq(scoreContract(3, 5), { delta: 30, bagsGained: 2, note: '' },
  'Overtrick: 3 bid, 5 tricks → +30, 2 bags');

eq(scoreContract(1, 1), { delta: 10, bagsGained: 0, note: '' },
  'Minimum bid: 1 bid, 1 trick → +10');

eq(scoreContract(13, 13), { delta: 130, bagsGained: 0, note: '' },
  'Max bid: 13 bid, 13 tricks → +130');

eq(scoreContract(1, 13), { delta: 10, bagsGained: 12, note: '' },
  'Max overtrick: 1 bid, 13 tricks → +10, 12 bags');

section('scoreContract — set');

eq(scoreContract(4, 3), { delta: -40, bagsGained: 0, note: 'set' },
  'Set by 1: 4 bid, 3 tricks → -40');

eq(scoreContract(5, 0), { delta: -50, bagsGained: 0, note: 'set' },
  'Set with 0 tricks: 5 bid, 0 tricks → -50');

eq(scoreContract(13, 12), { delta: -130, bagsGained: 0, note: 'set' },
  'Missed 13: 13 bid, 12 tricks → -130');

// ═══════════════════════════════════════════════
//  applyBagPenalty
// ═══════════════════════════════════════════════
section('applyBagPenalty');

eq(applyBagPenalty(0, 0), { bagsAfter: 0, penalty: 0 },
  'No bags → no penalty');

eq(applyBagPenalty(5, 3), { bagsAfter: 8, penalty: 0 },
  '5 + 3 = 8 bags → no penalty');

eq(applyBagPenalty(8, 2), { bagsAfter: 0, penalty: 100 },
  '8 + 2 = 10 bags → -100 penalty, reset to 0');

eq(applyBagPenalty(9, 1), { bagsAfter: 0, penalty: 100 },
  '9 + 1 = 10 bags → -100 penalty, reset to 0');

eq(applyBagPenalty(7, 5), { bagsAfter: 2, penalty: 100 },
  '7 + 5 = 12 bags → -100 penalty, 2 remain');

eq(applyBagPenalty(9, 3), { bagsAfter: 2, penalty: 100 },
  '9 + 3 = 12 bags → -100 penalty, 2 remain');

eq(applyBagPenalty(5, 15), { bagsAfter: 0, penalty: 200 },
  '5 + 15 = 20 bags → -200 penalty (double rollover)');

eq(applyBagPenalty(8, 13), { bagsAfter: 1, penalty: 200 },
  '8 + 13 = 21 bags → -200 penalty, 1 remains');

eq(applyBagPenalty(0, 10), { bagsAfter: 0, penalty: 100 },
  '0 + 10 = exactly 10 → -100 penalty');

// ═══════════════════════════════════════════════
//  scoreTeam — legacy path (nil === undefined)
// ═══════════════════════════════════════════════
section('scoreTeam — legacy nil (nil === undefined)');

eq(scoreTeam(0, 0, false, undefined, 0),
  { delta: 100, bagsGained: 0, note: 'Nil ✓' },
  'Legacy nil made: bid 0, 0 tricks → +100');

eq(scoreTeam(0, 3, false, undefined, 0),
  { delta: -100, bagsGained: 3, note: 'Nil ✗' },
  'Legacy nil broken: bid 0, 3 tricks → -100, 3 bags');

eq(scoreTeam(0, 0, true, undefined, 0),
  { delta: 200, bagsGained: 0, note: 'BN ✓' },
  'Legacy blind nil made → +200');

eq(scoreTeam(0, 2, true, undefined, 0),
  { delta: -200, bagsGained: 2, note: 'BN ✗' },
  'Legacy blind nil broken → -200, 2 bags');

eq(scoreTeam(4, 5, false, undefined, 0),
  { delta: 40, bagsGained: 1, note: '' },
  'Legacy normal contract: 4 bid, 5 tricks → +40');

eq(scoreTeam(4, 3, false, undefined, 0),
  { delta: -40, bagsGained: 0, note: 'set' },
  'Legacy set: 4 bid, 3 tricks → -40');

// ═══════════════════════════════════════════════
//  scoreTeam — no nil (nil=false)
// ═══════════════════════════════════════════════
section('scoreTeam — standard contract (nil=false)');

eq(scoreTeam(4, 4, false, false, 0),
  { delta: 40, bagsGained: 0, note: '' },
  'Standard exact: 4 bid, 4 tricks → +40');

eq(scoreTeam(3, 6, false, false, 0),
  { delta: 30, bagsGained: 3, note: '' },
  'Standard overtrick: 3 bid, 6 tricks → +30');

eq(scoreTeam(5, 2, false, false, 0),
  { delta: -50, bagsGained: 0, note: 'set' },
  'Standard set: 5 bid, 2 tricks → -50');

// ═══════════════════════════════════════════════
//  scoreTeam — partner nil (nil=true, bid > 0)
// ═══════════════════════════════════════════════
section('scoreTeam — partner nil');

// Partner nil made + partner makes contract
eq(scoreTeam(4, 4, false, true, 0).delta, 140,
  'Partner nil made (4 bid, 4 tricks, nilTook=0) → +100 nil + 40 contract = 140');

eq(scoreTeam(4, 4, false, true, 0).bagsGained, 0,
  'Partner nil made, exact — 0 bags');

// Partner nil broken
eq(scoreTeam(4, 5, false, true, 2).delta, -60,
  'Partner nil broken (4 bid, 5 tricks, nilTook=2) → -100 nil + 40 contract = -60');

// Blind partner nil made
eq(scoreTeam(3, 3, true, true, 0).delta, 230,
  'Blind partner nil made (3 bid, 3 tricks) → +200 nil + 30 contract = 230');

// Blind partner nil broken
eq(scoreTeam(3, 5, true, true, 1).delta, -170,
  'Blind partner nil broken (3 bid, 5 tricks, nilTook=1) → -200 nil + 30 = -170');

// Partner nil made but partner set
eq(scoreTeam(5, 3, false, true, 0).delta, 50,
  'Partner nil made + partner set (5 bid, 3 tricks) → +100 nil + -50 = 50');

// Partner nil broken and partner set
eq(scoreTeam(5, 3, false, true, 2).delta, -150,
  'Partner nil broken + set (5 bid, 3 tricks, nilTook=2) → -100 + -50 = -150');

// ═══════════════════════════════════════════════
//  scoreTeam — double nil (nil=true, bid=0)
// ═══════════════════════════════════════════════
section('scoreTeam — double nil');

eq(scoreTeam(0, 0, false, true, 0),
  { delta: 200, bagsGained: 0, note: 'Dbl Nil ✓' },
  'Double nil made → +200');

eq(scoreTeam(0, 3, false, true, 0),
  { delta: -200, bagsGained: 3, note: 'Dbl Nil ✗' },
  'Double nil broken (3 tricks) → -200, 3 bags');

eq(scoreTeam(0, 0, true, true, 0),
  { delta: 400, bagsGained: 0, note: 'Dbl BN ✓' },
  'Double blind nil made → +400');

eq(scoreTeam(0, 5, true, true, 0),
  { delta: -400, bagsGained: 5, note: 'Dbl BN ✗' },
  'Double blind nil broken (5 tricks) → -400, 5 bags');

eq(scoreTeam(0, 1, false, true, 0),
  { delta: -200, bagsGained: 1, note: 'Dbl Nil ✗' },
  'Double nil broken by 1 trick → -200, 1 bag');

// ═══════════════════════════════════════════════
//  computeTotals — multi-round scenarios
// ═══════════════════════════════════════════════
section('computeTotals — integration');

// We need to set the state for computeTotals
const stateObj = spades.state();

// Reset state
stateObj.rounds = [];

// Round 1: Team A bids 4, gets 5. Team B bids 3, gets 3.
stateObj.rounds.push({
  bidA: 4, tricksA: 5, nilA: false, blindA: false, nilTookA: 0,
  bidB: 3, tricksB: 3, nilB: false, blindB: false, nilTookB: 0,
});
let t = computeTotals();
eq(t.scoreA, 40, 'R1: Team A → 40 (4 bid, 5 tricks)');
eq(t.scoreB, 30, 'R1: Team B → 30 (3 bid, 3 tricks)');
eq(t.bagsA, 1, 'R1: Team A bags → 1');
eq(t.bagsB, 0, 'R1: Team B bags → 0');

// Round 2: Team A bids 3, gets 6 (3 more bags, total 4). Team B bids 5, gets 3 (set).
stateObj.rounds.push({
  bidA: 3, tricksA: 6, nilA: false, blindA: false, nilTookA: 0,
  bidB: 5, tricksB: 3, nilB: false, blindB: false, nilTookB: 0,
});
t = computeTotals();
eq(t.scoreA, 70, 'R2: Team A → 40 + 30 = 70');
eq(t.scoreB, -20, 'R2: Team B → 30 + -50 = -20');
eq(t.bagsA, 4, 'R2: Team A bags → 1 + 3 = 4');
eq(t.bagsB, 0, 'R2: Team B bags → 0');

// Round 3: Team A bids 2, gets 8 (6 bags → total 10, penalty!). Team B bids 4, gets 4.
stateObj.rounds.push({
  bidA: 2, tricksA: 8, nilA: false, blindA: false, nilTookA: 0,
  bidB: 4, tricksB: 4, nilB: false, blindB: false, nilTookB: 0,
});
t = computeTotals();
eq(t.scoreA, 70 + 20 - 100, 'R3: Team A → 70 + 20 - 100(bag penalty) = -10');
eq(t.bagsA, 0, 'R3: Team A bags reset to 0 after penalty');
eq(t.scoreB, 20, 'R3: Team B → -20 + 40 = 20');

// Round 4: nil round — Team A partner nil
stateObj.rounds.push({
  bidA: 3, tricksA: 4, nilA: true, blindA: false, nilTookA: 0,
  bidB: 4, tricksB: 4, nilB: false, blindB: false, nilTookB: 0,
});
t = computeTotals();
eq(t.scoreA, -10 + 130, 'R4: Team A → -10 + 100(nil) + 30(contract) = 120');
eq(t.scoreB, 60, 'R4: Team B → 20 + 40 = 60');

// ═══════════════════════════════════════════════
//  Edge cases
// ═══════════════════════════════════════════════
section('Edge cases');

eq(scoreContract(0, 0), { delta: 0, bagsGained: 0, note: '' },
  'Zero bid, zero tricks (degenerate) → 0');

eq(scoreContract(0, 5), { delta: 0, bagsGained: 5, note: '' },
  'Zero bid, 5 tricks → +0, 5 bags (all overtricks)');

eq(applyBagPenalty(0, 0), { bagsAfter: 0, penalty: 0 },
  'Zero bags, zero gained → no penalty');

// Partner nil with overtricks
const pnOver = scoreTeam(3, 7, false, true, 0);
eq(pnOver.bagsGained, 4, 'Partner nil made, 3 bid 7 tricks → 4 bags from contract overtricks');

// Partner nil broken, tricks split
const pnBroken = scoreTeam(4, 6, false, true, 2);
assert(pnBroken.delta === -100 + 40, 'Partner nil broken (nilTook=2) + contract 4 bid 6 tricks: -100 + 40 = -60');
eq(pnBroken.bagsGained, 2, 'Partner nil broken, 4 bid 6 tricks → 2 bags from contract');

// ═══════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════
console.log(`\n${'═'.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  • ${f}`));
  process.exit(1);
} else {
  console.log('All tests passed ✓');
}
