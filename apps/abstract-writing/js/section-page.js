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

    // ---- Results context (conclusion page only) ----
    const resultsHost = document.getElementById('results-context');
    const resultSpans = [];
    if (resultsHost) {
        const p = document.createElement('p');
        p.className = 'abstract-para';
        p.innerHTML = '<strong class="para-label">Results:</strong> ';
        RUNNING_EXAMPLE.results.sentences.forEach((s, i) => {
            const span = document.createElement('span');
            span.className = 'context-sentence';
            span.textContent = s.text;
            resultSpans[i] = span;
            p.append(span, ' ');
        });
        resultsHost.appendChild(p);
    }

    // ---- The example: the section as it would print, one paragraph ----
    // Tapping a sentence highlights it and draws an arrow out to a bubble naming its job.
    // Wide screens: bubbles sit in a column beside the paragraph and the arrows come in from the
    // side, stopping at the paragraph's edge, so the text is never interrupted or crossed.
    // Narrow screens (no room for a column): the first sentence's bubble sits above the paragraph
    // and every other bubble opens on a row straight under its sentence.
    const host = document.getElementById('example-inline');
    const SVG = 'http://www.w3.org/2000/svg';
    const WIDE_MIN = 620; // px of example width needed for the side column
    const label = SECTIONS.find(sec => sec.id === sectionId).label;

    const topLane = document.createElement('div');
    topLane.className = 'callout-lane';
    const para = document.createElement('p');
    para.className = 'abstract-para';
    para.innerHTML = `<strong class="para-label">${label}:</strong> `;
    const gutter = document.createElement('div');
    gutter.className = 'callout-gutter';
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'arrow-layer');
    svg.setAttribute('aria-hidden', 'true');
    host.append(topLane, para, gutter, svg);

    const drawn = []; // { span, index, bubble, path, head, row, animating }
    let wide = null;

    // Put each bubble where the current layout wants it.
    function home(rec) {
        if (wide) {
            if (rec.row) rec.row.remove();
            rec.bubble.style.marginLeft = '';
            gutter.appendChild(rec.bubble);
        } else {
            rec.bubble.style.top = '';
            if (rec.index === 0) {
                topLane.appendChild(rec.bubble);
            } else {
                if (!rec.row) {
                    rec.row = document.createElement('span');
                    rec.row.className = 'callout-row';
                }
                rec.span.nextSibling.after(rec.row); // after the space that follows the sentence
                rec.row.appendChild(rec.bubble);
            }
        }
    }

    function setArrow(rec, d, head) {
        rec.path.setAttribute('d', d);
        rec.head.setAttribute('d', head);
    }

    function layoutNarrow(rec) {
        const box = host.getBoundingClientRect();
        const rects = rec.span.getClientRects();
        const above = rec.index === 0;
        const r = above ? rects[0] : rects[rects.length - 1];
        const ax = r.left + r.width / 2 - box.left;
        const ay = above ? r.top - box.top - 2 : r.bottom - box.top + 2;

        // Nudge the bubble toward the middle so the arrow has a visible curve.
        const bw = rec.bubble.offsetWidth;
        const nudge = ax < box.width / 2 ? 40 : -40;
        const left = Math.max(0, Math.min(box.width - bw, ax + nudge - bw / 2));
        rec.bubble.style.marginLeft = `${left}px`;

        // Offsets, not getBoundingClientRect: the bubble may still be mid pop-in (scaled).
        const holder = rec.bubble.parentNode;
        const bx = left + bw / 2;
        const bTop = holder.offsetTop + rec.bubble.offsetTop;
        const by = above ? bTop + rec.bubble.offsetHeight + 2 : bTop - 2;
        const midY = (by + ay) / 2;
        const dir = above ? -1 : 1; // head points down into the text from above, up from below
        setArrow(rec,
            `M ${bx} ${by} C ${bx} ${midY}, ${ax} ${midY}, ${ax} ${ay}`,
            `M ${ax - 6} ${ay + 8 * dir} L ${ax} ${ay} L ${ax + 6} ${ay + 8 * dir}`);
    }

    function layoutWide() {
        const box = host.getBoundingClientRect();
        const edge = para.getBoundingClientRect().right - box.left;
        const gx = gutter.offsetLeft;

        // Aim each arrow at a line where the sentence reaches the right edge (so the arrow tip
        // sits right beside that sentence's text), picking the one nearest its vertical middle.
        const targets = drawn.map(rec => {
            const rects = [...rec.span.getClientRects()];
            const mid = (rects[0].top + rects[rects.length - 1].bottom) / 2;
            const atEdge = rects.filter(r => r.right - box.left > edge - 40);
            const pool = atEdge.length ? atEdge : rects;
            const r = pool.reduce((a, b) =>
                Math.abs(b.top + b.height / 2 - mid) < Math.abs(a.top + a.height / 2 - mid) ? b : a);
            return { rec, ay: r.top + r.height / 2 - box.top };
        }).sort((a, b) => a.ay - b.ay);

        // Stack the bubbles top to bottom, each centred on its line unless that would overlap.
        let floor = 0;
        targets.forEach(({ rec, ay }) => {
            const h = rec.bubble.offsetHeight;
            const top = Math.max(ay - h / 2, floor);
            floor = top + h + 8;
            rec.bubble.style.top = `${top}px`;

            const ax = edge + 6;
            const bx = gx - 4;
            const by = top + h / 2;
            const bend = (bx - ax) / 2;
            setArrow(rec,
                `M ${bx} ${by} C ${bx - bend} ${by}, ${ax + bend} ${ay}, ${ax} ${ay}`,
                `M ${ax + 8} ${ay - 6} L ${ax} ${ay} L ${ax + 8} ${ay + 6}`);
        });
        // Bubbles pushed below the paragraph still need room inside the card.
        host.style.minHeight = floor ? `${floor}px` : '';
    }

    function settle(rec) {
        rec.path.style.transition = 'none';
        rec.path.style.strokeDasharray = 'none';
        rec.path.style.strokeDashoffset = '0';
    }

    function drawIn(rec) {
        const len = rec.path.getTotalLength();
        rec.path.style.transition = 'none';
        rec.path.style.strokeDasharray = `${len}`;
        rec.path.style.strokeDashoffset = `${len}`;
        rec.path.getBoundingClientRect(); // commit the start state before animating
        rec.path.style.transition = 'stroke-dashoffset 0.55s ease-out 0.15s';
        rec.path.style.strokeDashoffset = '0';
        requestAnimationFrame(() => {
            rec.bubble.classList.add('shown');
            rec.head.classList.add('shown');
        });
    }

    // Recompute every arrow; only `fresh` (a just-revealed sentence) animates in.
    function layoutAll(fresh) {
        if (wide) {
            layoutWide();
        } else {
            host.style.minHeight = '';
            drawn.forEach(layoutNarrow);
        }
        drawn.forEach(rec => {
            if (rec === fresh) drawIn(rec);
            else if (!rec.animating) settle(rec);
        });
    }

    function reveal(span, s, i) {
        if (span.classList.contains('revealed')) return;
        const el = elementById[s.el];
        span.classList.add('revealed', `hl-${el.hl}`);
        span.setAttribute('aria-pressed', 'true');
        span.setAttribute('aria-description', el.label);
        (s.links || []).forEach(k => resultSpans[k].classList.add('linked', `hl-${el.hl}`));

        const bubble = document.createElement('span');
        bubble.className = `callout hl-${el.hl}`;
        bubble.textContent = el.label;

        const g = document.createElementNS(SVG, 'g');
        g.setAttribute('class', `arrow hl-${el.hl}`);
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('class', 'arrow-line');
        const head = document.createElementNS(SVG, 'path');
        head.setAttribute('class', 'arrow-head');
        g.append(path, head);
        svg.appendChild(g);

        const rec = { span, index: i, bubble, path, head, row: null, animating: true };
        drawn.push(rec);
        home(rec);
        layoutAll(rec);
        setTimeout(() => { rec.animating = false; layoutAll(); }, 900);
    }

    section.sentences.forEach((s, i) => {
        const span = document.createElement('span');
        span.className = 'inline-sentence';
        span.tabIndex = 0;
        span.setAttribute('role', 'button');
        span.setAttribute('aria-pressed', 'false');
        span.textContent = s.text;
        para.append(span, ' ');

        span.addEventListener('click', () => reveal(span, s, i));
        span.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                reveal(span, s, i);
            }
        });
    });

    // Switch layouts when the width crosses the threshold, and redraw arrows whenever lines rewrap.
    new ResizeObserver(() => {
        const nowWide = host.clientWidth >= WIDE_MIN;
        if (nowWide !== wide) {
            wide = nowWide;
            host.classList.toggle('wide', wide);
            drawn.forEach(home);
        }
        layoutAll();
    }).observe(host);
})();
