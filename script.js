
const URL = "https://teachablemachine.withgoogle.com/models/DZvPorzbJ/";

let model, webcam, labelContainer, maxPredictions;
let isCamActive = false;


async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  if (!model) {
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
  }

  document.getElementById('uploaded-image-preview').style.display = 'none';
  document.getElementById('result-box').style.display = 'none';

  const flip = true; 
  webcam = new tmImage.Webcam(200, 200, flip); 
  await webcam.setup(); 
  await webcam.play();
  
  isCamActive = true;
  window.requestAnimationFrame(loop);

  const webcamContainer = document.getElementById("webcam-container");
  const oldCanvas = webcamContainer.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  
  webcamContainer.appendChild(webcam.canvas);
  
  document.getElementById('capture-btn').style.display = 'inline-block';
}

async function loop() {
  if (!isCamActive) return; 
  webcam.update(); 
  window.requestAnimationFrame(loop);
}

async function captureCamera() {
  if (!webcam || !isCamActive) return;

  isCamActive = false;
  await webcam.stop(); 
  document.getElementById('capture-btn').style.display = 'none'; 
  const prediction = await model.predict(webcam.canvas);
  displayFinalAnalysis(prediction);
}

async function handleImageUpload(event) {
  const file = event.target.files[0]; 
  if (!file) return;

  isCamActive = false;
  if (webcam && typeof webcam.stop === 'function') {
    await webcam.stop();
  }
  document.getElementById('capture-btn').style.display = 'none';

  if (!model) {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgElement = document.getElementById('uploaded-image-preview');
    imgElement.src = e.target.result;
    imgElement.style.display = 'block'; 

    const webcamContainer = document.getElementById('webcam-container');
    Array.from(webcamContainer.children).forEach(child => {
      if (child.id !== 'uploaded-image-preview') child.style.display = 'none';
    });

    imgElement.onload = async function() {
      const prediction = await model.predict(imgElement);
      displayFinalAnalysis(prediction);
    };
  };
  reader.readAsDataURL(file);
}

function displayFinalAnalysis(predictions) {
  let topClass = "";
  let topProbability = -1;

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].probability > topProbability) {
      topProbability = predictions[i].probability;
      topClass = predictions[i].className;
    }
  }

  const percentage = (topProbability * 100).toFixed(0);
  
  document.getElementById('top-prediction').innerHTML = `Most Likely Result: <span style="color:#121d41; font-weight:bold;">${topClass} (${percentage}%)</span>`;

  const graphContainer = document.getElementById('graph-container');
  graphContainer.innerHTML = ""; 

  predictions.forEach(pred => {
    const predPct = (pred.probability * 100).toFixed(0);
    
    const row = document.createElement('div');
    row.style.margin = "5px 0";
    
    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 11pt; color: white; margin-bottom: 2px;">
        <span>${pred.className}</span>
        <span>${predPct}%</span>
      </div>
      <div style="background: rgba(255,255,255,0.2); width: 100%; height: 12px; border-radius: 6px; overflow: hidden;">
        <div style="background: ${pred.className === topClass ? '#ffdada' : '#95b7ff'}; width: ${predPct}%; height: 100%; transition: width 0.5s ease-in-out;"></div>
      </div>
    `;
    graphContainer.appendChild(row);
  });

  document.getElementById('result-box').style.display = 'block';
}

async function restartApp() {
  isCamActive = false;
  if (webcam && typeof webcam.stop === 'function') {
    try {
      await webcam.stop();
    } catch(e) {
      console.log("Cam already stopped");
    }
  }

  document.getElementById('result-box').style.display = 'none';
  document.getElementById('top-prediction').innerText = "Most Likely Result: --";
  document.getElementById('graph-container').innerHTML = "";

  const imgElement = document.getElementById('uploaded-image-preview');
  if (imgElement) {
    imgElement.src = "";
    imgElement.style.display = 'none';
  }

  const webcamContainer = document.getElementById("webcam-container");
  const oldCanvas = webcamContainer.querySelector('canvas');
  if (oldCanvas) {
    oldCanvas.remove();
  }

  const fileInput = document.getElementById('image-selector');
  if (fileInput) {
    fileInput.value = "";
  }

  document.getElementById('capture-btn').style.display = 'none';

  console.log("Application restarted successfully. Ready for new input!");
}


