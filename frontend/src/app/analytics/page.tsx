'use client';

import { useEffect, useState } from 'react';
import { fetchValidators, fetchValidatorStats } from '@/lib/api';
import type { Validator, ValidatorStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

/* Monochrome palette for charts — grays and subtle whites */
const MONO_COLORS = ['#ededed', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'];

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
            setValidators(v);
            setStats(s);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#a1a1aa' }}>
                <div style={{
                    width: 20, height: 20, border: '2px solid #1e1e2e', borderTopColor: '#ededed',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                <p style={{ margin: 0 }}>Loading analytics...</p>
            </div>
        );
    }

    const blockData = validators.map((v) => ({
        name: v.address.slice(0, 8) + '...',
        produced: v.total_blocks,
        missed: v.missed_blocks,
        uptime: parseFloat(v.uptime_percentage),
    }));

    const pieData = validators.map((v) => ({
        name: v.address.slice(0, 10) + '...',
        value: v.total_blocks,
    }));

    const totalProduced = parseInt(stats?.total_blocks || '0');
    const totalMissed = parseInt(stats?.total_missed || '0');
    const networkHealth = totalProduced + totalMissed > 0
        ? ((totalProduced / (totalProduced + totalMissed)) * 100).toFixed(1)
        : '0';

    /* ── Inline style objects ─────────────────────────────────────────── */
    const S = {
        page: { maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' } as React.CSSProperties,
        header: { marginBottom: '40px' } as React.CSSProperties,
        h1: { fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' } as React.CSSProperties,
        subtitle: { color: '#a1a1aa', margin: 0, fontSize: '0.95rem' } as React.CSSProperties,
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' } as React.CSSProperties,
        statCard: {
            background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '20px',
        } as React.CSSProperties,
        statLabel: { color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '8px' },
        statValue: { color: '#ededed', fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2, marginBottom: '4px' },
        statSub: { color: '#52525b', fontSize: '0.78rem' },
        chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' } as React.CSSProperties,
        chartCard: {
            background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '24px',
        } as React.CSSProperties,
        chartTitle: { color: '#ededed', fontSize: '0.95rem', fontWeight: 500, margin: '0 0 20px 0' } as React.CSSProperties,
        tableCard: {
            background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '24px', marginBottom: '32px',
        } as React.CSSProperties,
        table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.9rem' },
        th: { color: '#a1a1aa', fontWeight: 500, textAlign: 'left' as const, padding: '10px 12px', borderBottom: '1px solid #1e1e2e', fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
        td: { color: '#ededed', padding: '12px', borderBottom: '1px solid #1e1e2e' },
        tdMuted: { color: '#a1a1aa', padding: '12px', borderBottom: '1px solid #1e1e2e', fontFamily: 'monospace', fontSize: '0.85rem' },
    };

    const tooltipStyle = {
        background: '#18181b', border: '1px solid #1e1e2e', borderRadius: 8, color: '#ededed',
    };

    return (
        <div style={S.page}>
            {/* Header */}
            <header style={S.header}>
                <h1 style={S.h1}>Analytics</h1>
                <p style={S.subtitle}>Network performance overview and validator comparison</p>
            </header>

            {/* Summary Stats */}
            <div style={S.statsGrid}>
                <div style={S.statCard}>
                    <div style={S.statLabel}>Network Health</div>
                    <div style={S.statValue}>{networkHealth}%</div>
                    <div style={S.statSub}>Produced / (Produced + Missed)</div>
                </div>
                <div style={S.statCard}>
                    <div style={S.statLabel}>Active Validators</div>
                    <div style={S.statValue}>{validators.length}</div>
                    <div style={S.statSub}>Currently tracked</div>
                </div>
                <div style={S.statCard}>
                    <div style={S.statLabel}>Avg Uptime</div>
                    <div style={S.statValue}>{parseFloat(stats?.avg_uptime || '0').toFixed(1)}%</div>
                    <div style={S.statSub}>Mean validator uptime</div>
                </div>
                <div style={S.statCard}>
                    <div style={S.statLabel}>Total Indexed</div>
                    <div style={S.statValue}>{(totalProduced + totalMissed).toLocaleString()}</div>
                    <div style={S.statSub}>Blocks analyzed</div>
                </div>
            </div>

            {/* Charts */}
            <div style={S.chartsGrid}>
                {/* Block Production Comparison */}
                <div style={S.chartCard}>
                    <h3 style={S.chartTitle}>Block Production: Produced vs Missed</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={blockData}>
                            <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={{ stroke: '#1e1e2e' }} />
                            <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={{ stroke: '#1e1e2e' }} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="produced" fill="#ededed" name="Produced" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="missed" fill="#52525b" name="Missed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Block Share */}
                <div style={S.chartCard}>
                    <h3 style={S.chartTitle}>Block Production Share</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="#0a0a0f"
                                strokeWidth={2}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={MONO_COLORS[i % MONO_COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend
                                formatter={(value: string) => <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{value}</span>}
                            />
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Leaderboard */}
            <div style={S.tableCard}>
                <h3 style={S.chartTitle}>Validator Leaderboard</h3>
                <table style={S.table}>
                    <thead>
                        <tr>
                            <th style={S.th}>Rank</th>
                            <th style={S.th}>Validator</th>
                            <th style={S.th}>Blocks</th>
                            <th style={S.th}>Uptime</th>
                            <th style={{ ...S.th, minWidth: 140 }}>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validators
                            .sort((a, b) => b.total_blocks - a.total_blocks)
                            .map((v, i) => {
                                const uptime = parseFloat(v.uptime_percentage);
                                return (
                                    <tr key={v.id}>
                                        <td style={S.td}>
                                            <span style={{ fontSize: '1.1rem' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                            </span>
                                        </td>
                                        <td style={S.tdMuted}>{v.address}</td>
                                        <td style={S.td}>{v.total_blocks.toLocaleString()}</td>
                                        <td style={S.td}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 10px',
                                                borderRadius: '999px',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                background: uptime >= 90 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                                                color: uptime >= 90 ? '#ededed' : '#a1a1aa',
                                                border: `1px solid ${uptime >= 90 ? '#3f3f46' : '#1e1e2e'}`,
                                            }}>
                                                {uptime.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td style={S.td}>
                                            <div style={{
                                                width: '100%', maxWidth: 140, height: 6,
                                                background: '#1e1e2e', borderRadius: 3, overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${uptime}%`,
                                                    height: '100%',
                                                    background: uptime >= 90 ? '#ededed' : uptime >= 50 ? '#a1a1aa' : '#52525b',
                                                    borderRadius: 3,
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
