// ==========================================
// AETHER WATCH GLOBAL STATE
// ==========================================
let currentMode = 'stopwatch'; // 'stopwatch' or 'countdown'
let isRunning = false;
let startTime = 0;
let accumulatedTime = 0;
let animationFrameId = null;

// Laps Tracking
let laps = [];
let currentLapStartTime = 0;
let currentLapAccumulatedTime = 0;

// Countdown configurations
let countdownHours = 0;
let countdownMinutes = 0;
let countdownSeconds = 0;
let countdownsCompleted = 0;

// Device & Feature states
let colorScheme = 'dark'; // 'dark' or 'light'
let isSoundEnabled = true;
let isVoiceEnabled = false;
let wakeLock = null;

// Audio context holder
let audioCtx = null;
let voiceRecognition = null;

// Circumference base
const BASE_RING_CIRCUMFERENCE = 892;

// ==========================================
// DOM ELEMENTS
// ==========================================
const hoursEl = document.getElementById('time-hours');
const minutesEl = document.getElementById('time-minutes');
const secondsEl = document.getElementById('time-seconds');
const msEl = document.getElementById('time-ms');

const btnStartPause = document.getElementById('btn-start-pause');
const btnStartPauseText = document.getElementById('btn-start-pause-text');
const iconPlay = btnStartPause.querySelector('.icon-play');
const iconPause = btnStartPause.querySelector('.icon-pause');

const btnLapReset = document.getElementById('btn-lap-reset');
const btnLapResetText = document.getElementById('btn-lap-reset-text');

const lapsEmptyState = document.getElementById('laps-empty-state');
const lapsEmptyText = document.getElementById('laps-empty-text');
const lapsTable = document.getElementById('laps-table');
const lapsList = document.getElementById('laps-list');
const lapCounterTag = document.getElementById('lap-counter-tag');
const currentLapLabel = document.getElementById('current-lap-label');
const progressCircle = document.getElementById('progressCircle');

// Mode toggle tabs
const modeStopwatchBtn = document.getElementById('mode-stopwatch');
const modeCountdownBtn = document.getElementById('mode-countdown');
const countdownSettingsSec = document.getElementById('countdown-settings');
const lapsSectionCard = document.getElementById('laps-section-card');

// Toolbar buttons
const btnToggleVoice = document.getElementById('btn-toggle-voice');
const btnToggleSound = document.getElementById('btn-toggle-sound');
const btnToggleScheme = document.getElementById('btn-toggle-scheme');
const iconSun = btnToggleScheme.querySelector('.icon-sun');
const iconMoon = btnToggleScheme.querySelector('.icon-moon');
const iconVolumeOn = btnToggleSound.querySelector('.icon-volume-on');
const iconVolumeOff = btnToggleSound.querySelector('.icon-volume-off');
const voiceStatusBar = document.getElementById('voice-status-bar');

// Chart & Export
const chartSection = document.getElementById('chart-section');
const lapsActionBar = document.getElementById('laps-action-bar');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnCopyLaps = document.getElementById('btn-copy-laps');

// Stats Card
const statsSection = document.getElementById('stats-section');

// ==========================================
// AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep(frequency, type = 'sine', duration = 0.08) {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Envelope curve to avoid popping click sounds
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio Context blocked or unsupported.", e);
  }
}

// Chimes mappings
const soundStart = () => playBeep(880, 'sine', 0.1);
const soundPause = () => playBeep(587, 'sine', 0.1);
const soundLap = () => playBeep(440, 'sine', 0.06);
const soundReset = () => {
  playBeep(523, 'sine', 0.08);
  setTimeout(() => playBeep(784, 'sine', 0.16), 70);
};

// Melodic countdown alarm sequence (ascends then chime)
function playCountdownAlarm() {
  if (!isSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.08, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  } catch(e) {
    console.warn("Alarm synthesis failed.", e);
  }
}

// ==========================================
// SCREEN WAKE LOCK CONTROL
// ==========================================
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn(`Screen wake lock failure: ${err.name}, ${err.message}`);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
    });
  }
}

// ==========================================
// SYSTEM THEME & COLOR SCHEME (LIGHT/DARK)
// ==========================================
function setScheme(scheme) {
  colorScheme = scheme;
  document.documentElement.setAttribute('data-color-scheme', scheme);
  
  if (scheme === 'light') {
    iconSun.style.display = 'none';
    iconMoon.style.display = 'block';
  } else {
    iconSun.style.display = 'block';
    iconMoon.style.display = 'none';
  }
  
  // Re-draw canvas to update grid colors
  renderChart();
  saveState();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.getAttribute('data-theme-select') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderChart();
  saveState();
}

// ==========================================
// TIMER MODES (STOPWATCH vs COUNTDOWN)
// ==========================================
function setMode(mode) {
  if (isRunning) return; // Prevent switching modes while running
  
  currentMode = mode;
  resetTimer();
  
  if (mode === 'stopwatch') {
    modeStopwatchBtn.classList.add('active');
    modeCountdownBtn.classList.remove('active');
    countdownSettingsSec.style.display = 'none';
    lapsSectionCard.style.display = 'flex';
    document.getElementById('app-subtitle').textContent = 'High-precision microsecond-accurate stopwatch';
    currentLapLabel.style.display = 'inline-block';
    
    // Restore layout
    renderLaps();
    renderChart();
  } else {
    modeStopwatchBtn.classList.remove('active');
    modeCountdownBtn.classList.add('active');
    countdownSettingsSec.style.display = 'flex';
    lapsSectionCard.style.display = 'none'; // hide laps table in countdown mode
    chartSection.style.display = 'none'; // hide charts in countdown mode
    document.getElementById('app-subtitle').textContent = 'High-precision microsecond-accurate countdown';
    currentLapLabel.style.display = 'none';
    
    updateCountdownUI();
  }
  
  renderStats();
  saveState();
}

// ==========================================
// COUNTDOWN SELECTOR VALUE ADJUSTMENT
// ==========================================
function adjustCountdown(unit, direction) {
  if (isRunning) return;
  getAudioContext();
  playBeep(587, 'sine', 0.03);
  
  if (unit === 'hours') {
    if (direction === 'up') countdownHours = (countdownHours + 1) % 100;
    else countdownHours = (countdownHours - 1 + 100) % 100;
  } else if (unit === 'minutes') {
    if (direction === 'up') countdownMinutes = (countdownMinutes + 1) % 60;
    else countdownMinutes = (countdownMinutes - 1 + 60) % 60;
  } else if (unit === 'seconds') {
    if (direction === 'up') countdownSeconds = (countdownSeconds + 1) % 60;
    else countdownSeconds = (countdownSeconds - 1 + 60) % 60;
  }
  
  updateCountdownUI();
  saveState();
}

function updateCountdownUI() {
  document.getElementById('picker-h').textContent = String(countdownHours).padStart(2, '0');
  document.getElementById('picker-m').textContent = String(countdownMinutes).padStart(2, '0');
  document.getElementById('picker-s').textContent = String(countdownSeconds).padStart(2, '0');
  
  if (!isRunning && accumulatedTime === 0) {
    const totalMs = (countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds) * 1000;
    updateDisplay(totalMs);
    updateProgressCircle(totalMs);
  }
}

// ==========================================
// VOICE CONTROL (WEB SPEECH API)
// ==========================================
function initVoiceControl() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btnToggleVoice.style.display = 'none';
    return;
  }
  
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.lang = 'en-US';
  voiceRecognition.interimResults = false;
  
  voiceRecognition.onresult = (event) => {
    const idx = event.results.length - 1;
    const text = event.results[idx][0].transcript.trim().toLowerCase();
    console.log("Voice Input Detected:", text);
    
    if (text.includes('start') || text.includes('begin') || text.includes('go')) {
      startTimer();
    } else if (text.includes('pause') || text.includes('stop') || text.includes('hold')) {
      pauseTimer();
    } else if (text.includes('lap') || text.includes('record')) {
      if (currentMode === 'stopwatch') recordLap();
    } else if (text.includes('reset') || text.includes('clear')) {
      resetTimer();
    } else if (text.includes('dark') || text.includes('night')) {
      setScheme('dark');
    } else if (text.includes('light') || text.includes('day')) {
      setScheme('light');
    }
  };
  
  voiceRecognition.onend = () => {
    // Restart automatic loop if still enabled
    if (isVoiceEnabled) {
      try {
        voiceRecognition.start();
      } catch (err) {
        // Recognition already listening
      }
    }
  };
  
  voiceRecognition.onerror = (e) => {
    console.error("Speech Recognition Error:", e);
    if (e.error === 'not-allowed') {
      isVoiceEnabled = false;
      updateVoiceUI();
    }
  };
}

function toggleVoice() {
  if (!voiceRecognition) return;
  getAudioContext();
  
  isVoiceEnabled = !isVoiceEnabled;
  updateVoiceUI();
  
  if (isVoiceEnabled) {
    try {
      voiceRecognition.start();
      playBeep(650, 'sine', 0.05);
    } catch(e) {}
  } else {
    try {
      voiceRecognition.stop();
      playBeep(450, 'sine', 0.05);
    } catch(e) {}
  }
  saveState();
}

function updateVoiceUI() {
  if (isVoiceEnabled) {
    btnToggleVoice.classList.add('active');
    voiceStatusBar.style.display = 'flex';
  } else {
    btnToggleVoice.classList.remove('active');
    voiceStatusBar.style.display = 'none';
  }
}

// ==========================================
// TIMER ENGINE
// ==========================================
function startTimer() {
  if (isRunning) return;
  
  getAudioContext();
  
  if (currentMode === 'countdown') {
    const totalTarget = (countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds) * 1000;
    if (totalTarget === 0) {
      playBeep(250, 'sine', 0.2); // Warn beep
      return;
    }
  }
  
  soundStart();
  
  isRunning = true;
  startTime = performance.now() - accumulatedTime;
  currentLapStartTime = performance.now() - currentLapAccumulatedTime;
  
  // Start/Pause Button visual updates
  btnStartPause.classList.remove('play-state');
  btnStartPause.classList.add('pause-state');
  btnStartPauseText.textContent = 'Pause';
  iconPlay.style.display = 'none';
  iconPause.style.display = 'block';
  
  // Secondary Button visual updates
  btnLapReset.removeAttribute('disabled');
  btnLapResetText.textContent = (currentMode === 'stopwatch') ? 'Lap' : 'Reset';
  if (currentMode === 'countdown') {
    btnLapReset.setAttribute('disabled', 'true'); // reset disabled while countdown is running
  }
  
  requestWakeLock();
  saveState();
  
  animationFrameId = requestAnimationFrame(updateTime);
}

function pauseTimer() {
  if (!isRunning) return;
  
  soundPause();
  
  isRunning = false;
  cancelAnimationFrame(animationFrameId);
  
  const now = performance.now();
  accumulatedTime = now - startTime;
  currentLapAccumulatedTime = now - currentLapStartTime;
  
  // Restore Play/Start configuration
  btnStartPause.classList.remove('pause-state');
  btnStartPause.classList.add('play-state');
  btnStartPauseText.textContent = 'Resume';
  iconPlay.style.display = 'block';
  iconPause.style.display = 'none';
  
  btnLapReset.removeAttribute('disabled');
  btnLapResetText.textContent = 'Reset';
  
  releaseWakeLock();
  saveState();
}

function resetTimer() {
  if (isRunning) return;
  
  soundReset();
  
  accumulatedTime = 0;
  currentLapAccumulatedTime = 0;
  laps = [];
  
  // Reset outputs
  updateDisplay(0);
  currentLapLabel.textContent = 'LAP 1';
  updateProgressCircle(0);
  
  btnStartPauseText.textContent = 'Start';
  btnLapResetText.textContent = 'Reset';
  btnLapReset.setAttribute('disabled', 'true');
  
  if (currentMode === 'countdown') {
    updateCountdownUI();
  } else {
    renderLaps();
    renderChart();
  }
  
  renderStats();
  saveState();
}

function recordLap() {
  if (!isRunning || currentMode !== 'stopwatch') return;
  
  soundLap();
  
  const now = performance.now();
  const totalTime = now - startTime;
  const lapTime = now - currentLapStartTime;
  
  laps.unshift({
    lapNumber: laps.length + 1,
    lapTime,
    totalTime
  });
  
  currentLapStartTime = now;
  currentLapAccumulatedTime = 0;
  
  currentLapLabel.textContent = `LAP ${laps.length + 1}`;
  
  renderLaps();
  renderChart();
  renderStats();
  saveState();
}

// Primary loop runner
function updateTime(timestamp) {
  const elapsed = timestamp - startTime;
  
  if (currentMode === 'stopwatch') {
    updateDisplay(elapsed);
    updateProgressCircle(elapsed);
  } else {
    // Countdown Mode
    const totalTarget = (countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds) * 1000;
    const remaining = totalTarget - elapsed;
    
    if (remaining <= 0) {
      // Countdown completed!
      isRunning = false;
      accumulatedTime = 0;
      updateDisplay(0);
      updateProgressCircle(0);
      
      // Chime alarm sound
      playCountdownAlarm();
      
      // Update statistics
      countdownsCompleted++;
      renderStats();
      
      // Reset UI elements
      btnStartPause.classList.remove('pause-state');
      btnStartPause.classList.add('play-state');
      btnStartPauseText.textContent = 'Start';
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      
      btnLapReset.setAttribute('disabled', 'true');
      btnLapResetText.textContent = 'Reset';
      
      releaseWakeLock();
      saveState();
      return;
    }
    
    updateDisplay(remaining);
    
    // Reverse circle path
    const r = parseFloat(progressCircle.getAttribute('r')) || 142;
    const circumference = 2 * Math.PI * r;
    progressCircle.style.strokeDasharray = circumference;
    const percent = remaining / totalTarget;
    progressCircle.style.strokeDashoffset = circumference - (circumference * percent);
  }
  
  if (isRunning) {
    animationFrameId = requestAnimationFrame(updateTime);
  }
}

function updateProgressCircle(elapsed) {
  const r = parseFloat(progressCircle.getAttribute('r')) || 142;
  const circumference = 2 * Math.PI * r;
  progressCircle.style.strokeDasharray = circumference;
  
  const percent = (elapsed % 60000) / 60000;
  progressCircle.style.strokeDashoffset = circumference - (circumference * percent);
}

// Convert MS to elements
function formatTime(ms) {
  let hrs = Math.floor(ms / 3600000);
  let mins = Math.floor((ms % 3600000) / 60000);
  let secs = Math.floor((ms % 60000) / 1000);
  let centis = Math.floor((ms % 1000) / 10);
  
  return {
    hours: String(hrs).padStart(2, '0'),
    minutes: String(mins).padStart(2, '0'),
    seconds: String(secs).padStart(2, '0'),
    centiseconds: String(centis).padStart(2, '0')
  };
}

function updateDisplay(ms) {
  const time = formatTime(ms);
  hoursEl.textContent = time.hours;
  minutesEl.textContent = time.minutes;
  secondsEl.textContent = time.seconds;
  msEl.textContent = time.centiseconds;
}

// ==========================================
// SESSION STATISTICS BOARD CALCULATOR
// ==========================================
function renderStats() {
  if (currentMode === 'stopwatch') {
    if (laps.length === 0) {
      statsSection.style.display = 'none';
      return;
    }
    statsSection.style.display = 'flex';
    
    const times = laps.map(l => l.lapTime);
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const fastest = Math.min(...times);
    const slowest = Math.max(...times);
    
    // Variance and Standard Deviation
    const variance = times.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    const fAvg = formatTime(avg);
    const fFast = formatTime(fastest);
    const fSlow = formatTime(slowest);
    
    document.getElementById('stats-avg-lap').textContent = `${fAvg.minutes}:${fAvg.seconds}.${fAvg.centiseconds}`;
    document.getElementById('stats-fastest').textContent = `${fFast.minutes}:${fFast.seconds}.${fFast.centiseconds}`;
    document.getElementById('stats-slowest').textContent = `${fSlow.minutes}:${fSlow.seconds}.${fSlow.centiseconds}`;
    document.getElementById('stats-deviation').textContent = `± ${(stdDev / 1000).toFixed(2)}s`;
    
    // Reset Label Names
    const labels = statsSection.querySelectorAll('.stats-label');
    labels[0].textContent = 'Avg Lap Time';
    labels[1].textContent = 'Fastest Lap';
    labels[2].textContent = 'Slowest Lap';
    labels[3].textContent = 'Consistency (Std Dev)';
  } else {
    // Countdown Mode stats
    statsSection.style.display = 'flex';
    
    const totalSecs = countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds;
    const formatted = formatTime(totalSecs * 1000);
    
    document.getElementById('stats-avg-lap').textContent = countdownsCompleted;
    document.getElementById('stats-fastest').textContent = `${formatted.hours}:${formatted.minutes}:${formatted.seconds}`;
    document.getElementById('stats-slowest').textContent = 'N/A';
    document.getElementById('stats-deviation').textContent = 'N/A';
    
    const labels = statsSection.querySelectorAll('.stats-label');
    labels[0].textContent = 'Countdowns Finished';
    labels[1].textContent = 'Set Countdown';
    labels[2].textContent = 'Last Session';
    labels[3].textContent = 'Pacing Deviation';
  }
}

// ==========================================
// LAP RENDER BOARD
// ==========================================
function renderLaps() {
  if (currentMode !== 'stopwatch') return;
  
  lapCounterTag.textContent = `${laps.length} Lap${laps.length !== 1 ? 's' : ''}`;
  
  if (laps.length === 0) {
    lapsEmptyState.style.display = 'flex';
    lapsTable.style.display = 'none';
    lapsActionBar.style.display = 'none';
    lapsList.innerHTML = '';
    return;
  }
  
  lapsEmptyState.style.display = 'none';
  lapsTable.style.display = 'table';
  lapsActionBar.style.display = 'flex';
  
  // Highlight extremes
  let fastestLapIdx = -1;
  let slowestLapIdx = -1;
  
  if (laps.length > 1) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    laps.forEach((lap, idx) => {
      if (lap.lapTime < minTime) {
        minTime = lap.lapTime;
        fastestLapIdx = idx;
      }
      if (lap.lapTime > maxTime) {
        maxTime = lap.lapTime;
        slowestLapIdx = idx;
      }
    });
  }
  
  lapsList.innerHTML = laps.map((lap, idx) => {
    const formattedLap = formatTime(lap.lapTime);
    const formattedTotal = formatTime(lap.totalTime);
    
    let rowClass = '';
    let badgeHtml = '';
    
    if (idx === fastestLapIdx) {
      rowClass = 'fastest-row';
      badgeHtml = '<span class="lap-highlight-label fastest-lap-badge">Fastest</span>';
    } else if (idx === slowestLapIdx) {
      rowClass = 'slowest-row';
      badgeHtml = '<span class="lap-highlight-label slowest-lap-badge">Slowest</span>';
    }
    
    const lapTimeStr = `${formattedLap.minutes}:${formattedLap.seconds}.${formattedLap.centiseconds}`;
    const totalTimeStr = `${formattedTotal.minutes}:${formattedTotal.seconds}.${formattedTotal.centiseconds}`;
    
    return `
      <tr class="${rowClass}">
        <td>#${lap.lapNumber}</td>
        <td>${lapTimeStr}${badgeHtml}</td>
        <td>${totalTimeStr}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// VISUAL GRAPH PLOTTING (CANVAS ENGINE)
// ==========================================
function renderChart() {
  if (currentMode !== 'stopwatch' || laps.length < 2) {
    chartSection.style.display = 'none';
    return;
  }
  
  chartSection.style.display = 'flex';
  
  const canvas = document.getElementById('analytics-canvas');
  const ctx = canvas.getContext('2d');
  
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const w = rect.width;
  const h = rect.height;
  
  ctx.clearRect(0, 0, w, h);
  
  const sortedData = [...laps].reverse();
  
  let min = Infinity;
  let max = -Infinity;
  sortedData.forEach(lap => {
    if (lap.lapTime < min) min = lap.lapTime;
    if (lap.lapTime > max) max = lap.lapTime;
  });
  
  const range = max - min;
  const pad = range === 0 ? 1000 : range * 0.2;
  const minBound = Math.max(0, min - pad);
  const maxBound = max + pad;
  const boundRange = maxBound - minBound;
  
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 16;
  
  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;
  
  const pageStyles = getComputedStyle(document.documentElement);
  const strokeColor = pageStyles.getPropertyValue('--color-primary').trim() || '#00f2fe';
  const shadowColor = pageStyles.getPropertyValue('--color-glow-heavy').trim() || 'rgba(0, 242, 254, 0.3)';
  
  // 1. Draw Grid Lines
  ctx.strokeStyle = colorScheme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.fillStyle = colorScheme === 'light' ? '#475569' : '#64748b'; // dynamic labels color
  ctx.font = '10px var(--font-mono)';
  ctx.textBaseline = 'middle';
  
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const yVal = minBound + (i / (steps - 1)) * boundRange;
    const y = paddingTop + plotH - (i / (steps - 1)) * plotH;
    
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(w - paddingRight, y);
    ctx.stroke();
    
    const secLabel = (yVal / 1000).toFixed(1) + 's';
    ctx.fillText(secLabel, 2, y);
  }
  
  // 2. Map coordinates
  const points = sortedData.map((lap, idx) => {
    const x = paddingLeft + (sortedData.length === 1 ? plotW / 2 : (idx / (sortedData.length - 1)) * plotW);
    const y = paddingTop + plotH - ((lap.lapTime - minBound) / boundRange) * plotH;
    return { x, y };
  });
  
  // 3. Area gradient
  if (points.length > 0) {
    const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + plotH);
    areaGradient.addColorStop(0, strokeColor + '20');
    areaGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, paddingTop + plotH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, paddingTop + plotH);
    ctx.closePath();
    ctx.fill();
  }
  
  // 4. Line stroke
  if (points.length > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = shadowColor;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  // 5. Draw point dots
  points.forEach(p => {
    ctx.fillStyle = colorScheme === 'light' ? '#ffffff' : '#0f1225';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  
  // 6. Trend Analysis Tag
  const trendTag = document.getElementById('chart-trend-tag');
  if (sortedData.length >= 2) {
    const halfIdx = Math.floor(sortedData.length / 2);
    const firstHalfAvg = sortedData.slice(0, halfIdx).reduce((sum, l) => sum + l.lapTime, 0) / halfIdx;
    const secondHalfAvg = sortedData.slice(halfIdx).reduce((sum, l) => sum + l.lapTime, 0) / (sortedData.length - halfIdx);
    
    const changePct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (changePct < -2.5) {
      trendTag.textContent = 'FASTER ⚡';
      trendTag.style.color = '#10b981';
      trendTag.style.background = 'rgba(16, 185, 129, 0.08)';
      trendTag.style.borderColor = 'rgba(16, 185, 129, 0.15)';
    } else if (changePct > 2.5) {
      trendTag.textContent = 'SLOWER ⏳';
      trendTag.style.color = '#f43f5e';
      trendTag.style.background = 'rgba(244, 63, 94, 0.08)';
      trendTag.style.borderColor = 'rgba(244, 63, 94, 0.15)';
    } else {
      trendTag.textContent = 'STEADY 🎯';
      trendTag.style.color = strokeColor;
      trendTag.style.background = pageStyles.getPropertyValue('--color-glow-light').trim();
      trendTag.style.borderColor = pageStyles.getPropertyValue('--color-glow').trim();
    }
  }
}

window.addEventListener('resize', renderChart);

// ==========================================
// EXPORTS
// ==========================================
function exportCSV() {
  getAudioContext();
  playBeep(440, 'sine', 0.04);
  if (laps.length === 0) return;
  
  const sorted = [...laps].reverse();
  let content = 'Lap,Lap Time (ms),Total Time (ms),Lap Time,Total Time\n';
  
  sorted.forEach(l => {
    const fl = formatTime(l.lapTime);
    const ft = formatTime(l.totalTime);
    const flStr = `${fl.hours}:${fl.minutes}:${fl.seconds}.${fl.centiseconds}`;
    const ftStr = `${ft.hours}:${ft.minutes}:${ft.seconds}.${ft.centiseconds}`;
    content += `${l.lapNumber},${Math.round(l.lapTime)},${Math.round(l.totalTime)},${flStr},${ftStr}\n`;
  });
  
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aetherwatch_laps_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function copyToClipboard() {
  getAudioContext();
  playBeep(440, 'sine', 0.04);
  if (laps.length === 0) return;
  
  const activeTheme = document.documentElement.getAttribute('data-theme') || 'cyan';
  const sorted = [...laps].reverse();
  
  let clipText = `=== AETHERWATCH EXPORT ===\n`;
  clipText += `Theme Context: ${activeTheme.toUpperCase()}\n`;
  clipText += `Laps Count: ${laps.length}\n`;
  clipText += `Date: ${new Date().toLocaleString()}\n`;
  clipText += `------------------------------------\n`;
  
  sorted.forEach(l => {
    const fl = formatTime(l.lapTime);
    const ft = formatTime(l.totalTime);
    const flStr = `${fl.minutes}:${fl.seconds}.${fl.centiseconds}`;
    const ftStr = `${ft.minutes}:${ft.seconds}.${ft.centiseconds}`;
    clipText += `Lap #${String(l.lapNumber).padEnd(2)} | Time: ${flStr} | Cum: ${ftStr}\n`;
  });
  
  clipText += `------------------------------------\n`;
  clipText += `Rendered with AetherWatch Stopwatch.`;
  
  navigator.clipboard.writeText(clipText).then(() => {
    const copyTextEl = btnCopyLaps.innerHTML;
    
    btnCopyLaps.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    btnCopyLaps.style.borderColor = '#10b981';
    btnCopyLaps.style.color = '#10b981';
    
    setTimeout(() => {
      btnCopyLaps.innerHTML = copyTextEl;
      btnCopyLaps.style.borderColor = '';
      btnCopyLaps.style.color = '';
    }, 2000);
  }).catch(e => {
    console.error('Clipboard copy failure', e);
  });
}

btnExportCSV.addEventListener('click', exportCSV);
btnCopyLaps.addEventListener('click', copyToClipboard);

// ==========================================
// STATE SAVE & RESTORE (LOCAL STORAGE)
// ==========================================
function saveState() {
  const theme = document.documentElement.getAttribute('data-theme') || 'cyan';
  const state = {
    currentMode,
    isRunning,
    accumulatedTime: isRunning ? (performance.now() - startTime) : accumulatedTime,
    currentLapAccumulatedTime: isRunning ? (performance.now() - currentLapStartTime) : currentLapAccumulatedTime,
    laps,
    savedAt: Date.now(),
    theme,
    colorScheme,
    countdownHours,
    countdownMinutes,
    countdownSeconds,
    countdownsCompleted,
    isSoundEnabled,
    isVoiceEnabled
  };
  localStorage.setItem('aether_stopwatch_state', JSON.stringify(state));
}

function restoreState() {
  const savedStateStr = localStorage.getItem('aether_stopwatch_state');
  if (!savedStateStr) {
    setScheme('dark');
    setTheme('cyan');
    return;
  }
  
  try {
    const state = JSON.parse(savedStateStr);
    
    // Restore sound/voice indicators
    isSoundEnabled = state.isSoundEnabled !== undefined ? state.isSoundEnabled : true;
    updateSoundUI();
    
    isVoiceEnabled = state.isVoiceEnabled !== undefined ? state.isVoiceEnabled : false;
    // Delay speech initialization slightly to avoid prompt blocks
    setTimeout(() => {
      initVoiceControl();
      if (isVoiceEnabled && voiceRecognition) {
        try {
          voiceRecognition.start();
          updateVoiceUI();
        } catch(e) {}
      }
    }, 500);
    
    // Restore Mode
    currentMode = state.currentMode || 'stopwatch';
    
    // Restore Theme & Colors
    setScheme(state.colorScheme || 'dark');
    setTheme(state.theme || 'cyan');
    
    // Restore count metrics
    countdownHours = state.countdownHours || 0;
    countdownMinutes = state.countdownMinutes || 0;
    countdownSeconds = state.countdownSeconds || 0;
    countdownsCompleted = state.countdownsCompleted || 0;
    
    laps = state.laps || [];
    
    // Drift calculations
    const now = Date.now();
    const timeDiff = state.isRunning ? (now - state.savedAt) : 0;
    
    accumulatedTime = (state.accumulatedTime || 0) + timeDiff;
    currentLapAccumulatedTime = (state.currentLapAccumulatedTime || 0) + timeDiff;
    
    updateDisplay(accumulatedTime);
    currentLapLabel.textContent = `LAP ${laps.length + 1}`;
    
    // Configure visual layouts depending on mode
    if (currentMode === 'stopwatch') {
      modeStopwatchBtn.classList.add('active');
      modeCountdownBtn.classList.remove('active');
      countdownSettingsSec.style.display = 'none';
      lapsSectionCard.style.display = 'flex';
      document.getElementById('app-subtitle').textContent = 'High-precision microsecond-accurate stopwatch';
      currentLapLabel.style.display = 'inline-block';
      
      renderLaps();
      renderChart();
    } else {
      modeStopwatchBtn.classList.remove('active');
      modeCountdownBtn.classList.add('active');
      countdownSettingsSec.style.display = 'flex';
      lapsSectionCard.style.display = 'none';
      chartSection.style.display = 'none';
      document.getElementById('app-subtitle').textContent = 'High-precision microsecond-accurate countdown';
      currentLapLabel.style.display = 'none';
      
      updateCountdownUI();
    }
    
    renderStats();
    
    // Resume run if active
    if (state.isRunning) {
      // If countdown has expired while page was away
      if (currentMode === 'countdown' && accumulatedTime >= (countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds) * 1000) {
        accumulatedTime = 0;
        countdownsCompleted++;
        updateDisplay(0);
        updateProgressCircle(0);
        playCountdownAlarm();
        renderStats();
        saveState();
        return;
      }
      
      isRunning = true;
      startTime = performance.now() - accumulatedTime;
      currentLapStartTime = performance.now() - currentLapAccumulatedTime;
      
      btnStartPause.classList.remove('play-state');
      btnStartPause.classList.add('pause-state');
      btnStartPauseText.textContent = 'Pause';
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      
      btnLapReset.removeAttribute('disabled');
      btnLapResetText.textContent = (currentMode === 'stopwatch') ? 'Lap' : 'Reset';
      if (currentMode === 'countdown') {
        btnLapReset.setAttribute('disabled', 'true');
      }
      
      requestWakeLock();
      animationFrameId = requestAnimationFrame(updateTime);
    } else {
      if (accumulatedTime > 0 || laps.length > 0) {
        btnLapReset.removeAttribute('disabled');
        btnLapResetText.textContent = 'Reset';
        btnStartPauseText.textContent = 'Resume';
      }
    }
  } catch (e) {
    console.error("Failed to restore AetherWatch state.", e);
  }
}

// Auto save triggers
window.addEventListener('beforeunload', saveState);
document.addEventListener('visibilitychange', saveState);

// ==========================================
// TOOLBAR BUTTON EVENT BINDINGS
// ==========================================
btnToggleScheme.addEventListener('click', () => {
  getAudioContext();
  playBeep(900, 'sine', 0.04);
  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';
  setScheme(nextScheme);
});

btnToggleSound.addEventListener('click', () => {
  isSoundEnabled = !isSoundEnabled;
  updateSoundUI();
  getAudioContext();
  playBeep(800, 'sine', 0.04);
  saveState();
});

function updateSoundUI() {
  if (isSoundEnabled) {
    btnToggleSound.classList.add('active');
    iconVolumeOn.style.display = 'block';
    iconVolumeOff.style.display = 'none';
  } else {
    btnToggleSound.classList.remove('active');
    iconVolumeOn.style.display = 'none';
    iconVolumeOff.style.display = 'block';
  }
}

btnToggleVoice.addEventListener('click', toggleVoice);

modeStopwatchBtn.addEventListener('click', () => {
  getAudioContext();
  playBeep(700, 'sine', 0.05);
  setMode('stopwatch');
});

modeCountdownBtn.addEventListener('click', () => {
  getAudioContext();
  playBeep(700, 'sine', 0.05);
  setMode('countdown');
});

// Theme select tags
document.querySelectorAll('[data-theme-select]').forEach(btn => {
  btn.addEventListener('click', () => {
    getAudioContext();
    playBeep(1000, 'sine', 0.04);
    const selectedTheme = btn.getAttribute('data-theme-select');
    setTheme(selectedTheme);
  });
});

// Adjust click triggers for countdown
document.querySelectorAll('[data-adjust]').forEach(btn => {
  btn.addEventListener('click', () => {
    const unit = btn.getAttribute('data-adjust');
    const dir = btn.getAttribute('data-dir');
    adjustCountdown(unit, dir);
  });
});

// ==========================================
// CORE BUTTON BINDINGS
// ==========================================
btnStartPause.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

btnLapReset.addEventListener('click', () => {
  if (isRunning) {
    recordLap();
  } else {
    resetTimer();
  }
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  } else if (e.code === 'KeyL') {
    if (isRunning && currentMode === 'stopwatch') {
      recordLap();
    }
  } else if (e.code === 'KeyR') {
    if (!isRunning && (accumulatedTime > 0 || laps.length > 0)) {
      resetTimer();
    }
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  restoreState();
});
