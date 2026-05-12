(() => {
    const {
        DEFAULTS,
        applyLikelihoodRatio,
        formatPercent,
        saveCaseState
    } = window.PretestProbability;

    const pretestSlider = document.getElementById('pretest-slider');
    const pretestValue = document.getElementById('pretest-value');
    const selectPretestBtn = document.getElementById('select-pretest-btn');
    const revealDimerSection = document.getElementById('reveal-dimer-section');
    const revealDimerBtn = document.getElementById('reveal-dimer-btn');
    const dimerInlineResult = document.getElementById('dimer-inline-result');
    const dimerSection = document.getElementById('dimer-section');
    const posttestSlider = document.getElementById('posttest-slider');
    const posttestValue = document.getElementById('posttest-value');
    const selectPosttestBtn = document.getElementById('select-posttest-btn');
    const ctpaSection = document.getElementById('ctpa-section');
    const ctpaYes = document.getElementById('ctpa-yes');
    const ctpaNo = document.getElementById('ctpa-no');
    const summarySection = document.getElementById('summary-section');
    const summaryText = document.getElementById('summary-text');
    const nextBtn = document.getElementById('next-btn');

    let selectedPretest = Number(pretestSlider.value) / 100;
    let selectedPosttest = Number(posttestSlider.value) / 100;
    let ctpaOrdered = null;

    function updatePretestDisplay() {
        selectedPretest = Number(pretestSlider.value) / 100;
        pretestValue.textContent = formatPercent(selectedPretest, 0);
    }

    function updatePosttestDisplay() {
        selectedPosttest = Number(posttestSlider.value) / 100;
        posttestValue.textContent = formatPercent(selectedPosttest, 0);
    }

    function setCtpaChoice(ordered) {
        ctpaOrdered = ordered;
        ctpaYes.classList.toggle('selected', ordered);
        ctpaNo.classList.toggle('selected', !ordered);

        const calculatedPosttest = applyLikelihoodRatio(selectedPretest, DEFAULTS.dimerPositiveLikelihoodRatio);
        saveCaseState({
            pretestProbability: selectedPretest,
            posttestProbability: selectedPosttest,
            calculatedPosttestProbability: calculatedPosttest,
            dimerLikelihoodRatio: DEFAULTS.dimerPositiveLikelihoodRatio,
            dimerResult: 'positive',
            ctpaOrdered
        });

        summaryText.textContent = `You selected a pretest probability of ${formatPercent(selectedPretest, 0)}, a post-test probability of ${formatPercent(selectedPosttest, 0)}, and chose to ${ordered ? 'accept' : 'discontinue'} CTA pulmonary with contrast.`;
        summarySection.classList.remove('hidden');
        nextBtn.disabled = false;
    }

    updatePretestDisplay();
    updatePosttestDisplay();

    pretestSlider.addEventListener('input', updatePretestDisplay);
    posttestSlider.addEventListener('input', updatePosttestDisplay);

    selectPretestBtn.addEventListener('click', () => {
        revealDimerSection.classList.remove('hidden');
        selectPretestBtn.disabled = true;
        pretestSlider.disabled = true;
    });

    revealDimerBtn.addEventListener('click', () => {
        dimerInlineResult.classList.remove('hidden');
        dimerSection.classList.remove('hidden');
        revealDimerBtn.disabled = true;
    });

    selectPosttestBtn.addEventListener('click', () => {
        ctpaSection.classList.remove('hidden');
        selectPosttestBtn.disabled = true;
        posttestSlider.disabled = true;
    });

    ctpaYes.addEventListener('click', () => setCtpaChoice(true));
    ctpaNo.addEventListener('click', () => setCtpaChoice(false));

    nextBtn.addEventListener('click', () => {
        window.location.href = 'bayes-background.html';
    });
})();
