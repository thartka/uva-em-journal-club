/**
 * Page 1: four abstracts with blurred text. The reader picks the well-structured ones,
 * then each card reveals its verdict and how its words split across the four sections.
 */
(() => {
    const { SECTIONS } = AbstractData;

    // Word counts per section. Card order is fixed so the projector matches every phone.
    const ABSTRACTS = [
        {
            key: 'A',
            words: { background: 135, methods: 35, results: 70, conclusion: 40 },
            good: false,
            explanation: 'The background runs for a whole paragraph while the methods get a sentence or two. A reader learns a lot about the problem and almost nothing about how the study was done.'
        },
        {
            key: 'B',
            words: { background: 45, methods: 125, results: 85, conclusion: 35 },
            good: true,
            explanation: 'Short background and conclusion bracket a long methods and results. Methods is the biggest section here, which is common when the design or analysis takes some explaining.'
        },
        {
            key: 'C',
            words: { background: 40, methods: 80, results: 45, conclusion: 120 },
            good: false,
            explanation: 'The conclusion is nearly three times longer than the results. A long conclusion usually means the authors are repeating results or speculating beyond their data.'
        },
        {
            key: 'D',
            words: { background: 40, methods: 80, results: 130, conclusion: 30 },
            good: true,
            explanation: 'Same short bookends, but this time the results carry the most weight. Either methods or results can be the longest section; both should dwarf the background and conclusion.'
        }
    ];

    // Blurred text is drawn at this fraction of the real word count so four cards fit on a phone
    // without endless scrolling. Proportions between sections are unchanged.
    const FILLER_SCALE = 0.65;

    const FILLER = ('patients emergency department cohort outcome adverse events treatment clinical ' +
        'potassium measured within hours sample included excluded analysis model predicted risk ' +
        'association significant interval confidence rate observed compared group primary secondary ' +
        'retrospective data health system encounters defined composite mortality admission level ' +
        'electrocardiogram performed using regression testing sensitivity specificity overall these ' +
        'findings suggest the of and in with for was were to a we our study').split(' ');

    // Small seeded generator so each card's filler is stable between visits.
    function mulberry32(seed) {
        return () => {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function fillerText(nWords, rand) {
        const words = [];
        let sinceStop = 0;
        for (let i = 0; i < nWords; i++) {
            let w = FILLER[Math.floor(rand() * FILLER.length)];
            if (sinceStop === 0) w = w.charAt(0).toUpperCase() + w.slice(1);
            sinceStop++;
            const last = i === nWords - 1;
            if (last || (sinceStop > 12 && rand() < 0.18)) {
                w += '.';
                sinceStop = 0;
            }
            words.push(w);
        }
        return words.join(' ');
    }

    const grid = document.getElementById('abstract-grid');
    const checkBtn = document.getElementById('check-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorMsg = document.getElementById('pick-error');
    const summary = document.getElementById('shape-summary');
    const scoreLine = document.getElementById('score-line');
    const selected = new Set();
    let checked = false;

    ABSTRACTS.forEach((abs, idx) => {
        const rand = mulberry32(1009 * (idx + 1));
        const total = SECTIONS.reduce((n, s) => n + abs.words[s.id], 0);

        const card = document.createElement('article');
        card.className = 'abstract-card';
        card.dataset.key = abs.key;

        const head = document.createElement('div');
        head.className = 'abstract-card-head';
        head.innerHTML = `<h3>Abstract ${abs.key}</h3>`;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'pick-toggle';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.innerHTML = '<span class="pick-box" aria-hidden="true"></span><span>Well structured</span>';
        head.appendChild(toggle);
        card.appendChild(head);

        const title = document.createElement('p');
        title.className = 'fuzz fuzz-title';
        title.setAttribute('aria-hidden', 'true');
        title.textContent = fillerText(9, rand).replace(/\.$/, '');
        card.appendChild(title);

        SECTIONS.forEach(sec => {
            const block = document.createElement('div');
            block.className = `fuzz-section sec-${sec.id}`;
            block.innerHTML = `<span class="fuzz-heading">${sec.label}</span>`;
            const body = document.createElement('p');
            body.className = 'fuzz';
            body.setAttribute('aria-hidden', 'true');
            body.textContent = fillerText(Math.round(abs.words[sec.id] * FILLER_SCALE), rand);
            block.appendChild(body);
            card.appendChild(block);
        });

        const reveal = document.createElement('div');
        reveal.className = 'card-reveal hidden';
        const bar = SECTIONS.map(sec => {
            const pct = Math.round(100 * abs.words[sec.id] / total);
            return `<span class="share-seg sec-${sec.id}" style="flex-grow:${abs.words[sec.id]}" title="${sec.label}: ${pct}%">${pct}%</span>`;
        }).join('');
        reveal.innerHTML = `
            <p class="verdict"></p>
            <div class="share-bar" role="img" aria-label="${SECTIONS.map(s => `${s.label} ${Math.round(100 * abs.words[s.id] / total)} percent`).join(', ')}">${bar}</div>
            <p class="card-explanation">${abs.explanation}</p>
        `;
        card.appendChild(reveal);

        toggle.addEventListener('click', () => {
            if (checked) return;
            const on = !selected.has(abs.key);
            if (on) selected.add(abs.key); else selected.delete(abs.key);
            card.classList.toggle('picked', on);
            toggle.setAttribute('aria-pressed', String(on));
            errorMsg.classList.add('hidden');
        });

        grid.appendChild(card);
    });

    checkBtn.addEventListener('click', () => {
        if (selected.size === 0) {
            errorMsg.classList.remove('hidden');
            return;
        }
        checked = true;
        let right = 0;

        ABSTRACTS.forEach(abs => {
            const card = grid.querySelector(`[data-key="${abs.key}"]`);
            const picked = selected.has(abs.key);
            const correct = picked === abs.good;
            if (correct) right++;

            card.classList.add('checked', abs.good ? 'is-good' : 'is-poor');
            card.querySelector('.pick-toggle').disabled = true;
            card.querySelector('.card-reveal').classList.remove('hidden');
            card.querySelector('.verdict').innerHTML =
                `<strong>${abs.good ? 'Well structured' : 'Not well structured'}.</strong> ` +
                `<span class="${correct ? 'verdict-right' : 'verdict-wrong'}">You ${picked ? 'picked' : 'did not pick'} this one.</span>`;
        });

        scoreLine.textContent = `You called ${right} of ${ABSTRACTS.length} abstracts correctly.`;
        summary.classList.remove('hidden');
        checkBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
        summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    resetBtn.addEventListener('click', () => {
        checked = false;
        selected.clear();
        grid.querySelectorAll('.abstract-card').forEach(card => {
            card.classList.remove('checked', 'is-good', 'is-poor', 'picked');
            const toggle = card.querySelector('.pick-toggle');
            toggle.disabled = false;
            toggle.setAttribute('aria-pressed', 'false');
            card.querySelector('.card-reveal').classList.add('hidden');
        });
        summary.classList.add('hidden');
        resetBtn.classList.add('hidden');
        checkBtn.classList.remove('hidden');
    });
})();
