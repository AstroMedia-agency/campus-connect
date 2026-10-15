// Multi-attribute skill-matrix team formation.
// Approach: greedy balanced-bin packing. Each student is a vector of skill
// proficiencies (0-5). We repeatedly assign the student who adds the most
// "new coverage" to the currently weakest team, so teams end up balanced
// across all required skills instead of stacking similar people together.

export type Student = {
  id: string;
  name: string;
  skills: Record<string, number>; // e.g. { frontend: 4, backend: 2, ml: 0 }
  weekly_hours: number;
  attendance_pct: number;
  backlogs: number;
};

export type Team = {
  members: Student[];
  skillCoverage: Record<string, number>;
};

const ELIGIBLE_MIN_ATTENDANCE = 70;

export function filterEligible(students: Student[]): Student[] {
  return students.filter(
    (s) => s.attendance_pct >= ELIGIBLE_MIN_ATTENDANCE && s.backlogs === 0
  );
}

function coverageScore(team: Team, requiredSkills: string[]): number {
  return requiredSkills.reduce((sum, skill) => sum + (team.skillCoverage[skill] || 0), 0);
}

function addToTeam(team: Team, student: Student, requiredSkills: string[]) {
  team.members.push(student);
  requiredSkills.forEach((skill) => {
    const val = student.skills[skill] || 0;
    team.skillCoverage[skill] = Math.max(team.skillCoverage[skill] || 0, val);
  });
}

/**
 * Forms `teamCount` balanced teams from the eligible student pool.
 * requiredSkills = the skill tags the project needs (e.g. ["frontend","backend","design"]).
 */
export function formTeams(
  students: Student[],
  requiredSkills: string[],
  teamSize: number
): Team[] {
  const eligible = filterEligible(students);
  const teamCount = Math.max(1, Math.floor(eligible.length / teamSize));
  const teams: Team[] = Array.from({ length: teamCount }, () => ({
    members: [],
    skillCoverage: {},
  }));

  // Sort students by total skill strength descending so the strongest
  // "anchors" get distributed first (snake draft style).
  const pool = [...eligible].sort((a, b) => {
    const totalA = requiredSkills.reduce((s, k) => s + (a.skills[k] || 0), 0);
    const totalB = requiredSkills.reduce((s, k) => s + (b.skills[k] || 0), 0);
    return totalB - totalA;
  });

  for (const student of pool) {
    // find the team with open slots that currently has the LOWEST coverage
    // score — this is what forces balance instead of clustering.
    const candidates = teams.filter((t) => t.members.length < teamSize);
    if (candidates.length === 0) break;

    candidates.sort((a, b) => coverageScore(a, requiredSkills) - coverageScore(b, requiredSkills));
    addToTeam(candidates[0], student, requiredSkills);
  }

  return teams;
}

/** Simple diagnostic used by the UI to explain *why* a team was formed this way. */
export function explainTeam(team: Team, requiredSkills: string[]): string {
  const lines = requiredSkills.map((skill) => {
    const best = team.members.reduce(
      (max, m) => Math.max(max, m.skills[skill] || 0),
      0
    );
    return `${skill}: covered at level ${best}/5`;
  });
  return lines.join(", ");
}
