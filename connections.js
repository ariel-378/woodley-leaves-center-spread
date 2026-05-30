/* ===== Connections — interactive in-page game ===== */
(function () {
  const GROUPS = [
    { name: '___Berry',  words: ['Blue', 'Cran', 'Rasp', 'Straw'],            level: 1 },
    { name: '___Mile',   words: ['6 Minute', 'Extra', 'Si', 'The Green'],     level: 2 },
    { name: 'Pop___',    words: ['Corn', 'Culture', 'Sicle', 'Tart'],        level: 3 },
    { name: '(K)NE(E)',  words: ['Cap', 'Doh', 'Ling', 'Mo'],                 level: 4 },
  ];

  const MAX_MISTAKES = 5;

  const gridEl     = document.getElementById('conn-grid');
  const solvedEl   = document.getElementById('conn-solved-rows');
  const messageEl  = document.getElementById('conn-message');
  const heartsEl   = document.getElementById('conn-hearts');
  const submitBtn  = document.getElementById('conn-submit');
  const deselectBtn= document.getElementById('conn-deselect');
  const shuffleBtn = document.getElementById('conn-shuffle');

  let words = [];
  const selected = new Set();
  let mistakes = 0;
  const solved = [];
  let gameOver = false;

  function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildHearts() {
    heartsEl.innerHTML = '';
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const h = document.createElement('span');
      h.className = 'conn-heart';
      h.dataset.active = 'true';
      h.textContent = '●';
      heartsEl.appendChild(h);
    }
  }

  function updateHearts() {
    const dots = heartsEl.querySelectorAll('.conn-heart');
    const remaining = MAX_MISTAKES - mistakes;
    dots.forEach((d, i) => { d.dataset.active = i < remaining ? 'true' : 'false'; });
  }

  function initWords() {
    words = [];
    GROUPS.forEach((g, gi) => g.words.forEach(w => words.push({ word: w, group: gi })));
    shuffleArr(words);
  }

  function render() {
    gridEl.innerHTML = '';
    words.forEach((w, i) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'conn-tile' + (selected.has(i) ? ' is-selected' : '');
      tile.textContent = w.word;
      tile.dataset.idx = String(i);
      tile.disabled = gameOver;
      tile.addEventListener('click', () => toggleSelect(i));
      gridEl.appendChild(tile);
    });
    submitBtn.disabled  = selected.size !== 4 || gameOver;
    deselectBtn.disabled = selected.size === 0 || gameOver;
    shuffleBtn.disabled = gameOver;
  }

  function toggleSelect(i) {
    if (gameOver) return;
    if (selected.has(i)) selected.delete(i);
    else if (selected.size < 4) selected.add(i);
    render();
  }

  function setMessage(text, kind) {
    messageEl.textContent = text;
    messageEl.dataset.kind = kind || '';
  }

  function lockGroup(groupIdx) {
    const g = GROUPS[groupIdx];
    const row = document.createElement('div');
    row.className = 'conn-solved-row cat-' + g.level;
    row.innerHTML =
      '<div class="conn-solved-name">' + g.name + '</div>' +
      '<div class="conn-solved-words">' + g.words.join(' · ') + '</div>';
    solvedEl.appendChild(row);
    words = words.filter(w => w.group !== groupIdx);
    selected.clear();
    solved.push(groupIdx);
    if (solved.length === GROUPS.length) {
      gameOver = true;
      setMessage('Solved! Nicely done.', 'win');
    }
    render();
  }

  function revealRemaining() {
    GROUPS.forEach((g, gi) => {
      if (solved.indexOf(gi) === -1) {
        const row = document.createElement('div');
        row.className = 'conn-solved-row cat-' + g.level + ' is-revealed';
        row.innerHTML =
          '<div class="conn-solved-name">' + g.name + '</div>' +
          '<div class="conn-solved-words">' + g.words.join(' · ') + '</div>';
        solvedEl.appendChild(row);
      }
    });
    words = [];
    selected.clear();
    gameOver = true;
    render();
  }

  function submit() {
    if (selected.size !== 4 || gameOver) return;
    const picks = [...selected].map(i => words[i]);
    const groupCounts = {};
    picks.forEach(p => { groupCounts[p.group] = (groupCounts[p.group] || 0) + 1; });
    const counts = Object.values(groupCounts);
    const maxCount = Math.max.apply(null, counts);

    if (maxCount === 4) {
      const correctGroup = picks[0].group;
      lockGroup(correctGroup);
      if (!gameOver) setMessage('Correct!', 'win');
      return;
    }

    mistakes++;
    const tiles = gridEl.querySelectorAll('.is-selected');
    tiles.forEach(t => {
      t.classList.add('is-shake');
      setTimeout(() => t.classList.remove('is-shake'), 500);
    });
    setMessage(maxCount === 3 ? 'One away…' : 'Not quite.', 'warn');
    updateHearts();

    if (mistakes >= MAX_MISTAKES) {
      setTimeout(() => {
        revealRemaining();
        setMessage('Out of guesses — answers revealed.', 'lose');
      }, 550);
    }
  }

  function deselectAll() {
    selected.clear();
    render();
  }

  function reshuffleGrid() {
    if (gameOver) return;
    shuffleArr(words);
    selected.clear();
    render();
  }

  submitBtn.addEventListener('click', submit);
  deselectBtn.addEventListener('click', deselectAll);
  shuffleBtn.addEventListener('click', reshuffleGrid);

  buildHearts();
  initWords();
  render();
})();
