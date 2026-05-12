(() => {
    const pretestSlider = document.getElementById('nomogram-pretest');
    const lrSlider = document.getElementById('nomogram-lr');
    const pretestValue = document.getElementById('nomogram-pretest-value');
    const lrValue = document.getElementById('nomogram-lr-value');
    const posttestValue = document.getElementById('nomogram-posttest-value');
    const interpretation = document.getElementById('nomogram-interpretation');
    const svg = document.getElementById('nomogram-svg');

    function likelihoodRatioFromSlider() {
        return 10 ** Number(lrSlider.value);
    }

    function describeChange(likelihoodRatio) {
        if (likelihoodRatio < 0.2) {
            return 'Strongly decreases the probability.';
        }
        if (likelihoodRatio < 0.5) {
            return 'Moderately decreases the probability.';
        }
        if (likelihoodRatio < 2) {
            return 'Only modestly changes the probability.';
        }
        if (likelihoodRatio < 5) {
            return 'Moderately increases the probability.';
        }
        return 'Strongly increases the probability.';
    }

    function render() {
        const pretestProbability = Number(pretestSlider.value) / 100;
        const likelihoodRatio = likelihoodRatioFromSlider();
        const posttestProbability = window.Nomogram.render(svg, {
            pretestProbability,
            likelihoodRatio,
            title: 'Interactive Fagan Nomogram',
            subtitle: 'Move the sliders to see how pretest probability and LR determine post-test probability.'
        });

        pretestValue.textContent = window.PretestProbability.formatPercent(pretestProbability, 0);
        lrValue.textContent = window.PretestProbability.formatLikelihoodRatio(likelihoodRatio);
        posttestValue.textContent = window.PretestProbability.formatPercent(posttestProbability, 1);
        interpretation.textContent = describeChange(likelihoodRatio);
    }

    pretestSlider.addEventListener('input', render);
    lrSlider.addEventListener('input', render);
    render();
})();
