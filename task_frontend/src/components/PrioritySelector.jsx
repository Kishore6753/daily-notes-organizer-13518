/**
 * Priority selector for notes: low | moderate | high
 * Renders a dropdown with colored options and emits selected value.
 */
import React from 'react';

// PUBLIC_INTERFACE
export default function PrioritySelector({ value = 'low', onChange }) {
  /** A small dropdown for selecting note priority. */
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#8C96A9' }}>Priority</span>
      <select
        aria-label="Priority"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          height: 32,
          borderRadius: 8,
          padding: '4px 8px',
          background: '#141821',
          color: '#E8ECF3',
          border: '1px solid #2A3142',
        }}
      >
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
      </select>
    </label>
  );
}
