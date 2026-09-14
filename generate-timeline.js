/**
 * Generate monthly snapshots of student vectors over a school year (Sep-Jun).
 * Reads district.json (baseline = end-of-year) and creates 10 monthly frames.
 *
 * Key design: 15 "featured" students have dramatic, smooth arcs that
 * clearly demonstrate trends across specific dimensions. These are the
 * stars of the Journey tab demo.
 *
 * Output: data/timeline.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const district = JSON.parse(readFileSync(join(__dirname, 'data', 'district.json'), 'utf-8'));

function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function randNorm(mean, std) {
  const u1 = Math.random(), u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const DIM_KEYS = district.stats.dimensions.map(d => d.key);

// ─── Easing functions for smooth curves ──────────────────────────
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeIn(t) { return t * t; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }

// ─── Featured student archetypes ─────────────────────────────────
// Each defines dimension-level start->end overrides with easing.
// These create unmistakable visual trends in the Journey tab.
const FEATURED_ARCHETYPES = [
  // === ELL BREAKTHROUGH: English proficiency rockets up, pulling test scores and peers with it ===
  {
    tag: 'ell-breakthrough', label: 'ELL Breakthrough',
    find: s => s.raw.ellLevel === 'Newcomer',
    arcs: {
      ellStatus:     { start: 0.05, end: 0.55, ease: easeOut },    // dramatic English gain
      testScore:     { start: null, end: null, delta: 0.18, ease: easeOut },
      peerConnected: { start: null, end: null, delta: 0.20, ease: easeOut },
      selScore:      { start: null, end: null, delta: 0.12, ease: easeOut },
      attendance:    { start: null, end: null, delta: 0.06, ease: easeOut },
    }
  },
  {
    tag: 'ell-steady', label: 'ELL Steady Growth',
    find: s => s.raw.ellLevel === 'Developing',
    arcs: {
      ellStatus:     { start: null, end: null, delta: 0.15, ease: easeOut },
      testScore:     { start: null, end: null, delta: 0.10, ease: easeOut },
      peerConnected: { start: null, end: null, delta: 0.15, ease: easeInOut },
      gpa:           { start: null, end: null, delta: 0.08, ease: easeOut },
    }
  },

  // === RESILIENT CLIMBER: Low SES kid steadily rises across all academics ===
  {
    tag: 'resilient-climber', label: 'Resilient Climber',
    find: s => s.outcome === 'resilient',
    arcs: {
      gpa:              { start: null, end: null, delta: 0.18, ease: easeInOut },
      testScore:        { start: null, end: null, delta: 0.15, ease: easeInOut },
      assignCompletion: { start: null, end: null, delta: 0.12, ease: easeOut },
      selScore:         { start: null, end: null, delta: 0.15, ease: easeInOut },
      peerConnected:    { start: null, end: null, delta: 0.18, ease: easeOut },
      extracurricular:  { start: null, end: null, delta: 0.12, ease: easeOut },
    }
  },
  {
    tag: 'resilient-quiet', label: 'Quiet Resilience',
    find: s => s.outcome === 'resilient',
    arcs: {
      gpa:              { start: null, end: null, delta: 0.12, ease: easeInOut },
      attendance:       { start: 0.88, end: 0.97, ease: easeOut },
      assignCompletion: { start: null, end: null, delta: 0.15, ease: easeInOut },
      trajectory:       { start: 0.40, end: 0.72, ease: easeInOut },
    }
  },

  // === HIDDEN RISK: Looks fine, then SEL/peers/behavior crumble ===
  {
    tag: 'hidden-collapse', label: 'Hidden Risk — Social Collapse',
    find: s => s.outcome === 'hidden-risk',
    arcs: {
      selScore:       { start: null, end: null, delta: -0.22, ease: easeIn },
      peerConnected:  { start: null, end: null, delta: -0.25, ease: easeIn },
      counselorVisits:{ start: null, end: null, delta: -0.18, ease: easeIn },
      gpa:            { start: null, end: null, delta: -0.03, delayUntil: 0.5, ease: easeIn }, // academics hold, then drop
      discipline:     { start: null, end: null, delta: -0.15, delayUntil: 0.3, ease: easeIn },
    }
  },
  {
    tag: 'hidden-academic', label: 'Hidden Risk — Late Academic Drop',
    find: s => s.outcome === 'hidden-risk',
    arcs: {
      gpa:              { start: null, end: null, delta: -0.18, delayUntil: 0.4, ease: easeIn },
      testScore:        { start: null, end: null, delta: -0.12, delayUntil: 0.5, ease: easeIn },
      assignCompletion: { start: null, end: null, delta: -0.25, delayUntil: 0.3, ease: easeIn },
      trajectory:       { start: null, end: null, delta: -0.20, ease: easeIn },
      selScore:         { start: null, end: null, delta: -0.10, ease: easeIn },
    }
  },

  // === INTERVENTION V-SHAPE: Decline then dramatic recovery ===
  {
    tag: 'intervention-turnaround', label: 'Intervention Turnaround',
    find: s => s.outcome === 'intervention-success',
    arcs: {
      gpa:              { vShape: true, dip: -0.15, recovery: 0.20, pivot: 3 },
      attendance:       { vShape: true, dip: -0.10, recovery: 0.12, pivot: 3 },
      assignCompletion: { vShape: true, dip: -0.20, recovery: 0.25, pivot: 3 },
      selScore:         { vShape: true, dip: -0.12, recovery: 0.18, pivot: 4 },
      discipline:       { vShape: true, dip: -0.15, recovery: 0.18, pivot: 3 },
    }
  },

  // === HIGH-RISK DECLINE: Steady downward across multiple dimensions ===
  {
    tag: 'risk-decline', label: 'At-Risk Decline',
    find: s => s.outcome === 'high-risk',
    arcs: {
      gpa:              { start: null, end: null, delta: -0.20, ease: easeIn },
      attendance:       { start: null, end: null, delta: -0.18, ease: easeIn },
      assignCompletion: { start: null, end: null, delta: -0.25, ease: easeIn },
      discipline:       { start: null, end: null, delta: -0.20, ease: easeIn },
      selScore:         { start: null, end: null, delta: -0.15, ease: easeIn },
      peerConnected:    { start: null, end: null, delta: -0.12, ease: easeIn },
    }
  },

  // === ATTENDANCE RECOVERY: Chronic absence student gets better ===
  {
    tag: 'attendance-recovery', label: 'Attendance Recovery',
    find: s => s.flags.chronicAbsent && s.outcome === 'on-track',
    arcs: {
      attendance:       { start: 0.72, end: 0.94, ease: easeOut },
      gpa:              { start: null, end: null, delta: 0.10, ease: easeOut },
      assignCompletion: { start: null, end: null, delta: 0.12, ease: easeOut },
      peerConnected:    { start: null, end: null, delta: 0.10, ease: easeOut },
    }
  },

  // === DISCIPLINE TURNAROUND: Behavioral issues resolve over the year ===
  {
    tag: 'discipline-turnaround', label: 'Discipline Turnaround',
    find: s => s.flags.highDiscipline,
    arcs: {
      discipline:       { start: null, end: null, delta: 0.25, ease: easeInOut },
      selScore:         { start: null, end: null, delta: 0.18, ease: easeOut },
      peerConnected:    { start: null, end: null, delta: 0.12, ease: easeOut },
      gpa:              { start: null, end: null, delta: 0.06, delayUntil: 0.3, ease: easeOut },
    }
  },

  // === HOME DISRUPTION: Stable kid hits a wall mid-year ===
  {
    tag: 'home-disruption', label: 'Home Disruption (Mid-Year)',
    find: s => s.outcome === 'watch' && s.dims.homeStability > 0.5,
    arcs: {
      homeStability:    { cliff: true, cliffMonth: 4, drop: -0.30 },
      attendance:       { cliff: true, cliffMonth: 4, drop: -0.12 },
      selScore:         { cliff: true, cliffMonth: 4, drop: -0.15 },
      peerConnected:    { cliff: true, cliffMonth: 5, drop: -0.10 },
      gpa:              { cliff: true, cliffMonth: 5, drop: -0.08 },
      assignCompletion: { cliff: true, cliffMonth: 5, drop: -0.10 },
    }
  },

  // === SOCIAL BLOOM: Isolated kid finds their people ===
  {
    tag: 'social-bloom', label: 'Social Bloom',
    find: s => s.dims.peerConnected < 0.3 && s.outcome !== 'high-risk',
    arcs: {
      peerConnected:   { start: 0.12, end: 0.58, ease: easeOut },
      extracurricular: { start: null, end: null, delta: 0.20, ease: easeOut },
      selScore:        { start: null, end: null, delta: 0.15, ease: easeOut },
      attendance:      { start: null, end: null, delta: 0.05, ease: easeOut },
    }
  },

  // === ACADEMIC AWAKENING: Coasting kid suddenly engages ===
  {
    tag: 'academic-awakening', label: 'Academic Awakening',
    find: s => s.dims.gpa > 0.4 && s.dims.gpa < 0.6 && s.dims.courseRigor < 0.3,
    arcs: {
      gpa:              { start: null, end: null, delta: 0.15, delayUntil: 0.3, ease: easeOut },
      courseRigor:      { start: null, end: null, delta: 0.15, delayUntil: 0.2, ease: easeOut },
      assignCompletion: { start: null, end: null, delta: 0.18, ease: easeInOut },
      testScore:        { start: null, end: null, delta: 0.12, delayUntil: 0.4, ease: easeOut },
    }
  },

  // === SENIOR SLIDE: 12th grader checks out ===
  {
    tag: 'senior-slide', label: 'Senior Slide',
    find: s => s.grade === 12 && s.dims.gpa > 0.6,
    arcs: {
      gpa:              { start: null, end: null, delta: -0.12, delayUntil: 0.5, ease: easeIn },
      assignCompletion: { start: null, end: null, delta: -0.20, delayUntil: 0.4, ease: easeIn },
      attendance:       { start: null, end: null, delta: -0.08, delayUntil: 0.6, ease: easeIn },
      extracurricular:  { start: null, end: null, delta: -0.10, delayUntil: 0.5, ease: easeIn },
    }
  },

  // === SPED SUCCESS: Special ed services working ===
  {
    tag: 'sped-success', label: 'SpEd Services Working',
    find: s => s.raw.specialEd !== 'None',
    arcs: {
      testScore:        { start: null, end: null, delta: 0.14, ease: easeOut },
      assignCompletion: { start: null, end: null, delta: 0.16, ease: easeOut },
      selScore:         { start: null, end: null, delta: 0.12, ease: easeInOut },
      gpa:              { start: null, end: null, delta: 0.10, ease: easeOut },
    }
  },
];

// ─── Apply arc to a single dimension ─────────────────────────────
function applyArc(arc, endVal, mi) {
  const t = mi / 9; // 0=Sep, 1=Jun

  // V-shape arc (intervention)
  if (arc.vShape) {
    const pivot = arc.pivot / 9;
    if (t <= pivot) {
      const localT = t / pivot;
      return endVal - arc.recovery + arc.dip * easeIn(localT);
    } else {
      const localT = (t - pivot) / (1 - pivot);
      const bottom = endVal - arc.recovery + arc.dip;
      return bottom + (endVal - bottom) * easeOut(localT);
    }
  }

  // Cliff arc (sudden drop)
  if (arc.cliff) {
    if (mi < arc.cliffMonth) return endVal - arc.drop; // stable before
    // Sharp drop over 1 month, then stays
    if (mi === arc.cliffMonth) return endVal - arc.drop * 0.4;
    return endVal;
  }

  // Standard eased arc (start -> end with optional delay)
  let startVal, targetVal;
  if (arc.start !== null && arc.start !== undefined) {
    startVal = arc.start;
    targetVal = arc.end;
  } else {
    // delta-based: compute start from end - delta
    startVal = endVal - arc.delta;
    targetVal = endVal;
  }

  const delay = arc.delayUntil || 0;
  if (t < delay) return startVal; // flat until delay point
  const localT = (t - delay) / (1 - delay);
  const eased = arc.ease ? arc.ease(localT) : localT;
  return startVal + (targetVal - startVal) * eased;
}


// ─── Generate timeline ──────────────────────────────────────────
function generateTimeline(students) {
  const timeline = [];
  for (let mi = 0; mi < 10; mi++) timeline.push([]);

  // Assign featured archetypes
  const featured = new Map(); // studentId -> { tag, label, arcs }
  const usedIds = new Set();

  for (const arch of FEATURED_ARCHETYPES) {
    const candidates = students.filter(s => !usedIds.has(s.id) && arch.find(s));
    if (candidates.length === 0) {
      console.warn(`  No candidate for archetype: ${arch.tag}`);
      continue;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(pick.id);
    featured.set(pick.id, { tag: arch.tag, label: arch.label, arcs: arch.arcs });
    console.log(`  Featured: ${pick.firstName} ${pick.lastName} (${pick.id}) -> ${arch.tag}`);
  }

  for (const student of students) {
    const endDims = { ...student.dims };
    const feat = featured.get(student.id);

    for (let mi = 0; mi < 10; mi++) {
      const t = mi / 9;
      const dims = {};

      for (const key of DIM_KEYS) {
        if (feat && feat.arcs[key]) {
          // Featured student: use smooth arc
          dims[key] = clamp(+applyArc(feat.arcs[key], endDims[key], mi).toFixed(3));
        } else if (feat) {
          // Featured student, non-arc dimension: very gentle drift, no noise
          const drift = (endDims[key] - endDims[key]) * t; // 0 drift
          dims[key] = clamp(+(endDims[key] + randNorm(0, 0.002)).toFixed(3));
        } else {
          // Regular student: small drift + minimal noise
          const outcome = student.outcome;
          let drift = 0;

          // Outcome-based small drifts
          if (outcome === 'on-track') {
            if (key === 'gpa') drift = randNorm(0.03, 0.01);
            else if (key === 'selScore') drift = randNorm(0.02, 0.01);
            else if (key === 'peerConnected') drift = randNorm(0.02, 0.01);
          } else if (outcome === 'watch') {
            if (key === 'gpa') drift = randNorm(-0.02, 0.02);
            else if (key === 'assignCompletion') drift = randNorm(-0.03, 0.01);
          } else if (outcome === 'high-risk') {
            if (key === 'gpa') drift = randNorm(-0.06, 0.02);
            else if (key === 'attendance') drift = randNorm(-0.05, 0.02);
            else if (key === 'assignCompletion') drift = randNorm(-0.08, 0.02);
          } else if (outcome === 'resilient') {
            if (key === 'gpa') drift = randNorm(0.08, 0.02);
            else if (key === 'testScore') drift = randNorm(0.05, 0.02);
            else if (key === 'peerConnected') drift = randNorm(0.04, 0.02);
          } else if (outcome === 'hidden-risk') {
            if (key === 'selScore') drift = randNorm(-0.05, 0.02);
            else if (key === 'peerConnected') drift = randNorm(-0.05, 0.02);
          }

          // ELL drift for non-featured
          if (student.raw.ellLevel !== 'None' && key === 'ellStatus') {
            drift = randNorm(0.06, 0.02);
          }

          const startVal = endDims[key] - drift;
          const progress = startVal + drift * t;
          dims[key] = clamp(+(progress + randNorm(0, 0.003)).toFixed(3));
        }
      }

      timeline[mi].push({ id: student.id, d: dims });
    }
  }

  return { timeline, featured: [...featured.entries()].map(([id, f]) => ({ id, tag: f.tag, label: f.label })) };
}

// ─── Main ───
const result = generateTimeline(district.students);
const timeline = result.timeline;

console.log('='.repeat(60));
console.log('STUDENT TIMELINE GENERATED');
console.log('='.repeat(60));
console.log(`Months: ${MONTHS.length} (${MONTHS.join(', ')})`);
console.log(`Students per frame: ${timeline[0].length}`);
console.log(`Featured students: ${result.featured.length}`);

// Show featured students' journeys
for (const f of result.featured) {
  const student = district.students.find(s => s.id === f.id);
  console.log(`\n${f.label}: ${student.firstName} ${student.lastName} (${f.id})`);
  // Find the most dramatic dimension
  const sepSnap = timeline[0].find(s => s.id === f.id).d;
  const junSnap = timeline[9].find(s => s.id === f.id).d;
  let bestDim = '', bestDelta = 0;
  for (const k of DIM_KEYS) {
    const delta = Math.abs(junSnap[k] - sepSnap[k]);
    if (delta > bestDelta) { bestDelta = delta; bestDim = k; }
  }
  console.log(`  Key dim: ${bestDim}`);
  for (let mi = 0; mi < 10; mi++) {
    const snap = timeline[mi].find(s => s.id === f.id);
    const v = snap.d[bestDim];
    const bar = '|'.repeat(Math.round(v * 50));
    console.log(`  ${MONTHS[mi]}: ${v.toFixed(3)} ${bar}`);
  }
}

const output = { months: MONTHS, frames: timeline, featured: result.featured };
const outPath = join(__dirname, 'data', 'timeline.json');
writeFileSync(outPath, JSON.stringify(output));
console.log(`\nSaved to: ${outPath}`);
console.log(`Size: ${(JSON.stringify(output).length / 1024).toFixed(0)} KB`);
