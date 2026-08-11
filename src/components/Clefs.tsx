import React from 'react';

interface ClefProps {
  x: number;
  y: number;
}

/**
 * Treble Clef (Sol en 2ª)
 * Uses the user's uploaded base SVG asset /clefs/treble.svg.
 * Origin (0,0) is aligned with Line 2 (Sol line).
 */
export const TrebleClef: React.FC<ClefProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="clef-svg-container">
      <image
        href="/clefs/treble.svg"
        x="-22"
        y="-41"
        width="44"
        height="72"
        className="clef-base-image"
      />
    </g>
  );
};

/**
 * Treble 8vb Clef (Sol 8ª baja)
 * Uses the base treble.svg image asset + hardcoded "8" numeral below.
 * Color matches the clef (black in light theme, white in dark theme).
 */
export const Treble8vbClef: React.FC<ClefProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="clef-svg-container">
      <image
        href="/clefs/treble.svg"
        x="-22"
        y="-41"
        width="44"
        height="72"
        className="clef-base-image"
      />
      <text x="0" y="38" className="clef-8-numeral">
        8
      </text>
    </g>
  );
};

/**
 * Bass Clef (Fa en 4ª)
 * Uses the user's uploaded base SVG asset /clefs/bass.svg.
 * Origin (0,0) is aligned with Line 4 (Fa line).
 */
export const BassClef: React.FC<ClefProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="clef-svg-container">
      <image
        href="/clefs/bass.svg"
        x="-10"
        y="-13"
        width="40"
        height="40"
        className="clef-base-image"
      />
    </g>
  );
};

/**
 * Bass 8vb Clef (Fa 8ª baja)
 * Uses the base bass.svg image asset + hardcoded "8" numeral below.
 * Color matches the clef (black in light theme, white in dark theme).
 */
export const Bass8vbClef: React.FC<ClefProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="clef-svg-container">
      <image
        href="/clefs/bass.svg"
        x="-10"
        y="-13"
        width="40"
        height="40"
        className="clef-base-image"
      />
      <text x="10" y="32" className="clef-8-numeral">
        8
      </text>
    </g>
  );
};

/**
 * C Clef (Do - Alto & Tenor)
 * Uses the user's uploaded base SVG asset /clefs/c_clef.svg.
 * Origin (0,0) is aligned with the middle C notch pointer.
 */
export const CClef: React.FC<ClefProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="clef-svg-container">
      <image
        href="/clefs/c_clef.svg"
        x="-22"
        y="-22"
        width="44"
        height="44"
        className="clef-base-image"
      />
    </g>
  );
};
