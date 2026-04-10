/**
 * RCT data generation for both studies and secondary outcomes.
 * Depends on Stats (stats.js).
 */

const RCTSim = (() => {

    /**
     * Generate a single two-arm trial.
     *   nPerArm:   patients per arm
     *   pTreat:    true event rate in treatment arm
     *   pControl:  true event rate in control arm
     * Returns { treatment: [0|1, ...], control: [0|1, ...], pValue, treatRate, controlRate, diff }
     */
    function generateTrial(nPerArm, pTreat, pControl) {
        const treatment = Stats.bernoulliSample(nPerArm, pTreat);
        const control = Stats.bernoulliSample(nPerArm, pControl);
        const tEvents = treatment.reduce((s, v) => s + v, 0);
        const cEvents = control.reduce((s, v) => s + v, 0);
        const pValue = Stats.pValueFromCounts(tEvents, nPerArm, cEvents, nPerArm);
        const treatRate = tEvents / nPerArm;
        const controlRate = cEvents / nPerArm;
        return {
            treatment,
            control,
            pValue,
            treatEvents: tEvents,
            controlEvents: cEvents,
            treatRate,
            controlRate,
            diff: treatRate - controlRate
        };
    }

    /**
     * PANDA Trial (Study 1) — no real difference.
     * Primary outcome: additional vomiting within 2 h, 20 % in both arms.
     */
    function generateStudy1Primary() {
        return generateTrial(100, 0.20, 0.20);
    }

    /**
     * PANDA Trial secondary outcomes — all null.
     * Returns array of { name, treatment[], control[], pValue, treatRate, controlRate, diff }.
     */
    function generateStudy1Secondary() {
        const outcomes = [
            { name: 'Need for IV fluids',              pRate: 0.15 },
            { name: 'ED revisit within 72 h',          pRate: 0.10 },
            { name: 'Tolerating oral fluids at 1 h',   pRate: 0.70 },
            { name: 'Caregiver satisfaction > 7/10',   pRate: 0.80 }
        ];
        return outcomes.map(o => {
            const trial = generateTrial(100, o.pRate, o.pRate);
            return { name: o.name, ...trial };
        });
    }

    /**
     * BREEZE Trial (Study 2) — real difference.
     * Primary: escalation of care, Standard 25 %, HFNC 10 %.
     */
    function generateStudy2Primary() {
        return generateTrial(100, 0.10, 0.25);
    }

    /**
     * Batch-generate 20 trials for the power explorer.
     */
    function generateBatch(nPerArm, pTreat, pControl, count = 20) {
        const trials = [];
        for (let i = 0; i < count; i++) {
            const t = generateTrial(nPerArm, pTreat, pControl);
            trials.push(t);
        }
        return trials;
    }

    return {
        generateTrial,
        generateStudy1Primary,
        generateStudy1Secondary,
        generateStudy2Primary,
        generateBatch
    };
})();
