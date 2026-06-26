// ─── DATA & CONFIG ───────────────────────────────────────
// 読み込みたいJSONファイルをここにすべて列挙します
const QUESTION_FILES = ['questions.json', 'questions2.json', 'questions3.json']; 
const COUNT_OPTIONS = [10, 30, 50, 100, 200, 300, 400, 500];
const NUMS = ['①','②','③','④'];

// ─── STATE ───────────────────────────────────────────────
let allQuestions = []; // 全ファイルから統合された問題データ
let sessionQ = [];     // 今回出題する問題
let choiceMap = [];    // 選択肢のシャッフル写像
let current = 0;
let answers = [];      // 回答記録
let score = 0;
let selectedCount = 10;

// タイマー関連
let timerSec = 0;
let timerInterval = null;
let startTime = null;
let isTimerActive = false;

// ─── DATA LOADING ────────────────────────────────────────
async function loadAllQuestions() {
  try {
    const promises = QUESTION_FILES.map(file => 
      fetch(file).then(res => {
        if (!res.ok) throw new Error(`Failed to load ${file}`);
        return res.json();
      })
    );
    const results = await Promise.all(promises);
    // すべての問題配列を1つに統合
    allQuestions = results.flat();
    
    document.getElementById('loadingMsg').style.display = 'none';
    UI.initSetup();
    UI.showScreen('setupScreen');
  } catch(e) {
    document.getElementById('loadingMsg').innerHTML =
      `<div style="color:#ef4444">問題ファイルの読み込みに失敗しました。<br>ファイル名やCORS制限を確認してください。</div>`;
  }
}

// ─── TIMER LOGIC ─────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  if (!isTimerActive) return;
  
  startTime = Date.now() - (timerSec * 1000);
  timerInterval = setInterval(() => {
    timerSec = Math.floor((Date.now() - startTime) / 1000);
    UI.updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ─── UTILS ───────────────────────────────────────────────
function shuffle(arr) { return shuffleArr([...arr]); }
function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 起動時に全問題を読み込み
window.addEventListener('DOMContentLoaded', loadAllQuestions);