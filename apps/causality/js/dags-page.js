(() => {
    const confounderBtn = document.getElementById('confounder-action-btn');
    const colliderBtn = document.getElementById('collider-action-btn');
    const confounderNote = document.getElementById('confounder-note');
    const colliderNote = document.getElementById('collider-note');
    const confounderSvg = document.getElementById('confounder-dag');
    const colliderSvg = document.getElementById('collider-dag');

    let confounderAdjusted = false;
    let colliderConditioned = false;

    function setConfounderState(adjusted) {
        confounderAdjusted = adjusted;
        confounderSvg.classList.toggle('adjusted', adjusted);
        confounderBtn.textContent = adjusted ? 'Reset' : 'Adjust for severity';
        confounderBtn.classList.toggle('btn-secondary', adjusted);
        confounderBtn.classList.toggle('btn-blue', !adjusted);
        confounderNote.textContent = adjusted
            ? 'Adjusting for measured severity blocks the backdoor path (highlighted in orange). The direct arrow from delay to mortality may still reflect true causation — or remaining bias from unmeasured severity.'
            : 'Without accounting for severity, delay and mortality appear linked partly through a non-causal path: Delay ← Severity → Mortality.';
    }

    function setColliderState(conditioned) {
        colliderConditioned = conditioned;
        colliderSvg.classList.toggle('conditioned', conditioned);
        colliderBtn.textContent = conditioned ? 'Reset' : 'Analyze ICU patients only';
        colliderBtn.classList.toggle('btn-secondary', conditioned);
        colliderBtn.classList.toggle('btn-blue', !conditioned);
        colliderNote.textContent = conditioned
            ? 'Restricting to ICU patients conditions on a collider. Severity and delay become spuriously associated (orange path), distorting any delay–outcome analysis in this subgroup.'
            : 'Severity and delay both influence ICU admission. In the full ED population, this does not by itself create a false link between severity and delay.';
    }

    confounderBtn.addEventListener('click', () => {
        setConfounderState(!confounderAdjusted);
    });

    colliderBtn.addEventListener('click', () => {
        setColliderState(!colliderConditioned);
    });

    setConfounderState(false);
    setColliderState(false);
})();
