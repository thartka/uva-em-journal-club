/**
 * Type I / Type II errors module — shared question bank + interleaved MCQ renderer.
 *
 * Format: each page shows one board-style question. The learner commits to an
 * answer, then the correct answer, an explanation, and an interactive activity
 * are revealed together. A "Next" button advances to the following question.
 */

const TypeErrorQuestions = (() => {

    const STORAGE_KEY = 'type_i_ii';

    const QUESTIONS = [
        {
            id: 'q1',
            number: 1,
            prompt: 'A trial concludes that a thiamine, steroids, and vitamin C bundle reduces sepsis mortality. A larger, more rigorous trial later shows the bundle has no real effect on mortality. The first trial’s positive result is best described as a:',
            options: [
                { key: 'A', text: 'Selection bias' },
                { key: 'B', text: 'Type I error' },
                { key: 'C', text: 'Type II error' },
                { key: 'D', text: 'Inadequate power' }
            ],
            correct: 'B',
            explanations: {
                A: 'Selection bias is a systematic flaw in how patients enter or are grouped in a study. This false positive arose from chance under α, not from a design flaw.',
                B: 'Correct. A Type I error is rejecting a true null hypothesis — detecting an effect that is not real (a false positive). Its long-run rate is exactly the significance level α you choose.',
                C: 'A Type II error is the opposite: <em>failing</em> to detect an effect that truly exists. Here an effect was reported when none exists.',
                D: 'Inadequate power drives Type II errors (false negatives). A false positive is governed by α, not by power.'
            }
        },
        {
            id: 'q2',
            number: 2,
            prompt: 'An underpowered trial of thrombolytics for acute MI reports “no significant difference” in mortality, even though the drug truly reduces death. Failing to detect this real benefit is a:',
            options: [
                { key: 'A', text: 'Type I error' },
                { key: 'B', text: 'Publication bias' },
                { key: 'C', text: 'Small effect size' },
                { key: 'D', text: 'Type II error' }
            ],
            correct: 'D',
            explanations: {
                A: 'A Type I error is a false positive — claiming an effect that is not real. Here a real effect was missed.',
                B: 'Publication bias concerns which studies get published, not whether a given study detects its effect.',
                C: 'A small effect size contributes to low power, but the error itself is the missed detection — a Type II error.',
                D: 'Correct. A Type II error is failing to reject a false null — missing an effect that is truly there (a false negative). Its probability is β, and power = 1 − β.'
            }
        },
        {
            id: 'q3',
            number: 3,
            prompt: 'Investigators change their significance threshold from α = 0.05 to α = 0.01 and change nothing else. Holding effect size and sample size constant, the probability of a Type II error (β) will:',
            options: [
                { key: 'A', text: 'Increase' },
                { key: 'B', text: 'Decrease' },
                { key: 'C', text: 'Stay the same' },
                { key: 'D', text: 'Cannot be determined' }
            ],
            correct: 'A',
            explanations: {
                A: 'Correct. Making α more stringent moves the decision threshold outward, shrinking the false-positive region but enlarging β. For a fixed effect size and sample size, lowering α raises β (and lowers power).',
                B: 'Lowering α does not reduce β — the two trade off. Reducing one for free requires more data or a larger true effect.',
                C: 'α and β are linked through the same threshold. Moving the threshold to change α necessarily changes β.',
                D: 'With effect size and sample size held constant, the direction is determined: a stricter α increases β.'
            }
        },
        {
            id: 'q4',
            number: 4,
            prompt: 'A trial is planned with 80% power. Which single change would most increase its power to detect a true effect of the assumed size?',
            options: [
                { key: 'A', text: 'Lowering α to 0.01' },
                { key: 'B', text: 'Increasing the sample size' },
                { key: 'C', text: 'Choosing a more variable outcome' },
                { key: 'D', text: 'Reducing the sample size' }
            ],
            correct: 'B',
            explanations: {
                A: 'Lowering α makes the test more stringent and <em>decreases</em> power (increases β) — the opposite of the goal.',
                B: 'Correct. A larger sample narrows the sampling distributions, so a true effect is easier to detect — power rises and β falls. A larger true effect and a less variable outcome also raise power.',
                C: 'Greater outcome variability decreases power; you would need an even larger sample to overcome it.',
                D: 'Reducing the sample size decreases power and increases the risk of a Type II error.'
            }
        },
        {
            id: 'q5',
            number: 5,
            prompt: 'A trial of 200,000 patients finds that a new triage protocol produces a statistically significant reduction in ED length of stay of 2 minutes (p < 0.05). The most important concern is:',
            options: [
                { key: 'A', text: 'Insufficient statistical power to detect the effect' },
                { key: 'B', text: 'A false-positive result from a Type I error' },
                { key: 'C', text: 'Statistical significance without clinical significance' },
                { key: 'D', text: 'A treatment effect too large to be clinically plausible' }
            ],
            correct: 'C',
            explanations: {
                A: 'A trial of 200,000 patients that reaches significance is over-powered, not underpowered.',
                B: 'A Type I error is always possible, but the central problem here is that a real yet trivial effect was detected and risks being over-interpreted.',
                C: 'Correct. With a very large sample, even a 2-minute difference — clinically negligible — can be statistically significant. Statistical significance is not the same as clinical importance; judge the effect size and its confidence interval, not the p-value alone.',
                D: 'Two minutes is a tiny effect, not an implausibly large one. The issue is that it is too small to matter clinically, not too big to believe.'
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
