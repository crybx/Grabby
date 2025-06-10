// This script handles any interactive functionality in the popup
// Currently it's minimal but can be expanded as settings needs grow

document.addEventListener('DOMContentLoaded', function() {
    console.log('Grabby popup opened');
    
    // Get UI elements
    const grabbyButton = document.getElementById('grabby-button');
    const startBulkBtn = document.getElementById('start-bulk-grab');
    const stopBulkBtn = document.getElementById('stop-bulk-grab');
    const pageCountInput = document.getElementById('page-count');
    const delayInput = document.getElementById('delay-seconds');
    const statusDisplay = document.getElementById('bulk-status');
    const statusText = document.getElementById('status-text');
    const progressFill = document.getElementById('progress-fill');
    
    // Add click handler to the clipboard button
    if (grabbyButton) {
        grabbyButton.addEventListener('click', () => {
            // Show a quick visual feedback
            grabbyButton.classList.add('clicked');
            
            // Send a message to the background script to grab content
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'grabContent'
            });
            
            // Reset button after animation
            setTimeout(() => {
                grabbyButton.classList.remove('clicked');
            }, 300);
            
            // Close the popup after clicking
            window.close();
        });
    }
    
    // Add click handler for start bulk grab
    if (startBulkBtn) {
        startBulkBtn.addEventListener('click', () => {
            const pageCount = parseInt(pageCountInput.value);
            const delaySeconds = parseInt(delayInput.value);
            
            if (pageCount < 1 || pageCount > 1000) {
                alert('Page count must be between 1 and 1000');
                return;
            }
            
            if (delaySeconds < 1 || delaySeconds > 3600) {
                alert('Delay must be between 1 and 3600 seconds (1 hour)');
                return;
            }
            
            // Send start bulk grab message
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'startBulkGrab',
                pageCount: pageCount,
                delaySeconds: delaySeconds
            });
            
            // Update UI state
            updateUIForBulkGrabbing(true);
            updateStatus('Starting bulk grab...', 0);
        });
    }
    
    // Add click handler for stop bulk grab
    if (stopBulkBtn) {
        stopBulkBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'stopBulkGrab'
            });
            
            updateUIForBulkGrabbing(false);
            updateStatus('Stopped', 0);
        });
    }
    
    // Listen for status updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.target === 'popup') {
            switch (message.type) {
                case 'bulkGrabStatus':
                    updateStatus(message.status, message.progress);
                    break;
                case 'bulkGrabComplete':
                    updateUIForBulkGrabbing(false);
                    updateStatus('Completed!', 100);
                    setTimeout(() => {
                        statusDisplay.style.display = 'none';
                    }, 3000);
                    break;
                case 'bulkGrabStopped':
                    updateUIForBulkGrabbing(false);
                    updateStatus('Stopped', 0);
                    setTimeout(() => {
                        statusDisplay.style.display = 'none';
                    }, 2000);
                    break;
            }
        }
    });
    
    // Request current bulk grab status on popup open
    chrome.runtime.sendMessage({
        target: 'background',
        type: 'getBulkGrabStatus'
    }, (response) => {
        if (response && response.isRunning) {
            updateUIForBulkGrabbing(true);
            updateStatus(response.status, response.progress);
        }
    });
    
    function updateUIForBulkGrabbing(isRunning) {
        startBulkBtn.disabled = isRunning;
        stopBulkBtn.disabled = !isRunning;
        pageCountInput.disabled = isRunning;
        delayInput.disabled = isRunning;
        
        if (isRunning) {
            statusDisplay.style.display = 'block';
        }
    }
    
    function updateStatus(status, progress) {
        statusText.textContent = status;
        progressFill.style.width = progress + '%';
    }
});