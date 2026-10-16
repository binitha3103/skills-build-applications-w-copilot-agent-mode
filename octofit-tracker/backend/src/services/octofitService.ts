import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw Object.assign(new Error('Activity input is required'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    !/^[0-9a-fA-F]{24}$/.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[0-9a-fA-F]{24}$/.test(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('A valid userId, teamId, type, and positive minutes are required'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: new Types.ObjectId(userId) }),
    Team.exists({ _id: new Types.ObjectId(teamId) }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('The specified user or team does not exist'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw Object.assign(new Error('Team input is required'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    members.some((member) => typeof member !== 'string' || !/^[0-9a-fA-F]{24}$/.test(member))
  ) {
    throw Object.assign(new Error('A valid name, mascot, and member IDs are required'), { status: 400 });
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const pointTotals = await Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({ _id: { $in: pointTotals.map(({ _id }) => _id) } }).select('name').lean();
  const teamNames = new Map(teams.map(({ _id, name }) => [_id.toString(), name]));

  return pointTotals
    .map(({ _id, totalPoints }) => ({ teamName: teamNames.get(_id.toString()), totalPoints }))
    .filter((entry): entry is { teamName: string; totalPoints: number } => entry.teamName !== undefined)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('The specified user does not exist'), { status: 404 });
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const activityType = recentActivity?.type.trim().toLowerCase();
  const activityFocus = activityType
    ? ({ run: 'endurance', cycle: 'endurance', swim: 'endurance', strength: 'strength' }[activityType] ?? activityType)
    : undefined;
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const preferredFocuses = [...new Set([goalFocus, activityFocus].filter((focus): focus is string => Boolean(focus)))];
  const rankedWorkouts = workouts
    .map((workout) => ({
      workout,
      preference: preferredFocuses.indexOf(workout.focus.trim().toLowerCase()),
    }))
    .sort((a, b) => {
      if (a.preference < 0) return b.preference < 0 ? 0 : 1;
      if (b.preference < 0) return -1;
      return a.preference - b.preference;
    });

  return rankedWorkouts.map(({ workout, preference }) => ({
    ...workout,
    reason: preference === 0
      ? `Matches your ${user.fitnessGoal} fitness goal.`
      : preference === 1 && recentActivity
        ? `Matches your recent ${recentActivity.type} activity.`
        : 'Suggested workout.',
  }));
}

export { User };
