// Configuration for License Plate Recognition (LPR) service
module.exports = {
  // PlateRecognizer API (https://platerecognizer.com/)
  plateRecognizer: {
    apiKey: process.env.PLATE_RECOGNIZER_API_KEY || '',
    apiUrl: 'https://api.platerecognizer.com/v1/plate-reader/',
    regions: ['in'], // India
    // Confidence threshold (0-1)
    minConfidence: 0.7
  },
  
  // Camera settings optimized for license plate recognition
  camera: {
    // Frame size (VGA recommended for LPR)
    frameSize: 'VGA', // 640x480
    // JPEG quality (1-63, lower is better quality)
    jpegQuality: 8,
    // Brightness, contrast, and other camera settings
    brightness: 0,
    contrast: 1,
    saturation: 0,
    // Enable/disable auto white balance
    awb: true,
    // Exposure settings
    exposureCtrl: true,
    // Image processing
    sharpness: 2,  // Increase for better edge detection
    denoise: 1     // Reduce noise for better OCR
  },
  
  // License plate validation for Indian plates
  validation: {
    // Indian license plate format: XX-00-XX-XXXX or XX-00-XXXX
    regex: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/i,
    // Minimum confidence score (0-1)
    minConfidence: 0.7,
    // Maximum processing time in milliseconds
    timeout: 5000
  }
};
