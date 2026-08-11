/**
 * p-values module — shared question bank + interleaved MCQ renderer.
 *
 * Format: each page shows one board-style question. The learner commits to an
 * answer, then the correct answer, an explanation, and an interactive activity
 * are revealed together. A "Next" button advances to the following question.
 * (Renderer mirrors apps/type-i-ii-errors/js/questions.js.)
 */

const PValueQuestions = (() => {

    const STORAGE_KEY = 'p_values';

    // FIXED ORDER — do not reorder options or change their A–D keys.
    // Options render in array order with no shuffling, so every device shows the
    // same layout. The presenter's screen must match the residents' phones, so
    // this order must stay stable across versions once published.
    const QUESTIONS = [
        {
            id: 'q1',
            number: 1,
            prompt: 'A trial comparing a new antiemetic to placebo reports p = 0.04 for the difference in nausea scores. Which statement best describes what this p-value means?',
            options: [
                { key: 'A', text: 'Given the data observed in this trial, there is only about a 4% probability that the antiemetic has no real effect.' },
                { key: 'B', text: 'If the effect of this drug did not differ from placebo, a difference this large would occur about 4% of the time.' },
                { key: 'C', text: 'There is roughly a 96% probability that the antiemetic has a real effect.' },
                { key: 'D', text: 'On average, the antiemetic reduces nausea scores by about 4% versus placebo.' }
            ],
            correct: 'B',
            explanations: {
                A: 'This flips the conditional. A p-value is <em>not</em> the probability that the null hypothesis is true. It is calculated <em>assuming</em> no real effect, so it cannot also tell you the chance that assumption is right.',
                B: 'Correct. A p-value is P(data this extreme | no true difference) — the probability of a result at least this large <em>if</em> the effect of the drug did not differ from placebo. It is a statement about the data under the null, not about the hypothesis.',
                C: 'This is just 1 minus the misconception in option A, and it is wrong for the same reason: a p-value says nothing directly about the probability the treatment works.',
                D: 'A p-value is not an effect size. It does not tell you how big the difference is — only how surprising the data would be under the null. Read the effect size and its confidence interval for magnitude.'
            }
        },
        {
            id: 'q2',
            number: 2,
            prompt: 'You have a coin that you are trying to determine if it\'s fair or biased. You flip it 10 times and get 8 heads. The p-value is 0.11 for the hypothesis that the coin is fair. What does that 0.11 tell you?',
            options: [
                { key: 'A', text: 'If the coin were fair, a result this extreme would arise about 11% of the time.' },
                { key: 'B', text: 'There is only an 11% probability that this particular coin is actually fair.' },
                { key: 'C', text: 'There is an 89% probability that this coin is genuinely biased rather than fair.' },
                { key: 'D', text: 'Over many tosses, this coin would be expected to land heads about 11% more often than tails.' }
            ],
            correct: 'A',
            explanations: {
                A: 'Correct. 0.11 is P(data | fair coin) — the chance of a result at least this lopsided (8 or more heads, or 8 or more tails) <em>if</em> the coin is fair. It describes the data under the assumption of fairness, not whether the coin is actually fair.',
                B: 'This reverses the conditional. The chance the coin is fair <em>given</em> the data (the Bayesian posterior) depends on how common biased coins are to begin with. When most coins are fair, 8 heads still usually comes from a fair coin — that probability is far higher than 11%.',
                C: 'This is just 1 minus the misconception in B, and wrong for the same reason. The p-value is not the probability the coin is fair, so 1 minus it is not the probability the coin is loaded.',
                D: 'The 0.11 is a p-value, not a measure of how biased the coin is. It says nothing about the size of any bias.'
            }
        },
        {
            id: 'q3',
            number: 3,
            prompt: 'Two trials test the same blood-pressure drug and find an identical mean reduction of 5 mmHg relative to the placebo. Trial A (n = 40) reports p = 0.30; Trial B (n = 40,000) reports p < 0.001. Which conclusion is best supported?',
            options: [
                { key: 'A', text: 'The much larger treatment effect in Trial B is what drove its smaller p-value.' },
                { key: 'B', text: 'The drug produced a stronger blood-pressure response in Trial B’s population.' },
                { key: 'C', text: 'Trial B’s smaller p-value reflects its far larger sample size.' },
                { key: 'D', text: 'Because it was not significant, Trial A shows the drug has no effect.' }
            ],
            correct: 'C',
            explanations: {
                A: 'The effect is identical in both trials (5 mmHg). Trial B’s tiny p-value comes from its precision, not a bigger effect.',
                B: 'Both trials found the same 5 mmHg response. Nothing here suggests the drug works differently in the two populations.',
                C: 'Correct. With 1,000× the sample size, the very same 5 mmHg difference becomes highly “significant.” A smaller p-value means more precise, not larger or more clinically important — p-values are driven by sample size and variability, not effect magnitude alone.',
                D: 'A non-significant result is not proof of no effect. Trial A was simply too small to distinguish a 5 mmHg difference from zero — the trap in the next question.'
            }
        },
        {
            id: 'q4',
            number: 4,
            prompt: 'A stroke-therapy trial reports a 15% relative risk reduction in mortality that is not significant: p = 0.20, 95% CI for the risk ratio 0.66–1.09. What is the best interpretation?',
            options: [
                { key: 'A', text: 'With p = 0.20, the trial shows the therapy has no effect on mortality.' },
                { key: 'B', text: 'The therapy\'s effect on mortality remains uncertain; a larger trial may be warranted.' },
                { key: 'C', text: 'The wide confidence interval rules out any clinically important mortality benefit.' },
                { key: 'D', text: 'The therapy should be adopted, since the point estimate still favors treatment.' }
            ],
            correct: 'B',
            explanations: {
                A: 'Absence of significance is not evidence of no effect. A wide confidence interval that crosses 1 means the data are simply inconclusive.',
                B: 'Correct. The CI (0.66–1.09) runs from a substantial mortality benefit — a 34% relative reduction — to modest harm, so the trial can neither confirm nor exclude a clinically important effect. A non-significant p-value with a wide CI means “we don’t know yet,” not “no effect.”',
                C: 'The opposite is true. Because the CI extends down to 0.66, a large benefit is entirely compatible with these data — nothing important is ruled out.',
                D: 'A point estimate favoring treatment with a CI that crosses 1 does not justify adoption. The uncertainty is too wide to act on; read the whole CI, not just the direction of the estimate.'
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

    function storeAnswer(id, key, correct) {
        const data = _load();
        if (!data.answers) data.answers = {};
        data.answers[id] = { key, correct };
        _save(data);
    }

    function getStoredAnswers() {
        return _load().answers || {};
    }

    function getById(id) {
        return QUESTIONS.find(q => q.id === id);
    }

    /**
     * Render one interleaved question into `container`.
     *   opts.onReveal(isCorrect, chosenKey)  — called once, after the learner submits
     *   opts.nextHref                        — where "Next" navigates
     *   opts.nextLabel                       — label for the Next button
     */
    function render(container, id, opts = {}) {
        const q = getById(id);
        if (!q) return;

        container.innerHTML = '';

        const block = document.createElement('div');
        block.className = 'question-block';

        const prompt = document.createElement('p');
        prompt.className = 'question-prompt';
        prompt.innerHTML = q.prompt;
        block.appendChild(prompt);

        const optList = document.createElement('div');
        optList.className = 'options-list';
        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-label';
            label.dataset.key = opt.key;

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q.id;
            radio.value = opt.key;

            const text = document.createElement('span');
            text.textContent = `${opt.key}) ${opt.text}`;

            label.appendChild(radio);
            label.appendChild(text);
            optList.appendChild(label);
        });
        block.appendChild(optList);

        const feedback = document.createElement('div');
        feedback.className = 'feedback';
        feedback.style.display = 'none';
        block.appendChild(feedback);

        const errorMsg = document.createElement('p');
        errorMsg.className = 'quiz-error';
        errorMsg.style.display = 'none';
        errorMsg.textContent = 'Select an answer to reveal the explanation.';
        block.appendChild(errorMsg);

        const btnRow = document.createElement('div');
        btnRow.className = 'buttons';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.type = 'button';
        submitBtn.textContent = 'Reveal answer';
        btnRow.appendChild(submitBtn);
        block.appendChild(btnRow);

        container.appendChild(block);

        let revealed = false;
        submitBtn.addEventListener('click', () => {
            if (revealed) return;
            const selected = block.querySelector(`input[name="${q.id}"]:checked`);
            if (!selected) {
                errorMsg.style.display = 'block';
                return;
            }
            errorMsg.style.display = 'none';
            revealed = true;

            const chosen = selected.value;
            const isCorrect = chosen === q.correct;
            storeAnswer(q.id, chosen, isCorrect);

            // Lock options and mark correct / incorrect.
            block.querySelectorAll('input[type="radio"]').forEach(r => { r.disabled = true; });
            block.querySelectorAll('.option-label').forEach(label => {
                const key = label.dataset.key;
                if (key === q.correct) label.classList.add('correct-option');
                if (key === chosen && !isCorrect) label.classList.add('incorrect-option');
            });

            feedback.className = 'feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-incorrect');
            feedback.innerHTML = q.explanations[chosen] || '';
            feedback.style.display = 'block';

            submitBtn.style.display = 'none';

            if (typeof opts.onReveal === 'function') {
                opts.onReveal(isCorrect, chosen);
            }

            if (opts.nextHref) {
                const nextBtn = document.createElement('a');
                nextBtn.className = 'btn btn-primary';
                nextBtn.href = opts.nextHref;
                nextBtn.textContent = opts.nextLabel || 'Next →';
                btnRow.appendChild(nextBtn);
            }
        });
    }

    return {
        QUESTIONS,
        getById,
        getStoredAnswers,
        render
    };
})();
