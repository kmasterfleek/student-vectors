/**
 * Generate realistic synthetic student data for a school district.
 *
 * Creates ~800 students across 4 schools (2 elementary, 1 middle, 1 high)
 * with realistic correlations between dimensions:
 *   - SES correlates with attendance, test scores, home stability
 *   - Attendance correlates with GPA and assignment completion
 *   - Discipline incidents inversely correlate with engagement
 *   - BUT: deliberate "outliers" — resilient kids who beat the odds
 *
 * Each student is a 15-dimensional vector + an outcome label.
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Random helpers ─────────────────────────────────────────────

function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Normal distribution via Box-Muller
function randNorm(mean, std) {
  const u1 = Math.random(), u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Schools ────────────────────────────────────────────────────

const SCHOOLS = [
  { name: 'Riverside Elementary', type: 'elementary', grades: [3, 4, 5], avgSES: 0.65, size: 180 },
  { name: 'Lincoln Elementary', type: 'elementary', grades: [3, 4, 5], avgSES: 0.35, size: 200 },
  { name: 'Jefferson Middle', type: 'middle', grades: [6, 7, 8], avgSES: 0.50, size: 220 },
  { name: 'Washington High', type: 'high', grades: [9, 10, 11, 12], avgSES: 0.48, size: 250 },
];

// ─── Name generator ─────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma','Liam','Olivia','Noah','Ava','Ethan','Sophia','Mason','Isabella','Aiden',
  'Mia','Lucas','Charlotte','Jackson','Amelia','Sebastian','Harper','Mateo','Evelyn','Jack',
  'Luna','Owen','Camila','Alexander','Gianna','Henry','Abigail','Jacob','Emily','Daniel',
  'Sofia','Michael','Avery','Benjamin','Ella','James','Scarlett','Leo','Grace','William',
  'Victoria','Elijah','Riley','Oliver','Aria','Jayden','Lily','Carter','Chloe','Dylan',
  'Layla','Gabriel','Penelope','Julian','Zoey','Isaiah','Nora','Muhammad','Hannah','David',
  'Aaliyah','Carlos','Maria','Diego','Valentina','Angel','Camilla','Jose','Gabriela','Luis',
  'Mei','Wei','Yuki','Priya','Ananya','Arjun','Ravi','Kai','Hana','Jada',
  'DeShawn','Malik','Aaliyah','Imani','Zion','Kira','Marcus','Jade','Xavier','Destiny',
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Chen','Wang','Kim','Park','Patel','Shah','Singh','Nakamura','Tanaka','Okafor',
];

// ─── Student Generation ─────────────────────────────────────────

function generateStudent(school, id) {
  const grade = pick(school.grades);
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);

  // Base SES (school average + individual variation)
  const ses = clamp(randNorm(school.avgSES, 0.18), 0, 1);

  // Resilience factor: ~8% of low-SES kids are "resilient" — high performers despite circumstances
  const isResilient = ses < 0.35 && Math.random() < 0.08;
  // Risk factor: ~5% of high-SES kids are "at-risk" despite advantages
  const isHiddenRisk = ses > 0.6 && Math.random() < 0.05;

  // ─── Academic dimensions ───

  // GPA (0-4.0): correlated with SES but not determined by it
  let gpa = clamp(randNorm(1.5 + ses * 1.8, 0.5), 0, 4.0);
  if (isResilient) gpa = clamp(randNorm(3.3, 0.3), 2.5, 4.0);
  if (isHiddenRisk) gpa = clamp(randNorm(1.8, 0.4), 0.5, 2.5);

  // Attendance (0-1): 0.7-1.0 range, correlated with SES and GPA
  let attendance = clamp(randNorm(0.85 + ses * 0.08 + gpa * 0.02, 0.06), 0.5, 1.0);
  if (isResilient) attendance = clamp(randNorm(0.95, 0.02), 0.9, 1.0);
  // Chronic absence: ~15% of students
  if (Math.random() < 0.15) attendance = clamp(randNorm(0.78, 0.08), 0.5, 0.89);

  // Test scores (percentile 0-100): correlated with GPA and SES
  let testScore = clamp(randNorm(gpa * 20 + ses * 15 + 5, 12), 1, 99);
  if (isResilient) testScore = clamp(randNorm(75, 10), 55, 99);

  // Course rigor (0-1): ratio of advanced courses. Higher in high school.
  let rigor = 0;
  if (school.type === 'high') {
    rigor = clamp(randNorm(gpa * 0.15 + ses * 0.1, 0.12), 0, 1);
    if (isResilient) rigor = clamp(randNorm(0.5, 0.15), 0.2, 1);
  } else if (school.type === 'middle') {
    rigor = clamp(randNorm(gpa * 0.08 + ses * 0.05, 0.08), 0, 0.5);
  }

  // Assignment completion (0-1): strongly correlated with GPA
  let assignCompletion = clamp(randNorm(0.4 + gpa * 0.14, 0.1), 0, 1);
  if (isResilient) assignCompletion = clamp(randNorm(0.92, 0.04), 0.8, 1);
  if (isHiddenRisk) assignCompletion = clamp(randNorm(0.55, 0.15), 0.2, 0.8);

  // ─── Behavioral dimensions ───

  // Discipline incidents (0-10, 0 = none = good): inverse correlation with GPA and attendance
  let discipline = Math.max(0, Math.round(randNorm(4 - gpa * 0.8 - attendance * 1.5, 1.2)));
  if (isResilient) discipline = randInt(0, 1);
  // Some kids have many: ~10%
  if (Math.random() < 0.10) discipline = randInt(3, 8);

  // Extracurricular (0-5): number of activities
  let extracurricular = Math.max(0, Math.round(randNorm(ses * 1.5 + gpa * 0.5, 1)));
  if (school.type === 'elementary') extracurricular = Math.min(extracurricular, 3);
  if (isResilient) extracurricular = randInt(1, 3);

  // SEL score (0-1): social-emotional learning assessment
  let sel = clamp(randNorm(0.5 + attendance * 0.15 + extracurricular * 0.05 - discipline * 0.04, 0.12), 0, 1);
  if (isResilient) sel = clamp(randNorm(0.75, 0.08), 0.55, 1);
  if (isHiddenRisk) sel = clamp(randNorm(0.35, 0.12), 0.1, 0.6);

  // ─── Wellness dimensions ───

  // Counselor visits (0-15): more visits can mean proactive support OR distress
  let counselorVisits = Math.max(0, Math.round(randNorm(2, 2)));
  if (discipline > 3 || attendance < 0.8) counselorVisits = randInt(3, 10);
  if (isHiddenRisk) counselorVisits = randInt(4, 12); // often flagged

  // Grade trajectory (-1 to 1): GPA trend. Negative = declining.
  let trajectory = clamp(randNorm(0, 0.25), -1, 1);
  if (isResilient) trajectory = clamp(randNorm(0.3, 0.15), 0, 1);
  if (isHiddenRisk) trajectory = clamp(randNorm(-0.4, 0.2), -1, 0);
  // Seniors often slight decline
  if (grade === 12) trajectory -= 0.1;

  // ─── Environmental dimensions ───

  // Home stability (0-1): 1 = stable, 0 = many moves. Correlated with SES.
  let homeStability = clamp(randNorm(0.5 + ses * 0.35, 0.15), 0, 1);
  if (isHiddenRisk) homeStability = clamp(randNorm(0.4, 0.2), 0, 0.8); // divorce, etc.

  // ELL status (0-1): 0 = native speaker, 0.5 = developing, 1 = newcomer
  let ell = 0;
  if (Math.random() < 0.18) { // ~18% ELL
    ell = clamp(randNorm(0.5, 0.25), 0.1, 1);
  }

  // Special ed (0-1): 0 = no services, 0.5 = 504 plan, 1 = full IEP
  let sped = 0;
  if (Math.random() < 0.14) { // ~14% with services
    sped = Math.random() < 0.5 ? clamp(randNorm(0.4, 0.1), 0.2, 0.6) : clamp(randNorm(0.8, 0.1), 0.6, 1);
  }

  // Peer connectedness (0-1): social integration
  let peerConnect = clamp(randNorm(0.5 + extracurricular * 0.08 + sel * 0.2, 0.15), 0, 1);
  if (ell > 0.5) peerConnect *= 0.7; // ELL newcomers often less connected
  if (isHiddenRisk) peerConnect = clamp(randNorm(0.3, 0.15), 0, 0.6);

  // ─── Outcome (what happened at end of year) ───

  // Risk score (computed, not a dimension — this is what we're trying to predict/understand)
  const riskFactors = (
    (1 - attendance) * 3 +
    (4 - gpa) / 4 * 2 +
    discipline * 0.3 +
    (1 - assignCompletion) * 2 +
    (trajectory < -0.2 ? 1 : 0) +
    (1 - homeStability) * 0.5 +
    (counselorVisits > 5 ? 0.5 : 0)
  );

  let outcome;
  if (riskFactors > 5) outcome = 'high-risk';
  else if (riskFactors > 3) outcome = 'watch';
  else if (isResilient) outcome = 'resilient';
  else outcome = 'on-track';

  // Override: some high-risk kids get intervention and turn around
  if (outcome === 'high-risk' && Math.random() < 0.15) outcome = 'intervention-success';

  // Tag hidden risks
  if (isHiddenRisk) outcome = 'hidden-risk';

  return {
    id: `STU-${id.toString().padStart(4, '0')}`,
    firstName,
    lastName,
    grade,
    school: school.name,
    schoolType: school.type,
    // 15 dimensions (all normalized 0-1 for vector operations)
    dims: {
      gpa: +(gpa / 4).toFixed(3),                          // 0-1 (from 0-4.0)
      attendance: +attendance.toFixed(3),                    // 0-1
      testScore: +(testScore / 100).toFixed(3),             // 0-1 (from percentile)
      courseRigor: +rigor.toFixed(3),                        // 0-1
      assignCompletion: +assignCompletion.toFixed(3),        // 0-1
      discipline: +(1 - Math.min(discipline, 10) / 10).toFixed(3), // 0-1 (inverted: 1=no incidents)
      extracurricular: +(Math.min(extracurricular, 5) / 5).toFixed(3), // 0-1
      selScore: +sel.toFixed(3),                             // 0-1
      counselorVisits: +(1 - Math.min(counselorVisits, 15) / 15).toFixed(3), // 0-1 (inverted: 1=few visits)
      trajectory: +((trajectory + 1) / 2).toFixed(3),       // 0-1 (from -1..1)
      socioeconomic: +ses.toFixed(3),                        // 0-1
      homeStability: +homeStability.toFixed(3),              // 0-1
      ellStatus: +(1 - ell).toFixed(3),                      // 0-1 (inverted: 1=native speaker)
      specialEd: +(1 - sped).toFixed(3),                     // 0-1 (inverted: 1=no services)
      peerConnected: +peerConnect.toFixed(3),                // 0-1
    },
    // Raw values for display
    raw: {
      gpa: +gpa.toFixed(2),
      attendancePct: +(attendance * 100).toFixed(1),
      testPercentile: Math.round(testScore),
      courseRigor: +rigor.toFixed(2),
      assignCompletionPct: +(assignCompletion * 100).toFixed(1),
      disciplineIncidents: discipline,
      extracurricularCount: extracurricular,
      selScore: +sel.toFixed(2),
      counselorVisits,
      trajectory: +trajectory.toFixed(2),
      ses: +ses.toFixed(2),
      homeStability: +homeStability.toFixed(2),
      ellLevel: ell > 0 ? (ell > 0.7 ? 'Newcomer' : ell > 0.3 ? 'Developing' : 'Progressing') : 'None',
      specialEd: sped > 0.6 ? 'IEP' : sped > 0.2 ? '504 Plan' : 'None',
      peerConnected: +peerConnect.toFixed(2),
    },
    outcome,
    flags: {
      resilient: isResilient,
      hiddenRisk: isHiddenRisk,
      chronicAbsent: attendance < 0.9,
      highDiscipline: discipline >= 3,
      decliningGrades: trajectory < -0.2,
    }
  };
}

// ─── Generate full district ─────────────────────────────────────

function generateDistrict() {
  const students = [];
  let id = 1;

  for (const school of SCHOOLS) {
    for (let i = 0; i < school.size; i++) {
      students.push(generateStudent(school, id++));
    }
  }

  // Compute district stats
  const allGPA = students.map(s => s.raw.gpa);
  const allAttendance = students.map(s => s.raw.attendancePct);
  const outcomes = {};
  for (const s of students) outcomes[s.outcome] = (outcomes[s.outcome] || 0) + 1;

  const stats = {
    totalStudents: students.length,
    schools: SCHOOLS.map(s => ({ name: s.name, type: s.type, size: s.size })),
    avgGPA: +(allGPA.reduce((a, b) => a + b, 0) / allGPA.length).toFixed(2),
    avgAttendance: +(allAttendance.reduce((a, b) => a + b, 0) / allAttendance.length).toFixed(1),
    outcomes,
    dimensions: [
      { key: 'gpa', label: 'GPA', domain: 'Academic', desc: 'Grade point average (normalized 0-4.0)' },
      { key: 'attendance', label: 'Attendance', domain: 'Academic', desc: 'Percentage of school days present' },
      { key: 'testScore', label: 'Test Scores', domain: 'Academic', desc: 'Standardized assessment percentile' },
      { key: 'courseRigor', label: 'Course Rigor', domain: 'Academic', desc: 'Proportion of advanced/honors courses' },
      { key: 'assignCompletion', label: 'Assignment Completion', domain: 'Academic', desc: 'Percentage of assignments submitted' },
      { key: 'discipline', label: 'Discipline', domain: 'Behavioral', desc: 'Behavioral record (1=clean, 0=many incidents)' },
      { key: 'extracurricular', label: 'Extracurricular', domain: 'Behavioral', desc: 'Number of activities (normalized)' },
      { key: 'selScore', label: 'SEL Score', domain: 'Behavioral', desc: 'Social-emotional learning assessment' },
      { key: 'counselorVisits', label: 'Counselor Visits', domain: 'Wellness', desc: 'Frequency of counselor contact (1=few, 0=many)' },
      { key: 'trajectory', label: 'Grade Trajectory', domain: 'Wellness', desc: 'GPA trend (1=improving, 0=declining)' },
      { key: 'socioeconomic', label: 'Socioeconomic', domain: 'Environment', desc: 'Economic advantage level' },
      { key: 'homeStability', label: 'Home Stability', domain: 'Environment', desc: 'Residential stability (fewer moves = higher)' },
      { key: 'ellStatus', label: 'English Proficiency', domain: 'Environment', desc: 'English language level (1=native, 0=newcomer)' },
      { key: 'specialEd', label: 'Special Services', domain: 'Environment', desc: 'Special education service level (1=none, 0=full IEP)' },
      { key: 'peerConnected', label: 'Peer Connections', domain: 'Environment', desc: 'Social integration and friendship network' },
    ]
  };

  return { stats, students };
}

// ─── Main ───────────────────────────────────────────────────────

const district = generateDistrict();

console.log('='.repeat(60));
console.log('SYNTHETIC DISTRICT DATA GENERATED');
console.log('='.repeat(60));
console.log(`Students: ${district.stats.totalStudents}`);
console.log(`Schools: ${district.stats.schools.map(s => s.name).join(', ')}`);
console.log(`Avg GPA: ${district.stats.avgGPA}`);
console.log(`Avg Attendance: ${district.stats.avgAttendance}%`);
console.log(`\nOutcomes:`);
for (const [k, v] of Object.entries(district.stats.outcomes)) {
  console.log(`  ${k.padEnd(24)} ${v} (${(v / district.stats.totalStudents * 100).toFixed(1)}%)`);
}

const outPath = join(__dirname, 'data', 'district.json');
writeFileSync(outPath, JSON.stringify(district, null, 2));
console.log(`\nSaved to: ${outPath}`);
console.log(`Size: ${(JSON.stringify(district).length / 1024).toFixed(0)} KB`);
