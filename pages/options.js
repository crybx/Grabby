document.addEventListener('DOMContentLoaded', function() {
  const closePageLink = document.getElementById('close-page');
  const openStoryTrackerBtn = document.getElementById('open-story-tracker-btn');

  if (closePageLink) {
    closePageLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.close();
    });
  }

  if (openStoryTrackerBtn) {
    openStoryTrackerBtn.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/story-tracker.html') });
    });
  }
});