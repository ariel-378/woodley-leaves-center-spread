/* ===== Interactive Summer Word Scramble ===== */
(function () {
  const WORDS = [
    { scrambled: 'EEBRBCAU',       answer: 'BARBECUE' },
    { scrambled: 'OHTFUR FO LUYJ', answer: 'FOURTH OF JULY' },
    { scrambled: 'ACTVONAI',       answer: 'VACATION' },
    { scrambled: 'CEI AECMR',      answer: 'ICE CREAM' },
    { scrambled: 'CAEHB',          answer: 'BEACH' },
    { scrambled: 'RAOD PTRI',      answer: 'ROAD TRIP' },
    { scrambled: 'FESIELRIF',      answer: 'FIREFLIES' },
    { scrambled: 'SECNUSREN',      answer: 'SUNSCREEN' },
    { scrambled: 'AGESLSNSSU',     answer: 'SUNGLASSES' },
    { scrambled: 'RDSENHTMTSRUO',  answer: 'THUNDERSTORMS' },
    { scrambled: 'MTEWLNAOER',     answer: 'WATERMELON' },
    { scrambled: 'RBUADROFS',      answer: 'SURFBOARD' },
    { scrambled: 'WEAYPSEAL PACM', answer: 'SLEEPAWAY CAMP' },
    { scrambled: 'LENDMEOA',       answer: 'LEMONADE' },
    { scrambled: 'ADGREN',         answer: 'GARDEN' },
  ];

  function normalize(s) {
    return s.toUpperCase().replace(/\s+/g, ' ').trim();
  }

  const listEl = document.getElementById('ws-list');
  const statusEl = document.getElementById('ws-status');
  const revealBtn = document.getElementById('ws-reveal-all');

  let found = 0;

  function updateStatus() {
    statusEl.textContent = `${found} of ${WORDS.length} solved`;
  }

  function markSolved(row) {
    if (row.dataset.solved === 'true') return;
    row.dataset.solved = 'true';
    row.querySelector('.ws-input').disabled = true;
    row.querySelector('.ws-input').classList.add('is-correct');
    row.querySelector('.ws-status-icon').textContent = '✓';
    found++;
    updateStatus();
  }

  function reveal(row, answer) {
    if (row.dataset.solved === 'true') return;
    row.dataset.solved = 'revealed';
    const input = row.querySelector('.ws-input');
    input.value = answer;
    input.disabled = true;
    input.classList.add('is-revealed');
    row.querySelector('.ws-status-icon').textContent = '○';
  }

  WORDS.forEach((w, i) => {
    const row = document.createElement('li');
    row.className = 'ws-row';
    row.innerHTML = `
      <span class="ws-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="ws-scramble">${w.scrambled}</span>
      <input class="ws-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Your guess for ${w.scrambled}">
      <button class="ws-show" type="button" aria-label="Reveal answer">show</button>
      <span class="ws-status-icon" aria-hidden="true"></span>
    `;
    const input = row.querySelector('.ws-input');
    const showBtn = row.querySelector('.ws-show');

    input.addEventListener('input', () => {
      if (normalize(input.value) === w.answer) markSolved(row);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (normalize(input.value) === w.answer) markSolved(row);
        else input.classList.add('is-wrong');
      }
    });
    input.addEventListener('focus', () => input.classList.remove('is-wrong'));
    showBtn.addEventListener('click', () => reveal(row, w.answer));

    listEl.appendChild(row);
  });

  revealBtn.addEventListener('click', () => {
    document.querySelectorAll('.ws-row').forEach((row, i) => {
      if (row.dataset.solved !== 'true') reveal(row, WORDS[i].answer);
    });
  });

  updateStatus();
})();
