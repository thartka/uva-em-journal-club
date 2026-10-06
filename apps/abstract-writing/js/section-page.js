/**
 * Pages 2 to 5: one section of the running example.
 * The page's <body data-section="..."> picks the section. Each sentence is a tap target that
 * reveals which job it does. On the conclusion page, revealing a sentence also lights up the
 * results it rests on.
 */
(() => {
    const { SECTIONS, RUNNING_EXAMPLE, sectionWordCount } = AbstractData;
    const sectionId = document.body.dataset.section;
    const section = RUNNING_EXAMPLE[sectionId];
    const elementById = Object.fromEntries(section.elements.map(e => [e.id, e]));

    // ---- Abstract map: the running example's shape, current section highlighted ----
    const map = document.getElementById('abstract-map');
    if (map) {
        const bar = document.createElement('div');
        bar.className = 'map-bar';
        const legend = document.createElement('div');
        legend.className = 'map-legend';
        SECTIONS.forEach(sec => {
            const current = sec.id === sectionId;
            const seg = document.createElement('a');
            seg.href = sec.page;
            seg.className = `map-seg sec-${sec.id}${current ? ' current' : ''}`;
            seg.style.flexGrow = sectionWordCount(sec.id);
            seg.setAttribute('aria-label', `${sec.label}, ${sectionWordCount(sec.id)} words`);
            bar.appendChild(seg);

            const item = document.createElement('a');
            item.href = sec.page;
            item.className = `map-legend-item sec-${sec.id}${current ? ' current' : ''}`;
            item.innerHTML = `<span class="map-swatch"></span>${sec.label}`;
            legend.appendChild(item);
        });
        map.appendChild(bar);
        map.appendChild(legend);
    }

    // ---- Checklist of the jobs this section should do ----
    const list = document.getElementById('element-list');
    if (list) {
        section.elements.forEach(el => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="chip hl-${el.hl}">${el.label}</span>` +
                (el.absent ? ' <span class="absent-note">(none in this example)</span>' : '');
            list.appendChild(li);
        });
    }

    // ---- Stats line ----
    const stats = document.getElementById('section-stats');
    if (stats) {
        const n = section.sentences.length;
        stats.textContent = `Our ${sectionId}: ${n} sentence${n === 1 ? '' : 's'}, ${sectionWordCount(sectionId)} words`;
    }

    // ---- Results context (conclusion page only) ----
    const resultsHost = document.getElementById('results-context');
    const resultSpans = [];
    if (resultsHost) {
        const p = document.createElement('p');
        p.className = 'example-text';
        RUNNING_EXAMPLE.results.sentences.forEach((s, i) => {
            const span = document.createElement('span');
            span.className = 'context-sentence';
            span.textContent = s.text;
            resultSpans[i] = span;
            p.appendChild(span);
            p.appendChild(document.createTextNode(' '));
        });
        resultsHost.appendChild(p);
    }

    // ---- The example sentences ----
    const host = document.getElementById('example-sentences');
    const buttons = [];

    function reveal(btn, s) {
        if (btn.classList.contains('revealed')) return;
        const el = elementById[s.el];
        btn.classList.add('revealed', `hl-${el.hl}`);
        btn.setAttribute('aria-expanded', 'true');
        (s.links || []).forEach(i => resultSpans[i].classList.add('linked', `hl-${el.hl}`));
    }

    section.sentences.forEach((s, i) => {
        const el = elementById[s.el];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sentence';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = `<span class="sentence-tag">${el.label}</span><span class="sentence-num">${i + 1}</span> `;
        btn.appendChild(document.createTextNode(s.text));
        btn.addEventListener('click', () => {
            reveal(btn, s);
            updateRevealAll();
        });
        host.appendChild(btn);
        buttons.push([btn, s]);
    });

    const revealAll = document.getElementById('reveal-all-btn');
    function updateRevealAll() {
        if (revealAll && buttons.every(([b]) => b.classList.contains('revealed'))) {
            revealAll.disabled = true;
            revealAll.textContent = 'All revealed';
        }
    }
    if (revealAll) {
        revealAll.addEventListener('click', () => {
            buttons.forEach(([b, s]) => reveal(b, s));
            updateRevealAll();
        });
    }
})();
