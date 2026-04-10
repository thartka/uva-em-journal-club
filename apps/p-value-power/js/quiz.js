/**
 * Reusable MCQ component.
 * Renders questions, persists answers in sessionStorage, and shows feedback.
 */

const Quiz = (() => {

    const STORAGE_KEY = 'pvalpower_quiz';

    const QUESTIONS = [
        {
            id: 'q1',
            prompt: 'If a study reports a p-value of 0.03, what does that mean?',
            options: [
                { key: 'A', text: 'There is a 3% chance that the treatment has no effect' },
                { key: 'B', text: 'Assuming no true difference, there is a 3% chance of seeing a result this extreme' },
                { key: 'C', text: 'There is a 97% probability that the treatment is effective and the null hypothesis should be rejected' },
                { key: 'D', text: 'The treatment improves outcomes by 3%' }
            ],
            correct: 'B',
            explanations: {
                A: 'This is a common misconception. A p-value does not tell you the probability that the null hypothesis is true. It tells you how likely the observed data would be <em>if</em> the null hypothesis were true.',
                B: 'Correct! A p-value is the probability of observing data this extreme (or more extreme) under the assumption that there is no true difference between groups.',
                C: 'This reverses the conditional probability. A p-value does not tell you the probability that the treatment works. It tells you how surprising the data would be if there were no real effect.',
                D: 'A p-value is not a measure of effect size. It says nothing about the magnitude of benefit.'
            }
        },
        {
            id: 'q2',
            prompt: 'A study tests one primary outcome and four secondary outcomes, each at \u03B1\u00A0=\u00A00.05. If the treatment has NO real effect on any outcome, what is the approximate probability of finding at least one statistically significant result across all five tests?',
            options: [
                { key: 'A', text: '5%' },
                { key: 'B', text: '23%' },
                { key: 'C', text: '50%' },
                { key: 'D', text: '0%' }
            ],
            correct: 'B',
            explanations: {
                A: '5% applies to each <em>individual</em> test. When you run multiple independent tests, the overall false-positive rate increases. The probability of at least one false positive across 5 tests is 1\u00A0\u2212\u00A00.95\u2075\u00A0\u2248\u00A023%.',
                B: 'Correct! With 5 independent tests at \u03B1\u00A0=\u00A00.05 and no real effect, the probability of at least one significant result is 1\u00A0\u2212\u00A0(1\u00A0\u2212\u00A00.05)\u2075\u00A0\u2248\u00A022.6%.',
                C: 'That is too high. The correct calculation is 1\u00A0\u2212\u00A00.95\u2075\u00A0\u2248\u00A023%. You would need about 14 independent tests to approach a 50% false-positive rate.',
                D: 'Significant results <em>can</em> occur even when there is no real effect\u2014that is exactly what a Type I error (false positive) is. With \u03B1\u00A0=\u00A00.05, about 1 in 20 tests will be significant by chance.'
            }
        },
        {
            id: 'q3',
            prompt: 'A study is designed with 80% power to detect a clinically meaningful difference. If the difference truly exists, what does 80% power mean?',
            options: [
                { key: 'A', text: '80% of patients will benefit from the treatment' },
                { key: 'B', text: 'There is an 80% chance the treatment actually works given the observed data' },
                { key: 'C', text: 'There is an 80% chance the study finds a significant result' },
                { key: 'D', text: 'The p-value will be less than 0.80' }
            ],
            correct: 'C',
            explanations: {
                A: 'Power describes the study\u2019s ability to detect an effect, not the proportion of patients who benefit.',
                B: 'Power is a property of the study <em>design</em>, not a statement about posterior probability after data are observed.',
                C: 'Correct! Power is the probability that the study will produce a statistically significant result when a true difference of the assumed size exists. With 80% power, there is still a 20% chance (Type II error) of missing the effect.',
                D: 'Power is not directly about the p-value\u2019s magnitude. It is the probability of rejecting the null hypothesis when the alternative is true.'
            }
        }
    ];

    function _load() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
        } catch { return {}; }
    }

    function _save(data) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function getStoredAnswers() {
        return _load();
    }

    function storeAnswer(questionId, answerKey) {
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

    /**
     * Render pre-quiz (skippable) into a container element.
     *   container: DOM element
     *   onComplete: callback when user clicks Next
     */
    function renderPreQuiz(container, onComplete) {
        const stored = _load();
        if (!stored.pre) stored.pre = {};

        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'quiz-form';

        QUESTIONS.forEach(q => {
            const block = _buildQuestionBlock(q, stored.pre[q.id] || null, false);
            block.addEventListener('change', () => {
                const selected = block.querySelector(`input[name="${q.id}"]:checked`);
                if (selected) storeAnswer(q.id, selected.value);
            });
            form.appendChild(block);
        });

        const btnRow = document.createElement('div');
        btnRow.className = 'buttons';

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn btn-secondary';
        skipBtn.textContent = 'Skip';
        skipBtn.onclick = () => onComplete();

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary';
        nextBtn.textContent = 'Submit & Continue';
        nextBtn.onclick = () => onComplete();

        btnRow.appendChild(skipBtn);
        btnRow.appendChild(nextBtn);
        form.appendChild(btnRow);
        container.appendChild(form);
    }

    /**
     * Render post-quiz (required, with feedback) into a container element.
     */
    function renderPostQuiz(container, onComplete) {
        const stored = _load();
        const preAnswers = stored.pre || {};
        if (!stored.post) stored.post = {};

        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'quiz-form';

        QUESTIONS.forEach(q => {
            const block = _buildQuestionBlock(q, stored.post[q.id] || null, true, preAnswers[q.id] || null);
            block.addEventListener('change', () => {
                const selected = block.querySelector(`input[name="${q.id}"]:checked`);
                if (selected) storePostAnswer(q.id, selected.value);
            });
            form.appendChild(block);
        });

        const errorMsg = document.createElement('p');
        errorMsg.className = 'quiz-error';
        errorMsg.style.display = 'none';
        errorMsg.textContent = 'Please answer all questions before submitting.';
        form.appendChild(errorMsg);

        const btnRow = document.createElement('div');
        btnRow.className = 'buttons';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Submit Answers';
        submitBtn.onclick = () => {
            const current = _load();
            const post = current.post || {};
            const allAnswered = QUESTIONS.every(q => post[q.id]);
            if (!allAnswered) {
                errorMsg.style.display = 'block';
                return;
            }
            errorMsg.style.display = 'none';
            _showFeedback(form, post);
            submitBtn.style.display = 'none';

            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-primary';
            nextBtn.textContent = 'Finish';
            nextBtn.onclick = () => onComplete();
            btnRow.appendChild(nextBtn);
        };

        btnRow.appendChild(submitBtn);
        form.appendChild(btnRow);
        container.appendChild(form);
    }

    function _buildQuestionBlock(question, selectedKey, showPrevious, previousKey) {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.dataset.qid = question.id;

        const prompt = document.createElement('p');
        prompt.className = 'question-prompt';
        prompt.textContent = question.prompt;
        block.appendChild(prompt);

        if (showPrevious && previousKey) {
            const prev = document.createElement('p');
            prev.className = 'previous-answer';
            const prevOpt = question.options.find(o => o.key === previousKey);
            prev.textContent = `Your initial answer: ${previousKey}) ${prevOpt ? prevOpt.text : ''}`;
            block.appendChild(prev);
        }

        const optList = document.createElement('div');
        optList.className = 'options-list';
        question.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = question.id;
            radio.value = opt.key;
            if (selectedKey === opt.key) radio.checked = true;

            const text = document.createElement('span');
            text.textContent = `${opt.key}) ${opt.text}`;

            label.appendChild(radio);
            label.appendChild(text);
            optList.appendChild(label);
        });
        block.appendChild(optList);

        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback';
        feedbackDiv.style.display = 'none';
        block.appendChild(feedbackDiv);

        return block;
    }

    function _showFeedback(form, postAnswers) {
        QUESTIONS.forEach(q => {
            const block = form.querySelector(`[data-qid="${q.id}"]`);
            if (!block) return;
            const selected = postAnswers[q.id];
            const isCorrect = selected === q.correct;
            const feedbackDiv = block.querySelector('.feedback');

            feedbackDiv.className = 'feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-incorrect');
            feedbackDiv.innerHTML = q.explanations[selected] || '';
            feedbackDiv.style.display = 'block';

            block.querySelectorAll('input[type="radio"]').forEach(r => { r.disabled = true; });

            block.querySelectorAll('.option-label').forEach(label => {
                const radio = label.querySelector('input');
                if (radio.value === q.correct) label.classList.add('correct-option');
                if (radio.value === selected && !isCorrect) label.classList.add('incorrect-option');
            });
        });
    }

    return {
        QUESTIONS,
        getStoredAnswers,
        renderPreQuiz,
        renderPostQuiz
    };
})();
