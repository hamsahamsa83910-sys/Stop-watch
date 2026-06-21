# Stop-watch

PROJECT OVERVIEW
AetherWatch is a premium, high-precision web timer (HTML/CSS/JS) featuring:

Dual Modes: Stopwatch with lap recording and Countdown with a synthesized chime alarm.
Modern Themes: Glassmorphic UI with toggles for Light/Dark Mode and 4 neon accents (Cyan, Violet, Emerald, Crimson).
Voice Control: Speech commands ("Start", "Pause", "Lap", "Reset") for hands-free timing.
Smart Analytics: Real-time session statistics (Fastest/Slowest, Average, Standard Deviation) and a responsive Canvas graph.
Persistence & Export: Retains progress through page refreshes (with drift correction), holds the screen awake (Wake Lock), and exports data as a CSV or clipboard text.

CORE ANALYTICS INSIGHTS
Pacing Consistency (Standard Deviation): Calculates the variance of lap durations. A lower standard deviation indicates highly consistent pacing, while a higher value indicates erratic interval pacing.
Extreme Lap Detection: Automatically identifies and highlights the Fastest Lap (in green) and Slowest Lap (in red) within the table.
Dynamic Trend Analysis: Compares the average of the first half of your laps against the second half to display a visual trend indicator:
FASTER ⚡ (Improvement/pacing speedup > 2.5%)
SLOWER ⏳ (Fatigue/pacing slowdown > 2.5%)
STEADY 🎯 (Consistent pacing within 2.5% variance)
Average Lap Performance: Tracks the running average duration of recorded intervals to set a baseline for evaluation.

METHODOLOGY AND FEATURES ANALYSED
1. Technical Methodology
Microsecond Precision: Uses performance.now() timestamps (rather than drifting intervals) bound to a browser requestAnimationFrame loop for frame-rate accurate rendering.
Offline Audio & Voice Processing: Synthesizes chimes programmatically using Web Audio oscillators (no audio file dependencies) and integrates the Web Speech API to analyze voice commands locally.
Refreshed Drift Correction: Saves state with timestamps on close; upon reload, it calculates elapsed real-world time to resume timers without interruption.
HiDPI Canvas Rendering: Dynamically scales the analytics canvas to match the screen's Device Pixel Ratio (DPR) for crisp line drawings.

2. Features Analyzed & Implemented
Dual Time Modes: Stopwatch (lap counting) vs. Countdown (target limits & alarm chime).
Frosted UI Scheme: Adjustable Light/Dark themes matching 4 custom neon accent color swatches.
Mathematical Dashboard: Real-time calculators for Average, Fastest/Slowest, and Standard Deviation (Pacing Consistency).
Exports & Controls: CSV downloads, text clipboard summaries, screen wake locks, and sound controls.

TECHNOLOGIES USED
Core Stack
HTML5: Structured layout with embedded vector SVG icons.
CSS3 (Vanilla): Glassmorphism (backdrop-filter), flexbox/grid layout design, neon theme variables, and custom animations.
JavaScript (ES6+): Core business logic and rendering calculations.
Advanced Browser APIs
Web Audio API: Dynamically synthesizes button clicks and C-major alarm chimes using frequency oscillators.
Web Speech API (webkitSpeechRecognition): Dictates voice command inputs for hands-free control.
Screen Wake Lock API: Keeps the screen active while timers are running.
HTML5 Canvas API: Draws the high-DPI responsive line chart of your lap intervals.
LocalStorage API: Automatically saves and restores timer configurations and lap history.
High-Resolution Time API (performance.now()): Computes time intervals with microsecond precision
