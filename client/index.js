import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

// const remoteUrl = "http://34.32.228.101:8080/generate_animation"
const remoteUrl = "http://34.32.228.101:8080/generate_animation"
// 1. Set up the Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
let meshes = [];
let mesh;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
let startAnimationTime = Date.now()
let endAnimationTime = Date.now()

// Add a basic light
const ambientLight = new THREE.AmbientLight(0xcccccc, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 0).normalize();
scene.add(directionalLight);

// Add a PointLight
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(5, 5, 5); // Position is x, y, z
scene.add(pointLight);


// 2. Load the GLB Model
const loader = new GLTFLoader();
// Assuming loader.load() has already been called
loader.load('dd1.glb', function (gltf) {

    const object = gltf.scene;
    meshes = object.children[0].children
    const mesh = meshes[0]; // Example: working with the first mesh

    if (mesh.morphTargetDictionary) {
        // Iterate over the morphTargetDictionary to print names and indices
        for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
            console.log(`${name}: ${index}`);
        }
    } else {
        console.log('No morph targets found on this mesh.');
    }
    scene.add(object);


    // Compute the bounding box after adding the model to the scene
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());

    // Move the camera to focus on the center of the bounding box
    camera.position.x = center.x;
    camera.position.y = center.y;
    // Adjust the Z position based on the size of the model for a good view distance
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 4 * Math.tan(fov * 2));

    // Perhaps a bit far back
    camera.position.z = 30; // Adjust the 1.5 as needed

    // Update the camera's matrices
    camera.updateProjectionMatrix();

    // Point the camera to the center of the model
    camera.lookAt(center);

    // Update controls to rotate around the center of the model
    controls.target.set(center.x, center.y, center.z);
    controls.update();

}, undefined, function (error) {
    console.error(error);
});


// 3. Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

function animateFacialBlendShapes(animations, startIndex) {
    console.log(animations)
    let currentAnimationIndex = 0;
    startAnimationTime = Date.now()

    function animateNext() {
        if (currentAnimationIndex >= animations.length) {
  
            endAnimationTime = Date.now()
            console.log('Animation time:', endAnimationTime - startAnimationTime)
            return; // Exit if we've animated all objects in the array
        }

        const animation = animations[currentAnimationIndex];
        let { targets, duration } = animation;
        // Copy initial blend shape values for each mesh
        const initialValuesArray = meshes[0].morphTargetInfluences.slice(startIndex, (startIndex + targets.length));
        
        // let zeros = new Array(startIndex).fill(0); 
        // let updatedTargets = zeros.concat(targets); 
        // targets = updatedTargets;

        const startTime = performance.now();

        function animate() {
            const elapsedTime = performance.now() - startTime;
            const progress = elapsedTime / duration;

            if (progress < 1) {
                // console.log(progress)
                // Update each blend shape influence for each mesh based on linear interpolation
                meshes.forEach((mesh, meshIndex) => {
                    const initialValues = initialValuesArray;
                    for (let i = 0; i < targets.length; i++) {
                        mesh.morphTargetInfluences[startIndex+i] = THREE.MathUtils.lerp(initialValues[i], targets[i], progress);
                    }
                });

                requestAnimationFrame(animate); // Continue animation
            } else {
                // Set final values to ensure accuracy for each mesh
                meshes.forEach((mesh, meshIndex) => {
                    
                    for (let i = startIndex; i < (targets.length); i++) {
                        // console.log(i)
                        mesh.morphTargetInfluences[i] = targets[i];
                    }
                });

                currentAnimationIndex++; // Move to the next animation
                animateNext(); // Start the next animation
            }
        }

        animate(); // Start animating
    }

    animateNext(); // Start the animation sequence
}






// Call the function with the dummy data and your mesh

function playBase64Wav(base64WavData) {
    console.log("playing audio")
    // Example Base64 WAV data, replace with your actual Base64 string    
    // Convert Base64 string to a Uint8Array
    const byteCharacters = atob(base64WavData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // Create a blob from the Uint8Array
    const wavBlob = new Blob([byteArray], {type: 'audio/wav'});
    
    // Create an ObjectURL from the Blob
    const audioSrc = URL.createObjectURL(wavBlob);
    
    // Create an audio element and play it
    const audio = new Audio(audioSrc);
    audio.play()
        .catch(e => console.error('Playback failed:', e));
}

// Function to print input text and send GET request
function printInputTextAndSendRequest() {
    const inputElement = document.getElementById('inputText');
    const text = inputElement.value;
    console.log(text); // Print the text from the input to the console

    // Construct the URL with the query parameter
    const url = new URL(remoteUrl);

    // Send a GET request to the server
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            text: text, 
            isFirstChunk: true, 
            // emotion_vector:[0,0,1,0]
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text(); // or response.json() if your server responds with JSON
        })
        .then(data => {


            const { b64string, visemes, emotion_sequences:emos } = JSON.parse(data);
            playBase64Wav(b64string);
            const offset = 100;
            setTimeout(()=>{
                animateFacialBlendShapes(visemes, 256);

            }, offset)
            // animateFacialBlendShapes(emos, 293);

        })
        .catch(error => {
            console.log('There has been a problem with your fetch operation:', error);
        });
}

// Event listener for the button click




document.getElementById('printButton').addEventListener('click', printInputTextAndSendRequest);
