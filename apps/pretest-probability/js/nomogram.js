window.Nomogram = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const WIDTH = 430;
    const HEIGHT = 430;
    const CENTER_Y = 250;
    const MIN_Y = 100;
    const MAX_Y = 390;
    const LEFT_X = 70;
    const MID_X = 215;
    const RIGHT_X = 360;
    const SCALE = (MAX_Y - MIN_Y) / (2 * Math.log10(99));

    function createSvgElement(name, attributes = {}) {
        const element = document.createElementNS(NS, name);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });
        return element;
    }

    function logOdds(probability) {
        return Math.log10(window.PretestProbability.probToOdds(probability));
    }

    function yForPretest(probability) {
        return CENTER_Y + SCALE * logOdds(probability);
    }

    function yForPosttest(probability) {
        return CENTER_Y - SCALE * logOdds(probability);
    }

    function yForLikelihoodRatio(likelihoodRatio) {
        return CENTER_Y - (SCALE / 2) * Math.log10(likelihoodRatio);
    }

    function addText(svg, x, y, text, attributes = {}) {
        const node = createSvgElement('text', {
            x,
            y,
            fill: '#333',
            'font-size': 14,
            'text-anchor': 'middle',
            ...attributes
        });
        node.textContent = text;
        svg.appendChild(node);
        return node;
    }

    function addAxis(svg, x, title, ticks, yMapper, align = 'middle') {
        svg.appendChild(createSvgElement('line', {
            x1: x,
            y1: MIN_Y,
            x2: x,
            y2: MAX_Y,
            stroke: '#232D4B',
            'stroke-width': 3
        }));

        addText(svg, x, 88, title, {
            fill: '#232D4B',
            'font-size': 16,
            'font-weight': 700
        });

        ticks.forEach((tick) => {
            const y = yMapper(tick.value);
            svg.appendChild(createSvgElement('line', {
                x1: x - 8,
                y1: y,
                x2: x + 8,
                y2: y,
                stroke: '#232D4B',
                'stroke-width': 2
            }));

            const labelX = align === 'left' ? x - 12 : x + 12;
            const anchor = align === 'left' ? 'end' : 'start';
            addText(svg, labelX, y + 5, tick.label, {
                'text-anchor': anchor,
                'font-size': 13
            });
        });
    }

    function addMarker(svg, x, y, label, color, labelPosition = 'above') {
        svg.appendChild(createSvgElement('circle', {
            cx: x,
            cy: y,
            r: 8,
            fill: color,
            stroke: 'white',
            'stroke-width': 3
        }));

        const labelAttributes = {
            fill: color,
            'font-size': 14,
            'font-weight': 700
        };

        if (labelPosition === 'left') {
            addText(svg, x - 14, y + 5, label, {
                ...labelAttributes,
                'text-anchor': 'end'
            });
            return;
        }

        if (labelPosition === 'right') {
            addText(svg, x + 14, y + 5, label, {
                ...labelAttributes,
                'text-anchor': 'start'
            });
            return;
        }

        addText(svg, x, y - 16, label, labelAttributes);
    }

    function render(svg, options) {
        const {
            pretestProbability,
            likelihoodRatio,
            title = 'Nomogram',
            subtitle = ''
        } = options;

        const posttestProbability = window.PretestProbability.applyLikelihoodRatio(pretestProbability, likelihoodRatio);
        const pretestY = yForPretest(pretestProbability);
        const lrY = yForLikelihoodRatio(likelihoodRatio);
        const posttestY = yForPosttest(posttestProbability);

        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

        svg.appendChild(createSvgElement('rect', {
            x: 20,
            y: 20,
            width: WIDTH - 40,
            height: HEIGHT - 40,
            rx: 18,
            fill: '#ffffff',
            stroke: '#d9d9d9'
        }));

        addText(svg, WIDTH / 2, 38, title, {
            fill: '#232D4B',
            'font-size': 20,
            'font-weight': 700
        });

        if (subtitle) {
            addText(svg, WIDTH / 2, 62, subtitle, {
                fill: '#555',
                'font-size': 13
            });
        }

        const probabilityTicks = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 0.8, 0.9];
        const lrTicks = [0.1, 0.2, 0.5, 1, 2, 5, 10];

        addAxis(
            svg,
            LEFT_X,
            'Pretest probability',
            probabilityTicks.map((value) => ({
                value,
                label: window.PretestProbability.formatPercent(value, value < 0.1 ? 0 : 0)
            })),
            yForPretest,
            'left'
        );

        addAxis(
            svg,
            MID_X,
            'Likelihood ratio',
            lrTicks.map((value) => ({
                value,
                label: window.PretestProbability.formatLikelihoodRatio(value)
            })),
            yForLikelihoodRatio,
            'middle'
        );

        addAxis(
            svg,
            RIGHT_X,
            'Post-test probability',
            probabilityTicks.map((value) => ({
                value,
                label: window.PretestProbability.formatPercent(value, value < 0.1 ? 0 : 0)
            })),
            yForPosttest,
            'right'
        );

        svg.appendChild(createSvgElement('line', {
            x1: LEFT_X,
            y1: pretestY,
            x2: RIGHT_X,
            y2: posttestY,
            stroke: '#E57200',
            'stroke-width': 5,
            'stroke-linecap': 'round'
        }));

        addMarker(svg, LEFT_X, pretestY, window.PretestProbability.formatPercent(pretestProbability, 1), '#2196F3', 'right');
        addMarker(svg, MID_X, lrY, `LR ${window.PretestProbability.formatLikelihoodRatio(likelihoodRatio)}`, '#E57200', 'left');
        addMarker(svg, RIGHT_X, posttestY, window.PretestProbability.formatPercent(posttestProbability, 1), '#232D4B', 'left');

        return posttestProbability;
    }

    return {
        render
    };
})();
