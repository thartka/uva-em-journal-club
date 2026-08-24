/**
 * data-distributions: Galton board (quincunx) with real collision physics.
 *
 * Rebuilt from apps/mean-sd/js/galton-board.js. That version moved each ball
 * down at a constant speed and snapped it half a column left or right at every
 * row, a state machine wearing a ball costume. This one integrates gravity,
 * resolves circle-circle collisions against every peg, bounces off the frame
 * and the bin dividers, and lets the balls physically pile up in the bins.
 *
 * Layout is a true quincunx: row r carries r+1 pegs, so each gap in row r has
 * a peg centred directly beneath it in row r+1 and a falling ball cannot get
 * through without being deflected. Ten rows produce eleven bins, which is
 * Binomial(10, 1/2).
 *
 * A note on the randomness: a ball released dead centre onto the apex peg sits
 * at an unstable equilibrium, and pure deterministic physics would either
 * balance it there or let any tiny asymmetry in the geometry compound into a
 * lopsided histogram. Real boards rely on imperfections, so this one models two
 * honest ones: jitter in the release position, and a small tangential
 * perturbation at each peg contact (an imperfect peg, a ball with spin).
 *
 * GaltonPhysics is deliberately free of any DOM reference so the distribution
 * it produces can be checked headlessly.
 */

/* ------------------------------------------------------------------ *
 *  Physics
 * ------------------------------------------------------------------ */

class GaltonPhysics {
    constructor(opts = {}) {
        this.rows = opts.rows || 10;
        this.nBins = this.rows + 1;
        this.rng = opts.rng || new RNG(24);

        // Tunables, all expressed in units of one bin width so the board
        // behaves identically at any canvas size.
        //
        // pegR and ballR are the load-bearing pair here, and the constraint is
        // subtler than it first looks. Rows alternate phase: even rows carry
        // pegs at whole bin widths from centre, odd rows at half bin widths.
        // For any ball position, the distance to the nearest even-row peg and
        // the distance to the nearest odd-row peg sum to exactly 0.5. So
        // missing both phases needs 0.5 > 2*(pegR + ballR), and
        //
        //     pegR + ballR >= 0.25
        //
        // guarantees a ball cannot slip past two consecutive rows untouched.
        // The old board used 0.11 + 0.12 = 0.23, just under the threshold,
        // which let a ball thread a vertical channel and reach the bins having
        // never really been deflected.
        //
        // Clearance through a gap is 1 - 2*pegR - 2*ballR = 0.40 bin widths
        // here, wide enough that balls never jam between two pins.
        //
        // Only the *sum* matters to the walk, which is what makes the split
        // between the two free. Big pins with small balls (0.18 + 0.12) keeps
        // the sum at 0.30 and the clearance at 0.40, so the walk is unchanged,
        // while cutting the height of a ball pile roughly in half. That is what
        // lets 200 balls fit in the bins: at 0.14 + 0.16 a 200-ball run filled
        // the centre bin to the brim and balls began stacking above the divider
        // tops, where they no longer belong to any bin.
        this.k = {
            pegR: 0.18,
            ballR: 0.12,
            rowSpacing: 0.95,
            topMargin: 1.60,
            binGap: 1.00,      // vertical gap between last peg row and bin tops
            binH: 4.30,
            bottomMargin: 0.50,
            sideMargin: 0.40,
            dividerHalfW: 0.045
        };

        // Bounciness off a pin. Raising this to 0.55 was tried as a cure for
        // balls settling onto pin tops and was the wrong lever: it barely moved
        // the share of strikes that rebound upward (68% against 64%) while
        // widening the walk badly: SD 2.45 with a flat top, against 2.14 and a
        // proper peak here. What actually stopped the settling was applying the
        // scuff impulse once per strike instead of once per step.
        this.restitutionPeg = 0.40;
        this.restitutionWall = 0.34;
        this.restitutionBall = 0.12;
        this.tangentialKeep = 0.45;   // fraction of tangential speed kept on a peg hit
        this.pegNoise = 0.04;         // tangential perturbation, fraction of speed
        this.releaseJitter = 0.15;    // in bin widths, +/-
        this.airDrag = 0.0015;        // per step, keeps the pile from jittering forever

        // Lateral step per row, in bin widths, as a ball scuffs off a pin.
        // A true quincunx steps half a bin width, landing the ball on the next
        // row's pin; see the scuff model in _collidePegs.
        this.escapeK = 0.54;

        // How much the contact geometry biases the bounce direction. Small
        // values hand the decision to the geometry (anti-correlated walk,
        // centre chimney); large values approach an independent coin flip per
        // row, which is what Binomial(10, 1/2) actually assumes.
        this.sideGeom = 0.70;
        this.lateralDrag = 0.0;       // per step, applied to horizontal speed only

        // Floor on the scuff speed, as a fraction of the one-row characteristic
        // speed, so a ball arriving slowly still gets a real push off the pin.
        this.minScuff = 0.55;

        // If a ball is still touching the same pin after this many steps it is
        // considered stuck and is thrown clear upward.
        this.maxDwell = 8;
        this.unstickBounce = 0.40;    // fraction of the characteristic speed

        this.sleepSpeed = 0.35;       // bin widths per second
        this.sleepFrames = 18;

        // Failsafe. Very occasionally a ball wedges between a pin and a rail
        // and stops descending. Left alone it would never reach a bin and the
        // animation would wait on it forever, so past this many steps without
        // landing the ball gets jogged loose.
        this.maxAge = 4000;

        this.setSize(opts.width || 800);
        this.reset();
    }

    /** Recompute geometry from the board width. Returns the required height. */
    setSize(width) {
        this.width = width;
        const k = this.k;
        const fieldW = width * (1 - 2 * 0.04);
        this.binW = fieldW / this.nBins;
        const b = this.binW;

        this.sideMargin = (width - fieldW) / 2;
        this.fieldLeft = this.sideMargin;
        this.fieldRight = this.sideMargin + fieldW;
        this.centerX = width / 2;

        this.pegR = k.pegR * b;
        this.ballR = k.ballR * b;
        this.rowSpacing = k.rowSpacing * b;
        this.topMargin = k.topMargin * b;
        this.dividerHalfW = k.dividerHalfW * b;

        this.pegTop = this.topMargin;
        this.binTop = this.topMargin + (this.rows - 1) * this.rowSpacing + k.binGap * b;
        this.binBottom = this.binTop + k.binH * b;
        this.height = this.binBottom + k.bottomMargin * b;

        // Gravity chosen so a ball crosses the board in a couple of seconds.
        // This is a teaching animation, not a scale model. Keeping it well
        // below true gravity keeps the per-step displacement far under the
        // 0.40-bin-width peg clearance, so a fast ball cannot tunnel through a
        // pin between steps.
        this.gravity = 0.55 * this.height;

        this._buildPegs();
        this._buildDividers();
        return this.height;
    }

    _buildPegs() {
        this.pegs = [];
        for (let r = 0; r < this.rows; r++) {
            const y = this.pegTop + r * this.rowSpacing;
            for (let j = 0; j <= r; j++) {
                this.pegs.push({ x: this.centerX + (j - r / 2) * this.binW, y: y, row: r });
            }
        }
    }

    _buildDividers() {
        this.dividers = [];
        for (let i = 0; i <= this.nBins; i++) {
            this.dividers.push(this.fieldLeft + i * this.binW);
        }
    }

    reset() {
        this.balls = [];
        this.bins = new Array(this.nBins).fill(0);
        this.dropped = 0;
        this.landed = 0;
    }

    binIndexAt(x) {
        let i = Math.floor((x - this.fieldLeft) / this.binW);
        if (i < 0) i = 0;
        if (i >= this.nBins) i = this.nBins - 1;
        return i;
    }

    /** Release one ball above the apex peg with a little positional jitter. */
    spawnBall() {
        const jitter = this.rng.uniform(-this.releaseJitter, this.releaseJitter) * this.binW;
        this.balls.push({
            x: this.centerX + jitter,
            y: this.pegTop - 1.2 * this.binW,
            vx: this.rng.uniform(-0.04, 0.04) * this.binW,
            vy: 0,
            settled: false,
            slowFor: 0,
            counted: false,
            age: 0,
            pegDwell: 0,
            lastPeg: null,
            bin: -1
        });
        this.dropped++;
    }

    /** True once every released ball has come to rest. */
    get allSettled() {
        return this.balls.length > 0 && this.balls.every(b => b.settled);
    }

    get activeCount() {
        return this.balls.reduce((n, b) => n + (b.settled ? 0 : 1), 0);
    }

    /* -------------------- integration -------------------- */

    step(dt) {
        const balls = this.balls;

        for (const ball of balls) {
            if (ball.settled) continue;

            ball.vy += this.gravity * dt;
            ball.vx *= (1 - this.airDrag - this.lateralDrag);
            ball.vy *= (1 - this.airDrag);
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            this._collidePegs(ball);

            ball.age++;
            if (!ball.counted && ball.age > this.maxAge) {
                ball.vx += this.rng.uniform(-1, 1) * 0.25 * this.binW;
                ball.vy += 0.15 * this.binW;
            }
        }

        this._collideBalls();

        // The immovable boundaries are resolved last, after ball-on-ball
        // pushing, so that nothing can end a step sitting outside one. Running
        // them before the ball collisions let a shove from a neighbour drive a
        // ball through a rail, where it stayed (and was drawn) until the next
        // step pulled it back, up to two thirds of a ball radius into the wood.
        for (const ball of balls) {
            if (ball.settled) continue;

            this._collideEdgeWalls(ball);
            this._collideWalls(ball);
            this._collideDividers(ball);
            this._collideFloor(ball);

            // Record which bin the ball dropped into, the first time it clears
            // the divider tops. The dividers are solid from here down, so this
            // is also where it will come to rest.
            if (!ball.counted && ball.y > this.binTop + this.ballR) {
                ball.bin = this.binIndexAt(ball.x);
                this.bins[ball.bin]++;
                ball.counted = true;
                this.landed++;
            }
        }

        // Put balls that have stopped moving to sleep. They stay in the world
        // as immovable colliders, which keeps a tall pile from jittering.
        const sleepV = this.sleepSpeed * this.binW;
        for (const ball of balls) {
            if (ball.settled) continue;
            const speed = Math.hypot(ball.vx, ball.vy);
            const resting = ball.y > this.binTop && speed < sleepV;
            ball.slowFor = resting ? ball.slowFor + 1 : 0;
            if (ball.slowFor > this.sleepFrames) {
                ball.settled = true;
                ball.vx = 0;
                ball.vy = 0;
            }
        }
    }

    _collidePegs(ball) {
        const reach = this.rowSpacing + this.ballR + this.pegR;
        const minDist = this.ballR + this.pegR;

        // Find the pin the ball is overlapping, if any. One pin at a time: the
        // lattice is spaced so a ball cannot be inside two at once.
        let peg = null, d = 0, dx = 0, dy = 0;
        for (const q of this.pegs) {
            const qy = ball.y - q.y;
            if (qy > reach || qy < -reach) continue;
            const qx = ball.x - q.x;
            if (qx > minDist || qx < -minDist) continue;
            const dist = Math.hypot(qx, qy);
            if (dist >= minDist) continue;
            peg = q; d = dist; dx = qx; dy = qy;
            break;
        }

        if (!peg) {
            ball.pegDwell = 0;
            ball.lastPeg = null;
            return;
        }

        // How many consecutive steps this ball has been touching *this* pin.
        ball.pegDwell = (peg === ball.lastPeg) ? ball.pegDwell + 1 : 1;
        ball.lastPeg = peg;

        if (d < 1e-9) d = 1e-9;
        const nx = dx / d;
        const ny = dy / d;

        // Push the ball back out of the pin.
        const overlap = minDist - d;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const vn = ball.vx * nx + ball.vy * ny;
        const vyImpact = Math.abs(ball.vy);

        // Speed of a ball that has fallen one row from rest is sqrt(2) times
        // this, the natural yardstick for "moving normally" on this board.
        const vChar = Math.sqrt(this.gravity * this.rowSpacing);

        // Reflect the normal component. This is what throws the ball back
        // upward off the top of a pin, so restitution here is what makes a
        // strike read as a bounce rather than a landing.
        if (vn < 0) {
            const tx = ball.vx - vn * nx;
            const ty = ball.vy - vn * ny;
            ball.vx = tx * this.tangentialKeep - nx * vn * this.restitutionPeg;
            ball.vy = ty * this.tangentialKeep - ny * vn * this.restitutionPeg;
        }

        // The ball scuffs off one side of the pin, but only once per strike.
        //
        // This used to run on every step of a contact, and that was the bug
        // behind balls parking on pin tops. A ball resting on a pin re-entered
        // this branch every step; each time its horizontal velocity was
        // overwritten with a value proportional to its *current* vertical
        // speed, which by then was nearly zero. So the ball was handed a scuff
        // of nearly nothing, over and over, and sat there creeping sideways
        // instead of leaving. Applying the impulse once per strike lets the
        // ball keep the velocity it was given and actually bounce away.
        if (ball.pegDwell === 1) {
            // Direction leans on the contact geometry (which side of the pin
            // the ball struck), but only as a bias on a coin flip, never as a
            // verdict. Taking the side straight from the geometry makes the
            // walk anti-correlated: a ball moving right strikes the next pin on
            // its left face and is sent back left, then right, alternating
            // almost deterministically and returning to the middle. That put a
            // chimney on the centre bin, twice the height of its neighbours.
            const pRight = 0.5 + 0.5 * Math.max(-1, Math.min(1, nx / this.sideGeom));
            const side = this.rng.next() < pRight ? 1 : -1;

            // Magnitude scales with impact speed, which is what keeps the walk
            // honest: a fixed scuff would step the ball a long way near the top
            // where it falls slowly, and almost nothing near the bottom where
            // it crosses to the next row in a blink. The floor matters just as
            // much: without it a ball that arrives almost stationary is given
            // almost no sideways push and has no way off the pin.
            const speedRef = Math.max(vyImpact, this.minScuff * vChar);
            const escape = this.escapeK * speedRef * (this.binW / this.rowSpacing);
            ball.vx = side * escape * (1 + this.rng.uniform(-this.pegNoise, this.pegNoise));
        }

        // Last resort. If a ball has somehow held station on a pin, throw it
        // clear: upward, the way a real ball comes off, not sideways.
        if (ball.pegDwell > this.maxDwell) {
            ball.vy = -this.unstickBounce * vChar;
            ball.vx += (ball.vx >= 0 ? 1 : -1) * this.unstickBounce * vChar * 0.5;
            ball.pegDwell = 0;
        }
    }

    /**
     * The two slanted rails that run down the sides of the pin triangle.
     *
     * These matter more than they look. In an ideal quincunx the triangle is
     * self-containing: a ball on the edge pin of row r that steps outward moves
     * to offset (r+1)/2, which is exactly the edge pin of row r+1, so it can
     * never leave. Real physics never steps precisely half a bin width, and a
     * ball that overshoots the edge pin finds nothing outside the triangle to
     * deflect it, so it free-falls down the outside and dumps into an end bin.
     * Without these rails roughly half of all balls ended up in bins 0 and 10.
     *
     * The rails sit parallel to the triangle edge, so a ball pressed against
     * one slides along the edge instead of being kicked back inward. That
     * reproduces the ideal board's behaviour rather than merely papering over
     * the escape. They stop at the last pin row, which is what lets balls fan
     * out into the two outermost bins.
     *
     * Offset is 2*(pegR + ballR), not pegR + ballR. The tighter value pinches
     * the corridor at the apex down to exactly the width a ball needs to get
     * around the first pin, and balls wedge there instead of falling. At double
     * that, a ball can sit tangent to a pin's outer face with room to move,
     * while still staying inside the next row's edge pin.
     */
    _collideEdgeWalls(ball) {
        const lastRowY = this.pegTop + (this.rows - 1) * this.rowSpacing;
        if (ball.y < this.pegTop || ball.y > lastRowY) return;

        const slope = (0.5 * this.binW) / this.rowSpacing;   // dx per dy
        const norm = Math.sqrt(1 + slope * slope);
        const dy = ball.y - this.pegTop;

        // railSurface is the face of the rail, and the ball's *surface* is what
        // stops against it, so the centre is held one radius short. Earlier
        // this constrained the centre to the rail line itself, which let the
        // ball's body cross it by up to a full radius and read on screen as the
        // ball sinking into the timber. Placing the surface a radius further
        // out leaves the centre limit exactly where it was, so the containment
        // behaviour that keeps balls inside the triangle is unchanged.
        const railSurface = this.railOffset();

        // side = +1 for the right rail, -1 for the left rail.
        for (const side of [1, -1]) {
            // Signed distance of the ball centre past the rail face.
            const f = side * (ball.x - this.centerX) - (slope * dy + railSurface);
            const perp = f / norm;
            if (perp <= -this.ballR) continue;           // ball body still clear

            // Inward unit normal.
            const nx = -side / norm;
            const ny = slope / norm;

            const push = perp + this.ballR;
            ball.x += nx * push;
            ball.y += ny * push;

            const vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) {
                ball.vx -= (1 + this.restitutionWall) * vn * nx;
                ball.vy -= (1 + this.restitutionWall) * vn * ny;
            }
        }
    }

    /**
     * Offset of the rail face from the triangle's centre line, in pixels.
     * Shared by the physics and the renderer so the two cannot drift apart.
     */
    railOffset() {
        return 2 * (this.pegR + this.ballR) + this.ballR;
    }

    _collideWalls(ball) {
        const lo = this.fieldLeft + this.ballR;
        const hi = this.fieldRight - this.ballR;
        if (ball.x < lo) {
            ball.x = lo;
            if (ball.vx < 0) ball.vx = -ball.vx * this.restitutionWall;
        } else if (ball.x > hi) {
            ball.x = hi;
            if (ball.vx > 0) ball.vx = -ball.vx * this.restitutionWall;
        }
    }

    _collideDividers(ball) {
        const capR = this.dividerHalfW;
        const minDist = this.ballR + capR;

        for (const dx0 of this.dividers) {
            // Skip the two outer dividers; the frame walls already cover them.
            const dx = ball.x - dx0;
            if (dx > minDist + this.binW || dx < -(minDist + this.binW)) continue;

            if (ball.y < this.binTop) {
                // Rounded cap on top of the divider.
                const dy = ball.y - this.binTop;
                const d = Math.hypot(dx, dy);
                if (d < minDist && d > 1e-9) {
                    const nx = dx / d, ny = dy / d;
                    const overlap = minDist - d;
                    ball.x += nx * overlap;
                    ball.y += ny * overlap;
                    const vn = ball.vx * nx + ball.vy * ny;
                    if (vn < 0) {
                        const tx = ball.vx - vn * nx;
                        const ty = ball.vy - vn * ny;
                        ball.vx = tx * this.tangentialKeep - nx * vn * this.restitutionPeg;
                        ball.vy = ty * this.tangentialKeep - ny * vn * this.restitutionPeg;
                    }
                }
            } else if (Math.abs(dx) < minDist) {
                // Vertical shaft of the divider.
                const side = dx >= 0 ? 1 : -1;
                ball.x = dx0 + side * minDist;
                if (ball.vx * side < 0) ball.vx = -ball.vx * this.restitutionWall;
            }
        }
    }

    _collideFloor(ball) {
        const floor = this.binBottom - this.ballR;
        if (ball.y > floor) {
            ball.y = floor;
            if (ball.vy > 0) {
                ball.vy = -ball.vy * this.restitutionBall;
                ball.vx *= 0.86;
            }
        }
    }

    /**
     * Ball-on-ball collisions via a uniform spatial hash. Settled balls act as
     * immovable colliders so piles stay put instead of shivering.
     */
    _collideBalls() {
        const balls = this.balls;
        if (balls.length < 2) return;

        const cell = 2.5 * this.ballR;
        const grid = new Map();
        const key = (cx, cy) => cx + ',' + cy;

        for (let i = 0; i < balls.length; i++) {
            const b = balls[i];
            const cx = Math.floor(b.x / cell);
            const cy = Math.floor(b.y / cell);
            const k = key(cx, cy);
            let list = grid.get(k);
            if (!list) { list = []; grid.set(k, list); }
            list.push(i);
        }

        const minDist = 2 * this.ballR;

        for (let i = 0; i < balls.length; i++) {
            const a = balls[i];
            const cx = Math.floor(a.x / cell);
            const cy = Math.floor(a.y / cell);
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const list = grid.get(key(cx + ox, cy + oy));
                    if (!list) continue;
                    for (const j of list) {
                        if (j <= i) continue;
                        const b = balls[j];
                        if (a.settled && b.settled) continue;

                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 >= minDist * minDist || d2 < 1e-12) continue;

                        const d = Math.sqrt(d2);
                        const nx = dx / d, ny = dy / d;
                        const overlap = minDist - d;

                        if (a.settled) {
                            b.x += nx * overlap;
                            b.y += ny * overlap;
                        } else if (b.settled) {
                            a.x -= nx * overlap;
                            a.y -= ny * overlap;
                        } else {
                            a.x -= nx * overlap * 0.5;
                            a.y -= ny * overlap * 0.5;
                            b.x += nx * overlap * 0.5;
                            b.y += ny * overlap * 0.5;
                        }

                        // Relative normal velocity, reflected.
                        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                        if (rvn >= 0) continue;
                        const jImp = -(1 + this.restitutionBall) * rvn;

                        if (a.settled) {
                            b.vx += jImp * nx;
                            b.vy += jImp * ny;
                        } else if (b.settled) {
                            a.vx -= jImp * nx;
                            a.vy -= jImp * ny;
                        } else {
                            a.vx -= jImp * nx * 0.5;
                            a.vy -= jImp * ny * 0.5;
                            b.vx += jImp * nx * 0.5;
                            b.vy += jImp * ny * 0.5;
                        }
                    }
                }
            }
        }
    }

    /** Mean and SD of the landed bin indices. */
    binStats() {
        let n = 0, sum = 0;
        for (let i = 0; i < this.nBins; i++) { n += this.bins[i]; sum += i * this.bins[i]; }
        if (!n) return { n: 0, mean: NaN, sd: NaN };
        const mean = sum / n;
        let ss = 0;
        for (let i = 0; i < this.nBins; i++) ss += this.bins[i] * (i - mean) * (i - mean);
        return { n: n, mean: mean, sd: Math.sqrt(ss / Math.max(1, n - 1)) };
    }
}

/* ------------------------------------------------------------------ *
 *  Rendering + controls
 * ------------------------------------------------------------------ */

class GaltonBoard {
    constructor(canvasId, opts = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.physics = new GaltonPhysics({ rows: 10, rng: new RNG(opts.seed || 24) });

        this.numBalls = 100;
        this.speed = 50;
        this.showCurve = false;
        this.animationId = null;
        this.dt = 1 / 240;

        this._onResize = () => { this.resizeCanvas(); this.draw(); };
        window.addEventListener('resize', this._onResize);

        this.resizeCanvas();
        this.setupControls();
        this.draw();
    }

    /* -------------------- canvas sizing -------------------- */

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const cssW = Math.max(280, container.clientWidth);
        const cssH = this.physics.setSize(cssW);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = cssW + 'px';
        this.canvas.style.height = cssH + 'px';
        this.canvas.width = Math.round(cssW * dpr);
        this.canvas.height = Math.round(cssH * dpr);
        // setTransform, not scale, because scale() would compound on every resize.
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.w = cssW;
        this.h = cssH;
        this.dpr = dpr;

        // The frame, pins, bins and glass never move, so they are rendered once
        // here rather than rebuilt every animation frame. Doing it per frame
        // meant 55 fresh radial gradients plus two full-canvas gradient fills
        // sixty times a second, which dragged the frame rate low enough that a
        // 6-second drop took nearly half a minute.
        this._glassGrad = null;      // gradient is sized to the canvas
        this._buildStatic();
        this._buildBallSprite();
    }

    /** Pre-render everything that does not move into an offscreen canvas. */
    _buildStatic() {
        const p = this.physics;
        if (!this.bg) this.bg = document.createElement('canvas');
        this.bg.width = this.canvas.width;
        this.bg.height = this.canvas.height;
        const bx = this.bg.getContext('2d');
        bx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this._drawFrame(bx, p);
        this._drawRails(bx, p);
        this._drawBins(bx, p);
        this._drawPegs(bx, p);
    }

    /**
     * The slanted rails down the sides of the pin triangle.
     *
     * The stroke is drawn half a line-width outboard of the rail face the
     * physics uses, so the timber's *inner edge* lands exactly where a ball
     * comes to rest against it rather than running through the middle of the
     * ball.
     */
    _drawRails(ctx, p) {
        const lastRowY = p.pegTop + (p.rows - 1) * p.rowSpacing;
        const slope = (0.5 * p.binW) / p.rowSpacing;
        const lineW = Math.max(2, p.binW * 0.05);
        const off = p.railOffset() + lineW / 2;

        ctx.strokeStyle = '#5a3d26';
        ctx.lineWidth = lineW;
        ctx.lineCap = 'round';
        for (const side of [1, -1]) {
            ctx.beginPath();
            ctx.moveTo(p.centerX + side * off, p.pegTop);
            ctx.lineTo(p.centerX + side * (slope * (lastRowY - p.pegTop) + off), lastRowY);
            ctx.stroke();
        }
    }

    /** Pre-render one ball, so each frame is a drawImage instead of a gradient. */
    _buildBallSprite() {
        const r = this.physics.ballR;
        const pad = 1;
        const size = Math.max(4, Math.ceil((r + pad) * 2));
        if (!this.ballSprite) this.ballSprite = document.createElement('canvas');
        this.ballSprite.width = Math.round(size * this.dpr);
        this.ballSprite.height = Math.round(size * this.dpr);
        const bx = this.ballSprite.getContext('2d');
        bx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        const cx = size / 2, cy = size / 2;

        const g = bx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r);
        g.addColorStop(0, '#ffd9a3');
        g.addColorStop(0.4, '#E57200');
        g.addColorStop(1, '#a34f00');
        bx.fillStyle = g;
        bx.beginPath();
        bx.arc(cx, cy, r, 0, Math.PI * 2);
        bx.fill();

        bx.fillStyle = 'rgba(255,255,255,0.75)';
        bx.beginPath();
        bx.arc(cx - r * 0.34, cy - r * 0.38, r * 0.22, 0, Math.PI * 2);
        bx.fill();

        this.ballSpriteSize = size;
    }

    /* -------------------- controls -------------------- */

    setupControls() {
        const numSlider = document.getElementById('num-balls');
        const numValue = document.getElementById('num-balls-value');
        const speedSlider = document.getElementById('speed');
        const speedValue = document.getElementById('speed-value');
        const dropBtn = document.getElementById('drop-balls-btn');
        const curveBtn = document.getElementById('add-curve-btn');
        const resetBtn = document.getElementById('reset-btn');

        if (numSlider && numValue) {
            numSlider.addEventListener('input', e => {
                this.numBalls = parseInt(e.target.value, 10);
                numValue.textContent = this.numBalls;
            });
        }

        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', e => {
                this.speed = parseInt(e.target.value, 10);
                speedValue.textContent =
                    this.speed < 25 ? 'Slow' : (this.speed < 75 ? 'Medium' : 'Fast');
            });
        }

        if (dropBtn) {
            dropBtn.addEventListener('click', () => {
                if (this.animationId) return;
                this.run();
            });
        }

        if (curveBtn) {
            curveBtn.addEventListener('click', () => {
                this.showCurve = !this.showCurve;
                curveBtn.textContent = this.showCurve ? 'Hide Normal Curve' : 'Add Normal Curve';
                this.draw();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    }

    /** Physics substeps per animation frame, and the gap between releases. */
    _speedSettings() {
        const s = this.speed / 100;
        return {
            substeps: Math.round(2 + s * 12),
            dropInterval: 600 - s * 560
        };
    }

    reset() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.physics.rng.reset();
        this.physics.reset();
        const dropBtn = document.getElementById('drop-balls-btn');
        if (dropBtn) dropBtn.disabled = false;
        this.draw();
    }

    run() {
        this.physics.rng.reset();
        this.physics.reset();

        const dropBtn = document.getElementById('drop-balls-btn');
        if (dropBtn) dropBtn.disabled = true;

        let toDrop = this.numBalls;
        let lastDrop = -Infinity;

        const frame = (now) => {
            const { substeps, dropInterval } = this._speedSettings();

            if (toDrop > 0 && now - lastDrop >= dropInterval) {
                this.physics.spawnBall();
                toDrop--;
                lastDrop = now;
            }

            for (let i = 0; i < substeps; i++) this.physics.step(this.dt);
            this.draw();

            if (toDrop > 0 || this.physics.activeCount > 0) {
                this.animationId = requestAnimationFrame(frame);
            } else {
                this.animationId = null;
                if (dropBtn) dropBtn.disabled = false;
            }
        };

        this.animationId = requestAnimationFrame(frame);
    }

    /* -------------------- drawing -------------------- */

    draw() {
        const ctx = this.ctx;
        const p = this.physics;

        // Blit the pre-rendered scenery at device resolution, then draw only
        // the things that actually change.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.bg) ctx.drawImage(this.bg, 0, 0);
        ctx.restore();

        this._drawBalls(ctx, p);
        if (this.showCurve) this._drawNormalCurve(ctx, p);
        this._drawCounts(ctx, p);
        this._drawGlass(ctx, p);
    }

    _drawFrame(ctx, p) {
        // Backboard.
        const bg = ctx.createLinearGradient(0, 0, 0, this.h);
        bg.addColorStop(0, '#fbf7ef');
        bg.addColorStop(1, '#f0e8da');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.w, this.h);

        // Wooden surround.
        const frameW = p.sideMargin * 0.75;
        const wood = ctx.createLinearGradient(0, 0, this.w, this.h);
        wood.addColorStop(0, '#8b5e3c');
        wood.addColorStop(0.5, '#6b4a2f');
        wood.addColorStop(1, '#4e3521');
        ctx.strokeStyle = wood;
        ctx.lineWidth = frameW;
        ctx.strokeRect(frameW / 2, frameW / 2, this.w - frameW, this.h - frameW);

        // Inner shadow line.
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(frameW, frameW, this.w - 2 * frameW, this.h - 2 * frameW);

        // Funnel above the apex peg.
        const mouthY = p.pegTop - 1.5 * p.binW;
        const mouthHalf = p.binW * 0.55;
        ctx.fillStyle = '#6b4a2f';
        ctx.beginPath();
        ctx.moveTo(p.centerX - mouthHalf * 2.1, mouthY - p.binW * 0.62);
        ctx.lineTo(p.centerX - mouthHalf * 0.42, mouthY);
        ctx.lineTo(p.centerX - mouthHalf * 0.42, mouthY + p.binW * 0.12);
        ctx.lineTo(p.centerX - mouthHalf * 2.1, mouthY + p.binW * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.centerX + mouthHalf * 2.1, mouthY - p.binW * 0.62);
        ctx.lineTo(p.centerX + mouthHalf * 0.42, mouthY);
        ctx.lineTo(p.centerX + mouthHalf * 0.42, mouthY + p.binW * 0.12);
        ctx.lineTo(p.centerX + mouthHalf * 2.1, mouthY + p.binW * 0.12);
        ctx.closePath();
        ctx.fill();
    }

    _drawBins(ctx, p) {
        // Bin floor and dividers, drawn as wood.
        const wood = ctx.createLinearGradient(0, p.binTop, 0, p.binBottom);
        wood.addColorStop(0, '#7d5636');
        wood.addColorStop(1, '#5a3d26');
        ctx.fillStyle = wood;

        const halfW = p.dividerHalfW;
        for (const x of p.dividers) {
            ctx.beginPath();
            ctx.moveTo(x - halfW, p.binBottom);
            ctx.lineTo(x - halfW, p.binTop);
            ctx.arc(x, p.binTop, halfW, Math.PI, 0);
            ctx.lineTo(x + halfW, p.binBottom);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#5a3d26';
        ctx.fillRect(p.fieldLeft, p.binBottom, p.fieldRight - p.fieldLeft, this.h - p.binBottom);
    }

    _drawPegs(ctx, p) {
        for (const peg of p.pegs) {
            const g = ctx.createRadialGradient(
                peg.x - p.pegR * 0.35, peg.y - p.pegR * 0.35, p.pegR * 0.15,
                peg.x, peg.y, p.pegR
            );
            g.addColorStop(0, '#f2f4f7');
            g.addColorStop(0.55, '#b9c0c9');
            g.addColorStop(1, '#7d8894');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, p.pegR, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
    }

    _drawBalls(ctx, p) {
        const s = this.ballSpriteSize;
        const half = s / 2;
        for (const ball of p.balls) {
            ctx.drawImage(this.ballSprite, ball.x - half, ball.y - half, s, s);
        }
    }

    _drawNormalCurve(ctx, p) {
        const stats = p.binStats();
        if (!stats.n || !isFinite(stats.sd) || stats.sd <= 0) return;

        const yBase = p.binBottom;

        // The bars here are physical piles of balls, not scaled rectangles, so
        // the curve has to be matched to the height the balls actually reached.
        // Scaling it to the bin height instead would leave it floating well
        // above a 10-ball run, overlaying nothing.
        let topY = p.binBottom;
        for (const ball of p.balls) {
            if (ball.counted && ball.y - p.ballR < topY) topY = ball.y - p.ballR;
        }
        const amp = Math.max(10, p.binBottom - topY);

        // Scale the density so its peak matches the tallest pile.
        const peak = Stats.normalDensity(stats.mean, stats.mean, stats.sd);
        if (!peak) return;

        ctx.beginPath();
        let started = false;
        for (let px = 0; px <= 240; px++) {
            const binPos = (px / 240) * p.nBins - 0.5;
            const x = p.fieldLeft + (binPos + 0.5) * p.binW;
            const dens = Stats.normalDensity(binPos, stats.mean, stats.sd);
            const y = yBase - (dens / peak) * amp;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '600 12px -apple-system, Segoe UI, sans-serif';
        ctx.fillStyle = '#232D4B';
        ctx.textAlign = 'left';
        ctx.fillText('Normal curve  (mean ' + stats.mean.toFixed(2) +
                     ', SD ' + stats.sd.toFixed(2) + ')',
                     p.fieldLeft + 6, p.binTop + 14);
    }

    _drawCounts(ctx, p) {
        ctx.font = '600 11px -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        for (let i = 0; i < p.nBins; i++) {
            if (!p.bins[i]) continue;
            const x = p.fieldLeft + (i + 0.5) * p.binW;
            ctx.fillText(String(p.bins[i]), x, p.binBottom + (this.h - p.binBottom) * 0.68);
        }
    }

    _drawGlass(ctx, p) {
        if (!this._glassGrad) {
            const g = ctx.createLinearGradient(0, 0, this.w, this.h);
            g.addColorStop(0, 'rgba(255,255,255,0.16)');
            g.addColorStop(0.35, 'rgba(255,255,255,0.03)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.00)');
            g.addColorStop(1, 'rgba(255,255,255,0.07)');
            this._glassGrad = g;
        }
        ctx.fillStyle = this._glassGrad;
        ctx.fillRect(p.sideMargin, p.sideMargin, this.w - 2 * p.sideMargin, this.h - 2 * p.sideMargin);
    }
}

// Exported for the headless distribution check.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GaltonPhysics: GaltonPhysics };
}
