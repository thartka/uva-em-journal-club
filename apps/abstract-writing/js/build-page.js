/**
 * Page 6: build the mild hyperkalemia abstract one sentence at a time.
 * Sentences are dealt from a random interleaving of the four sections, but each section's
 * sentences always arrive in their original order, so a correct pick appends to the end.
 */
(() => {
    const { SECTIONS, EXERCISE } = AbstractData;
    const labelOf = Object.fromEntries(SECTIONS.map(s => [s.id, s.label]));
    const TOTAL = SECTIONS.reduce((n, s) => n + EXERCISE[s.id].length, 0);

    const progressEl = document.getElementById('build-progress');
    const sentenceEl = document.getElementById('current-sentence');
    const dealCard = document.getElementById('deal-card');
    const choiceHost = document.getElementById('choice-buttons');
    const feedbackEl = document.getElementById('build-feedback');
    const scoreEl = document.getElementById('build-score');
    const builtHost = document.getElementById('built-abstract');
    const donePanel = document.getElementById('done-panel');
    const doneScore = document.getElementById('done-score');
    const restartBtns = document.querySelectorAll('.restart-btn');

    let deck = [];
    let pos = 0;
    let firstTry = 0;
    let missedThisOne = false;
    const sectionBodies = {};
    const choiceBtns = {};

    function shuffleDeck() {
        const remaining = Object.fromEntries(SECTIONS.map(s => [s.id, 0]));
        const out = [];
        for (let k = 0; k < TOTAL; k++) {
            // Pick a section with probability proportional to how many sentences it has left.
            const left = SECTIONS.map(s => EXERCISE[s.id].length - remaining[s.id]);
            let r = Math.random() * left.reduce((a, b) => a + b, 0);
            let i = 0;
            while (r >= left[i]) { r -= left[i]; i++; }
            const id = SECTIONS[i].id;
            out.push({ section: id, ...EXERCISE[id][remaining[id]] });
            remaining[id]++;
        }
        return out;
    }

    // Build the empty abstract and the four answer buttons once.
    SECTIONS.forEach(sec => {
        const block = document.createElement('div');
        block.className = `built-section sec-${sec.id}`;
        block.innerHTML = `<h3 class="built-heading">${sec.label}</h3>`;
        const body = document.createElement('p');
        body.className = 'built-body';
        block.appendChild(body);
        builtHost.appendChild(block);
        sectionBodies[sec.id] = body;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn choice-btn sec-${sec.id}`;
        btn.textContent = sec.label;
        btn.addEventListener('click', () => choose(sec.id));
        choiceHost.appendChild(btn);
        choiceBtns[sec.id] = btn;
    });

    function setFeedback(kind, html) {
        feedbackEl.className = `build-feedback ${kind}`;
        feedbackEl.innerHTML = html;
    }

    function showCurrent() {
        Object.values(choiceBtns).forEach(b => { b.disabled = false; b.classList.remove('wrong'); });
        missedThisOne = false;
        if (pos >= deck.length) {
            finish();
            return;
        }
        progressEl.textContent = `Sentence ${pos + 1} of ${TOTAL}`;
        sentenceEl.textContent = deck[pos].text;
        dealCard.classList.remove('dealt');
        void dealCard.offsetWidth; // restart the entry animation
        dealCard.classList.add('dealt');
    }

    function choose(sectionId) {
        const card = deck[pos];
        if (sectionId !== card.section) {
            missedThisOne = true;
            const btn = choiceBtns[sectionId];
            btn.disabled = true;
            btn.classList.add('wrong');
            setFeedback('feedback-incorrect', `<strong>Not ${labelOf[sectionId]}.</strong> ${card.hint}`);
            return;
        }

        if (!missedThisOne) firstTry++;
        const span = document.createElement('span');
        span.className = 'placed just-placed';
        span.textContent = card.text + ' ';
        sectionBodies[card.section].appendChild(span);
        setTimeout(() => span.classList.remove('just-placed'), 1600);

        setFeedback('feedback-correct', `<strong>Placed in ${labelOf[card.section]}.</strong>`);
        pos++;
        scoreEl.textContent = `Right on the first try: ${firstTry} of ${pos}`;
        showCurrent();
    }

    function finish() {
        dealCard.classList.add('hidden');
        choiceHost.classList.add('hidden');
        feedbackEl.className = 'build-feedback hidden';
        doneScore.textContent = `You placed ${firstTry} of ${TOTAL} sentences correctly on the first try.`;
        donePanel.classList.remove('hidden');
    }

    function start() {
        deck = shuffleDeck();
        pos = 0;
        firstTry = 0;
        Object.values(sectionBodies).forEach(b => { b.textContent = ''; });
        dealCard.classList.remove('hidden');
        choiceHost.classList.remove('hidden');
        donePanel.classList.add('hidden');
        feedbackEl.className = 'build-feedback hidden';
        scoreEl.textContent = '';
        showCurrent();
    }

    restartBtns.forEach(b => b.addEventListener('click', () => {
        start();
        dealCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));

    start();
})();
