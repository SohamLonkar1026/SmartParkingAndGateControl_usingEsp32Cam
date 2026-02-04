const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const config = require('../config/licensePlateConfig');

class LicensePlateService {
  constructor() {
    this.plateRecognizerConfig = config.plateRecognizer;
    this.api = axios.create({
      baseURL: this.plateRecognizerConfig.apiUrl,
      headers: {
        'Authorization': `Token ${this.plateRecognizerConfig.apiKey}`,
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10000 // 10 seconds timeout
    });
  }

  /**
   * Process an image to detect and recognize license plates
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} - Recognized plate information
   */
  async recognizePlate(imagePath) {
    try {
      if (!this.plateRecognizerConfig.apiKey) {
        throw new Error('PlateRecognizer API key is not configured');
      }

      const form = new FormData();
      form.append('upload', fs.createReadStream(imagePath));
      form.append('regions', this.plateRecognizerConfig.regions);
      
      const response = await this.api.post('', form, {
        headers: form.getHeaders()
      });

      return this._processApiResponse(response.data);
    } catch (error) {
      console.error('License plate recognition error:', error.message);
      throw new Error(`License plate recognition failed: ${error.message}`);
    }
  }

  /**
   * Process the API response and extract plate information
   * @private
   */
  _processApiResponse(data) {
    if (!data.results || data.results.length === 0) {
      throw new Error('No license plates detected in the image');
    }

    // Sort by confidence (highest first)
    const sortedResults = data.results.sort((a, b) => b.score - a.score);
    const bestMatch = sortedResults[0];

    if (bestMatch.score < this.plateRecognizerConfig.minConfidence) {
      throw new Error('License plate confidence too low');
    }

    // Format plate number (remove spaces and convert to uppercase)
    const plateNumber = bestMatch.plate.replace(/\s+/g, '').toUpperCase();
    
    // Validate Indian plate format
    if (!this._validateIndianPlate(plateNumber)) {
      throw new Error('Invalid Indian license plate format');
    }

    return {
      plateNumber,
      confidence: bestMatch.score,
      region: bestMatch.region,
      vehicle: {
        type: bestMatch.vehicle?.type || 'car',
        make: bestMatch.vehicle?.make?.[0]?.name,
        color: bestMatch.vehicle?.color?.[0]?.name
      },
      coordinates: bestMatch.box
    };
  }

  /**
   * Validate Indian license plate format
   * @private
   */
  _validateIndianPlate(plateNumber) {
    // Indian plate format: XX-00-XX-XXXX or XX-00-XXXX
    const indianPlateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/i;
    return indianPlateRegex.test(plateNumber);
  }

  /**
   * Get camera configuration optimized for license plate recognition
   */
  getCameraConfig() {
    return config.camera;
  }
}

module.exports = new LicensePlateService();
