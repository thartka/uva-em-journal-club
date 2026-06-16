(() => {
    const { QUESTIONS, getStoredAnswers, storePostAnswer, getOptionText } = CausalityQuestions;

    const quizForm = document.getElementById('post-quiz-form');
    const submitBtn = document.getElementById('submit-btn');
    const finishBtn = document.getElementById('finish-btn');
    const errorMsg = document.getElementById('quiz-error');
    const debriefPanel = document.getElementById('debrief-panel');

    const stored = getStoredAnswers();
    const preAnswers = stored.pre || {};
    if (!stored.post) stored.post = {};

    QUESTIONS.forEach(q => {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.dataset.qid = q.id;

        const prompt = document.createElement('p');
        prompt.className = 'question-prompt';
        prompt.textContent = q.prompt;
        block.appendChild(prompt);

        if (preAnswers[q.id]) {
            const prev = document.createElement('p');
            prev.className = 'previous-answer';
            prev.textContent = `Your initial answer: ${getOptionText(q.id, preAnswers[q.id])}`;
            block.appendChild(prev);
        }

        const optList = document.createElement('div');
        optList.className = 'options-list';

        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `post-${q.id}`;
            radio.value = opt.key;
            if (stored.post[q.id] === opt.key) radio.checked = true;

            const text = document.createElement('span');
            text.textContent = `${opt.key}) ${opt.text}`;

            label.appendChild(radio);
            label.appendChild(text);
            optList.appendChild(label);
        });

        block.appendChild(optList);

        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback hidden';
        block.appendChild(feedbackDiv);

        quizForm.appendChild(block);

        block.addEventListener('change', () => {
            const selected = block.querySelector(`input[name="post-${q.id}"]:checked`);
            if (selected) storePostAnswer(q.id, selected.value);
        });
    });

    function showFeedback() {
        const current = getStoredAnswers();
        const post = current.post || {};

        QUESTIONS.forEach(q => {
            const block = quizForm.querySelector(`[data-qid="${q.id}"]`);
            const selected = post[q.id];
            const feedbackDiv = block.querySelector('.feedback');
            const isCorrect = selected === q.correct;

            feedbackDiv.className = 'feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-incorrect');
            feedbackDiv.innerHTML = q.explanations[selected] || '';
            feedbackDiv.classList.remove('hidden');

            block.querySelectorAll('input[type="radio"]').forEach(r => { r.disabled = true; });

            block.querySelectorAll('.option-label').forEach(label => {
                const radio = label.querySelector('input');
                if (radio.value === q.correct) label.classList.add('correct-option');
                if (radio.value === selected && !isCorrect) label.classList.add('incorrect-option');
            });
        });

        debriefPanel.classList.remove('hidden');
        submitBtn.classList.add('hidden');
        finishBtn.classList.remove('hidden');
    }

    submitBtn.addEventListener('click', () => {
        const current = getStoredAnswers();
        const post = current.post || {};
        const allAnswered = QUESTIONS.every(q => post[q.id]);

        if (!allAnswered) {
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        showFeedback();
    });

    finishBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
})();
