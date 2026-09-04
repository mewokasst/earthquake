// physics.js

const GRAVITY = 9.80665;
const WIDTH_REF = 16;
const K0 = 1.6e7;
const MASS0 = 2.4e5;

class ShearBuilding {
  constructor(p) {
    this.stories = Math.max(1, Math.floor(p.stories || 1));
    this.floorHeight = Math.max(2.5, Number(p.floorHeight) || 3.2);
    this.width = Math.max(4, Number(p.width) || 16);
    this.stiffnessMult = Math.max(0.1, Number(p.stiffnessMult) || 1);
    this.dampingRatio = Math.max(0, Number(p.dampingRatio) || 0.025);
    this.material = p.material || "concrete";
    this.foundation = p.foundation || "strong";

    const materials = {
      concrete: {
        stiffness: 1.00,
        strength: 1.00,
        density: 1.00
      },
      steel: {
        stiffness: 1.35,
        strength: 1.25,
        density: 0.55
      },
      wood: {
        stiffness: 0.60,
        strength: 0.72,
        density: 0.40
      }
    };

    const materialData =
      materials[this.material] || materials.concrete;

    const foundationData =
      this.foundation === "weak"
        ? {
            stiffness: 0.72,
            strength: 0.68
          }
        : {
            stiffness: 1.00,
            strength: 1.00
          };

    this.materialStrength =
      materialData.strength * foundationData.strength;

    const widthFactor = this.width / WIDTH_REF;

    /*
     * Floor mass scales with floor area.
     * This prevents adding floors from accidentally changing
     * the mass of the existing floors.
     */
    this.mFloor =
      MASS0 * Math.pow(widthFactor, 2) * materialData.density;

    this.floorMass = this.mFloor;

    /*
     * Real gravitational acceleration.
     *
     * Gravity is vertical and therefore is NOT added directly
     * to the horizontal earthquake force.
     */
    this.gravity = GRAVITY;

    this.floorWeight =
      this.mFloor * this.gravity;

    this.totalMass =
      this.mFloor * this.stories;

    this.totalWeight =
      this.totalMass * this.gravity;

    /*
     * Story stiffness.
     *
     * Width^3 gives wider buildings substantially greater
     * lateral stiffness.
     */
    this.kStory =
      K0 *
      this.stiffnessMult *
      materialData.stiffness *
      foundationData.stiffness *
      Math.pow(widthFactor, 3);

    this.cStory =
      2 *
      this.dampingRatio *
      Math.sqrt(this.kStory * this.mFloor);

    const N = this.stories;

    this.x = new Float64Array(N);
    this.v = new Float64Array(N);
    this.a = new Float64Array(N);

    this.peakDrift = new Float64Array(N);
    this.peakDriftSigned = new Float64Array(N);
    this.residual = new Float64Array(N);

    /*
     * Gravity load carried by each story.
     *
     * Story 1 carries the largest load.
     * Upper stories carry progressively less.
     */
    this.gravityLoadAbove = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      this.gravityLoadAbove[i] =
        (N - i) * this.floorWeight;
    }

    /*
     * P-Delta is a geometric effect caused by gravity
     * acting through the building's lateral displacement.
     *
     * We limit the geometric reduction to keep this
     * educational simulator numerically stable.
     */
    this.maxPDeltaRatio = 0.65;

    this.damageState =
      new Array(N).fill("safe");

    this.collapsed = false;
    this.collapseInitiatingStory = -1;

    this.naturalFreqHz =
      this.estimateNaturalFrequency();
  }

  estimateNaturalFrequency() {
    const N = this.stories;

    if (N <= 0) return 0;

    const omega =
      2 *
      Math.sqrt(
        this.kStory / this.mFloor
      ) *
      Math.sin(
        Math.PI /
        (2 * (2 * N + 1))
      );

    return omega / (2 * Math.PI);
  }

  driftThresholds() {
    return {
      warning:
        0.005 *
        this.materialStrength,

      severe:
        0.015 *
        this.materialStrength,

      collapse:
        0.030 *
        this.materialStrength
    };
  }

  getPDeltaRatio(i) {
    const P =
      this.gravityLoadAbove[i] || 0;

    /*
     * Approximate geometric stiffness:
     *
     * kGeo = P / h
     *
     * Higher gravity load therefore creates a larger
     * destabilizing effect.
     */
    const kGeo =
      P /
      Math.max(this.floorHeight, 0.1);

    const ratio =
      kGeo /
      Math.max(this.kStory, 1);

    return Math.min(
      this.maxPDeltaRatio,
      Math.max(0, ratio)
    );
  }

  getEffectiveStoryStiffness(i) {
    const pDelta =
      this.getPDeltaRatio(i);

    const thresholds =
      this.driftThresholds();

    const drift =
      this.peakDrift[i];

    let damageFactor = 1;

    if (drift >= thresholds.collapse) {
      damageFactor = 0.12;
    } else if (drift >= thresholds.severe) {
      damageFactor = 0.45;
    } else if (drift >= thresholds.warning) {
      damageFactor = 0.78;
    }

    return this.kStory *
      (1 - pDelta) *
      damageFactor;
  }

  getStoryDrift(i) {
    const below =
      i === 0 ? 0 : this.x[i - 1];

    return this.x[i] - below;
  }

  getStoryDriftVelocity(i) {
    const below =
      i === 0 ? 0 : this.v[i - 1];

    return this.v[i] - below;
  }

  calculateAcceleration(i, groundAccel) {
    const m = this.mFloor;
    const c = this.cStory;

    const drift =
      this.getStoryDrift(i);

    const driftVelocity =
      this.getStoryDriftVelocity(i);

    const k =
      this.getEffectiveStoryStiffness(i);

    /*
     * Force from the story below.
     */
    let force =
      -k * drift;

    /*
     * Damping from the story below.
     */
    force +=
      -c * driftVelocity;

    /*
     * Coupling to the story above.
     */
    if (i < this.stories - 1) {
      const aboveDrift =
        this.x[i + 1] - this.x[i];

      const aboveVelocity =
        this.v[i + 1] - this.v[i];

      const kAbove =
        this.getEffectiveStoryStiffness(i + 1);

      force +=
        kAbove * aboveDrift;

      force +=
        c * aboveVelocity;
    }

    /*
     * Earthquake base excitation.
     *
     * IMPORTANT:
     * Gravity is NOT included here because gravity is
     * vertical while this equation is the horizontal
     * equation of motion.
     */
    force +=
      -m * groundAccel;

    return force / m;
  }

  step(dt, groundAccel) {
    if (this.collapsed) return;

    if (!Number.isFinite(dt)) {
      dt = 1 / 120;
    }

    if (!Number.isFinite(groundAccel)) {
      groundAccel = 0;
    }

    dt =
      Math.min(
        Math.max(dt, 1 / 1000),
        1 / 30
      );

    /*
     * Semi-implicit integration with several small
     * substeps is considerably more stable for the
     * stiff building springs.
     */
    const maxSubstep =
      1 / 240;

    const steps =
      Math.max(
        1,
        Math.ceil(dt / maxSubstep)
      );

    const subDt =
      dt / steps;

    for (let sub = 0; sub < steps; sub++) {
      this.integrateSubstep(
        subDt,
        groundAccel
      );

      if (this.collapsed) {
        break;
      }
    }

    this.updateDrift();
  }

  integrateSubstep(dt, groundAccel) {
    const N =
      this.stories;

    /*
     * Calculate all accelerations using the
     * same state before changing any velocity.
     */
    for (let i = 0; i < N; i++) {
      this.a[i] =
        this.calculateAcceleration(
          i,
          groundAccel
        );
    }

    /*
     * Semi-implicit Euler.
     */
    for (let i = 0; i < N; i++) {
      this.v[i] +=
        this.a[i] * dt;

      /*
       * Physical numerical safety limit.
       * Prevents one unstable frame from throwing
       * the building thousands of meters away.
       */
      const velocityLimit =
        Math.max(
          8,
          this.floorHeight * 10
        );

      this.v[i] =
        Math.max(
          -velocityLimit,
          Math.min(
            velocityLimit,
            this.v[i]
          )
        );

      this.x[i] +=
        this.v[i] * dt;

      const displacementLimit =
        Math.max(
          this.floorHeight * 2.5,
          this.width * 1.5
        );

      if (
        this.x[i] >
        displacementLimit
      ) {
        this.x[i] =
          displacementLimit;

        this.v[i] *= 0.15;
      }

      if (
        this.x[i] <
        -displacementLimit
      ) {
        this.x[i] =
          -displacementLimit;

        this.v[i] *= 0.15;
      }
    }
  }

  updateDrift() {
    const N =
      this.stories;

    const thresholds =
      this.driftThresholds();

    for (let i = 0; i < N; i++) {
      const drift =
        this.getStoryDrift(i) /
        Math.max(
          this.floorHeight,
          0.001
        );

      const absDrift =
        Math.abs(drift);

      if (
        absDrift >
        this.peakDrift[i]
      ) {
        this.peakDrift[i] =
          absDrift;

        this.peakDriftSigned[i] =
          drift;
      }

      let state =
        "safe";

      if (
        this.peakDrift[i] >=
        thresholds.collapse
      ) {
        state =
          "collapsed-story";
      } else if (
        this.peakDrift[i] >=
        thresholds.severe
      ) {
        state =
          "severe";
      } else if (
        this.peakDrift[i] >=
        thresholds.warning
      ) {
        state =
          "warning";
      }

      this.damageState[i] =
        state;

      if (
        state === "collapsed-story" &&
        !this.collapsed
      ) {
        this.collapsed =
          true;

        this.collapseInitiatingStory =
          i;
      }
    }
  }

  captureResidual() {
    for (
      let i = 0;
      i < this.stories;
      i++
    ) {
      this.residual[i] =
        this.x[i];
    }
  }

  reset() {
    this.x.fill(0);
    this.v.fill(0);
    this.a.fill(0);

    this.peakDrift.fill(0);
    this.peakDriftSigned.fill(0);
    this.residual.fill(0);

    this.damageState.fill(
      "safe"
    );

    this.collapsed =
      false;

    this.collapseInitiatingStory =
      -1;
  }

  maxRoofDisplacement() {
    if (
      this.stories <= 0
    ) {
      return 0;
    }

    return this.x[
      this.stories - 1
    ];
  }

  maxPeakDrift() {
    let max = 0;
    let floor = -1;

    for (
      let i = 0;
      i < this.stories;
      i++
    ) {
      if (
        this.peakDrift[i] >
        max
      ) {
        max =
          this.peakDrift[i];

        floor =
          i;
      }
    }

    return {
      ratio: max,
      floor
    };
  }

  overallDamageClass() {
    if (this.collapsed) {
      return "collapsed";
    }

    const result =
      this.maxPeakDrift();

    const thresholds =
      this.driftThresholds();

    if (
      result.ratio >=
      thresholds.severe
    ) {
      return "severe";
    }

    if (
      result.ratio >=
      thresholds.warning
    ) {
      return "warning";
    }

    return "safe";
  }

  getGravityInfo() {
    return {
      gravity: this.gravity,
      floorMass: this.floorMass,
      floorWeight: this.floorWeight,
      totalMass: this.totalMass,
      totalWeight: this.totalWeight,
      stories: this.stories
    };
  }
}