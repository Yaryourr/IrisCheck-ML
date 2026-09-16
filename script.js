// TODO: Paste the link to your model between the "" on line 2!
const URL = "https://teachablemachine.withgoogle.com/models/DZvPorzbJ/";

let model, webcam, labelContainer, maxPredictions;
let isCamActive = false;

// 1. تحميل النموذج وإعداد الكاميرا
async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  if (!model) {
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
  }

  // إخفاء المعاينات السابقة وصندوق النتائج الثابتة
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
  
  // إظهار زر الالتقاط (Capture) وإخفاء زر الكاميرا الأساسي مؤقتاً لتنظيم المساحة
  document.getElementById('capture-btn').style.display = 'inline-block';
}

// 2. حلقة التحديث المستمر للكاميرا
async function loop() {
  if (!isCamActive) return; 
  webcam.update(); 
  window.requestAnimationFrame(loop);
}

// 3. دالة إيقاف الكاميرا والتقاط اللحظة الحالية (Capture)
async function captureCamera() {
  if (!webcam || !isCamActive) return;

  isCamActive = false;
  await webcam.stop(); // إيقاف البث الحي فوراً وثبات الصورة
  document.getElementById('capture-btn').style.display = 'none'; // إخفاء زر الالتقاط

  // تحليل الإطار الأخير الثابت المعروض على الكانفاس
  const prediction = await model.predict(webcam.canvas);
  displayFinalAnalysis(prediction);
}

// 4. معالجة الصورة المرفوعة من الجهاز
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

// 5. دالة معالجة النتيجة الأكثر احتمالاً وبناء الرسم البياني التوضيحي
function displayFinalAnalysis(predictions) {
  let topClass = "";
  let topProbability = -1;

  // إيجاد النتيجة الأعلى
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].probability > topProbability) {
      topProbability = predictions[i].probability;
      topClass = predictions[i].className;
    }
  }

  const percentage = (topProbability * 100).toFixed(0);
  
  // تحديث نص النتيجة الأكثر احتمالاً
  document.getElementById('top-prediction').innerHTML = `Most Likely Result: <span style="color:#121d41; font-weight:bold;">${topClass} (${percentage}%)</span>`;

  // بناء أشرطة الرسم البياني (CSS Progress Bars) ديناميكياً
  const graphContainer = document.getElementById('graph-container');
  graphContainer.innerHTML = ""; // تنظيف الرسم البياني السابق

  predictions.forEach(pred => {
    const predPct = (pred.probability * 100).toFixed(0);
    
    // إنشاء سطر لكل مرض
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

  // إظهار صندوق النتائج كاملاً بسلاسة
  document.getElementById('result-box').style.display = 'block';
}

async function restartApp() {
  // إيقاف الكاميرا الحية الحالية تماماً لمنع أي تداخل برمي
  isCamActive = false;
  if (webcam && typeof webcam.stop === 'function') {
    try {
      await webcam.stop();
    } catch(e) {
      console.log("Cam already stopped");
    }
  }

  // 1. إخفاء صندوق النتائج والرسم البياني وتصفير نصوصه
  document.getElementById('result-box').style.display = 'none';
  document.getElementById('top-prediction').innerText = "Most Likely Result: --";
  document.getElementById('graph-container').innerHTML = "";

  // 2. تصفير وإخفاء الصورة المرفوعة سابقاً بأمان مع الحفاظ على عنصر الـ <img> في الصفحة
  const imgElement = document.getElementById('uploaded-image-preview');
  if (imgElement) {
    imgElement.src = "";
    imgElement.style.display = 'none';
  }

  // 3. تنظيف أي عناصر كاميرا حية (canvas) قديمة من داخل الصندوق لتجهيزه للمستقبل
  const webcamContainer = document.getElementById("webcam-container");
  const oldCanvas = webcamContainer.querySelector('canvas');
  if (oldCanvas) {
    oldCanvas.remove();
  }

  // 4. تصفير الـ input المخصص لرفع الصور بأمان ليقبل رفع نفس الصورة مرتين متتاليتين
  const fileInput = document.getElementById('image-selector');
  if (fileInput) {
    fileInput.value = "";
  }

  // إخفاء زر التقاط الكاميرا الأساسي حتى يضغط المستخدم على Use Camera مجدداً
  document.getElementById('capture-btn').style.display = 'none';

  console.log("Application restarted successfully. Ready for new input!");
}


