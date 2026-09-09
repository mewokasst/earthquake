class CityEnvironment {
  constructor(scene, lowPowerDevice) {
    this.scene = scene;
    this.lowPowerDevice = lowPowerDevice;
    this.group = new THREE.Group();
    this.reactiveTrees = [];
    this.reactiveLights = [];
    this.crackMaterial = new THREE.MeshBasicMaterial({ color: 0x171d20, transparent: true, opacity: 0 });
    this.crackLines = [];
    this.maxCrackLevel = 0;
    this.obstacles = [];
    scene.add(this.group);
    this.build();
  }

  rectsOverlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.z1 < b.z2 && a.z2 > b.z1;
  }

  buildAsphaltTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "#1a2124";
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const shade = 18 + Math.floor(Math.random() * 28);
      context.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 9})`;
      const dot = Math.random() * 2.6 + 0.5;
      context.fillRect(Math.random() * size, Math.random() * size, dot, dot);
    }
    for (let i = 0; i < 90; i++) {
      const shade = 42 + Math.floor(Math.random() * 20);
      context.fillStyle = `rgba(${shade}, ${shade + 8}, ${shade + 10}, 0.5)`;
      const patchWidth = Math.random() * 20 + 8;
      const patchHeight = Math.random() * 6 + 2;
      context.fillRect(Math.random() * size, Math.random() * size, patchWidth, patchHeight);
    }
    const color = new THREE.CanvasTexture(canvas);
    color.wrapS = THREE.RepeatWrapping;
    color.wrapT = THREE.RepeatWrapping;
    color.repeat.set(24, 24);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bumpContext = bumpCanvas.getContext("2d");
    bumpContext.fillStyle = "#808080";
    bumpContext.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      const shade = 90 + Math.floor(Math.random() * 90);
      bumpContext.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      bumpContext.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.copy(color.repeat);
    return { color, bump };
  }

  buildSurfaceTexture(baseColor, variation, count) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = baseColor;
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      const shade = Math.floor(Math.random() * variation);
      context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, .16)`;
      const dot = Math.random() * 3 + 0.5;
      context.fillRect(Math.random() * size, Math.random() * size, dot, dot);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    return texture;
  }

  buildContactShadowTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
    gradient.addColorStop(0, "rgba(8, 12, 14, 0.5)");
    gradient.addColorStop(0.6, "rgba(8, 12, 14, 0.16)");
    gradient.addColorStop(1, "rgba(8, 12, 14, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  buildSkyTexture(night) {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    if (night) {
      gradient.addColorStop(0, "#0b121a");
      gradient.addColorStop(0.58, "#1b303a");
      gradient.addColorStop(1, "#304148");
    } else {
      gradient.addColorStop(0, "#172d3b");
      gradient.addColorStop(0.58, "#52747a");
      gradient.addColorStop(1, "#a9b8ab");
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  build() {
    const concrete = this.buildSurfaceTexture("#596866", 70, 2400);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({ map: concrete, color: 0x76847c, roughness: 0.92, metalness: 0.01 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    this.addPlaza();
    this.roadAsphalt = this.buildAsphaltTexture();
    this.addRoad(24, 0, 7, 150, 0);
    this.addRoad(0, 24, 7, 150, Math.PI / 2);
    this.addLoopRoad(30, 7);
    this.addIntersection(24, 24, 7);
    this.addRoadGreenery();
    this.addGrassStrips();
    this.addParkland();
    this.addBuildings();
    this.addStreetFurniture();
    this.addHouses();
    this.addCracks();
    this.scene.background = this.buildSkyTexture(false);
  }

  addPlaza() {
    const half = 19;
    const paveTexture = this.buildSurfaceTexture("#b7ada0", 70, 1600);
    const pave = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2, half * 2),
      new THREE.MeshStandardMaterial({ map: paveTexture, color: 0xd7cdbd, roughness: 0.88 })
    );
    pave.rotation.x = -Math.PI / 2;
    pave.position.y = 0.05;
    pave.receiveShadow = true;
    this.group.add(pave);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({ map: this.buildContactShadowTexture(), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    this.group.add(shadow);

    const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xd0c4aa, roughness: 0.82 });
    const curbBar = (w, d, x, z) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), curbMaterial);
      curb.position.set(x, 0.14, z);
      this.group.add(curb);
    };
    curbBar(half * 2 + 0.3, 0.3, 0, half);
    curbBar(half * 2 + 0.3, 0.3, 0, -half);
    curbBar(0.3, half * 2 + 0.3, half, 0);
    curbBar(0.3, half * 2 + 0.3, -half, 0);

    this.obstacles.push({ x1: -half - 1, z1: -half - 1, x2: half + 1, z2: half + 1 });
  }

  addRoad(x, z, width, length, rotation) {
    const w = width || 7;
    const len = length || 150;
    const asphalt = this.roadAsphalt || this.buildAsphaltTexture();
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(w, len),
      new THREE.MeshStandardMaterial({ map: asphalt.color, bumpMap: asphalt.bump, bumpScale: 0.045, color: 0xffffff, roughness: 0.94, metalness: 0.01 })
    );
    road.rotation.x = -Math.PI / 2;
    road.rotation.y = rotation;
    road.position.set(x, 0.04, z);
    road.receiveShadow = true;
    this.group.add(road);

    this.paintLaneMarkings(x, z, w, len, !!rotation);

    const half = w / 2 + 2;
    if (rotation) {
      this.obstacles.push({ x1: x - 75, z1: z - half, x2: x + 75, z2: z + half });
    } else {
      this.obstacles.push({ x1: x - half, z1: z - 75, x2: x + half, z2: z + 75 });
    }
  }

  /**
   * Paints a two-lane-each-way road: a double-yellow no-passing center line,
   * one dashed white lane divider per direction, and solid white outer edge
   * lines. `horizontal` = the road runs along world X (marks vary along x,
   * offsets apply to z); when false the road runs along world Z.
   */
  paintLaneMarkings(x, z, width, length, horizontal) {
    const laneMaterial = new THREE.MeshStandardMaterial({ color: 0xe9eee2, roughness: 0.72 });
    const yellowMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a53a, roughness: 0.66 });

    [-0.09, 0.09].forEach(offset => {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? length : 0.07, 0.022, horizontal ? 0.07 : length),
        yellowMaterial
      );
      line.position.set(horizontal ? x : x + offset, 0.073, horizontal ? z + offset : z);
      line.receiveShadow = true;
      this.group.add(line);
    });

    const laneOffset = width / 4;
    [-1, 1].forEach(side => {
      for (let mark = -length / 2 + 3; mark <= length / 2 - 3; mark += 6) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(horizontal ? 2.2 : 0.14, 0.022, horizontal ? 0.14 : 2.2),
          laneMaterial
        );
        dash.position.set(
          horizontal ? x + mark : x + side * laneOffset,
          0.071,
          horizontal ? z + side * laneOffset : z + mark
        );
        dash.receiveShadow = true;
        this.group.add(dash);
      }
    });

    [-1, 1].forEach(side => {
      const edgeOffset = side * (width / 2 - 0.3);
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? length : 0.13, 0.022, horizontal ? 0.13 : length),
        laneMaterial
      );
      edge.position.set(horizontal ? x : x + edgeOffset, 0.071, horizontal ? z + edgeOffset : z);
      edge.receiveShadow = true;
      this.group.add(edge);
    });
  }

  addLoopRoad(half, width) {
    const asphalt = this.roadAsphalt || this.buildAsphaltTexture();
    const material = new THREE.MeshStandardMaterial({ map: asphalt.color, bumpMap: asphalt.bump, bumpScale: 0.045, color: 0xffffff, roughness: 0.94, metalness: 0.01 });
    const span = half * 2 + width;
    const segments = [
      { x: 0, z: half, w: span, d: width, horizontal: true },
      { x: 0, z: -half, w: span, d: width, horizontal: true },
      { x: half, z: 0, w: width, d: span, horizontal: false },
      { x: -half, z: 0, w: width, d: span, horizontal: false }
    ];
    segments.forEach(seg => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(seg.w, seg.d), material);
      road.rotation.x = -Math.PI / 2;
      road.position.set(seg.x, 0.04, seg.z);
      road.receiveShadow = true;
      this.group.add(road);

      const roadWidth = seg.horizontal ? seg.d : seg.w;
      const roadLength = seg.horizontal ? seg.w : seg.d;
      this.paintLaneMarkings(seg.x, seg.z, roadWidth, roadLength, seg.horizontal);

      this.obstacles.push({
        x1: seg.x - seg.w / 2 - 1.5,
        z1: seg.z - seg.d / 2 - 1.5,
        x2: seg.x + seg.w / 2 + 1.5,
        z2: seg.z + seg.d / 2 + 1.5
      });
    });
  }

  addGrassStrips() {
    const grassTexture = this.buildSurfaceTexture("#345b4c", 65, 1100);
    const grassMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x4d8063, roughness: 0.98 });
    [[-42, 8, 34, 3], [-42, 40, 34, 3], [8, -42, 3, 34], [40, -42, 3, 34]].forEach(([x, z, width, depth]) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), grassMaterial);
      strip.position.set(x, 0.035, z);
      strip.receiveShadow = true;
      this.group.add(strip);
    });
  }

  /**
   * Splits [start, end] into sub-segments, cutting out gaps around each
   * [center, halfWidth] entry in `excludes` (used to keep grass/trees clear
   * of intersections where another road crosses).
   */
  buildStripSegments(start, end, excludes) {
    const cuts = excludes.slice().sort((a, b) => a[0] - b[0]);
    const segments = [];
    let cursor = start;
    cuts.forEach(([center, halfWidth]) => {
      const gapStart = center - halfWidth;
      const gapEnd = center + halfWidth;
      if (gapStart > cursor) segments.push([cursor, Math.min(gapStart, end)]);
      cursor = Math.max(cursor, gapEnd);
    });
    if (cursor < end) segments.push([cursor, end]);
    return segments.filter(([a, b]) => b - a > 2);
  }

  addRoadGreenery() {
    const grassTexture = this.buildSurfaceTexture("#345b4c", 65, 1100);
    const grassMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x4d8063, roughness: 0.98 });
    const roadHalf = 3.5;
    const stripHalf = 1.25;
    const offset = roadHalf + stripHalf + 0.55;
    const treePositions = [];

    const addStrip = (segments, axis, fixedCoord, side) => {
      segments.forEach(([a, b]) => {
        const len = b - a;
        const mid = (a + b) / 2;
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(axis === "z" ? stripHalf * 2 : len, 0.05, axis === "z" ? len : stripHalf * 2),
          grassMaterial
        );
        strip.position.set(
          axis === "z" ? fixedCoord + side * offset : mid,
          0.035,
          axis === "z" ? mid : fixedCoord + side * offset
        );
        strip.receiveShadow = true;
        this.group.add(strip);

        if (axis === "z") {
          this.obstacles.push({ x1: fixedCoord + side * offset - stripHalf, z1: a, x2: fixedCoord + side * offset + stripHalf, z2: b });
        } else {
          this.obstacles.push({ x1: a, z1: fixedCoord + side * offset - stripHalf, x2: b, z2: fixedCoord + side * offset + stripHalf });
        }

        const gap = 6;
        const count = Math.max(1, Math.round(len / gap));
        for (let index = 0; index <= count; index++) {
          const t = a + (len * index) / count;
          if (t < a + 0.5 || t > b - 0.5) continue;
          const x = axis === "z" ? fixedCoord + side * offset : t;
          const z = axis === "z" ? t : fixedCoord + side * offset;
          treePositions.push([x, z]);
        }
      });
    };

    const mainGap = [24, 13];
    // Arterial roads (outward side only, to stay clear of the central plaza)
    addStrip(this.buildStripSegments(-73, 73, [mainGap, [30, 7], [-30, 7]]), "z", 24, 1);
    addStrip(this.buildStripSegments(-73, 73, [mainGap, [30, 7], [-30, 7]]), "x", 24, 1);

    // Loop ring road (outward side only, on all four legs)
    addStrip(this.buildStripSegments(-32, 32, [[24, 7]]), "x", 30, 1);
    addStrip(this.buildStripSegments(-32, 32, [[24, 7]]), "x", -30, -1);
    addStrip(this.buildStripSegments(-32, 32, [[24, 7]]), "z", 30, 1);
    addStrip(this.buildStripSegments(-32, 32, [[24, 7]]), "z", -30, -1);

    if (treePositions.length) {
      const trunk = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.13, 0.18, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x4c5144, roughness: 1 }),
        treePositions.length
      );
      const foliage = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: 0x3a7a5a, roughness: 0.95 }),
        treePositions.length
      );
      this.placeInstances(treePositions, trunk, 0.78, 0.78);
      this.placeInstances(treePositions, foliage, 2.1, 0.78);
      trunk.castShadow = foliage.castShadow = true;
      this.group.add(trunk, foliage);
      this.reactiveTrees.push(
        { mesh: trunk, positions: treePositions, y: 0.78, scale: 0.78 },
        { mesh: foliage, positions: treePositions, y: 2.1, scale: 0.78 }
      );
      treePositions.forEach(([x, z]) => {
        this.obstacles.push({ x1: x - 1.2, z1: z - 1.2, x2: x + 1.2, z2: z + 1.2 });
      });
    }
  }

  addParkland() {
    const meadow = new THREE.MeshStandardMaterial({ color: 0x557e68, roughness: 1 });
    const water = new THREE.MeshStandardMaterial({ color: 0x477e8b, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.9 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x9ca99d, roughness: 0.9 });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(22, 112), water);
    river.rotation.x = -Math.PI / 2;
    river.position.set(-58, 0.055, 2);
    river.receiveShadow = true;
    this.group.add(river);

    const bank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 112), stone);
    bank.position.set(-46.2, 0.11, 2);
    bank.receiveShadow = true;
    this.group.add(bank);

    [[-35, -38, 12, 8], [-35, 36, 12, 10], [42, -48, 22, 7], [42, 49, 22, 8]].forEach(([x, z, width, depth]) => {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), meadow);
      lawn.position.set(x, 0.06, z);
      lawn.receiveShadow = true;
      this.group.add(lawn);
      for (let index = 0; index < 3; index++) {
        const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.32, 8), stone);
        planter.position.set(x - width / 2 + 2 + index * 3.4, 0.24, z - depth / 2 + 2.2);
        this.group.add(planter);
      }
    });
  }

  roundedSquareShape(size, radius) {
    const s = size / 2;
    const r = Math.min(radius, s);
    const shape = new THREE.Shape();
    shape.moveTo(-s + r, -s);
    shape.lineTo(s - r, -s);
    shape.quadraticCurveTo(s, -s, s, -s + r);
    shape.lineTo(s, s - r);
    shape.quadraticCurveTo(s, s, s - r, s);
    shape.lineTo(-s + r, s);
    shape.quadraticCurveTo(-s, s, -s, s - r);
    shape.lineTo(-s, -s + r);
    shape.quadraticCurveTo(-s, -s, -s + r, -s);
    return shape;
  }

  addIntersection(cx, cz, roadWidth) {
    const plateHalf = roadWidth / 2 + 4;
    const cornerRadius = 3.4;
    const asphalt = this.roadAsphalt || this.buildAsphaltTexture();

    // Corner "bulb" fill (sidewalk-toned) sits beneath the rounded plate,
    // so it only shows through in the four curb corners.
    const cornerTexture = this.buildSurfaceTexture("#a99b83", 65, 900);
    const cornerFill = new THREE.Mesh(
      new THREE.PlaneGeometry(plateHalf * 2 + 1.4, plateHalf * 2 + 1.4),
      new THREE.MeshStandardMaterial({ map: cornerTexture, color: 0xc9b99c, roughness: 0.9 })
    );
    cornerFill.rotation.x = -Math.PI / 2;
    cornerFill.position.set(cx, 0.055, cz);
    cornerFill.receiveShadow = true;
    this.group.add(cornerFill);

    const shape = this.roundedSquareShape(plateHalf * 2, cornerRadius);
    const plate = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 16),
      new THREE.MeshStandardMaterial({ map: asphalt.color, bumpMap: asphalt.bump, bumpScale: 0.04, color: 0xffffff, roughness: 0.94, metalness: 0.01 })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(cx, 0.078, cz);
    plate.receiveShadow = true;
    this.group.add(plate);

    const paint = new THREE.MeshStandardMaterial({ color: 0xe9eee2, roughness: 0.78 });
    const crosswalkDist = plateHalf + 1.7;
    const stopLineDist = crosswalkDist + 2.6;
    const directions = [{ dx: 0, dz: 1 }, { dx: 0, dz: -1 }, { dx: 1, dz: 0 }, { dx: -1, dz: 0 }];

    directions.forEach(({ dx, dz }) => {
      for (let index = -3; index <= 3; index++) {
        const d = crosswalkDist + index * 0.68;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(dz !== 0 ? roadWidth * 0.82 : 0.55, 0.03, dz !== 0 ? 0.55 : roadWidth * 0.82),
          paint
        );
        stripe.position.set(cx + dx * d, 0.105, cz + dz * d);
        stripe.receiveShadow = true;
        this.group.add(stripe);
      }

      const stopLine = new THREE.Mesh(
        new THREE.BoxGeometry(dz !== 0 ? roadWidth * 0.82 : 0.4, 0.03, dz !== 0 ? 0.4 : roadWidth * 0.82),
        paint
      );
      stopLine.position.set(cx + dx * stopLineDist, 0.1, cz + dz * stopLineDist);
      stopLine.receiveShadow = true;
      this.group.add(stopLine);
    });

    this.obstacles.push({ x1: cx - plateHalf - 3, z1: cz - plateHalf - 3, x2: cx + plateHalf + 3, z2: cz + plateHalf + 3 });
  }

  addBuildings() {
    const buildings = [
      [-42, -38, 12, 19, 8, 0x6e7f79, 0xb7d8cf], [-42, 42, 10, 15, 12, 0x426c78, 0xa7d3d2],
      [48, -38, 13, 17, 7, 0x806458, 0xe0bd83], [48, 44, 11, 18, 10, 0x607871, 0xb6d8c8],
      [-38, 0, 14, 12, 5, 0x788a83, 0xc4ddd1]
    ];
    buildings.forEach(([x, z, width, depth, floors, color, windowColor]) => {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.08 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, floors * 2.4, depth), material);
      body.position.y = floors * 1.2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.22, depth + 0.45), new THREE.MeshStandardMaterial({ color: 0x263d40, roughness: 0.9 }));
      roof.position.y = floors * 2.4 + 0.12;
      group.add(roof);
      const windowMaterial = new THREE.MeshStandardMaterial({ color: windowColor, emissive: windowColor, emissiveIntensity: 0.18, roughness: 0.3, metalness: 0.2 });
      const windowRows = Math.min(floors, 10);
      const windowColumns = Math.max(2, Math.floor(width / 3));
      for (let row = 0; row < windowRows; row++) {
        for (let column = 0; column < windowColumns; column++) {
          const offset = (column - (windowColumns - 1) / 2) * (width * 0.7 / Math.max(windowColumns - 1, 1));
          const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.045), windowMaterial);
          frontWindow.position.set(offset, 1.02 + row * 2.4, depth / 2 + 0.035);
          group.add(frontWindow);
          if (column % 2 === 0) {
            const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 1.05), windowMaterial);
            sideWindow.position.set(width / 2 + 0.035, 1.02 + row * 2.4, offset % Math.max(depth - 2, 2));
            group.add(sideWindow);
          }
        }
      }
      group.position.set(x, 0, z);
      this.group.add(group);

      const pad = 2.5;
      this.obstacles.push({ x1: x - width / 2 - pad, z1: z - depth / 2 - pad, x2: x + width / 2 + pad, z2: z + depth / 2 + pad });
    });
  }

  addStreetFurniture() {
    const treePositions = [[16, 12], [31, 12], [16, 35], [34, 35], [-18, 12], [-32, 12], [-18, 35], [-34, 37], [16, -14], [32, -14], [16, -34], [34, -34], [-17, -13], [-31, -13], [-17, -35], [-33, -35], [10, 17], [38, 17]];
    const treeCount = treePositions.length;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x4c5144, roughness: 1 }), treeCount);
    const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshStandardMaterial({ color: 0x316c58, roughness: 0.95 }), treeCount);
    this.placeInstances(treePositions, trunk, 0.9, 0.85);
    this.placeInstances(treePositions, foliage, 2.45, 0.85);
    trunk.castShadow = foliage.castShadow = true;
    this.group.add(trunk, foliage);
    this.reactiveTrees.push({ mesh: trunk, positions: treePositions, y: 0.9, scale: 0.85 }, { mesh: foliage, positions: treePositions, y: 2.45, scale: 0.85 });

    const lightPositions = [[20, 9], [29, 9], [20, 39], [29, 39], [-20, 9], [-29, 9], [-20, 39], [-29, 39], [20, -9], [29, -9], [-20, -9], [-29, -9]];
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0x2b3639, roughness: 0.7, metalness: 0.45 }), lightPositions.length);
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0xe3b15a, emissive: 0x5b4317, emissiveIntensity: 0.35 }), lightPositions.length);
    this.placeInstances(lightPositions, poles, 1.8, 1);
    this.placeInstances(lightPositions, lamps, 3.65, 1);
    poles.castShadow = lamps.castShadow = true;
    this.group.add(poles, lamps);
    this.reactiveLights.push({ mesh: poles, positions: lightPositions, y: 1.8 }, { mesh: lamps, positions: lightPositions, y: 3.65 });

    const carPositions = [[11, 17], [37, 17], [11, -17], [37, -17], [17, 11], [17, 37], [-17, 11], [-17, 37]];
    const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.55, 3.7), new THREE.MeshStandardMaterial({ color: 0x3c7475, roughness: 0.6, metalness: 0.2 }), carPositions.length);
    this.placeInstances(carPositions, cars, 0.42, 1);
    cars.castShadow = true;
    this.group.add(cars);

    const pad = 1.8;
    [...treePositions, ...lightPositions, ...carPositions].forEach(([x, z]) => {
      this.obstacles.push({ x1: x - pad, z1: z - pad, x2: x + pad, z2: z + pad });
    });
  }

  placeInstances(positions, mesh, y, scale) {
    const matrix = new THREE.Matrix4();
    positions.forEach(([x, z], index) => {
      matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  addHouses() {
    const palette = [
      { wall: 0x8e6655, roof: 0x303d3c },
      { wall: 0xb6a77b, roof: 0x475247 },
      { wall: 0x668797, roof: 0x304b51 },
      { wall: 0xa6b5a8, roof: 0x3c504a },
      { wall: 0xc39166, roof: 0x4c3e31 },
      { wall: 0x887b8b, roof: 0x47454d }
    ];
    const domain = 46;
    const maxHouses = 16;
    const maxAttempts = 900;
    let placed = 0;
    let attempts = 0;

    while (placed < maxHouses && attempts < maxAttempts) {
      attempts++;
      const w = 4 + Math.random() * 4;
      const d = 4 + Math.random() * 4;
      const x = (Math.random() * 2 - 1) * domain;
      const z = (Math.random() * 2 - 1) * domain;
      if (Math.abs(x) > domain - 2 || Math.abs(z) > domain - 2) continue;

      const box = { x1: x - w / 2 - 1.4, z1: z - d / 2 - 1.4, x2: x + w / 2 + 1.4, z2: z + d / 2 + 1.4 };
      if (this.obstacles.some(o => this.rectsOverlap(o, box))) continue;

      const floors = 1 + Math.floor(Math.random() * 2);
      const height = floors * 2.5;
      const colorSet = palette[Math.floor(Math.random() * palette.length)];

      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), new THREE.MeshStandardMaterial({ color: colorSet.wall, roughness: 0.76 }));
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const roofHeight = 1.3 + Math.random() * 0.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, roofHeight, 4), new THREE.MeshStandardMaterial({ color: colorSet.roof, roughness: 0.86 }));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = height + roofHeight / 2 - 0.05;
      roof.castShadow = true;
      group.add(roof);

      for (let row = 0; row < floors; row++) {
        const window = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: 0xf7dd8a, emissive: 0xf7dd8a, emissiveIntensity: 0.22, roughness: 0.4 }));
        window.position.set(0, 1.1 + row * 2.5, d / 2 + 0.03);
        group.add(window);
      }

      group.rotation.y = (Math.random() - 0.5) * 0.35;
      group.position.set(x, 0, z);
      this.group.add(group);

      this.obstacles.push(box);
      placed++;
    }
  }

  addCracks() {
    const crackMaterial = this.crackMaterial;
    [[10, 20, 17, 24], [27, 12, 35, 15], [12, 31, 18, 36], [29, 33, 38, 38], [-30, 18, -21, 21], [-38, -14, -29, -18]].forEach(([x1, z1, x2, z2]) => {
      const length = Math.hypot(x2 - x1, z2 - z1);
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.09), crackMaterial.clone());
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = Math.atan2(z2 - z1, x2 - x1);
      crack.position.set((x1 + x2) / 2, 0.085, (z1 + z2) / 2);
      crack.scale.x = 0.05;
      this.group.add(crack);
      this.crackLines.push(crack);
    });
  }

  update(acceleration, driftRatio) {
    const intensity = Math.min(1, Math.abs(acceleration) / 9.80665);
    const sway = Math.sin(performance.now() * 0.004) * intensity * 0.12;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    this.reactiveTrees.forEach((item, groupIndex) => {
      item.positions.forEach(([x, z], index) => {
        quaternion.setFromEuler(new THREE.Euler(groupIndex ? sway : sway * 0.55, 0, groupIndex ? sway * 0.7 : sway * 0.25));
        matrix.compose(new THREE.Vector3(x, item.y, z), quaternion, scale.set(item.scale, item.scale, item.scale));
        item.mesh.setMatrixAt(index, matrix);
      });
      item.mesh.instanceMatrix.needsUpdate = true;
    });
    this.reactiveLights.forEach(item => {
      item.positions.forEach(([x, z], index) => {
        quaternion.setFromEuler(new THREE.Euler(0, 0, sway * 0.32));
        matrix.compose(new THREE.Vector3(x, item.y, z), quaternion, scale);
        item.mesh.setMatrixAt(index, matrix);
      });
      item.mesh.instanceMatrix.needsUpdate = true;
    });
    this.maxCrackLevel = Math.max(this.maxCrackLevel, Math.min(1, Math.max(0, driftRatio) * 80));
    this.crackLines.forEach((crack, index) => {
      const progress = Math.max(0, Math.min(1, this.maxCrackLevel * 1.35 - index * 0.13));
      crack.scale.x = 0.05 + progress * 0.95;
      crack.material.opacity = progress * 0.82;
    });
  }

  reset() {
    this.maxCrackLevel = 0;
    this.crackLines.forEach(crack => { crack.scale.x = 0.05; crack.material.opacity = 0; });
  }
}