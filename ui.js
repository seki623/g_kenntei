const UI = {
  // フラッシュカード用の状態管理変数
  cardCurrent: 0,
  cardPool: [],
  cardTimer: null, // 自動めくり用のタイマー保持

  // ─── SETUP SCREEN ───────────────────────────────────────
  handleShuffleCChange() {
    const shuffleC = document.getElementById('shuffleC').checked;
    const showExpInput = document.getElementById('showExp');
    
    if (shuffleC) {
      showExpInput.checked = false;
    } else {
      showExpInput.checked = true;
    }
  },

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

    this.renderIndividualQList();
  },

  selectCount(n, btn) {
    selectedCount = n;
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
  },

  toggleQuestionList() {
    const container = document.getElementById('selectListContainer');
    const arrow = document.getElementById('listArrow');
    container.classList.toggle('open');
    if (container.classList.contains('open')) {
      arrow.textContent = '▲';
    } else {
      arrow.textContent = '▼';
    }
  },

  renderIndividualQList() {
    const listArea = document.getElementById('individualQList');
    listArea.innerHTML = '';
    
    allQuestions.forEach((q, idx) => {
      const label = document.createElement('label');
      label.className = 'select-q-label';
      
      const qShort = q.question.length > 45 ? q.question.slice(0, 45) + '…' : q.question;
      
      label.innerHTML = `
        <input type="checkbox" class="q-select-checkbox" value="${idx}" onchange="UI.updateSelectedCountBadge()">
        <span class="q-idx">#${idx + 1}</span>
        <span>${qShort}</span>
      `;
      listArea.appendChild(label);
    });

    this.updateSelectedCountBadge();
  },

  updateSelectedCountBadge() {
    const checkedBoxes = document.querySelectorAll('.q-select-checkbox:checked');
    document.getElementById('selectedCountBadge').textContent = checkedBoxes.length;
  },

  selectRange() {
    const startInput = document.getElementById('rangeStart').value;
    const endInput = document.getElementById('rangeEnd').value;
    
    const start = parseInt(startInput);
    const end = parseInt(endInput);
    
    if (isNaN(start) || isNaN(end)) {
      alert('開始番号と終了番号を両方入力してください。');
      return;
    }
    
    if (start > end) {
      alert('開始番号は終了番号以下の数値を入力してください。');
      return;
    }

    const checkboxes = document.querySelectorAll('.q-select-checkbox');
    
    checkboxes.forEach(box => {
      const currentIdx = parseInt(box.value) + 1;
      if (currentIdx >= start && currentIdx <= end) {
        box.checked = true;
      } else {
        box.checked = false; 
      }
    });

    this.updateSelectedCountBadge();
  },

  // ─── FLASHCARD MODE ───────────────────────────────────────
  startFlashcards() {
    const checkedBoxes = document.querySelectorAll('.q-select-checkbox:checked');
    const doShuffleQ = document.getElementById('shuffleQ').checked;
    
    if (checkedBoxes.length > 0) {
      this.cardPool = Array.from(checkedBoxes).map(box => allQuestions[parseInt(box.value)]);
    } else {
      this.cardPool = allQuestions.slice(0, selectedCount);
    }

    if (this.cardPool.length === 0) {
      alert('出題する問題がありません。');
      return;
    }

    if (doShuffleQ) {
      this.cardPool = shuffle(this.cardPool);
    }

    // トグル等の初期状態リセット
    document.getElementById('autoCardToggle').checked = false;
    this.stopAutoCard();

    this.cardCurrent = 0;
    this.showScreen('flashcardScreen');
    this.renderCard();
  },

  renderCard() {
    const q = this.cardPool[this.cardCurrent];
    const total = this.cardPool.length;

    document.getElementById('cardFlipContainer').classList.remove('flipped');

    document.getElementById('cardProgress').textContent = `${this.cardCurrent + 1} / ${total}`;
    document.getElementById('cardQuestionText').textContent = q.question;
    
    const correctText = q.choices[q.correct];
    document.getElementById('cardAnswerText').textContent = `正解: ${correctText}`;
    document.getElementById('cardExpText').textContent = q.explanation ? q.explanation : '解説は登録されていません。';

    document.getElementById('cardPrevBtn').style.opacity = this.cardCurrent === 0 ? '0.3' : '1';
    document.getElementById('cardPrevBtn').disabled = this.cardCurrent === 0;
    
    const isLast = this.cardCurrent === total - 1;
    document.getElementById('cardNextBtn').textContent = isLast ? '終了する' : '次へ →';

    // 💡 自動めくりが有効なら、表面のタイマーを開始
    this.planAutoFlip();
  },

  toggleCardFlip() {
    document.getElementById('cardFlipContainer').classList.toggle('flipped');
  },

  // 自動めくりのトグルが切り替わったときの処理
  handleAutoCardToggle() {
    const isAuto = document.getElementById('autoCardToggle').checked;
    if (isAuto) {
      this.planAutoFlip();
    } else {
      this.stopAutoCard();
    }
  },

  // タイマーのスケジュールを組む関数
  planAutoFlip() {
    this.stopAutoCard(); // 既存のタイマーを一旦クリア
    
    const isAuto = document.getElementById('autoCardToggle').checked;
    if (!isAuto) return;

    const container = document.getElementById('cardFlipContainer');
    const isFlipped = container.classList.contains('flipped');

    if (!isFlipped) {
      // 表面（問題）のとき：設定秒数後に裏返す
      const secFront = parseFloat(document.getElementById('timeFront').value) || 5;
      this.cardTimer = setTimeout(() => {
        container.classList.add('flipped');
        this.planAutoFlip(); // 裏返ったので、次は裏面のタイマーをセット
      }, secFront * 1000);
    } else {
      // 裏面（答え）のとき：設定秒数後に次のカードへ進む
      const secBack = parseFloat(document.getElementById('timeBack').value) || 4;
      this.cardTimer = setTimeout(() => {
        const isLast = this.cardCurrent === this.cardPool.length - 1;
        if (isLast) {
          // 最後なら自動モードを終了して戻る
          document.getElementById('autoCardToggle').checked = false;
          this.stopAutoCard();
          alert('すべてのカードをチェックしました！');
          this.goSetup();
        } else {
          this.cardCurrent++;
          this.renderCard();
        }
      }, secBack * 1000);
    }
  },

  // タイマーを止める関数
  stopAutoCard() {
    if (this.cardTimer) {
      clearTimeout(this.cardTimer);
      this.cardTimer = null;
    }
  },

  nextCard() {
    this.stopAutoCard();
    if (this.cardCurrent < this.cardPool.length - 1) {
      this.cardCurrent++;
      this.renderCard();
    } else {
      if (confirm('すべてのカードをチェックしました！一覧画面に戻りますか？')) {
        this.goSetup();
      }
    }
  },

  prevCard() {
    this.stopAutoCard();
    if (this.cardCurrent > 0) {
      this.cardCurrent--;
      this.renderCard();
    }
  },

  // ─── GAME START ──────────────────────────────────────────
  startQuiz() {
    const checkedBoxes = document.querySelectorAll('.q-select-checkbox:checked');

    if (checkedBoxes.length > 0) {
      this.startSelectedQuestions();
      return;
    }

    const doShuffleQ = document.getElementById('shuffleQ').checked;
    const doShuffleC = document.getElementById('shuffleC').checked;
    isTimerActive = document.getElementById('useTimer').checked;

    let pool = [...allQuestions];
    if (doShuffleQ) pool = shuffle(pool);
    sessionQ = pool.slice(0, selectedCount);

    this.setupSession(doShuffleC);
  },

  startSelectedQuestions() {
    const checkedBoxes = document.querySelectorAll('.q-select-checkbox:checked');
    if (checkedBoxes.length === 0) {
      alert('問題が選択されていません。解きたい問題にチェックを入れてください。');
      return;
    }

    const doShuffleQ = document.getElementById('shuffleQ').checked;
    const doShuffleC = document.getElementById('shuffleC').checked;
    isTimerActive = document.getElementById('useTimer').checked;

    let chosenPool = Array.from(checkedBoxes).map(box => allQuestions[parseInt(box.value)]);
    
    if (doShuffleQ) {
      chosenPool = shuffle(chosenPool);
    }
    
    sessionQ = chosenPool;
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

    document.getElementById('explanation').classList.remove('show');

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
    const expEl = document.getElementById('explanation');
    
    if (showExp && explanation) {
      document.getElementById('explanationText').textContent = explanation;
      expEl.classList.add('show');
    } else {
      expEl.classList.remove('show');
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
      this.showResult(true);
    }
  },

  // ─── RESULT SCREEN ───────────────────────────────────────
  showResult(isAborted = false) {
    const answeredCount = isAborted ? answers.filter(a => a !== null).length : sessionQ.length;
    const total = answeredCount === 0 ? 1 : answeredCount;
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

    document.getElementById('retrySameBtn').style.display = sessionQ.length === 1 ? 'none' : '';

    const hasWrong = sessionQ.some((q, i) => !answers[i] || answers[i].origChosen !== q.correct);
    document.getElementById('retryWrongBtn').style.display = hasWrong ? '' : 'none';

    const container = document.getElementById('reviewItems');
    container.innerHTML = '';
    sessionQ.forEach((q, i) => {
      const a = answers[i];
      if (isAborted && !a) return;

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
    const wrongPool = sessionQ.filter((q, i) => !answers[i] || answers[i].origChosen !== q.correct);
    if (wrongPool.length === 0) return;

    sessionQ = wrongPool;
    const doShuffleC = document.getElementById('shuffleC').checked;
    this.setupSession(doShuffleC);
  },

  restartSameSettings() {
    const doShuffleQ = document.getElementById('shuffleQ').checked;
    const doShuffleC = document.getElementById('shuffleC').checked;
    
    const checkedBoxes = document.querySelectorAll('.q-select-checkbox:checked');
    if (checkedBoxes.length > 0) {
      let chosenPool = Array.from(checkedBoxes).map(box => allQuestions[parseInt(box.value)]);
      if (doShuffleQ) chosenPool = shuffle(chosenPool);
      sessionQ = chosenPool;
    } else {
      let pool = [...allQuestions];
      if (doShuffleQ) pool = shuffle(pool);
      sessionQ = pool.slice(0, selectedCount);
    }
    
    this.setupSession(doShuffleC);
  },

  // ─── HELPER ──────────────────────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  goSetup() {
    stopTimer();
    this.initSetup();
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