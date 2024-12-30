import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const FaceRecognitionApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faces, setFaces] = useState(null);

  // Step 2: Load face-api.js models and start the webcam feed
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      startWebcam();
    };

    const startWebcam = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;
    };

    loadModels();
  }, []);

  // Step 3: Detect faces in the video feed
  useEffect(() => {
    const detectFace = async () => {
      if (videoRef.current && canvasRef.current) {
        const detections = await faceapi.detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        // Clear the canvas and draw detections
        canvasRef.current?.clear();
        faceapi.matchDimensions(canvasRef.current, videoRef.current);
        const resizedDetections = faceapi.resizeResults(detections, videoRef.current);
        canvasRef.current?.drawDetections(resizedDetections);
        canvasRef.current?.drawFaceLandmarks(resizedDetections);

        // Capture the image and send to backend
        captureAndSendToBackend(resizedDetections);
      }
    };

    const interval = setInterval(detectFace, 100); // Detect faces every 100ms

    return () => clearInterval(interval);
  }, []);

  const captureAndSendToBackend = async (detections) => {
    if (detections.length > 0) {
      // Step 4: Capture image from the video feed
      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      const imageData = canvas.toDataURL();

      // Step 5: Send the captured image to Flask backend
      try {
        const response = await axios.post('http://localhost:5000/api/recognize', {
          image: imageData,
        });
        setFaces(response.data); // Set the detected faces data to state
      } catch (error) {
        console.error('Error sending image to backend:', error);
      }
    }
  };

  return (
    <div>
      <h1>Face Recognition App</h1>
      <video ref={videoRef} width="640" height="480" autoPlay muted />
      <canvas ref={canvasRef} width="640" height="480" />
      <div>
        {faces && (
          <pre>{JSON.stringify(faces, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default FaceRecognitionApp;
