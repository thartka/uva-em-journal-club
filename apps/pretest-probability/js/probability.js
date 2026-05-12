window.PretestProbability = (() => {
    const DEFAULTS = {
        pretestProbability: 0.03,
        dimerPositiveLikelihoodRatio: 1.6,
        storageKey: 'pretest_probability_case'
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function probToOdds(probability) {
        const p = clamp(probability, 0.0001, 0.9999);
        return p / (1 - p);
    }

    function oddsToProb(odds) {
        return odds / (1 + odds);
    }

    function applyLikelihoodRatio(pretestProbability, likelihoodRatio) {
        return oddsToProb(probToOdds(pretestProbability) * likelihoodRatio);
    }

    function formatPercent(probability, digits = 1) {
        return `${(probability * 100).toFixed(digits)}%`;
    }

    function formatLikelihoodRatio(likelihoodRatio) {
        if (likelihoodRatio < 0.1) {
            return likelihoodRatio.toFixed(2);
        }

        return likelihoodRatio >= 10
            ? likelihoodRatio.toFixed(0)
            : likelihoodRatio.toFixed(1);
    }

    function defaultPostTestProbability() {
        return applyLikelihoodRatio(DEFAULTS.pretestProbability, DEFAULTS.dimerPositiveLikelihoodRatio);
    }

    function saveCaseState(state) {
        sessionStorage.setItem(DEFAULTS.storageKey, JSON.stringify(state));
    }

    function loadCaseState() {
        const raw = sessionStorage.getItem(DEFAULTS.storageKey);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (_error) {
            return null;
        }
    }

    return {
        DEFAULTS,
        clamp,
        probToOdds,
        oddsToProb,
        applyLikelihoodRatio,
        formatPercent,
        formatLikelihoodRatio,
        defaultPostTestProbability,
        saveCaseState,
        loadCaseState
    };
})();
