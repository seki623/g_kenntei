const UI = {
  // ─── SETUP SCREEN ───────────────────────────────────────
  initSetup() {
    const total = allQuestions.length;
    document.getElementById('totalBadge').textContent = `全 ${total} 問のデータベースから出題`;
    document.getElementById('statsBadge').innerHTML = `<span>総問題数: <strong>${total}</strong></span>`;
    document.getElementById('headerInfo').textContent = `${total} 問`;

    const grid = document.getElementById('countGrid');
    grid.innerHTML = '';
    COUNT_OPTIONS.forEach(n => {
      const btn = document.createElement('button');
      btn.className = 'count-btn';
      const isOver = n > total;
      if (isOver) {
        btn.className += ' disabled';
        btn.innerHTML = `${n}<span class="sub">全問 (${total})</span>`;
        btn.onclick = () => this.selectCount(total, btn);
      } else {
        btn.innerHTML = `${n}<span class="sub">問</span>`;
        btn.onclick = () => this.selectCount(n, btn);
      }
      btn.dataset.val = isOver ? total : n;
      grid.appendChild(btn);
    });

    const defaultN = Math.min(10, total);
    this.selectCount(defaultN, grid.querySelector(`[data-val="${defaultN}"]`) || grid.firstChild);
  },

  selectCount(n, btn) {
    selectedCount = n;
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
  },

  // ─── GAME START ──────────────────────────────────────────
  startQuiz() {
    const doShuffleQ = document.getElementById('shuffleQ').checked;
    const doShuffleC = document.getElementById('shuffleC').checked;
    isTimerActive = document.getElementById('useTimer').checked;

    let pool = [...allQuestions];
    if (doShuffleQ) pool = shuffle(pool);
    sessionQ = pool.slice(0, selectedCount);

    this.setupSession(doShuffleC);
  },

  setupSession(doShuffleC) {
    choiceMap = sessionQ.map(q => {
      const idxs = [0, 1, 2, 3];
      if (doShuffleC) shuffleArr(idxs);
      return idxs;
    });

    current = 0;
    answers = new Array(sessionQ.length).fill(null);
    score = 0;
    timerSec = 0;

    const timerEl = document.getElementById('timerEl');
    if (isTimerActive) {
      timerEl.classList.remove('hidden');
      this.updateTimerDisplay();
      startTimer();
    } else {
      timerEl.classList.add('hidden');
    }

    this.showScreen('quizScreen');
    document.getElementById('qTotal').textContent = sessionQ.length;
    this.renderQuestion();
  },

  // ─── RENDER QUESTION ─────────────────────────────────────
  renderQuestion() {
    const q = sessionQ[current];
    const map = choiceMap[current];
    const total = sessionQ.length;

    document.getElementById('qNum').textContent = current + 1;
    document.getElementById('progressFill').style.width = `${(current / total) * 100}%`;
    document.getElementById('correctTrack').textContent = `正答: ${score} / ${current}`;
    document.getElementById('questionText').textContent = q.question;

    const area = document.getElementById('choicesArea');
    area.innerHTML = '';
    map.forEach((origIdx, dispPos) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="c-num">${NUMS[dispPos]}</span><span>${q.choices[origIdx]}</span>`;
      btn.onclick = () => this.selectAnswer(dispPos);
      area.appendChild(btn);
    });

    document.getElementById('explanation').classList.remove('show');
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('backBtn').style.display = current === 0 ? 'none' : '';

    const prev = answers[current];
    if (prev !== null) {
      this.applyAnswerState(prev.chosenDisp, prev.correctDisp, q.explanation);
    }
  },

  selectAnswer(dispPos) {
    if (answers[current] !== null) return;
    const q = sessionQ[current];
    const map = choiceMap[current];
    const origChosen = map[dispPos];
    const correctDisp = map.indexOf(q.correct);

    const isCorrect = (origChosen === q.correct);
    if (isCorrect) score++;
    answers[current] = { chosenDisp: dispPos, correctDisp, origChosen };

    this.applyAnswerState(dispPos, correctDisp, q.explanation);
    document.getElementById('correctTrack').textContent = `正答: ${score} / ${current + 1}`;
  },

  applyAnswerState(chosenDisp, correctDisp, explanation) {
    const btns = document.querySelectorAll('.choice-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctDisp) btn.classList.add('correct');
      if (i === chosenDisp && chosenDisp !== correctDisp) btn.classList.add('wrong');
    });

    const showExp = document.getElementById('showExp').checked;
    if (showExp && explanation) {
      document.getElementById('explanationText').textContent = explanation;
      document.getElementById('explanation').classList.add('show');
    }

    const isLast = current === sessionQ.length - 1;
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.style.display = '';
    nextBtn.textContent = isLast ? '結果を見る' : '次へ →';
  },

  // ─── NAVIGATION & ABORT ──────────────────────────────────
  goNext() {
    if (current < sessionQ.length - 1) {
      current++;
      this.renderQuestion();
    } else {
      stopTimer();
      this.showResult();
    }
  },

  goBack() {
    if (current > 0) {
      current--;
      this.renderQuestion();
    }
  },

  abortQuiz() {
    if (confirm('クイズを途中で終了して結果画面へ進みますか？')) {
      stopTimer();
      this.showResult(true); // 中断フラグを渡す
    }
  },

  // ─── RESULT SCREEN ───────────────────────────────────────
  showResult(isAborted = false) {
    // 途中終了の場合は、実際に解いた（回答が存在する）問題数のみを分母にする
    const answeredCount = isAborted ? answers.filter(a => a !== null).length : sessionQ.length;
    const total = answeredCount === 0 ? 1 : answeredCount; // 0除算対策
    const wrong = answeredCount - score;
    const pct = Math.round((score / total) * 100);

    document.getElementById('finalScore').textContent = `${score}/${answeredCount}`;
    document.getElementById('statCorrect').textContent = score;
    document.getElementById('statWrong').textContent = wrong;
    document.getElementById('statPct').textContent = `${pct}%`;
    
    const elapsedEl = document.getElementById('resultElapsed');
    if (isTimerActive) {
      const m = Math.floor(timerSec / 60);
      const s = timerSec % 60;
      elapsedEl.textContent = `所要時間: ${m === 0 ? `${s}秒` : `${m}分${s}秒`}`;
    } else {
      elapsedEl.textContent = '時間計測: オフ';
    }

    let title = pct === 100 ? '🎉 パーフェクト！' : pct >= 80 ? '🌟 優秀！' : pct >= 60 ? '👍 合格ライン' : '📚 要復習';
    if (isAborted) title += '（途中終了）';
    document.getElementById('resultTitle').textContent = title;

    // 間違えた問題があるか確認し、ボタンの有効・無効化
    const hasWrong = sessionQ.some((q, i) => !answers[i] || answers[i].origChosen !== q.correct);
    document.getElementById('retryWrongBtn').style.display = hasWrong ? '' : 'none';

    const container = document.getElementById('reviewItems');
    container.innerHTML = '';
    sessionQ.forEach((q, i) => {
      const a = answers[i];
      if (isAborted && !a) return; // 途中終了で未回答の問題はレビューに出さない

      const ok = a && (a.origChosen === q.correct);
      const div = document.createElement('div');
      div.className = 'review-item';
      const qShort = q.question.length > 45 ? q.question.slice(0, 45) + '…' : q.question;
      let detail = ok ? '<span style="color:#22c55e">正解</span>' : (a ? `正解: ${NUMS[a.correctDisp]} ${q.choices[q.correct]}` : '未回答');
      div.innerHTML = `<div class="ri-ico">${ok ? '✅' : '❌'}</div><div class="ri-body"><strong>Q${i + 1}. ${qShort}</strong>${detail}</div>`;
      container.appendChild(div);
    });

    this.showScreen('resultScreen');
  },

  // ─── RETRY OPTIONS ───────────────────────────────────────
  restartWrongOnly() {
    // 間違えた問題、または未回答の問題だけを抽出
    const wrongPool = sessionQ.filter((q, i) => !answers[i] || answers[i].origChosen !== q.correct);
    if (wrongPool.length === 0) return;

    sessionQ = wrongPool;
    const doShuffleC = document.getElementById('shuffleC').checked;
    this.setupSession(doShuffleC);
  },

  restartSameSettings() {
    this.startQuiz();
  },

  // ─── HELPER ──────────────────────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  goSetup() {
    stopTimer();
    this.showScreen('setupScreen');
  },

  updateTimerDisplay() {
    const el = document.getElementById('timerEl');
    const m = Math.floor(timerSec / 60);
    const s = timerSec % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    el.className = 'timer' + (timerSec >= 3600 ? ' warn' : '');
  }
};