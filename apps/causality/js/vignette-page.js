(() => {
    const { QUESTIONS, storePreAnswer, getStoredAnswers } = CausalityQuestions;

    const form = document.getElementById('quiz-form');
    const skipBtn = document.getElementById('skip-btn');
    const continueBtn = document.getElementById('continue-btn');
    const errorMsg = document.getElementById('quiz-error');

    const stored = getStoredAnswers();
    const preAnswers = stored.pre || {};

    QUESTIONS.forEach(q => {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.dataset.qid = q.id;

        const prompt = document.createElement('p');
        prompt.className = 'question-prompt';
        prompt.textContent = q.prompt;
        block.appendChild(prompt);

        const optList = document.createElement('div');
        optList.className = 'options-list';

        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q.id;
            radio.value = opt.key;
            if (preAnswers[q.id] === opt.key) radio.checked = true;

            const text = document.createElement('span');
            text.textContent = `${opt.key}) ${opt.text}`;

            label.appendChild(radio);
            label.appendChild(text);
            optList.appendChild(label);
        });

        block.appendChild(optList);
        form.appendChild(block);

        block.addEventListener('change', () => {
            const selected = block.querySelector(`input[name="${q.id}"]:checked`);
            if (selected) storePreAnswer(q.id, selected.value);
        });
    });

    skipBtn.addEventListener('click', () => {
        window.location.href = 'hill-criteria.html';
    });

    continueBtn.addEventListener('click', () => {
        const current = getStoredAnswers();
        const pre = current.pre || {};
        const allAnswered = QUESTIONS.every(q => pre[q.id]);

        if (!allAnswered) {
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        window.location.href = 'hill-criteria.html';
    });
})();
