import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css'; // Make sure you have the CSS file

const App = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const videoRef = useRef();
  const [userFaceDescriptors, setUserFaceDescriptors] = useState([]);

  // Load models on initial load
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true); // Start loading models
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      setLoading(false); // Models are loaded
      setIsModelLoaded(true);
    };

    loadModels();
  }, []);

  const startVideo = () => {
    const video = videoRef.current;
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => console.error('Error accessing webcam: ', err));
  };

  const handleVideoOnPlay = async () => {
    const video = videoRef.current;
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Detect faces on every frame
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (isRegistered && userFaceDescriptors.length > 0) {
        // Compare the captured face with the registered faces
        const faceMatcher = new faceapi.FaceMatcher(userFaceDescriptors);
        const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));
        
        // Display matching results or login status
        console.log('Login results:', results);
      }

      canvas?.clear();
      canvas?.dispose();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas?.drawDetections(resizedDetections);
      canvas?.drawFaceLandmarks(resizedDetections);
    }, 100);
  };

  const handleRegister = async () => {
    if (!userName) {
      alert('Please enter your name before registering.');
      return;
    }

    // Capture face and save face descriptor
    const video = videoRef.current;
    const detections = await faceapi.detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length > 0) {
      const faceDescriptors = detections.map(d => d.descriptor);
      setUserFaceDescriptors(faceDescriptors);

      // Save the user face descriptor with their name
      localStorage.setItem(userName, JSON.stringify(faceDescriptors));
      setIsRegistered(true);
      alert('Registration successful!');
    } else {
      alert('No face detected. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (!userName) {
      alert('Please enter your name to login.');
      return;
    }

    // Retrieve saved face descriptor
    const savedDescriptors = localStorage.getItem(userName);
    if (savedDescriptors) {
      const faceDescriptors = JSON.parse(savedDescriptors);
      setUserFaceDescriptors(faceDescriptors);

      // Now the user can attempt login by detecting and matching the face
      alert('Login successful!');
    } else {
      alert('User not registered. Please register first.');
    }
  };

  return (
    <div>
      <h1>Face Recognition Login</h1>
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Enter your name"
      />
      <div>
        <button onClick={handleRegister} disabled={!isModelLoaded}>
          Register
        </button>
        <button onClick={handleLogin} disabled={!isModelLoaded}>
          Login
        </button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoOnPlay}
        width="720"
        height="560"
      />
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading models...</p>
        </div>
      )}
      {!loading && isModelLoaded && !isRegistered && (
        <button onClick={startVideo}>Start Video</button>
      )}
    </div>
  );
};

export default App;
