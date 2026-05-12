(() => {
    const pretestSlider = document.getElementById('nomogram-pretest');
    const lrSlider = document.getElementById('nomogram-lr');
    const pretestValue = document.getElementById('nomogram-pretest-value');
    const lrValue = document.getElementById('nomogram-lr-value');
    const posttestValue = document.getElementById('nomogram-posttest-value');
    const svg = document.getElementById('nomogram-svg');

    function likelihoodRatioFromSlider() {
        return 10 ** Number(lrSlider.value);
    }

    function render() {
        const pretestProbability = Number(pretestSlider.value) / 100;
        const likelihoodRatio = likelihoodRatioFromSlider();
        const posttestProbability = window.Nomogram.render(svg, {
            pretestProbability,
            likelihoodRatio,
            title: 'Interactive Fagan Nomogram'
        });

        pretestValue.textContent = window.PretestProbability.formatPercent(pretestProbability, 0);
        lrValue.textContent = window.PretestProbability.formatLikelihoodRatio(likelihoodRatio);
        posttestValue.textContent = window.PretestProbability.formatPercent(posttestProbability, 1);
    }

    pretestSlider.addEventListener('input', render);
    lrSlider.addEventListener('input', render);
    render();
})();
