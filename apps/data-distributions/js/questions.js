/**
 * data-distributions: question bank + interleaved MCQ renderer.
 *
 * Format matches apps/p-values: one board-style question per page, the learner
 * commits to an answer, then the correct answer, an explanation and an
 * interactive activity are revealed together.
 */

const DistributionQuestions = (() => {

    const STORAGE_KEY = 'data_distributions';

    // FIXED ORDER: do not reorder options or change their A–D keys.
    // Options render in array order with no shuffling, so the presenter's
    // screen matches the residents' phones. This order must stay stable across
    // versions once published.
    const QUESTIONS = [
        {
            id: 'q1',
            number: 1,
            prompt: 'A study of 400 pediatric ED patients reports patient age as ' +
                    '<strong>mean 5 years (SD 6)</strong>. What is the best interpretation?',
            options: [
                { key: 'A', text: 'About 95% of patients were between −7 and 17 years of age.' },
                { key: 'B', text: 'Age is right-skewed; median with IQR would summarize it better.' },
                { key: 'C', text: 'Age is normally distributed with wide variability.' },
                { key: 'D', text: 'The 95% CI for the mean age should be reported instead.' }
            ],
            correct: 'B',
            explanations: {
                A: 'This is the arithmetic you would do <em>if</em> the data were normal, and ' +
                   'running it is exactly how you discover they are not. Mean − 2 SD = −7 years. ' +
                   'No patient can be −7 years old, so the distribution cannot be normal, and ' +
                   'mean ± SD is the wrong summary.',
                B: 'Correct. The SD (6) exceeds the mean (5) on a variable that cannot go below ' +
                   'zero. Mean − 1 SD is already −1 year. When the SD approaches or exceeds the ' +
                   'mean of a non-negative variable, the data are right-skewed: here, mostly ' +
                   'young children with a tail of older ones. Report the median with IQR.',
                C: '"Wide variability" is the charitable reading, but it does not survive the ' +
                   'arithmetic: a normal distribution with mean 5 and SD 6 puts about 20% of ' +
                   'patients at a negative age. The width is not the problem. The shape is.',
                D: 'A tempting one, because a 95% CI is a perfectly respectable statistic. But a ' +
                   'CI describes how precisely you know the <em>mean</em>; it says nothing about ' +
                   'how the <em>patients</em> are spread, and it does not repair a skewed ' +
                   'variable. Describing the patients needs the median and IQR.'
            }
        },
        {
            id: 'q2',
            number: 2,
            prompt: 'Left ventricular ejection fraction in 12,000 patients with heart failure. ' +
                    'The histogram shows two distinct peaks, one near 30% in patients with ' +
                    'reduced EF and one near 60% in those with preserved EF. Reported values: ' +
                    '<strong>mean 45% (SD 16)</strong>, <strong>median 46% (IQR 31–58)</strong>. ' +
                    'What is the most appropriate way to summarize this?',
            options: [
                { key: 'A', text: 'Mean 45% (SD 16): mean and median are nearly equal, so the data are normal.' },
                { key: 'B', text: 'Median 46% (IQR 31–58).' },
                { key: 'C', text: 'Neither single summary captures this: show the distribution and describe both groups.' },
                { key: 'D', text: 'Mean with a 95% CI, since the sample is large.' }
            ],
            correct: 'C',
            explanations: {
                A: 'This is the trap. Mean ≈ median tells you the distribution is roughly ' +
                   '<em>symmetric</em>. It does not tell you it is <em>normal</em>. A bimodal ' +
                   'distribution with two balanced peaks is perfectly symmetric about its ' +
                   'centre, and its centre is the valley where the fewest patients are. Here ' +
                   'that centre lands at 45%, the mildly reduced range, which is the smallest ' +
                   'of the three EF categories.',
                B: 'Not wrong so much as insufficient, which makes it the most interesting ' +
                   'distractor here. The median and IQR are robust and honest, but "median 46%" ' +
                   'still describes a single typical patient, and there is no single typical ' +
                   'heart failure patient in this dataset: there are two, and they are not the ' +
                   'same disease to treat.',
                C: 'Correct. With two peaks, every single-number summary lands in the trough ' +
                   'between them and describes an ejection fraction that relatively few ' +
                   'patients actually have. This is the case the handout means by "visual ' +
                   'representation is helpful for multimodal data": show the histogram, and ' +
                   'report HFrEF and HFpEF separately, because they differ in treatment and in ' +
                   'what the trials show.',
                D: 'Sample size is not the issue. n = 12,000 makes the mean very ' +
                   '<em>precise</em>, and a precise estimate of a number that describes nobody ' +
                   'is still not a useful summary. A narrow CI around 45% would give false ' +
                   'confidence in a value sitting between the two real groups.'
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
        data.answers[id] = { key: key, correct: correct };
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
     *   opts.onReveal(isCorrect, chosenKey)
     *   opts.nextHref / opts.nextLabel
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
            text.textContent = opt.key + ') ' + opt.text;

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
            const selected = block.querySelector('input[name="' + q.id + '"]:checked');
            if (!selected) {
                errorMsg.style.display = 'block';
                return;
            }
            errorMsg.style.display = 'none';
            revealed = true;

            const chosen = selected.value;
            const isCorrect = chosen === q.correct;
            storeAnswer(q.id, chosen, isCorrect);

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
        QUESTIONS: QUESTIONS,
        getById: getById,
        getStoredAnswers: getStoredAnswers,
        render: render
    };
})();
