import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { getStorage, log, spaceID } from "../../helpers/global.js";
import { bus } from "../../modules/bus.js";

export class ProductViewer {

    constructor(product, settings) {

        this.product = product;
        this.settings = settings;

        this.state = {};

        this.state.allowCameraUpdate = false;

        this.state.allowPositionUpdate = false;

        this.state.viewerFirstLoad = true;

        // console.log('ProductViewer', this.product.sketch.offset);

        this.state.timeOut = null;

        this.init();
    }

    init() {

        let self = this;

        this.view();

        // Load 3D model
        const container = document.querySelector('factory-viewer');

        if (!container) return;

        this.clearScene();

        // return;

        this.state.scene = new THREE.Scene();
        this.state.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        self.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        self.renderer.setSize(container.clientWidth, container.clientHeight);
        self.renderer.setPixelRatio(window.devicePixelRatio); // Improve resolution quality
        self.renderer.setClearColor(0xffffff, 1); // Set background color to white
        container.appendChild(self.renderer.domElement);

        self.state.controls = new OrbitControls(this.state.camera, self.renderer.domElement);
        self.state.controls.enableDamping = true;
        self.state.controls.dampingFactor = 0.25;
        self.state.controls.enableZoom = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Increase intensity
        self.state.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Add directional light
        directionalLight.position.set(0, 1, 1).normalize();
        self.state.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 1); // Increase intensity
        this.state.camera.add(pointLight);
        self.state.scene.add(this.state.camera);

        self.state.scene_default = self.state.scene.clone();

        let mtlFileExists = this.product.cad_files.find(file => file.name.endsWith('.mtl'));
        let objFileExists = this.product.cad_files.find(file => file.name.endsWith('.obj'));

        if (!mtlFileExists || !objFileExists) { self.state.viewerFirstLoad = true; return; }

        const mtlFile = getStorage() + '/S' + spaceID() + '/' + this.product.cad_files.find(file => file.name.endsWith('.mtl')).id + '.mtl';
        self.state.objFile = getStorage() + '/S' + spaceID() + '/' + this.product.cad_files.find(file => file.name.endsWith('.obj')).id + '.obj';

        if (mtlFile && self.state.objFile) {
            const mtlLoader = new MTLLoader();
            mtlLoader.load(mtlFile, (materials) => {

                self.materials = materials;
                self.materials.preload();

                // console.log('loadObjFile MTLLoader');
                // self.state.objLoader = new OBJLoader();
                // self.state.objLoader.setMaterials(materials);

                self.loadObjFile();
            });
        } else {
            console.error('MTL or OBJ file not found in the provided CAD files.');
        }

        window.addEventListener('resize', () => {
            self.state.camera.aspect = container.clientWidth / container.clientHeight;
            self.state.camera.updateProjectionMatrix();
            self.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        const animate = function () {
            requestAnimationFrame(animate);
            self.state.controls.update();
            self.renderer.render(self.state.scene, self.state.camera);
            // self.renderer.update();
        };

        animate();

        self.state.controls.addEventListener('change', () => {
            this.captureParameters();
        });

        this.listeners();
    }

    clearScene() {

        // console.log('clear scene 1');

        if (this.state.scene) {

            // console.log('clear scene 2');

            // Dispose of the scene and its children
            this.state.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.state.scene = null;
        }
    }

    loadObjFileFirstTime() {

        let self = this;

        self.state.objLoader = new OBJLoader();
        self.state.objLoader.setMaterials(self.materials);

        log('Loading object file first time:', self.state.objFile);

        // Load the object first to compute its bounding box and set optimal camera position
        self.state.objLoader.load(self.state.objFile, (object) => {

            // Compute bounding box
            const box = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Find the largest dimension
            const maxDim = Math.max(size.x, size.y, size.z);

            // Compute optimal camera Z position based on FOV and object size
            const fov = self.state.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.1; // Add some padding

            // Center the object
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center);

            // Set camera position to optimal zoom
            self.state.camera.position.set(0, 0, cameraZ);
            self.state.camera.lookAt(0, 0, 0);
            self.state.camera.updateProjectionMatrix();

            // Add object to scene
            self.state.scene.add(object);
            self.state.object = object;

            // Continue with any additional setup (e.g., controls)
            self.state.controls.update();

            // Mark first load as done
            self.state.viewerFirstLoad = false;
        });
    }

    loadObjFile() {

        let self = this;

        self.state.objLoader = new OBJLoader();
        self.state.objLoader.setMaterials(self.materials);

        self.state.objLoader.load(self.state.objFile, (object) => {

            // console.log('Object loaded', self.product.sketch.offset);

            // Center the object
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center);
            if (self.product.sketch.offset) {
                object.position.x += (box.max.x - box.min.x) * self.product.sketch.offset.x;
                object.position.y += (box.max.y - box.min.y) * self.product.sketch.offset.y;
            }
            object.scale.set(1, 1, 1); // Reduce the size of the object
            self.state.scene.add(object);

            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            self.state.cube = new THREE.Mesh(geometry, material);
            self.state.scene.add(self.state.cube);

            self.state.object = object;

            // Center the camera on the object
            const size = new THREE.Vector3();
            box.getSize(size);

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = self.state.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.1; // Zoom out a little so that the object is not too close
            self.state.camera.position.z = cameraZ;

            // Restore camera position if left, right, up, or down was pressed
            if (self.state.allowPositionUpdate) {

                self.state.camera.position.set(this.state.viewerParameters.position.x, this.state.viewerParameters.position.y, this.state.viewerParameters.position.z);
                self.state.allowPositionUpdate = false;
            }

            self.state.camera.fov = self.product.sketch.fov;

            // const minZ = box.min.z;
            // const cameraToFarEdge = minZ < 0 ? -minZ + self.product.sketch.position.z : self.product.sketch.position.z - minZ;

            self.state.camera.near = 0.1;
            self.state.camera.far = maxDim * 5;

            // self.state.camera.lookAt(0, 0, 0);
            // self.state.camera.near = 0.1;
            // self.state.camera.far = 5000;
            self.state.camera.updateProjectionMatrix();
            self.state.controls.update();

            // Apply viewer parameters on first load after initialization
            if (self.state.viewerFirstLoad) {

                // console.log('Applying viewer parameters', self.product.sketch);
                self.state.camera.fov = self.product.sketch.fov;
                self.state.camera.position.set(self.product.sketch.position.x, self.product.sketch.position.y, self.product.sketch.position.z);
                self.state.camera.rotation.set(self.product.sketch.rotation.x, self.product.sketch.rotation.y, self.product.sketch.rotation.z);
                self.state.camera.updateProjectionMatrix();
                self.state.viewerFirstLoad = false;

                // If the position is not set, center the camera on the object. obj and mtl were just uploaded.
                if (self.product.sketch.position.x == 0 && self.product.sketch.position.y == 0 && self.product.sketch.position.z == 0) {

                    self.state.camera.position.set(0, 0, cameraZ);
                }
            }
        });
    }

    refresh() {

        let self = this;

        // console.log('refresh viewer', self.product.sketch.offset);

        self.state.scene = self.state.scene_default.clone();

        self.state.allowPositionUpdate = true;

        // self.state.objLoader.parse();
        self.loadObjFile();

        self.captureParameters();
    }

    view() {

        document.querySelector('sketch-viewer').innerHTML = ``;

        if (!this.product.cad_files.find(file => file.name.endsWith('.obj'))) return;

        document.querySelector('sketch-viewer').innerHTML = `
            <div style="width:500px;height:500px;"> 
                <factory-viewer class="d-block" style="width:100%;height:100%;"></factory-viewer>
            </div>
        `;
    }

    listeners() {

        setTimeout(() => {
            this.state.allowCameraUpdate = true;
        }, 1000);

        bus.on('sketch:controls:updated', () => {

            this.refresh();
        });
    }

    // Function to capture parameters
    captureParameters() {

        // console.log(this.state.object)

        // Object rotation
        const objectRotation = {
            x: this.state.object.rotation.x,
            y: this.state.object.rotation.y,
            z: this.state.object.rotation.z,
        };

        // Camera position and rotation
        this.state.viewerParameters = {
            position: {
                x: this.state.camera.position.x,
                y: this.state.camera.position.y,
                z: this.state.camera.position.z,
            },
            rotation: {
                x: this.state.object.rotation.x,
                y: this.state.object.rotation.y,
                z: this.state.object.rotation.z,
            },
            // rotation: {
            //     x: THREE.MathUtils.radToDeg(this.state.camera.rotation.x),
            //     y: THREE.MathUtils.radToDeg(this.state.camera.rotation.y),
            //     z: THREE.MathUtils.radToDeg(this.state.camera.rotation.z),
            // },
            fov: this.state.camera.fov, // Field of view
        };

        // debounce event
        this.state.timeOut && clearTimeout(this.state.timeOut);

        // refresh render
        if (this.state.allowCameraUpdate) this.state.timeOut = setTimeout(() => {

            // console.log('refresh camera-view');
            // this.state.camera.position.z = 0;

            this.product.sketch.camera.p1 = parseFloat(this.state.camera.position.x);
            this.product.sketch.camera.p2 = parseFloat(this.state.camera.position.y);
            this.product.sketch.camera.p3 = parseFloat(this.state.camera.position.z);

            // if (!this.product.sketch.viewer) this.product.sketch.viewer = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 75 };

            this.product.sketch.position.x = parseFloat(this.state.camera.position.x);
            this.product.sketch.position.y = parseFloat(this.state.camera.position.y);
            this.product.sketch.position.z = parseFloat(this.state.camera.position.z);
            this.product.sketch.fov = parseFloat(this.state.camera.fov);

            document.querySelector('.camera-view').value = `${this.state.camera.position.x},${this.state.camera.position.y},${this.state.camera.position.z}`;
            document.querySelector('.camera-view').dispatchEvent(new Event('change'));
        }, 1000);

        // this.state.firstLoadViewer = false;

        // this.product.sketch.viewer = this.state.viewerParameters;

        // console.log(JSON.stringify(this.state.viewerParameters, null, 2));
    }

    getViewerData() {

        return this.state.viewerParameters;
    }
}