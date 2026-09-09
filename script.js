const $ = id => document.getElementById(id);
const canvas = $("scene");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
camera.position.set(28, 20, 30);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const lowPowerDevice = window.matchMedia("(pointer: coarse)").matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 2));
renderer.shadowMap.enabled = !lowPowerDevice;
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 12, 0);
scene.add(new THREE.HemisphereLight(0xdbe9ed, 0x27343a, 1.7));
const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
sun.position.set(18, 35, 12); sun.castShadow = !lowPowerDevice; scene.add(sun);
const mountainBackdrop = new THREE.Group();
scene.add(mountainBackdrop);
function createMountainPeak(radius, height) {
	const geometry = new THREE.ConeGeometry(radius, height, 7, 3, false);
	const positions = geometry.attributes.position;
	const colors = [];
	const baseColor = new THREE.Color(0x3a3f52);
	const peakColor = new THREE.Color(0xc8ccd4);
	for (let i = 0; i < positions.count; i++) {
		const amount = Math.max(0, Math.min(1, (positions.getY(i) + height / 2) / height));
		const color = baseColor.clone().lerp(peakColor, amount * amount);
		colors.push(color.r, color.g, color.b);
	}
	geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
	const peak = new THREE.Mesh(geometry, material);
	peak.castShadow = false;
	peak.receiveShadow = false;
	return peak;
}
function addMountainRange(xPositions) {
	const peaks = [
		[-72, 17, 43], [-46, 23, 57], [-18, 16, 38], [12, 24, 64], [42, 18, 48], [70, 25, 55]
	];
	peaks.forEach(([z, radius, height], index) => {
		const peak = createMountainPeak(radius, height);
		peak.position.set(xPositions[index], height / 2 - 1, z);
		mountainBackdrop.add(peak);
	});
}
addMountainRange([-88, -86, -91, -84, -89, -85]);
addMountainRange([88, 86, 91, 84, 89, 85]);
const streetScene = new THREE.Group();
const streetZones = [];
const houseLots = [];
function buildAsphaltTexture() {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size; canvas.height = size;
	const context = canvas.getContext("2d");
	context.fillStyle = "#252c2e"; context.fillRect(0, 0, size, size);
	for (let i = 0; i < 3200; i++) {
		const shade = 30 + Math.floor(Math.random() * 30);
		context.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 5}, .42)`;
		const width = Math.random() * 5 + 1;
		const height = Math.random() * 3 + 0.5;
		context.fillRect(Math.random() * size, Math.random() * size, width, height);
	}
	context.fillStyle = "rgba(20, 25, 27, .34)";
	[72, 184].forEach(x => context.fillRect(x, 0, 9, size));
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1, 12);
	return texture;
}
function addRoadSurface(width, length, x, z, rotation = 0) {
	const road = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshStandardMaterial({ map: buildAsphaltTexture(), color: 0x292f32, roughness: 0.96, metalness: 0 }));
	road.rotation.x = -Math.PI / 2; road.rotation.y = rotation; road.position.set(x, 0.34, z); road.receiveShadow = true; streetScene.add(road);
	streetZones.push({ x: rotation ? x : x, z: rotation ? z : z, width: rotation ? length : width, depth: rotation ? width : length, padding: 0 });
	const markMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e6d3, roughness: 0.8 });
	for (let mark = -72; mark <= 72; mark += 8) {
		const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 3.2), markMaterial);
		dash.position.set(rotation ? x + mark : x, 0.37, rotation ? z : z + mark); dash.rotation.y = rotation; streetScene.add(dash);
	}
	[-width / 2 + 0.38, width / 2 - 0.38].forEach(offset => {
		const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, length), markMaterial);
		edge.position.set(rotation ? x + offset : x + offset, 0.37, rotation ? z : z); edge.rotation.y = rotation; streetScene.add(edge);
	});
}
function addLoopSidewalk(centerX, centerZ, width, depth) {
	const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xb4aa96, roughness: 0.88, metalness: 0 });
	const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x777b78, roughness: 0.84, metalness: 0 });
	const sidewalkWidth = 2.4;
	const curbWidth = 0.24;
	const horizontal = width > depth;
	const edgeOffset = (horizontal ? depth : width) / 2 + sidewalkWidth / 2;
	[edgeOffset, -edgeOffset].forEach(offset => {
		const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? width : sidewalkWidth, 0.1, horizontal ? sidewalkWidth : depth), sidewalkMaterial.clone());
		sidewalk.position.set(horizontal ? centerX : centerX + offset, 0.37, horizontal ? centerZ + offset : centerZ);
		sidewalk.receiveShadow = true;
		streetScene.add(sidewalk);
		streetZones.push({ x: sidewalk.position.x, z: sidewalk.position.z, width: horizontal ? width : sidewalkWidth, depth: horizontal ? sidewalkWidth : depth, padding: 0.25 });
		const curb = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? width : curbWidth, 0.2, horizontal ? curbWidth : depth), curbMaterial.clone());
		curb.position.set(horizontal ? centerX : centerX + offset * 0.58, 0.43, horizontal ? centerZ + offset * 0.58 : centerZ);
		curb.receiveShadow = true;
		streetScene.add(curb);
	});
}
function addLoopRoads() {
	const left = -22;
	const right = 30;
	const top = -22;
	const bottom = 30;
	const roadWidth = 5.5;
	const horizontalLength = right - left;
	const verticalLength = bottom - top;
	addRoadSurface(roadWidth, horizontalLength, (left + right) / 2, top);
	addRoadSurface(roadWidth, horizontalLength, (left + right) / 2, bottom);
	addRoadSurface(roadWidth, verticalLength, left, (top + bottom) / 2, Math.PI / 2);
	addRoadSurface(roadWidth, verticalLength, right, (top + bottom) / 2, Math.PI / 2);
	addLoopSidewalk((left + right) / 2, top, horizontalLength, roadWidth);
	addLoopSidewalk((left + right) / 2, bottom, horizontalLength, roadWidth);
	addLoopSidewalk(left, (top + bottom) / 2, roadWidth, verticalLength);
	addLoopSidewalk(right, (top + bottom) / 2, roadWidth, verticalLength);
	const cornerMaterial = new THREE.MeshStandardMaterial({ map: buildAsphaltTexture(), color: 0x292f32, roughness: 0.96, metalness: 0 });
	[left, right].forEach(x => [top, bottom].forEach(z => {
		const corner = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.035, roadWidth), cornerMaterial.clone());
		corner.position.set(x, 0.35, z);
		corner.receiveShadow = true;
		streetScene.add(corner);
		streetZones.push({ x, z, width: roadWidth, depth: roadWidth, padding: 0 });
	}));
}
addRoadSurface(7, 150, 24, 0);
addRoadSurface(7, 150, 0, 24, Math.PI / 2);
addLoopRoads();
function addStreetTrees() {
	const positions = [
		[-58, -68, 0], [-42, -68, 1], [-12, -68, 2], [12, -68, 0], [42, -68, 1], [58, -68, 2],
		[-58, 68, 1], [-42, 68, 2], [-12, 68, 0], [12, 68, 1], [42, 68, 2], [58, 68, 0],
		[-58, -42, 2], [-58, -18, 0], [-58, 12, 1], [-58, 42, 2], [58, -42, 0], [58, -18, 1], [58, 12, 2], [58, 42, 0],
		[-42, -12, 1], [-42, 12, 2], [42, -12, 0], [42, 12, 1], [-12, -12, 2], [12, -12, 0], [-12, 12, 1], [12, 12, 2]
	];
	const variants = [
		{ trunk: new THREE.CylinderGeometry(0.16, 0.22, 1.8, 6), foliage: new THREE.ConeGeometry(1.05, 2.8, 7), trunkY: 0.9, foliageY: 2.45 },
		{ trunk: new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6), foliage: new THREE.ConeGeometry(0.72, 4.2, 7), trunkY: 1.1, foliageY: 3.1 },
		{ trunk: new THREE.CylinderGeometry(0.18, 0.25, 1.45, 6), foliage: new THREE.SphereGeometry(1.15, 7, 5), trunkY: 0.72, foliageY: 1.95 }
	];
	const trunkMaterials = [0x5b4435, 0x594231, 0x624735].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
	const foliageMaterials = [0x47745b, 0x315f4d, 0x3f8053].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.96 }));
	variants.forEach((variant, variantIndex) => {
		const selected = positions.filter(position => position[2] === variantIndex);
		const trunks = new THREE.InstancedMesh(variant.trunk, trunkMaterials[variantIndex], selected.length);
		const foliage = new THREE.InstancedMesh(variant.foliage, foliageMaterials[variantIndex], selected.length);
		const treeData = selected.map(([x, z], index) => ({ x, z, scale: 0.85 + ((index * 17 + variantIndex * 7) % 31) / 100, rotation: ((index * 37 + variantIndex * 19) % 360) * Math.PI / 180 }));
		const matrix = new THREE.Matrix4();
		treeData.forEach((tree, index) => {
			const scale = new THREE.Vector3(tree.scale, tree.scale, tree.scale);
			matrix.compose(new THREE.Vector3(tree.x, 0.3 + variant.trunkY * tree.scale, tree.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation), scale); trunks.setMatrixAt(index, matrix);
			matrix.compose(new THREE.Vector3(tree.x, 0.3 + variant.foliageY * tree.scale, tree.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation), scale); foliage.setMatrixAt(index, matrix);
		});
		trunks.castShadow = foliage.castShadow = true;
		streetScene.add(trunks, foliage);
		variant.trunkY = variant.trunkY; variant.foliageY = variant.foliageY;
		streetScene.userData.treeData = streetScene.userData.treeData || [];
		streetScene.userData.treeData.push({ trunks, foliage, trees: treeData, variant });
	});
}
addStreetTrees();
function overlapsLot(candidate, other) {
	return Math.abs(candidate.x - other.x) < (candidate.width + other.width) / 2 + candidate.padding + other.padding && Math.abs(candidate.z - other.z) < (candidate.depth + other.depth) / 2 + candidate.padding + other.padding;
}
function addNeighborhoodHouses() {
	const candidates = [
		[-54, -52], [-38, -52], [-8, -52], [12, -52], [40, -52], [56, -52],
		[-54, 52], [-38, 52], [-8, 52], [12, 52], [40, 52], [56, 52],
		[-54, -36], [-54, -8], [-54, 12], [-54, 38], [56, -36], [56, -8], [56, 12], [56, 38]
	];
	const palette = [
		[0x9a5d4d, 0x60433d], [0xd0b990, 0x75644f], [0x6f94a2, 0x465661], [0x8b8a80, 0x505454]
	];
	const treePositions = streetScene.userData.treeData.flatMap(group => group.trees.map(tree => ({ x: tree.x, z: tree.z, width: 2.2, depth: 2.2, padding: 1.2 })));
	const buildingWidth = +$("width").value;
	const buildingKeepout = { x: 0, z: 0, width: buildingWidth, depth: buildingWidth, padding: 2 };
	candidates.forEach(([x, z], index) => {
		if (houseLots.length >= 14) return;
		const width = 4 + (index % 3) * 1.2;
		const depth = 4.5 + ((index + 1) % 3) * 1.1;
		const stories = 1 + (index % 3);
		const candidate = { x, z, width, depth, padding: 1.8 };
		if (overlapsLot(candidate, buildingKeepout) || streetZones.some(zone => overlapsLot(candidate, zone)) || houseLots.some(lot => overlapsLot(candidate, lot)) || treePositions.some(tree => overlapsLot(candidate, tree))) return;
		const group = new THREE.Group();
		const colors = palette[index % palette.length];
		const bodyHeight = stories * 2.2;
		const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), new THREE.MeshStandardMaterial({ color: colors[0], roughness: 0.82, metalness: 0 }));
		body.position.y = 0.3 + bodyHeight / 2;
		body.castShadow = true; body.receiveShadow = true; group.add(body);
		const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.38, depth + 0.35), new THREE.MeshStandardMaterial({ color: colors[1], roughness: 0.9, metalness: 0 }));
		roof.position.y = 0.3 + bodyHeight + 0.19;
		roof.castShadow = true; group.add(roof);
		const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xb8d9d4, emissive: 0x426d6b, emissiveIntensity: 0.28, roughness: 0.35 });
		for (let row = 0; row < stories; row++) {
			const window = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.2, width * 0.24), 0.42, 0.04), windowMaterial);
			window.position.set(0, 0.95 + row * 2.2, depth / 2 + 0.03);
			group.add(window);
		}
		group.rotation.y = ((index % 5) - 2) * 0.035;
		group.position.set(x, 0, z);
		streetScene.add(group);
		houseLots.push(candidate);
	});
}
addNeighborhoodHouses();
const environment = new CityEnvironment(scene, lowPowerDevice);
function updateStreetTrees(acceleration) {
	const sway = Math.sin(performance.now() * 0.004) * Math.min(1, Math.abs(acceleration) / 9.80665) * 0.1;
	const matrix = new THREE.Matrix4();
	const axis = new THREE.Vector3(0, 1, 0);
	streetScene.userData.treeData.forEach(group => group.trees.forEach((tree, index) => {
		const rotation = new THREE.Euler(sway * 0.5, tree.rotation, sway);
		matrix.compose(new THREE.Vector3(tree.x, 0.3 + group.variant.trunkY * tree.scale, tree.z), new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(tree.scale, tree.scale, tree.scale)); group.trunks.setMatrixAt(index, matrix);
		matrix.compose(new THREE.Vector3(tree.x, 0.3 + group.variant.foliageY * tree.scale, tree.z), new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(tree.scale, tree.scale, tree.scale)); group.foliage.setMatrixAt(index, matrix);
	}));
	streetScene.userData.treeData.forEach(group => { group.trunks.instanceMatrix.needsUpdate = true; group.foliage.instanceMatrix.needsUpdate = true; });
}
let structural; let building; let motion; let activeFrequency = 1; let running = false; let elapsed = 0; let shakePhase = 0; let last = performance.now(); let waveHistory = [];
const visualMotionScale = 5;
const viewportPanel = $("viewport-panel");
const timeOfDay = $("time-of-day");
function updateTimeOfDay(isDay) { const night = !isDay; timeOfDay.parentElement.classList.toggle("night", night); sun.intensity = night ? 0.35 : 2.2; sun.color.set(night ? 0x8faed1 : 0xffe2b0); scene.background = environment.buildSkyTexture(night); scene.getObjectByProperty("type", "HemisphereLight").intensity = night ? 0.65 : 1.7; viewportPanel.style.background = night ? "linear-gradient(180deg, #101820 0%, #1a2932 63%, #26343a 63%, #1d292d 100%)" : "linear-gradient(180deg, #101820 0%, #172932 63%, #26343a 63%, #1d292d 100%)"; }
timeOfDay.addEventListener("change", () => updateTimeOfDay(timeOfDay.checked));
updateTimeOfDay(timeOfDay.checked);
function values() { return { stories: +$("stories").value, width: +$("width").value, pgaG: +$("pga").value, freqHz: +$("frequency").value, durationS: +$("duration").value, material: "concrete", foundation: "strong", dampingRatio: 0.025, stiffnessMult: 1, floorHeight: 3.2, waveform: $("waveform").value }; }
function rebuild() { if (building) building.dispose(); structural = new ShearBuilding(values()); building = new BuildingView(scene, structural); const height = structural.stories * structural.floorHeight; const distance = Math.max(42, height * 1.6); controls.target.set(0, height / 2, 0); camera.position.set(distance * 0.72, height * 0.58, distance); controls.update(); $("natural-frequency").textContent = structural.naturalFreqHz.toFixed(2) + " Hz"; }
function resize() { const box = canvas.parentElement.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / Math.max(box.height, 1); camera.updateProjectionMatrix(); }
let lastReportKey = "";
function updateDamageReport() { const elevation = $("elevation"); const rows = $("damage-rows"); const reportKey = structural.stories + ":" + structural.damageState.join(","); if (reportKey === lastReportKey) return; lastReportKey = reportKey; elevation.style.setProperty("--floor-count", structural.stories); if (elevation.children.length !== structural.stories) { elevation.innerHTML = ""; rows.innerHTML = ""; for (let i = structural.stories - 1; i >= 0; i--) { const block = document.createElement("span"); block.dataset.floor = i; elevation.appendChild(block); const row = document.createElement("tr"); row.innerHTML = `<td>${i + 1}</td><td data-drift></td><td data-danger></td>`; rows.appendChild(row); } } const blocks = [...elevation.children]; const tableRows = [...rows.children]; for (let i = 0; i < structural.stories; i++) { const state = structural.damageState[i]; const danger = { safe: "low", warning: "moderate", severe: "high", "collapsed-story": "critical" }[state] || "low"; const block = blocks[structural.stories - 1 - i]; block.className = state; const row = tableRows[structural.stories - 1 - i]; row.className = state; row.querySelector("[data-drift]").textContent = (structural.peakDrift[i] * 100).toFixed(2) + "%"; row.querySelector("[data-danger]").textContent = danger; } }
function updateReadout() { const peak = structural.maxPeakDrift(); const state = structural.overallDamageClass(); const floorState = peak.floor < 0 ? "safe" : structural.damageState[peak.floor]; const danger = { safe: "Low", warning: "Moderate", severe: "High", "collapsed-story": "Critical" }[floorState] || "Low"; $("elapsed").textContent = elapsed.toFixed(1) + " s"; $("roof-displacement").textContent = structural.maxRoofDisplacement().toFixed(2) + " m"; $("peak-drift").textContent = (peak.ratio * 100).toFixed(2) + "%"; const verdict = $("verdict"); verdict.textContent = state.toUpperCase(); verdict.className = "verdict " + state; $("damage-story").textContent = peak.floor < 0 ? "Floor: None affected" : "Floor: " + (peak.floor + 1) + " most affected"; $("damage-level").textContent = "Danger level: " + danger; updateDamageReport(); }
function clearScreenShake() { canvas.style.transform = "translate3d(0, 0, 0)"; }
const wave = $("wave-canvas"); const waveContext = wave.getContext("2d"); let waveWidth = 0; let waveHeight = 0; let waveRatio = 0;
function drawWave(accel = 0) { const width = Math.max(1, wave.clientWidth); const height = Math.max(1, wave.clientHeight); const ratio = Math.min(window.devicePixelRatio || 1, 2); if (width !== waveWidth || height !== waveHeight || ratio !== waveRatio) { waveWidth = width; waveHeight = height; waveRatio = ratio; wave.width = width * ratio; wave.height = height * ratio; waveContext.setTransform(ratio, 0, 0, ratio, 0, 0); } waveContext.clearRect(0, 0, width, height); waveHistory.push(accel / 9.80665); if (waveHistory.length > 180) waveHistory.shift(); waveContext.strokeStyle = "rgba(142, 160, 160, .45)"; waveContext.lineWidth = 1; waveContext.beginPath(); waveContext.moveTo(0, height / 2); waveContext.lineTo(width, height / 2); waveContext.stroke(); waveContext.strokeStyle = "#f0c44c"; waveContext.lineWidth = 2; waveContext.beginPath(); waveHistory.forEach((value, index) => { const x = index / 179 * width; const y = height / 2 - Math.max(-1, Math.min(1, value)) * height * 0.42; index ? waveContext.lineTo(x, y) : waveContext.moveTo(x, y); }); waveContext.stroke(); $("wave-readout").textContent = (accel / 9.80665).toFixed(2) + " g"; }
function start() { const settings = values(); rebuild(); motion = new GroundMotion(settings, 1 / 120); activeFrequency = settings.freqHz; elapsed = 0; shakePhase = 0; running = true; $("start-btn").textContent = "Shake in progress"; $("status").textContent = "Ground motion active"; }
function reset() { running = false; elapsed = 0; waveHistory = []; environment.reset(); clearScreenShake(); drawWave(); rebuild(); $("start-btn").textContent = "Start shake"; $("status").textContent = "Ready to simulate"; updateReadout(); }
function applySettings() { running = false; elapsed = 0; waveHistory = []; environment.reset(); clearScreenShake(); drawWave(); rebuild(); $("start-btn").textContent = "Start shake"; $("status").textContent = "Settings updated"; updateReadout(); }
const menu = $("controls-menu");
function setMenuOpen(open) { if (!open && menu.contains(document.activeElement)) $("menu-toggle").focus(); menu.classList.toggle("open", open); menu.setAttribute("aria-hidden", String(!open)); $("menu-toggle").setAttribute("aria-expanded", String(open)); }
$("menu-toggle").addEventListener("click", () => setMenuOpen(!menu.classList.contains("open")));
$("close-menu").addEventListener("click", () => setMenuOpen(false));
document.addEventListener("click", event => { if (menu.classList.contains("open") && !menu.contains(event.target) && event.target !== $("menu-toggle")) setMenuOpen(false); });
document.addEventListener("keydown", event => { if (event.key === "Escape") setMenuOpen(false); });
const report = $("damage-report"); const reportTitle = $("report-title"); let drag = null;
const reportToggle = document.createElement("button"); reportToggle.className = "report-toggle"; reportToggle.textContent = "-"; reportToggle.title = "Shrink result"; reportToggle.setAttribute("aria-label", "Shrink result"); reportTitle.appendChild(reportToggle);
reportToggle.addEventListener("pointerdown", event => event.stopPropagation()); reportToggle.addEventListener("click", event => { event.stopPropagation(); const compact = report.classList.toggle("compact"); reportToggle.textContent = compact ? "+" : "-"; reportToggle.title = compact ? "Expand result" : "Shrink result"; reportToggle.setAttribute("aria-label", compact ? "Expand result" : "Shrink result"); });
report.addEventListener("pointerdown", event => { const rect = report.getBoundingClientRect(); drag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; report.style.transform = "none"; report.setPointerCapture(event.pointerId); });
report.addEventListener("pointermove", event => { if (!drag) return; const panel = $("viewport-panel").getBoundingClientRect(); report.style.left = Math.max(8, Math.min(panel.width - report.offsetWidth - 8, event.clientX - panel.left - drag.x)) + "px"; report.style.top = Math.max(8, Math.min(panel.height - report.offsetHeight - 8, event.clientY - panel.top - drag.y)) + "px"; });
report.addEventListener("pointerup", () => { drag = null; });
const metrics = $("metrics-dock"); let metricsDrag = null;
metrics.addEventListener("pointerdown", event => { const rect = metrics.getBoundingClientRect(); metricsDrag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; metrics.style.transform = "none"; metrics.style.left = rect.left - $("viewport-panel").getBoundingClientRect().left + "px"; metrics.style.top = rect.top - $("viewport-panel").getBoundingClientRect().top + "px"; metrics.setPointerCapture(event.pointerId); });
metrics.addEventListener("pointermove", event => { if (!metricsDrag) return; const panel = $("viewport-panel").getBoundingClientRect(); metrics.style.left = Math.max(8, Math.min(panel.width - metrics.offsetWidth - 8, event.clientX - panel.left - metricsDrag.x)) + "px"; metrics.style.top = Math.max(8, Math.min(panel.height - metrics.offsetHeight - 8, event.clientY - panel.top - metricsDrag.y)) + "px"; });
metrics.addEventListener("pointerup", () => { metricsDrag = null; });
const waveDock = $("wave-dock"); const waveTitle = $("wave-title"); let waveDrag = null;
waveDock.addEventListener("pointerdown", event => { const rect = waveDock.getBoundingClientRect(); waveDrag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; waveDock.style.transform = "none"; waveDock.style.left = rect.left - $("viewport-panel").getBoundingClientRect().left + "px"; waveDock.style.top = rect.top - $("viewport-panel").getBoundingClientRect().top + "px"; waveDock.setPointerCapture(event.pointerId); });
	waveDock.addEventListener("pointermove", event => { if (!waveDrag) return; const panel = $("viewport-panel").getBoundingClientRect(); waveDock.style.left = Math.max(8, Math.min(panel.width - waveDock.offsetWidth - 8, event.clientX - panel.left - waveDrag.x)) + "px"; waveDock.style.top = Math.max(8, Math.min(panel.height - waveDock.offsetHeight - 8, event.clientY - panel.top - waveDrag.y)) + "px"; });
	waveDock.addEventListener("pointerup", () => { waveDrag = null; });
$("start-btn").addEventListener("click", start); $("reset-btn").addEventListener("click", reset);
["stories", "width", "pga", "frequency", "duration"].forEach(id => $(id).addEventListener("input", () => { const v = $(id).value; $(id + "-value").textContent = id === "width" ? v + " m" : id === "pga" ? (+v).toFixed(2) + " g" : id === "frequency" ? (+v).toFixed(2) + " Hz" : id === "duration" ? v + " s" : v; applySettings(); }));
["waveform"].forEach(id => $(id).addEventListener("change", applySettings));
$("reset-camera-btn").addEventListener("click", () => { camera.position.set(28, 20, 30); controls.target.set(0, 12, 0); controls.update(); });
$("viewport-toggle").addEventListener("click", () => { const expanded = $("viewport-panel").classList.toggle("expanded"); $("viewport-toggle").setAttribute("aria-pressed", expanded); $("viewport-toggle").title = expanded ? "Collapse viewport" : "Expand viewport"; requestAnimationFrame(resize); });
const uiToggle = document.createElement("button"); uiToggle.className = "cam-btn ui-toggle"; uiToggle.id = "ui-toggle"; uiToggle.textContent = "◉"; uiToggle.title = "Hide interface"; uiToggle.setAttribute("aria-label", "Hide interface"); uiToggle.setAttribute("aria-pressed", "false"); $("viewport-panel").querySelector(".camera-dock").appendChild(uiToggle);
uiToggle.addEventListener("click", () => { const hidden = $("viewport-panel").classList.toggle("ui-hidden"); uiToggle.setAttribute("aria-pressed", hidden); uiToggle.textContent = hidden ? "◎" : "◉"; uiToggle.title = hidden ? "Show interface" : "Hide interface"; uiToggle.setAttribute("aria-label", hidden ? "Show interface" : "Hide interface"); });
function frame(now) { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; if (running && motion) { const index = Math.floor(elapsed * 120); const sample = motion.sampleIndex(index); structural.step(dt, sample.accel); elapsed += dt; shakePhase += dt * Math.PI * 2 * activeFrequency; if (structural.collapsed) { building.collapse(structural.collapseInitiatingStory); if (building.animateCollapse(dt)) running = false; } else { building.updatePose(sample.disp * visualMotionScale); } environment.update(sample.accel, structural.maxPeakDrift().ratio); const intensity = Math.min(1, Math.abs(sample.accel) / 9.80665); const shakePixels = 1.5 + intensity * 10; canvas.style.transform = `translate3d(${Math.sin(shakePhase) * shakePixels}px, ${Math.cos(shakePhase * 1.17) * shakePixels * 0.65}px, 0)`; drawWave(sample.accel); updateReadout(); if (index >= motion.totalSteps() - 1 || (structural.collapsed && !running)) { clearScreenShake(); $("start-btn").textContent = "Start shake"; $("status").textContent = structural.collapsed ? "Collapse detected" : "Shake complete"; } } else { clearScreenShake(); } controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame); }
const viewportObserver = new ResizeObserver(() => { resize(); drawWave(); });
viewportObserver.observe($("viewport-panel"));
window.addEventListener("resize", () => { resize(); drawWave(); }); rebuild(); resize(); drawWave(); updateReadout(); requestAnimationFrame(frame);