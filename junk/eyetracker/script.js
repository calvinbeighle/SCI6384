// Initialize WebGazer
webgazer.setRegression('ridge')
    .setTracker('TFFacemesh')
    .setGazeListener((data, timestamp) => {
        if (data != null) {
            const gazePoint = document.getElementById('gaze-point');
            gazePoint.style.left = data.x + 'px';
            gazePoint.style.top = data.y + 'px';
        }
    })
    .begin();

// DOM Elements
const startButton = document.getElementById('startButton');
const calibrateButton = document.getElementById('calibrateButton');
const statusDiv = document.getElementById('status');
const trackingArea = document.getElementById('tracking-area');

// State variables
let isTracking = false;
let calibrationPoints = [];
const numCalibrationPoints = 9;
const numCalibrationRounds = 3;
let currentRound = 0;
let calibrationData = [];

// Create calibration points
function createCalibrationPoints() {
    const points = [];
    const spacing = 100;
    const startX = 50;
    const startY = 50;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const point = document.createElement('div');
            point.className = 'calibration-point';
            point.style.left = (startX + i * spacing) + 'px';
            point.style.top = (startY + j * spacing) + 'px';
            point.style.display = 'none';
            trackingArea.appendChild(point);
            points.push(point);
        }
    }
    return points;
}

// Calculate accuracy between predicted and actual points
function calculateAccuracy(predicted, actual) {
    const dx = predicted.x - actual.x;
    const dy = predicted.y - actual.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Initialize calibration points
calibrationPoints = createCalibrationPoints();

// Start button click handler
startButton.addEventListener('click', async () => {
    try {
        await webgazer.showVideoPreview(true);
        isTracking = true;
        statusDiv.textContent = 'Status: Tracking Active - Please ensure your face is well-lit and centered in the camera view';
        startButton.disabled = true;
        calibrateButton.disabled = false;
    } catch (error) {
        statusDiv.textContent = 'Status: Error - ' + error.message;
    }
});

// Calibration button click handler
calibrateButton.addEventListener('click', () => {
    if (!isTracking) return;
    
    let currentPoint = 0;
    statusDiv.textContent = `Status: Calibration Round ${currentRound + 1}/${numCalibrationRounds} - Look at each point and click when ready`;
    
    function showNextPoint() {
        if (currentPoint >= numCalibrationPoints) {
            currentRound++;
            
            if (currentRound < numCalibrationRounds) {
                // Start next round
                currentPoint = 0;
                statusDiv.textContent = `Status: Calibration Round ${currentRound + 1}/${numCalibrationRounds} - Look at each point and click when ready`;
                setTimeout(showNextPoint, 1000);
            } else {
                // Calibration complete
                statusDiv.textContent = 'Status: Calibration Complete - Tracking accuracy should now be improved';
                calibrationPoints.forEach(point => point.style.display = 'none');
                
                // Calculate and display average accuracy
                const avgAccuracy = calibrationData.reduce((sum, acc) => sum + acc, 0) / calibrationData.length;
                statusDiv.textContent += `\nAverage accuracy: ${Math.round(avgAccuracy)} pixels`;
                
                // Reset for potential recalibration
                currentRound = 0;
                calibrationData = [];
            }
            return;
        }
        
        calibrationPoints.forEach(point => point.style.display = 'none');
        calibrationPoints[currentPoint].style.display = 'block';
        
        // Store the actual point coordinates
        const actualX = calibrationPoints[currentPoint].offsetLeft + 10;
        const actualY = calibrationPoints[currentPoint].offsetTop + 10;
        
        calibrationPoints[currentPoint].addEventListener('click', () => {
            // Get the predicted gaze point
            const predicted = webgazer.getCurrentPrediction();
            if (predicted) {
                const accuracy = calculateAccuracy(predicted, { x: actualX, y: actualY });
                calibrationData.push(accuracy);
            }
            
            webgazer.addCalibrationPoint(actualX, actualY);
            currentPoint++;
            setTimeout(showNextPoint, 500);
        }, { once: true });
    }
    
    showNextPoint();
}); 