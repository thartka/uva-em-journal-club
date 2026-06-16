/**
 * Causality module — shared questions and sessionStorage helpers.
 */

const CausalityQuestions = (() => {

    const STORAGE_KEY = 'causality_module';

    const QUESTIONS = [
        {
            id: 'q1',
            prompt: 'Based on this observational study alone, which conclusion is most supported by the evidence?',
            options: [
                { key: 'A', text: 'Antibiotic delay leads to an increase in mortality' },
                { key: 'B', text: 'Antibiotic delay is associated with an increase in mortality' },
                { key: 'C', text: 'Antibiotic delay has no relationship to mortality' },
                { key: 'D', text: 'This study shows that 60 minutes is the most appropriate target' }
            ],
            correct: 'B',
            explanations: {
                A: 'This overstates what an observational study can show. Statistical significance does not establish that delay <em>causes</em> death — confounding is a major threat in sepsis timing studies.',
                B: 'Correct. The study can show association, but this observational design cannot by itself prove causation. Unmeasured confounding (e.g., illness severity) may explain part or all of the gradient.',
                C: 'The study reports an association between delay and mortality. Concluding there is no relationship ignores the reported findings.',
                D: 'An observational association does not establish a specific time target. Choosing 60 minutes requires more than one study\'s gradient.'
            }
        },
        {
            id: 'q2',
            prompt: 'Which Bradford Hill criterion does this observational study not address?',
            options: [
                { key: 'A', text: 'Temporality' },
                { key: 'B', text: 'Dose response' },
                { key: 'C', text: 'Experimental evidence' },
                { key: 'D', text: 'Strength / effect size' }
            ],
            correct: 'C',
            explanations: {
                A: 'Temporality is partially satisfied: antibiotics are given before death. Time zero can be fuzzy in sepsis, but this criterion is not what the design fails to provide.',
                B: 'Dose response (biological gradient) is partially addressed — the study reports worsening outcomes with longer delay. The main limitation is not absence of a gradient.',
                C: 'Correct. This observational design cannot provide experimental evidence. RCTs that intentionally delay antibiotics would be unethical, so causation cannot be proven by intervention.',
                D: 'Strength of association is a Hill criterion, and this study reports a large, statistically significant gradient. Effect size is not the main gap in the causal argument.'
            }
        }
    ];

    function _load() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function _save(data) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getStoredAnswers() {
        return _load();
    }

    function storePreAnswer(questionId, answerKey) {
        const data = _load();
        if (!data.pre) data.pre = {};
        data.pre[questionId] = answerKey;
        _save(data);
    }

    function storePostAnswer(questionId, answerKey) {
        const data = _load();
        if (!data.post) data.post = {};
        data.post[questionId] = answerKey;
        _save(data);
    }

    function getOptionText(questionId, key) {
        const question = QUESTIONS.find(q => q.id === questionId);
        const option = question?.options.find(o => o.key === key);
        return option ? `${key}) ${option.text}` : key;
    }

    return {
        QUESTIONS,
        getStoredAnswers,
        storePreAnswer,
        storePostAnswer,
        getOptionText
    };
})();
