/**
 * Writing an Abstract module: shared content.
 *
 * SECTIONS        the four parts of a structured abstract, in order
 * RUNNING_EXAMPLE the hyperkalemia machine learning abstract used on pages 2 to 5
 * EXERCISE        the mild hyperkalemia abstract used for the page 6 build exercise
 */

const AbstractData = (() => {

    const SECTIONS = [
        { id: 'background', label: 'Background', page: 'p2-background.html' },
        { id: 'methods', label: 'Methods', page: 'p3-methods.html' },
        { id: 'results', label: 'Results', page: 'p4-results.html' },
        { id: 'conclusion', label: 'Conclusion', page: 'p5-conclusion.html' }
    ];

    // Each element is one job a section should do. `hl` indexes the highlight palette in styles.css.
    const RUNNING_EXAMPLE = {
        background: {
            elements: [
                { id: 'why', label: 'Why the problem is important', hl: 1 },
                { id: 'goal', label: 'Goal of the project', hl: 2 }
            ],
            sentences: [
                { el: 'why', text: 'Hyperkalemia is a common electrolyte derangement in the emergency department and knowing which patients are at the highest risk for adverse events can assist in treatment and disposition decisions.' },
                { el: 'goal', text: 'The goal of this project was to determine which patient factors were the most important in predicting adverse outcomes in patients with hyperkalemia using a machine learning approach.' }
            ]
        },
        methods: {
            elements: [
                { id: 'design', label: 'Study type and data source', hl: 1 },
                { id: 'criteria', label: 'Inclusion and exclusion criteria', hl: 2 },
                { id: 'interest', label: 'Methods of interest', hl: 3 },
                { id: 'primary', label: 'Primary outcome', hl: 4 },
                { id: 'secondary', label: 'Secondary outcomes', hl: 5, absent: true }
            ],
            sentences: [
                { el: 'design', text: 'We performed a retrospective cohort study of adult patients at the University of Virginia Health System in 2020 and 2021, including both inpatient and outpatient encounters.' },
                { el: 'criteria', text: 'Patients were included who had a non-hemolyzed potassium level of ≥5.5 mmol/L and an electrocardiogram (ECG) done within 1 hour of the potassium draw.' },
                { el: 'criteria', text: 'We excluded patients who received cardiac membrane stabilizing and intracellular potassium-shifting medications prior to ECG, those on vasopressors, and those with a platelet count >500,000.' },
                { el: 'interest', text: 'Our predictors were age, potassium value, creatinine value, QTc, QRS interval, PR interval, atrial fibrillation (a-fib), atrial flutter (a-flutter), left bundle branch block (LBBB), and right bundle branch block (RBBB), peaked T-waves, and left ventricular hypertrophy (LVH).' },
                { el: 'primary', text: 'We defined our outcome of interest as a composite of symptomatic bradycardia, ventricular tachycardia or fibrillation, cardiac arrest, and death within 12 hours of the potassium draw.' },
                { el: 'interest', text: 'The data was split into a training set (70%) and a testing set (30%).' },
                { el: 'interest', text: 'We built a random forest model using the training data then evaluated its performance using the testing set.' }
            ]
        },
        results: {
            elements: [
                { id: 'screened', label: 'Screened, then included', hl: 1 },
                { id: 'primary', label: 'How many had the primary outcome', hl: 2 },
                { id: 'test', label: 'Chief hypothesis test', hl: 3 },
                { id: 'secondary', label: 'Secondary outcomes and other details', hl: 4 }
            ],
            sentences: [
                { el: 'screened', text: 'Our inclusion criteria identified 1002 patients with hyperkalemia, and after exclusions, we had a final sample of 727.' },
                { el: 'primary', text: 'We identified 28 hyperkalemia-associated adverse events in 56 patients, yielding an adverse event rate of 7.7%.' },
                { el: 'test', text: 'Using the threshold that optimized the Youden’s J statistic, the accuracy was 67% with a sensitivity of 65% and a specificity of 67%.' },
                { el: 'secondary', text: 'All the predictors were found to increase the probability of an adverse event.' },
                { el: 'secondary', text: 'ECG intervals (QTc, PR interval, and QRS interval) were found to be the most important variables in the model, followed by the patient’s age, potassium value, and creatinine value (Figure).' },
                { el: 'secondary', text: 'Sex, persistent ECG findings (a-fib, a-flutter, RBBB, LBBB, and LVH), and Peaked T-waves were found to be modestly predictive.' }
            ]
        },
        conclusion: {
            elements: [
                { id: 'rate', label: 'Ties back to the event rate and model accuracy', hl: 2 },
                { id: 'importance', label: 'Ties back to which predictors mattered most', hl: 4 }
            ],
            sentences: [
                // `links` are indexes into results.sentences
                { el: 'rate', links: [1, 2], text: 'Adverse events due to hyperkalemia occur moderately frequently, however, they are difficult to predict using a random forest model.' },
                { el: 'importance', links: [4], text: 'ECG intervals were the most important factors for predicting an adverse event, followed by age and laboratory results.' }
            ]
        }
    };

    // Page 6. Within a section the sentences are listed in the order they appear in the abstract.
    const EXERCISE = {
        background: [
            {
                text: 'Many guidelines offer specific potassium values at which treatments should be given to prevent adverse effects from hyperkalemia, while others rely solely on clinical and electrocardiographic findings to guide management.',
                hint: 'This sets up why the question matters. Where does an abstract do that?'
            },
            {
                text: 'We wanted to determine the rate of adverse events in patients with hyperkalemia in a range generally accepted to be mild (5.5-6.4 mmol/L).',
                hint: '“We wanted to determine…” is a statement of the project’s goal.'
            }
        ],
        methods: [
            {
                text: 'We performed a retrospective cohort study of adult patients in which a non-hemolyzed potassium resulted at a level of 5.5-6.4 mmol/L, and an electrocardiogram (ECG) was done within 1 hour of the potassium draw.',
                hint: 'This names the type of study and who qualified for it.'
            },
            {
                text: 'Our sample included all episodes involving adult patients at the University of Virginia Health System in 2020 and 2021, including both inpatient and outpatient encounters.',
                hint: 'Where and when the data came from describes how the study was done.'
            },
            {
                text: 'We excluded patients who received cardiac membrane stabilizing and intracellular potassium-shifting medications prior to ECG, those on vasopressors (can cause ECG changes), and those with a platelet count >500,000 (can cause pseudohyperkalemia).',
                hint: 'Who was left out, and why, is decided before any data are analyzed.'
            },
            {
                text: 'We defined adverse events as symptomatic bradycardia, ventricular tachycardia or fibrillation, cardiac arrest, and death within 12 hours of ECG and potassium draw.',
                hint: 'This defines the outcome. It does not count it yet.'
            }
        ],
        results: [
            {
                text: 'Our query resulted in 1002 discrete episodes of hyperkalemia, and after exclusions, we had a final sample of 618 episodes of mild hyperkalemia.',
                hint: 'These are counts of the episodes screened and the episodes included.'
            },
            {
                text: 'We identified 28 hyperkalemia-associated adverse events in 21 patients, yielding an adverse event rate of 4.5%.',
                hint: 'This counts how often the primary outcome happened.'
            },
            {
                text: 'There were 16 episodes of symptomatic bradycardia, 2 episodes of ventricular tachycardia, and 6 episodes of cardiac arrest with 4 deaths.',
                hint: 'This breaks down the events that were actually observed.'
            },
            {
                text: 'In the 2 episodes of ventricular tachycardia, there were no ECG changes typically associated with hyperkalemia on the initial ECG.',
                hint: 'This reports what was seen in specific patients, which is a finding of the study.'
            },
            {
                text: 'Of the patients who experienced an adverse event, 14 patients had acute kidney injuries (AKIs) and 4 had end-stage renal disease.',
                hint: 'This describes the patients who had the outcome, which is a finding of the study.'
            }
        ],
        conclusion: [
            {
                text: 'Adverse events due to mild hyperkalemia are uncommon, and nearly all of them present with characteristic clinical signs and ECG changes.',
                hint: 'This sums up what the findings mean, without any new numbers.'
            },
            {
                text: 'While we identified 2 adverse events in patients that would have been deemed not to need emergent stabilization based on the initial potassium and ECG, it is difficult to draw conclusions from such rare events.',
                hint: 'This weighs how much the findings can tell us. Interpretation comes last.'
            }
        ]
    };

    function wordCount(text) {
        return text.trim().split(/\s+/).length;
    }

    function sectionWordCount(sectionId) {
        return RUNNING_EXAMPLE[sectionId].sentences.reduce((n, s) => n + wordCount(s.text), 0);
    }

    return { SECTIONS, RUNNING_EXAMPLE, EXERCISE, wordCount, sectionWordCount };
})();
