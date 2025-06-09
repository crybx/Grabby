// This script handles any interactive functionality in the popup
// Currently it's minimal but can be expanded as settings needs grow

document.addEventListener('DOMContentLoaded', function() {
    console.log('Grabby popup opened');
    
    // Add click handler to the clipboard button
    const grabbyButton = document.getElementById('grabby-button');
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
});