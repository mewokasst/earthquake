// building.js

const DAMAGE_COLOR = {
  safe: new THREE.Color(0x9aa4ad),
  warning: new THREE.Color(0xf0c44c),
  severe: new THREE.Color(0xe87532),
  "collapsed-story": new THREE.Color(0xd94141),
  collapsed: new THREE.Color(0xd94141)
};

class BuildingView {
  constructor(parent, structural) {
    this.parent = parent;
    this.structural = structural;

    this.group =
      new THREE.Group();

    this.parent.add(
      this.group
    );

    this.floors = [];
    this.columnSegs = [];
    this.midColumns = [];
    this.midPositions = [];

    this.collapseActive =
      false;

    this.width =
      structural.width;

    this.floorHeight =
      structural.floorHeight;

    this.stories =
      structural.stories;

    this.halfWidth =
      this.width / 2;

    this.build();
  }

  build() {
    const s =
      this.structural;

    const N =
      s.stories;

    const w =
      s.width;

    const fh =
      s.floorHeight;

    const half =
      w / 2;

    /*
     * Taller buildings get slightly stronger-looking
     * columns so adding floors doesn't make the
     * structure visually disappear.
     */
    const heightFactor =
      Math.min(
        1.35,
        Math.max(
          0.85,
          N / 8
        )
      );

    const colR =
      Math.max(
        0.18,
        Math.min(
          0.65,
          (w / 60) *
          heightFactor
        )
      );

    this.colR =
      colR;

    this.halfWidth =
      half;

    const slabThickness =
      Math.max(
        0.18,
        Math.min(
          0.38,
          fh * 0.08
        )
      );

    const slabMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x737b83,
        roughness: 0.72,
        metalness: 0.08
      });

    const columnMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x9aa4ad,
        roughness: 0.58,
        metalness: 0.12
      });

    this.columnMat =
      columnMaterial;

    /*
     * Shared unit-cube geometry + glazing material for facade
     * windows. Every window is one scaled instance of this same
     * geometry, added as a child of its floor's facade panel so it
     * automatically follows that panel's sway/collapse motion.
     */
    this.windowGeometry =
      new THREE.BoxGeometry(1, 1, 1);

    this.windowMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xbfe6ea,
        emissive: 0x2c5760,
        emissiveIntensity: 0.24,
        roughness: 0.22,
        metalness: 0.35
      });

    /*
     * Floors.
     */
    for (
      let i = 0;
      i < N;
      i++
    ) {
      const y =
        fh * (i + 1);

      const slabGeometry =
        new THREE.BoxGeometry(
          w,
          slabThickness,
          w
        );

      const slab =
        new THREE.Mesh(
          slabGeometry,
          slabMaterial.clone()
        );

      slab.position.set(
        0,
        y,
        0
      );

      slab.castShadow =
        true;

      slab.receiveShadow =
        true;

      this.group.add(
        slab
      );

      const facadeGroup =
        [];

      /*
       * Four thin facade bands.
       */
      const facadeThickness =
        Math.max(
          0.14,
          w * 0.018
        );

      const facadeHeight =
        Math.max(
          0.3,
          fh * 0.92
        );

      const facadeMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x515961,
          roughness: 0.8,
          metalness: 0.04
        });

      const front =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            w,
            facadeHeight,
            facadeThickness
          ),
          facadeMaterial.clone()
        );

      front.position.set(
        0,
        y - fh * 0.5,
        half
      );

      const back =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            w,
            facadeHeight,
            facadeThickness
          ),
          facadeMaterial.clone()
        );

      back.position.set(
        0,
        y - fh * 0.5,
        -half
      );

      const left =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            facadeThickness,
            facadeHeight,
            w
          ),
          facadeMaterial.clone()
        );

      left.position.set(
        -half,
        y - fh * 0.5,
        0
      );

      const right =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            facadeThickness,
            facadeHeight,
            w
          ),
          facadeMaterial.clone()
        );

      right.position.set(
        half,
        y - fh * 0.5,
        0
      );

      facadeGroup.push(
        front,
        back,
        left,
        right
      );

      this.addFacadeWindows(front, "x", 1, w, facadeHeight, facadeThickness);
      this.addFacadeWindows(back, "x", -1, w, facadeHeight, facadeThickness);
      this.addFacadeWindows(left, "z", -1, w, facadeHeight, facadeThickness);
      this.addFacadeWindows(right, "z", 1, w, facadeHeight, facadeThickness);

      facadeGroup.forEach(
        mesh => {
          mesh.castShadow =
            true;

          mesh.receiveShadow =
            true;

          this.group.add(
            mesh
          );
        }
      );

      const crackGroup =
        new THREE.Group();

      crackGroup.visible =
        false;

      this.group.add(
        crackGroup
      );

      this.floors.push({
        slab,
        facades:
          facadeGroup,
        crackGroup
      });
    }

    /*
     * Four corner columns.
     */
    const signs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    this.cornerSigns =
      signs;

    for (
      let c = 0;
      c < signs.length;
      c++
    ) {
      const segs = [];

      for (
        let i = 0;
        i < N;
        i++
      ) {
        const geometry =
          new THREE.BoxGeometry(
            colR * 1.7,
            fh,
            colR * 1.7
          );

        const mesh =
          new THREE.Mesh(
            geometry,
            columnMaterial.clone()
          );

        mesh.castShadow =
          true;

        mesh.receiveShadow =
          true;

        this.group.add(
          mesh
        );

        segs.push({
          mesh,
          mat: mesh.material,
          floorIdx: i
        });
      }

      this.columnSegs.push(
        segs
      );
    }

    /*
     * Extra columns on wide buildings.
     */
    if (w > 18) {
      const mids = [
        [0, -half],
        [0, half],
        [-half, 0],
        [half, 0]
      ];

      this.midPositions =
        mids;

      mids.forEach(
        position => {
          const segs = [];

          for (
            let i = 0;
            i < N;
            i++
          ) {
            const geometry =
              new THREE.BoxGeometry(
                colR * 1.4,
                fh,
                colR * 1.4
              );

            const mesh =
              new THREE.Mesh(
                geometry,
                columnMaterial.clone()
              );

            mesh.castShadow =
              true;

            mesh.receiveShadow =
              true;

            this.group.add(
              mesh
            );

            segs.push({
              mesh,
              mat: mesh.material,
              floorIdx: i
            });
          }

          this.midColumns.push({
            segs
          });
        }
      );
    }

    /*
     * Roofline: a parapet lip plus a small mechanical cap, attached
     * as a child of the top floor's slab so it rides along with
     * that floor's sway (and disappears with it on collapse).
     */
    const topFloor =
      this.floors[N - 1];

    if (topFloor) {
      const roofGroup =
        new THREE.Group();

      const parapetHeight =
        Math.max(0.22, fh * 0.09);

      const parapet =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            w + 0.1,
            parapetHeight,
            w + 0.1
          ),
          new THREE.MeshStandardMaterial({
            color: 0x444d54,
            roughness: 0.78,
            metalness: 0.06
          })
        );

      parapet.position.y =
        slabThickness / 2 +
        parapetHeight / 2;

      parapet.castShadow =
        true;

      roofGroup.add(
        parapet
      );

      const capSize =
        Math.max(1.1, w * 0.26);

      const capHeight =
        Math.max(0.55, fh * 0.32);

      const cap =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            capSize,
            capHeight,
            capSize * 0.68
          ),
          new THREE.MeshStandardMaterial({
            color: 0x5b656c,
            roughness: 0.7,
            metalness: 0.1
          })
        );

      cap.position.set(
        0,
        slabThickness / 2 +
          parapetHeight +
          capHeight / 2,
        0
      );

      cap.castShadow =
        true;

      roofGroup.add(
        cap
      );

      topFloor.slab.add(
        roofGroup
      );
    }

    this.updatePose();
  }

  floorRenderX(i, groundDisp) {
    if (i < 0) {
      return groundDisp;
    }

    return (
      groundDisp +
      this.structural.x[i]
    );
  }

  updatePose(groundDisp = 0) {
    if (
      this.collapseActive
    ) {
      return;
    }

    const s =
      this.structural;

    const fh =
      s.floorHeight;

    const N =
      s.stories;

    this.group.position.x =
      groundDisp;

    for (
      let i = 0;
      i < N;
      i++
    ) {
      const off =
        s.x[i];

      const f =
        this.floors[i];

      f.slab.position.x =
        off;

      const belowOff =
        i === 0
          ? 0
          : s.x[i - 1];

      const mid =
        (off + belowOff) / 2;

      f.facades.forEach(
        mesh => {
          if (
            mesh.userData.originalX ===
            undefined
          ) {
            mesh.userData.originalX =
              mesh.position.x;
          }

          mesh.position.x =
            mesh.userData.originalX +
            mid;
        }
      );

      f.crackGroup.position.x =
        mid;

      this.applyDamageColor(
        i
      );
    }

    this.cornerSigns.forEach(
      (sign, cornerIdx) => {
        const segs =
          this.columnSegs[
            cornerIdx
          ];

        for (
          let i = 0;
          i < N;
          i++
        ) {
          const bottomOff =
            i === 0
              ? 0
              : s.x[i - 1];

          const topOff =
            s.x[i];

          this.placeColumnSegment(
            segs[i].mesh,
            sign[0] *
              this.halfWidth,
            sign[1] *
              this.halfWidth,
            fh * i,
            fh * (i + 1),
            bottomOff,
            topOff
          );
        }
      }
    );

    if (
      this.midColumns.length
    ) {
      this.midColumns.forEach(
        (mc, idx) => {
          const [
            px,
            pz
          ] =
            this.midPositions[
              idx
            ];

          for (
            let i = 0;
            i < N;
            i++
          ) {
            const bottomOff =
              i === 0
                ? 0
                : s.x[i - 1];

            const topOff =
              s.x[i];

            this.placeColumnSegment(
              mc.segs[i].mesh,
              px,
              pz,
              fh * i,
              fh * (i + 1),
              bottomOff,
              topOff
            );
          }
        }
      );
    }
  }

  placeColumnSegment(
    mesh,
    baseX,
    baseZ,
    yBottom,
    yTop,
    offBottom,
    offTop
  ) {
    const xBottom =
      baseX +
      offBottom;

    const xTop =
      baseX +
      offTop;

    const midX =
      (xBottom + xTop) / 2;

    const midY =
      (yBottom + yTop) / 2;

    mesh.position.set(
      midX,
      midY,
      baseZ
    );

    const dx =
      xTop - xBottom;

    const dy =
      yTop - yBottom;

    const len =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    mesh.scale.y =
      len /
      Math.max(
        yTop - yBottom,
        0.001
      );

    mesh.rotation.z =
      -Math.atan2(
        dx,
        dy
      );
  }

  /**
   * Instances a row of glazing panes across one facade face and adds
   * them as children of that facade mesh, so they inherit its sway,
   * skew and collapse motion for free.
   *
   * axis: "x" for the front/back faces (windows spaced along local x,
   * facing along local z); "z" for the left/right faces (windows
   * spaced along local z, facing along local x).
   * outwardSign: +1 or -1, which way along the facing axis the glass
   * sits so it reads flush with the outer wall surface.
   * span: the facade's own width (equal to the building width, w).
   */
  addFacadeWindows(
    facade,
    axis,
    outwardSign,
    span,
    facadeHeight,
    facadeThickness
  ) {
    const margin =
      Math.min(0.6, span * 0.08);

    const usable =
      Math.max(0.5, span - margin * 2);

    const columns =
      Math.max(
        2,
        Math.min(14, Math.floor(usable / 2.2))
      );

    const winSpan =
      Math.min(1.6, (usable / columns) * 0.7);

    const winHeight =
      Math.min(1.3, facadeHeight * 0.55);

    const outward =
      facadeThickness / 2 + 0.006;

    const spacing =
      columns > 1 ? usable / (columns - 1) : 0;

    const mesh =
      new THREE.InstancedMesh(
        this.windowGeometry,
        this.windowMaterial,
        columns
      );

    const matrix =
      new THREE.Matrix4();

    const scale =
      axis === "x"
        ? new THREE.Vector3(winSpan, winHeight, 0.12)
        : new THREE.Vector3(0.12, winHeight, winSpan);

    for (let c = 0; c < columns; c++) {
      const t =
        columns > 1 ? -usable / 2 + c * spacing : 0;

      const position =
        axis === "x"
          ? new THREE.Vector3(t, 0, outwardSign * outward)
          : new THREE.Vector3(outwardSign * outward, 0, t);

      matrix.compose(
        position,
        new THREE.Quaternion(),
        scale
      );

      mesh.setMatrixAt(c, matrix);
    }

    mesh.instanceMatrix.needsUpdate =
      true;

    facade.add(mesh);
  }

  applyDamageColor(i) {
    if (
      !this.floors[i]
    ) {
      return;
    }

    const state =
      this.structural
        .damageState[i];

    const color =
      DAMAGE_COLOR[state] ||
      DAMAGE_COLOR.safe;

    this.columnSegs.forEach(
      segs => {
        if (
          segs[i]
        ) {
          segs[i].mat.color.copy(
            color
          );
        }
      }
    );

    this.midColumns.forEach(
      mc => {
        if (
          mc.segs[i]
        ) {
          mc.segs[i].mat.color.copy(
            color
          );
        }
      }
    );

    this.updateCracks(
      i,
      state
    );
  }

  updateCracks(
    i,
    state
  ) {
    const group =
      this.floors[i]
        .crackGroup;

    if (
      state === "safe"
    ) {
      group.visible =
        false;

      return;
    }

    if (
      group.children.length ===
      0
    ) {
      this.addFacadeCracks(
        i,
        state
      );
    }

    group.visible =
      true;
  }

  addFacadeCracks(
    i,
    state
  ) {
    const group =
      this.floors[i]
        .crackGroup;

    const w =
      this.width;

    const fh =
      this.floorHeight;

    const count =
      state === "warning"
        ? 3
        : state === "severe"
        ? 6
        : 10;

    const material =
      new THREE.LineBasicMaterial({
        color:
          0x181b1e,
        transparent: true,
        opacity: 0.85
      });

    for (
      let n = 0;
      n < count;
      n++
    ) {
      const x =
        -w / 2 +
        Math.random() *
        w;

      const y =
        i * fh +
        fh * 0.2 +
        Math.random() *
        fh * 0.55;

      const points = [];

      const length =
        0.25 +
        Math.random() *
        0.7;

      points.push(
        new THREE.Vector3(
          x,
          y,
          w / 2 + 0.012
        )
      );

      points.push(
        new THREE.Vector3(
          x +
            (Math.random() - 0.5) *
            length,
          y +
            length *
            0.5,
          w / 2 + 0.014
        )
      );

      const geometry =
        new THREE.BufferGeometry()
          .setFromPoints(
            points
          );

      const line =
        new THREE.Line(
          geometry,
          material.clone()
        );

      group.add(
        line
      );
    }
  }

  collapse(storyIndex = 0) {
    if (this.collapseActive) return;
    const direction = this.structural.peakDriftSigned[storyIndex] >= 0 ? 1 : -1;
    this.collapseActive = true;
    this.collapseDirection = direction;
    this.collapseTime = 0;
    this.collapseStory = Math.max(0, storyIndex);
    this.collapseFloorStates = [];

    for (let i = 0; i < this.stories; i++) {
      const delay = i <= this.collapseStory
        ? (this.collapseStory - i) * 0.42
        : (i - this.collapseStory) * 0.18;
      const floor = this.floors[i];
      const state = { floor, floorIndex: i, delay, drop: 0, settled: false };
      state.slabY = floor.slab.position.y;
      state.pieces = [];
      state.facadePieces = [];
      state.facadeY = floor.facades.map(facade => facade.position.y);
      state.crackY = floor.crackGroup.position.y;
      state.columns = [];
      this.columnSegs.forEach(segs => {
        const column = segs[i];
        state.columns.push({ mesh: column.mesh, y: column.mesh.position.y, rotation: column.mesh.rotation.z });
      });
      this.midColumns.forEach(columnGroup => {
        const column = columnGroup.segs[i];
        state.columns.push({ mesh: column.mesh, y: column.mesh.position.y, rotation: column.mesh.rotation.z });
      });
      const slabWidth = floor.slab.geometry.parameters.width || this.width;
      const slabHeight = floor.slab.geometry.parameters.height || 0.24;
      floor.slab.visible = true;
      const gridSize = 2;
      const pieceWidth = slabWidth / gridSize;
        for (let row = 0; row < gridSize; row++) {
          for (let column = 0; column < gridSize; column++) {
            const widthScale = 0.78 + Math.random() * 0.16;
            const piece = new THREE.Mesh(
              new THREE.BoxGeometry(pieceWidth * widthScale, slabHeight * (0.78 + Math.random() * 0.22), slabWidth / gridSize * (0.78 + Math.random() * 0.16)),
              floor.slab.material.clone()
            );
            piece.castShadow = true;
            piece.receiveShadow = true;
            piece.visible = false;
            this.group.add(piece);
            state.pieces.push({
              mesh: piece,
              x: floor.slab.position.x + (column - 0.5) * pieceWidth + (Math.random() - 0.5) * pieceWidth * 0.12,
              z: (row - 0.5) * pieceWidth + (Math.random() - 0.5) * pieceWidth * 0.12,
              y: state.slabY,
              rotation: (Math.random() - 0.5) * 0.18,
              spin: (Math.random() - 0.5) * 1.3
            });
          }
        }
        floor.facades.forEach(facade => {
          const facadeWidth = facade.geometry.parameters.width || slabWidth;
          const facadeHeight = facade.geometry.parameters.height || this.floorHeight * 0.6;
          const facadeDepth = facade.geometry.parameters.depth || 0.1;
          facade.visible = true;
          for (let row = 0; row < gridSize; row++) {
            for (let column = 0; column < gridSize; column++) {
              const horizontal = facadeWidth >= facadeDepth;
              const tileWidth = (horizontal ? facadeWidth : facadeDepth) / gridSize;
              const tileHeight = facadeHeight / gridSize;
              const tile = new THREE.Mesh(
                new THREE.BoxGeometry(horizontal ? tileWidth * 0.86 : facadeWidth, tileHeight * 0.86, horizontal ? facadeDepth : tileWidth * 0.86),
                facade.material.clone()
              );
              tile.castShadow = true;
              tile.receiveShadow = true;
              tile.visible = false;
              this.group.add(tile);
              state.facadePieces.push({
                mesh: tile,
                source: facade,
                x: facade.position.x + (horizontal ? (column - 0.5) * tileWidth : 0),
                y: facade.position.y - facadeHeight / 2 + (row + 0.5) * tileHeight,
                z: facade.position.z + (horizontal ? 0 : (column - 0.5) * tileWidth),
                rotation: (Math.random() - 0.5) * 0.14,
                spin: (Math.random() - 0.5) * 1.1
              });
            }
          }
        });
      this.collapseFloorStates.push(state);
    }
  }

  animateCollapse(dt) {
    if (!this.collapseActive) return true;
    this.collapseTime += Math.max(0, dt);
    const gravity = 9.81;
    let complete = true;

    this.collapseFloorStates.forEach(state => {
      const fallingTime = this.collapseTime - state.delay;
      if (fallingTime <= 0) {
        if (state.floor.crackGroup.children.length === 0) {
          this.addFacadeCracks(state.floorIndex, "severe");
        }
        state.floor.crackGroup.visible = true;
        complete = false;
        return;
      }

      state.floor.slab.visible = false;

      const fallDuration = 1.05;
      const t = Math.min(fallingTime, fallDuration);
      const naturalDrop = 0.5 * gravity * t * t;
      const drop = Math.min(this.floorHeight * 1.25, naturalDrop);
      const settle = fallingTime > fallDuration
        ? Math.sin(Math.min((fallingTime - fallDuration) * 8, Math.PI / 2)) * 0.08
        : 0;
      state.drop = Math.max(0, drop - settle);
      const wobble = Math.sin(fallingTime * 24) * Math.max(0, 1 - fallingTime / fallDuration) * 0.06;

      state.pieces.forEach((piece, index) => {
        piece.mesh.visible = true;
        piece.mesh.position.set(
          piece.x + Math.sin(fallingTime * 5 + index) * 0.07,
          piece.y - state.drop,
          piece.z + Math.cos(fallingTime * 4 + index) * 0.025
        );
        piece.mesh.rotation.z = piece.rotation + wobble + fallingTime * piece.spin * 0.18;
      });
      state.facadePieces.forEach((piece, index) => {
        piece.mesh.visible = true;
        piece.mesh.position.set(
          piece.x + Math.sin(fallingTime * 4 + index) * 0.035,
          piece.y - state.drop,
          piece.z + Math.cos(fallingTime * 4 + index) * 0.02
        );
        piece.mesh.rotation.z = piece.rotation + wobble + fallingTime * piece.spin * 0.12;
      });
      state.floor.facades.forEach((mesh, index) => {
        mesh.position.y = state.facadeY[index] - state.drop;
        mesh.rotation.z = state.columns.length ? wobble * this.collapseDirection : 0;
      });
      state.floor.crackGroup.position.y = state.crackY - state.drop;
      state.columns.forEach(column => {
        column.mesh.position.y = column.y - state.drop * 0.85;
        column.mesh.rotation.z = column.rotation + wobble * this.collapseDirection;
      });

      if (fallingTime < fallDuration + 0.25) complete = false;
    });

    return complete;
  }

  dispose() {
    this.group.traverse(
      object => {
        if (
          object.geometry
        ) {
          object.geometry.dispose();
        }

        if (
          object.material
        ) {
          if (
            Array.isArray(
              object.material
            )
          ) {
            object.material.forEach(
              material =>
                material.dispose()
            );
          } else {
            object.material.dispose();
          }
        }
      }
    );

    if (
      this.group.parent
    ) {
      this.group.parent.remove(
        this.group
      );
    }
  }
}