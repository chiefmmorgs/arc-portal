'use client';

import { useEffect, useState } from 'react';
import { fetchValidators, fetchValidatorStats } from '@/lib/api';
import type { Validator, ValidatorStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['#0ae448', '#fec5fb', '#ff8709', '#00bae2', '#9d95ff', '#abff84', '#f100cb'];

export default function AnalyticsPage() {
    const [validators, setValidators] = useState<Validator[]>([]);
    const [stats, setStats] = useState<ValidatorStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            const [v, s] = await Promise.all([fetchValidators(), fetchValidatorStats()]);
            setValidators(v); setStats(s);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                Loading analytics...
            </div>
        );
    }

    const blockData = validators.map(v => ({
        name: v.address.slice(0, 8) + '...',
        produced: v.total_blocks,
        missed: v.missed_blocks,
        uptime: parseFloat(v.uptime_percentage),
    }));

    const pieData = validators.map(v => ({ name: v.address.slice(0, 10) + '...', value: v.total_blocks }));

    const totalProduced = parseInt(stats?.total_blocks || '0');
    const totalMissed = parseInt(stats?.total_missed || '0');
    const networkHealth = totalProduced + totalMissed > 0 ? ((totalProduced / (totalProduced + totalMissed)) * 100).toFixed(1) : '0';

    const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' };

    const statCards = [
        { label: 'Network Health', value: `${networkHealth}%`, sub: 'Block success rate', color: 'var(--green)', glow: 'card-glow-green', gradient: 'text-gradient-green' },
        { label: 'Active Validators', value: `${validators.length}`, sub: 'Currently tracked', color: 'var(--pink)', glow: 'card-glow-pink', gradient: 'text-gradient-purple' },
        { label: 'Avg Uptime', value: `${parseFloat(stats?.avg_uptime || '0').toFixed(1)}%`, sub: 'Mean uptime', color: 'var(--blue)', glow: 'card-glow-blue', gradient: 'text-gradient-ocean' },
        { label: 'Total Indexed', value: (totalProduced + totalMissed).toLocaleString(), sub: 'Blocks analyzed', color: 'var(--orange)', glow: 'card-glow-orange', gradient: 'text-gradient-sunset' },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
            <div className="orb orb-blue" style={{ width: 400, height: 400, top: -100, right: -100 }} />
            <div className="orb orb-green" style={{ width: 300, height: 300, bottom: 100, left: -80 }} />

            <header className="animate-fade-up" style={{ marginBottom: 48 }}>
                <h1 className="heading-xl text-gradient-ocean">Analytics</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8 }}>Network performance and validator stats.</p>
            </header>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
                {statCards.map((s, i) => (
                    <div key={s.label} className={`card ${s.glow} animate-fade-up delay-${i + 1}`} style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 2, background: s.color, opacity: 0.5, borderRadius: 2 }} />
                        <div className="stat-label" style={{ marginBottom: 12, marginTop: 8 }}>{s.label}</div>
                        <div className={`stat-value ${s.gradient}`}>{s.value}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
                <div className="card animate-fade-up delay-5">
                    <h3 className="heading-md" style={{ margin: '0 0 20px 0' }}>Block Production</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={blockData}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(10,228,72,0.05)' }} />
                            <Bar dataKey="produced" fill="#0ae448" name="Produced" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="missed" fill="#ff8709" name="Missed" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card animate-fade-up delay-5">
                    <h3 className="heading-md" style={{ margin: '0 0 20px 0' }}>Block Share</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}
                                dataKey="value" stroke="var(--bg-card)" strokeWidth={2}
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                            <Legend formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{value}</span>} />
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card animate-fade-up" style={{ padding: 0 }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
                    <h3 className="heading-md" style={{ margin: 0 }}>Validator Leaderboard</h3>
                </div>
                <div style={{ padding: '0 28px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                            <tr>
                                {['Rank', 'Validator', 'Blocks', 'Uptime', 'Performance'].map(h => (
                                    <th key={h} style={{ color: 'var(--text-muted)', fontWeight: 500, textAlign: 'left', padding: '14px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {validators.sort((a, b) => b.total_blocks - a.total_blocks).map((v, i) => {
                                const uptime = parseFloat(v.uptime_percentage);
                                const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
                                return (
                                    <tr key={v.id}>
                                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', fontSize: '1rem' }}>
                                            {i < 3 ? medals[i] : `#${i + 1}`}
                                        </td>
                                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'Space Grotesk, monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{v.address}</td>
                                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{v.total_blocks.toLocaleString()}</td>
                                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                                            <span className={uptime >= 90 ? 'chip chip-green' : 'chip chip-orange'}>{uptime.toFixed(1)}%</span>
                                        </td>
                                        <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ width: '100%', maxWidth: 140, height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${uptime}%`, height: '100%', background: uptime >= 90 ? 'var(--green)' : 'var(--orange)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}