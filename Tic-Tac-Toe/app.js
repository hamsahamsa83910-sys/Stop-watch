/**
 * Cosmic Tic-Tac-Toe Upgraded Game Logic
 * Features:
 * - Dynamic Board Sizes (3x3, 4x4, 5x5, 6x6)
 * - LocalStorage Leaderboard & History logger
 * - Web Speech API Voice Commands
 * - Synthesized Space Ambient Background Music & Retro Sound Effects
 * - Theme management
 * - High-speed heuristic line AI for large boards, Minimax for 3x3
 */

// Game Configuration & State
let boardSize = 3; // Default 3x3
let winConditionCount = 3; // 3 in a row
let board = [];
let currentPlayer = 'X';
let isGameActive = false;
let gameMode = 'pvp'; // 'pvp' or 'ai'
let aiDifficulty = 'easy'; // 'easy', 'medium', 'hard'
let playerNames = { X: 'Player 1', O: 'Player 2' };

// Sound & Music Synthesizer States
let soundEnabled = true;
let musicEnabled = false;
let audioCtx = null;
let bgMusicNode = null; // Oscillator for low drone
let bgMelodyTimer = null; // Timer for periodic ambient notes

// Speech Recognition State
let voiceActive = false;
let recognition = null;

// Confetti Particle System
let canvas = null;
let ctx = null;
let confettiParticles = [];
let animationId = null;

// Dynamic DOM Elements Selection
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const modePvpBtn = document.getElementById('btn-mode-pvp');
const modeAiBtn = document.getElementById('btn-mode-ai');
const aiDifficultyContainer = document.getElementById('ai-difficulty-container');
const p2NameField = document.getElementById('p2-name-field');
const player1NameInput = document.getElementById('player1-name');
const player2NameInput = document.getElementById('player2-name');
const btnStartGame = document.getElementById('btn-start-game');

const themeSelector = document.getElementById('theme-selector');
const gridButtons = document.querySelectorAll('.btn-grid-size');
const winConditionInfo = document.getElementById('win-condition-info');

const currentDisplay = document.getElementById('current-player-display');
const turnIndicatorBox = document.getElementById('turn-indicator-box');
const soundToggleBtn = document.getElementById('btn-sound-toggle');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');

const musicToggleBtn = document.getElementById('btn-music-toggle');
const iconMusicOn = document.getElementById('icon-music-on');
const iconMusicOff = document.getElementById('icon-music-off');

const voiceToggleBtn = document.getElementById('btn-voice-toggle');
const voiceStatusPanel = document.getElementById('voice-status-panel');
const voiceTranscript = document.getElementById('voice-transcript');

const scoreLabelX = document.getElementById('score-label-x');
const scoreLabelO = document.getElementById('score-label-o');
const scoreValX = document.getElementById('score-val-x');
const scoreValO = document.getElementById('score-val-o');
const scoreValDraw = document.getElementById('score-val-draw');
const scoreCardX = document.getElementById('score-card-x');
const scoreCardO = document.getElementById('score-card-o');

const gameBoard = document.getElementById('game-board');

const btnResetRound = document.getElementById('btn-reset-round');
const btnChangeSetup = document.getElementById('btn-change-setup');
const btnResetScores = document.getElementById('btn-clear-stats');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const leaderboardTbody = document.getElementById('leaderboard-tbody');
const historyLogList = document.getElementById('history-log-list');

// Persistent Score Counter
let matchScores = { X: 0, O: 0, draws: 0 };

/* ==========================================================================
   Initialization & Theme Handler
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadStatsFromLocalStorage();
  renderLeaderboard();
  renderHistory();

  // Setup Theme Selector Listener
  themeSelector.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Apply default local theme selection
  const storedTheme = localStorage.getItem('cosmic-tic-tac-toe-theme') || 'theme-nebula';
  themeSelector.value = storedTheme;
  applyTheme(storedTheme);
});

function applyTheme(themeName) {
  document.body.className = '';
  document.body.classList.add(themeName);
  localStorage.setItem('cosmic-tic-tac-toe-theme', themeName);
  playClickSound();
}

/* ==========================================================================
   Sound & Ambient Music Synthesis Engine (Web Audio API)
   ========================================================================== */

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freqStart, freqEnd, duration, type = 'sine', volume = 0.12) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

function playClickSound() { playTone(800, 400, 0.05, 'triangle', 0.08); }
function playMarkerXSound() { playTone(523.25, 783.99, 0.1, 'sine', 0.12); }
function playMarkerOSound() { playTone(329.63, 220.00, 0.12, 'sine', 0.12); }
function playDrawSound() { playTone(160, 80, 0.4, 'sawtooth', 0.08); }
function playResetSound() { playTone(440, 660, 0.15, 'sine', 0.1); }

function playWinSound() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playTone(freq, freq * 1.02, 0.25, 'triangle', 0.08);
    }, index * 80);
  });
}

// Low frequency ambient cosmic synthesizer background music
function toggleBackgroundMusic() {
  initAudio();
  if (!audioCtx) return;

  musicEnabled = !musicEnabled;

  if (musicEnabled) {
    iconMusicOn.classList.remove('hidden');
    iconMusicOff.classList.add('hidden');
    startAmbientMusic();
  } else {
    iconMusicOn.classList.add('hidden');
    iconMusicOff.classList.remove('hidden');
    stopAmbientMusic();
  }
}

function startAmbientMusic() {
  try {
    // 1. Create a deep space continuous drone
    bgMusicNode = audioCtx.createOscillator();
    const bgGain = audioCtx.createGain();

    bgMusicNode.type = 'sine';
    bgMusicNode.frequency.value = 65.41; // C2 deep drone freq
    
    bgGain.gain.value = 0.03; // Extremely low backing volume
    bgMusicNode.connect(bgGain);
    bgGain.connect(audioCtx.destination);
    
    bgMusicNode.start();

    // 2. Setup periodic soothing ambient chime notes
    const melodyNotes = [261.63, 329.63, 392.00, 523.25, 587.33]; // C4, E4, G4, C5, D5
    
    function playNextMelody() {
      if (!musicEnabled) return;
      
      const randomFreq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
      // Slow soft glide tone
      playTone(randomFreq, randomFreq * 0.99, 2.5, 'sine', 0.02);
      
      // Schedule next ambient note in 4 to 8 seconds
      const nextDelay = 4000 + Math.random() * 4000;
      bgMelodyTimer = setTimeout(playNextMelody, nextDelay);
    }
    
    // Begin melody chain
    playNextMelody();
  } catch (err) {
    console.warn("Could not start background synth drone:", err);
  }
}

function stopAmbientMusic() {
  if (bgMusicNode) {
    try {
      bgMusicNode.stop();
    } catch (e) {}
    bgMusicNode = null;
  }
  if (bgMelodyTimer) {
    clearTimeout(bgMelodyTimer);
    bgMelodyTimer = null;
  }
}

/* ==========================================================================
   Voice Command Engine (Web Speech API)
   ========================================================================== */

function toggleVoiceControl() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in your browser. Please try Google Chrome.");
    return;
  }

  initAudio();
  voiceActive = !voiceActive;

  if (voiceActive) {
    voiceToggleBtn.classList.add('listening');
    voiceStatusPanel.classList.remove('hidden');
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      voiceTranscript.textContent = "Listening... Say 'cell 5' or 'row 2 column 3'";
    };

    recognition.onresult = (event) => {
      const resultText = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      voiceTranscript.textContent = `You said: "${resultText}"`;
      parseVoiceCommand(resultText);
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
    };

    recognition.onend = () => {
      if (voiceActive) {
        recognition.start(); // Keep listening recursively
      }
    };

    recognition.start();
    playTone(800, 1000, 0.15, 'sine', 0.08); // high tone chirp on active
  } else {
    voiceToggleBtn.classList.remove('listening');
    voiceStatusPanel.classList.add('hidden');
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    playTone(1000, 800, 0.15, 'sine', 0.08); // falling chime on disable
  }
}

function parseVoiceCommand(cmd) {
  if (!isGameActive) return;

  // Standard Voice Commands
  if (cmd.includes('reset') || cmd.includes('next round') || cmd.includes('play again')) {
    playResetSound();
    startNewRound();
    return;
  }

  if (cmd.includes('mute') || cmd.includes('disable sound')) {
    soundEnabled = false;
    iconSoundOn.classList.add('hidden');
    iconSoundOff.classList.remove('hidden');
    return;
  }

  // Row Column extraction e.g. "row 2 column 3" or "row two column one"
  const numbersMap = {
    one: 1, 1: 1,
    two: 2, 2: 2,
    three: 3, 3: 3,
    four: 4, 4: 4,
    five: 5, 5: 5,
    six: 6, 6: 6
  };

  const rowMatch = cmd.match(/row\s+(\w+)/);
  const colMatch = cmd.match(/(?:column|col)\s+(\w+)/);

  if (rowMatch && colMatch) {
    const rowWord = rowMatch[1];
    const colWord = colMatch[1];

    const r = numbersMap[rowWord];
    const c = numbersMap[colWord];

    if (r !== undefined && c !== undefined && r >= 1 && r <= boardSize && c >= 1 && c <= boardSize) {
      const idx = (r - 1) * boardSize + (c - 1);
      attemptCellSelection(idx);
      return;
    }
  }

  // Cell extraction e.g. "cell five", "cell 12", "box 4"
  const cellMatch = cmd.match(/(?:cell|box|square|slot)\s+(\w+)/);
  if (cellMatch) {
    const cellVal = cellMatch[1];
    let numIdx = numbersMap[cellVal];
    
    if (numIdx === undefined) {
      numIdx = parseInt(cellVal);
    }

    if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= (boardSize * boardSize)) {
      attemptCellSelection(numIdx - 1);
      return;
    }
  }
}

function attemptCellSelection(index) {
  if (board[index] === '' && isGameActive) {
    if (gameMode === 'ai' && currentPlayer === 'O') return; // block player picking during AI moves
    makeMove(index);
  }
}

/* ==========================================================================
   Visual Theme Selectors & Dynamic Configurations
   ========================================================================== */

// Config click listeners for Grid selector buttons
gridButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    gridButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    boardSize = parseInt(btn.dataset.size);
    
    // Set matching winning rules
    if (boardSize === 3) {
      winConditionCount = 3;
    } else if (boardSize === 4) {
      winConditionCount = 4;
    } else if (boardSize === 5) {
      winConditionCount = 4; // 4 in a row for 5x5 feels most dynamic
    } else if (boardSize === 6) {
      winConditionCount = 5;
    }
    
    winConditionInfo.textContent = `Requires ${winConditionCount} in a row to win`;
  });
});

// PVP vs AI Selection toggle
modePvpBtn.addEventListener('click', () => {
  playClickSound();
  gameMode = 'pvp';
  modePvpBtn.classList.add('active');
  modeAiBtn.classList.remove('active');
  aiDifficultyContainer.classList.add('hidden');
  p2NameField.classList.remove('hidden');
  player2NameInput.value = playerNames.O.startsWith('AI') ? 'Player 2' : playerNames.O;
});

modeAiBtn.addEventListener('click', () => {
  playClickSound();
  gameMode = 'ai';
  modeAiBtn.classList.add('active');
  modePvpBtn.classList.remove('active');
  aiDifficultyContainer.classList.remove('hidden');
  p2NameField.classList.add('hidden');
});

// Configure AI difficulty options
const diffButtons = document.querySelectorAll('.difficulty-group .btn-outline');
diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    diffButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    aiDifficulty = btn.dataset.difficulty;
  });
});

// Configure system sound muter controls
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    iconSoundOn.classList.remove('hidden');
    iconSoundOff.classList.add('hidden');
    initAudio();
    playTone(600, 600, 0.05, 'sine', 0.1);
  } else {
    iconSoundOn.classList.add('hidden');
    iconSoundOff.classList.remove('hidden');
  }
});

// Background music toggle connector
musicToggleBtn.addEventListener('click', toggleBackgroundMusic);

// Setup start match click
btnStartGame.addEventListener('click', () => {
  initAudio();
  playClickSound();

  playerNames.X = player1NameInput.value.trim() || 'Player 1';
  if (gameMode === 'pvp') {
    playerNames.O = player2NameInput.value.trim() || 'Player 2';
  } else {
    const formattedDiff = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
    playerNames.O = `AI (${formattedDiff})`;
  }

  scoreLabelX.textContent = `${playerNames.X} (X)`;
  scoreLabelO.textContent = `${playerNames.O} (O)`;

  // Reset scores for completely new game config session
  matchScores = { X: 0, O: 0, draws: 0 };
  updateScoreboardUI();

  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  // Trigger grid initializers
  initConfetti();
  startNewRound();
});

/* ==========================================================================
   Core Game Loops
   ========================================================================== */

function startNewRound() {
  // Construct dynamic board elements
  board = Array(boardSize * boardSize).fill('');
  currentPlayer = 'X';
  isGameActive = true;
  gameBoard.classList.remove('shake-board');

  // Generate dynamic CSS columns
  gameBoard.style.setProperty('--grid-cols', boardSize);
  
  // Wipe and rebuild elements dynamically
  gameBoard.innerHTML = '';
  for (let i = 0; i < boardSize * boardSize; i++) {
    const cellBtn = document.createElement('button');
    cellBtn.className = 'cell';
    cellBtn.dataset.index = i;
    cellBtn.setAttribute('role', 'gridcell');
    cellBtn.setAttribute('aria-label', `Cell ${i + 1}, empty`);
    
    // Click listener
    cellBtn.addEventListener('click', () => {
      attemptCellSelection(i);
    });

    gameBoard.appendChild(cellBtn);
  }

  updateActiveTurnUI();
}

function updateActiveTurnUI() {
  if (currentPlayer === 'X') {
    currentDisplay.textContent = playerNames.X;
    currentDisplay.className = 'player-x-text';
    scoreCardX.classList.add('active-x');
    scoreCardO.classList.remove('active-o');
  } else {
    currentDisplay.textContent = playerNames.O;
    currentDisplay.className = 'player-o-text';
    scoreCardO.classList.add('active-o');
    scoreCardX.classList.remove('active-x');
  }
}

function updateScoreboardUI() {
  scoreValX.textContent = matchScores.X;
  scoreValO.textContent = matchScores.O;
  scoreValDraw.textContent = matchScores.draws;
}

function makeMove(index) {
  board[index] = currentPlayer;

  const cellElement = gameBoard.children[index];
  cellElement.textContent = currentPlayer;
  cellElement.classList.add(currentPlayer.toLowerCase());
  cellElement.setAttribute('aria-label', `Cell ${index + 1}, marked ${currentPlayer}`);

  if (currentPlayer === 'X') {
    playMarkerXSound();
  } else {
    playMarkerOSound();
  }

  // Check state
  const winObj = checkWinner(board, boardSize, winConditionCount);
  if (winObj) {
    endGame(winObj);
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateActiveTurnUI();

    if (gameMode === 'ai' && currentPlayer === 'O' && isGameActive) {
      setTimeout(makeAIMove, 500); // realistic think timer
    }
  }
}

function endGame(winObj) {
  isGameActive = false;
  scoreCardX.classList.remove('active-x');
  scoreCardO.classList.remove('active-o');

  if (winObj.winner === 'Draw') {
    matchScores.draws++;
    currentDisplay.textContent = "It's a Draw!";
    currentDisplay.className = 'player-draw-text';
    gameBoard.classList.add('shake-board');
    playDrawSound();
  } else {
    matchScores[winObj.winner]++;
    const winnerName = playerNames[winObj.winner];
    currentDisplay.textContent = `${winnerName} Wins!`;
    currentDisplay.className = winObj.winner === 'X' ? 'player-x-text' : 'player-o-text';

    // Highlight winning row cells
    winObj.line.forEach(idx => {
      gameBoard.children[idx].classList.add('winning-cell');
    });

    playWinSound();
    triggerConfetti();
  }

  updateScoreboardUI();
  saveMatchToHistory(winObj.winner);
}

/* ==========================================================================
   Generalized Multi-Grid Check Winner Logic
   ========================================================================== */

function checkWinner(gridBoard, size, winCount) {
  // Helper to generate sequences of winning lines
  const lines = getWinningLines(size, winCount);

  for (let line of lines) {
    const firstVal = gridBoard[line[0]];
    if (firstVal) {
      let isWin = true;
      for (let idx of line) {
        if (gridBoard[idx] !== firstVal) {
          isWin = false;
          break;
        }
      }
      if (isWin) {
        return { winner: firstVal, line: line };
      }
    }
  }

  if (!gridBoard.includes('')) {
    return { winner: 'Draw' };
  }

  return null;
}

/**
 * Builds list of sequences that qualify for victory
 */
function getWinningLines(size, winCount) {
  const list = [];

  // Rows check
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winCount; c++) {
      const seq = [];
      for (let w = 0; w < winCount; w++) {
        seq.push(r * size + (c + w));
      }
      list.push(seq);
    }
  }

  // Columns check
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winCount; r++) {
      const seq = [];
      for (let w = 0; w < winCount; w++) {
        seq.push((r + w) * size + c);
      }
      list.push(seq);
    }
  }

  // Diagonals (down-right)
  for (let r = 0; r <= size - winCount; r++) {
    for (let c = 0; c <= size - winCount; c++) {
      const seq = [];
      for (let w = 0; w < winCount; w++) {
        seq.push((r + w) * size + (c + w));
      }
      list.push(seq);
    }
  }

  // Diagonals (down-left)
  for (let r = 0; r <= size - winCount; r++) {
    for (let c = winCount - 1; c < size; c++) {
      const seq = [];
      for (let w = 0; w < winCount; w++) {
        seq.push((r + w) * size + (c - w));
      }
      list.push(seq);
    }
  }

  return list;
}

/* ==========================================================================
   Smart Heuristic Multi-Grid AI Engine
   ========================================================================== */

function makeAIMove() {
  if (!isGameActive) return;

  let move;
  if (aiDifficulty === 'easy') {
    move = getEasyMove();
  } else if (aiDifficulty === 'medium') {
    // 50% chance heuristic, 50% chance random
    if (Math.random() > 0.5) {
      move = getBestHeuristicMove();
    } else {
      move = getEasyMove();
    }
  } else {
    // Hard/Unbeatable AI
    if (boardSize === 3) {
      move = getMinimaxMove(); // perfect tree search on small board
    } else {
      move = getBestHeuristicMove(); // highly optimized linear weights scanner on larger boards
    }
  }

  if (move !== undefined && move !== null) {
    makeMove(move);
  }
}

function getEasyMove() {
  const empties = getEmptyIndexes(board);
  return empties[Math.floor(Math.random() * empties.length)];
}

function getEmptyIndexes(currentBoard) {
  const list = [];
  for (let i = 0; i < currentBoard.length; i++) {
    if (currentBoard[i] === '') list.push(i);
  }
  return list;
}

/**
 * 3x3 Perfect Minimax Solver
 */
function getMinimaxMove() {
  let bestScore = -Infinity;
  let move = null;

  const empties = getEmptyIndexes(board);
  for (let idx of empties) {
    board[idx] = 'O';
    let val = minimax(board, 0, false);
    board[idx] = '';
    if (val > bestScore) {
      bestScore = val;
      move = idx;
    }
  }
  return move;
}

function minimax(currBoard, depth, isMaximizing) {
  const result = checkWinner(currBoard, 3, 3);
  if (result) {
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    if (result.winner === 'Draw') return 0;
  }

  const empties = getEmptyIndexes(currBoard);

  if (isMaximizing) {
    let best = -Infinity;
    for (let idx of empties) {
      currBoard[idx] = 'O';
      best = Math.max(best, minimax(currBoard, depth + 1, false));
      currBoard[idx] = '';
    }
    return best;
  } else {
    let best = Infinity;
    for (let idx of empties) {
      currBoard[idx] = 'X';
      best = Math.min(best, minimax(currBoard, depth + 1, true));
      currBoard[idx] = '';
    }
    return best;
  }
}

/**
 * Advanced Line-Weight Heuristic AI for sizes (4x4, 5x5, 6x6)
 * Rates cells by threat levels and opportunism across winning corridors
 */
function getBestHeuristicMove() {
  const empties = getEmptyIndexes(board);
  if (empties.length === 0) return null;

  let bestMove = empties[0];
  let maxScore = -Infinity;

  const lines = getWinningLines(boardSize, winConditionCount);

  // Evaluate scores for each empty slot
  for (let cell of empties) {
    let score = 0;

    // Fast-path: pick center on early moves
    if (boardSize > 3 && cell === Math.floor((boardSize * boardSize) / 2) && empties.length > (boardSize * boardSize - 3)) {
      score += 15;
    }

    for (let line of lines) {
      if (!line.includes(cell)) continue;

      // Count O's and X's in this corridor
      let oCount = 0;
      let xCount = 0;

      for (let idx of line) {
        if (board[idx] === 'O') oCount++;
        else if (board[idx] === 'X') xCount++;
      }

      // Assign weighting weights
      if (xCount === 0 && oCount > 0) {
        // AI's own corridor with potential to advance
        if (oCount === winConditionCount - 1) score += 10000; // Complete immediately to win
        else if (oCount === winConditionCount - 2) score += 150; // Prepare threats
        else score += 10;
      } else if (oCount === 0 && xCount > 0) {
        // Opponent corridor we need to block
        if (xCount === winConditionCount - 1) score += 3000; // Immediate defense block!
        else if (xCount === winConditionCount - 2) score += 80;  // Pre-emptive block
        else score += 5;
      } else if (oCount === 0 && xCount === 0) {
        // Pure empty corridor
        score += 2;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMove = cell;
    }
  }

  return bestMove;
}

/* ==========================================================================
   LocalStorage History Logging & Leaderboards
   ========================================================================== */

let leaderboardData = [];
let matchHistoryData = [];

function loadStatsFromLocalStorage() {
  const storedLeaderboard = localStorage.getItem('cosmic-leaderboard');
  const storedHistory = localStorage.getItem('cosmic-history');

  leaderboardData = storedLeaderboard ? JSON.parse(storedLeaderboard) : [];
  matchHistoryData = storedHistory ? JSON.parse(storedHistory) : [];
}

function saveStatsToLocalStorage() {
  localStorage.setItem('cosmic-leaderboard', JSON.stringify(leaderboardData));
  localStorage.setItem('cosmic-history', JSON.stringify(matchHistoryData));
}

function saveMatchToHistory(winner) {
  const p1 = playerNames.X;
  const p2 = playerNames.O;
  
  // 1. Log Match Entry
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const turns = board.filter(c => c !== '').length;

  const matchEntry = {
    p1: p1,
    p2: p2,
    grid: `${boardSize}x${boardSize}`,
    winner: winner, // 'X', 'O', or 'Draw'
    date: dateStr,
    turns: turns
  };

  matchHistoryData.unshift(matchEntry); // Prepend to history logs list
  if (matchHistoryData.length > 30) {
    matchHistoryData.pop(); // keep log limit capped to 30
  }

  // 2. Update Leaderboard Stats for Players
  updatePlayerLeaderboardStats(p1, winner === 'X' ? 'win' : winner === 'O' ? 'loss' : 'draw');
  if (gameMode === 'pvp' || !p2.startsWith('AI')) {
    updatePlayerLeaderboardStats(p2, winner === 'O' ? 'win' : winner === 'X' ? 'loss' : 'draw');
  }

  saveStatsToLocalStorage();
  renderLeaderboard();
  renderHistory();
}

function updatePlayerLeaderboardStats(name, outcome) {
  let playerRecord = leaderboardData.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!playerRecord) {
    playerRecord = { name: name, played: 0, wins: 0, losses: 0, draws: 0 };
    leaderboardData.push(playerRecord);
  }

  playerRecord.played++;
  if (outcome === 'win') playerRecord.wins++;
  else if (outcome === 'loss') playerRecord.losses++;
  else playerRecord.draws++;

  // Sort: Rank by wins descending, then played descending
  leaderboardData.sort((a, b) => b.wins - a.wins || a.played - b.played);
}

function renderLeaderboard() {
  if (leaderboardData.length === 0) {
    leaderboardTbody.innerHTML = `
      <tr>
        <td colspan="6" class="placeholder-row">No leaderboard stats recorded yet.</td>
      </tr>
    `;
    return;
  }

  leaderboardTbody.innerHTML = '';
  leaderboardData.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${idx + 1}</strong></td>
      <td>${escapeHTML(row.name)}</td>
      <td>${row.played}</td>
      <td>${row.wins}</td>
      <td>${row.losses}</td>
      <td>${row.draws}</td>
    `;
    leaderboardTbody.appendChild(tr);
  });
}

function renderHistory() {
  if (matchHistoryData.length === 0) {
    historyLogList.innerHTML = `<p class="placeholder-text">No matches logged yet.</p>`;
    return;
  }

  historyLogList.innerHTML = '';
  matchHistoryData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item fade-in';

    let outcomeText = '';
    let outcomeClass = '';

    if (item.winner === 'Draw') {
      outcomeText = 'Draw';
      outcomeClass = 'winner-draw';
    } else if (item.winner === 'X') {
      outcomeText = `${item.p1} won`;
      outcomeClass = 'winner-x';
    } else {
      outcomeText = `${item.p2} won`;
      outcomeClass = 'winner-o';
    }

    div.innerHTML = `
      <div>
        <div class="history-players">${escapeHTML(item.p1)} <span style="color: var(--text-muted);">vs</span> ${escapeHTML(item.p2)}</div>
        <div class="history-meta">${item.grid} board &bull; ${item.turns} turns &bull; ${item.date}</div>
      </div>
      <span class="history-winner ${outcomeClass}">${outcomeText}</span>
    `;

    historyLogList.appendChild(div);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Reset Local Scores and Clear Logs
btnResetScores.addEventListener('click', () => {
  if (confirm("Are you sure you want to completely erase the leaderboard and match history?")) {
    playResetSound();
    leaderboardData = [];
    matchHistoryData = [];
    matchScores = { X: 0, O: 0, draws: 0 };
    updateScoreboardUI();
    saveStatsToLocalStorage();
    renderLeaderboard();
    renderHistory();
  }
});

/* ==========================================================================
   Tab Panel Switching
   ========================================================================== */

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));

    btn.classList.add('active');
    const paneId = btn.dataset.tab;
    document.getElementById(paneId).classList.add('active');
  });
});

/* ==========================================================================
   Resets and Dashboard Actions
   ========================================================================== */

btnResetRound.addEventListener('click', () => {
  playResetSound();
  startNewRound();
});

btnChangeSetup.addEventListener('click', () => {
  playClickSound();
  isGameActive = false;
  gameScreen.classList.add('hidden');
  setupScreen.classList.remove('hidden');
});

/* ==========================================================================
   Confetti Physics Canvas Elements
   ========================================================================== */

function initConfetti() {
  canvas = document.getElementById('confetti-canvas');
  ctx = canvas.getContext('2d');
  resizeConfettiCanvas();
  window.addEventListener('resize', resizeConfettiCanvas);
}

function resizeConfettiCanvas() {
  if (canvas) {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
}

class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 4;
    this.color = this.getRandomColor();
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * -6 - 4;
    this.gravity = 0.18;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
    this.opacity = 1;
    this.fade = Math.random() * 0.015 + 0.015;
  }

  getRandomColor() {
    const colors = ['#00f2fe', '#ff007f', '#f5a623', '#ffffff', '#b829ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.speedX;
    this.speedY += this.gravity;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    this.opacity -= this.fade;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function triggerConfetti() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  confettiParticles = [];

  const boardWidth = canvas.width;
  const boardHeight = canvas.height;

  for (let i = 0; i < 50; i++) {
    confettiParticles.push(new ConfettiParticle(15, boardHeight - 15));
    confettiParticles.push(new ConfettiParticle(boardWidth - 15, boardHeight - 15));
  }

  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  confettiParticles.forEach((p, idx) => {
    p.update();
    p.draw();
    if (p.opacity <= 0 || p.y > canvas.height) {
      confettiParticles.splice(idx, 1);
    }
  });

  if (confettiParticles.length > 0) {
    animationId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
