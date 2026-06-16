(() => {
    const wrap = document.getElementById('hill-table-wrap');
    if (!wrap) return;

    document.querySelectorAll('.hill-table tbody tr').forEach(row => {
        const cell = row.querySelector('td:last-child');
        const criterionCell = row.querySelector('td:nth-child(2)');
        if (!cell) return;

        const text = cell.innerHTML.trim();
        const criterionLabel = criterionCell ? criterionCell.textContent.trim() : 'criterion';

        cell.classList.add('hill-reveal-cell');
        cell.innerHTML = `
            <div class="hill-reveal-row">
                <div class="hill-reveal-stack">
                    <span class="hill-reveal-text">${text}</span>
                    <button
                        type="button"
                        class="hill-reveal-cover"
                        aria-expanded="false"
                        aria-label="Tap to reveal ${criterionLabel} for early antibiotics in sepsis"
                    >
                        Tap to reveal
                    </button>
                </div>
            </div>
        `;

        const rowEl = cell.querySelector('.hill-reveal-row');
        const cover = cell.querySelector('.hill-reveal-cover');

        cover.addEventListener('click', () => {
            rowEl.classList.add('hill-revealed');
            cover.setAttribute('aria-expanded', 'true');
        });
    });
})();
