(() => {
    const { DEFAULTS, formatLikelihoodRatio, formatPercent } = window.PretestProbability;

    const pretest = DEFAULTS.pretestProbability;
    const likelihoodRatio = DEFAULTS.dimerPositiveLikelihoodRatio;

    window.Nomogram.render(document.getElementById('case-nomogram-svg'), {
        pretestProbability: pretest,
        likelihoodRatio,
        title: 'Case Nomogram',
        subtitle: 'Low Wells risk plus a positive D-dimer.'
    });

    document.getElementById('case-pretest').textContent = `${formatPercent(pretest, 1)} Low-risk Well's`;
    document.getElementById('case-lr').textContent = formatLikelihoodRatio(likelihoodRatio);
})();
