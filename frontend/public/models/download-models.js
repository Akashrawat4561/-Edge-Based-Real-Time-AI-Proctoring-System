const https = require('https');
const fs = require('fs');
const path = require('path');

const models = [
  // Tiny Face Detector (fastest)
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  
  // 68 Point Landmarks
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  
  // Face Recognition (optional - for face matching)
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  
  // Face Expression Recognition
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(baseUrl + filename, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
};

const downloadAll = async () => {
  console.log('📥 Downloading face-api.js models...');
  console.log('This may take a few minutes...\n');
  
  for (const model of models) {
    try {
      await downloadFile(model);
    } catch (err) {
      console.error(`❌ Failed to download ${model}:`, err.message);
    }
  }
  
  console.log('\n✅ All models downloaded successfully!');
  console.log('📁 Location:', __dirname);
};

downloadAll();