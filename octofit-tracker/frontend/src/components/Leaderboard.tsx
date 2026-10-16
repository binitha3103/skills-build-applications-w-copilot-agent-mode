import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

const loadLeaderboard = () => getJson<Record<string, unknown>>('/api/leaderboard');

export default function Leaderboard() {
  return <CapabilityCard title="Leaderboard" description="Compare team point totals." load={loadLeaderboard} collection="leaderboard" emptyMessage="No leaderboard rankings yet." />;
}
