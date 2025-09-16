/**
 * Priority chip displays Low/Moderate/High with soft colored background.
 */
import React from 'react';

const styles = {
  base: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  low: { background: '#DCFCE7', color: '#166534' },
  moderate: { background: '#FEF3C7', color: '#92400E' },
  high: { background: '#FEE2E2', color: '#991B1B' },
};

// PUBLIC_INTERFACE
export default function PriorityChip({ value = 'low' }) {
  /** Visual chip for priority field */
  const tone = styles[value] || styles.low;
  return <span style={{ ...styles.base, ...tone }}>{value}</span>;
}
