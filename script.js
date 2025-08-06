"use strict";

const videoPlayer = document.getElementById('videoPlayer');

// List of video files
const playlist = [
  'videos/NewTone.MP4',
  'videos/Sojka.MP4',
  'videos/Masaz.mp4',
  'videos/Ser.mp4'
];

let currentIndex = 0;
let retryCount = 0;
const maxRetries = 5;
let preloadedVideo = null;
let lastCommitSHA = null;

// Play video (with support for older WebViews)
function playVideo(index) {
  const videoSrc = playlist[index];
  console.log(`Playing video: ${videoSrc}`);
  videoPlayer.src = videoSrc;
  videoPlayer.load();

  try {
    const playPromise = videoPlayer.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          console.log(`Playback started successfully for ${videoSrc}`);
        })
        .catch((err) => {
          console.warn(`Playback error for ${videoSrc}. Retry #${retryCount + 1}:`, err);
          retryOrSkip(index);
        });
    } else {
      console.log('Playing without Promise support.');
    }
  } catch (err) {
    console.warn(`Immediate play() failure for ${videoSrc}. Retry #${retryCount + 1}:`, err);
    retryOrSkip(index);
  }
}

// Retry or skip to the next video
function retryOrSkip(index) {
  retryCount++;
  if (retryCount >= maxRetries) {
    console.warn(`Skipping video after ${maxRetries} attempts.`);
    retryCount = 0;
    currentIndex = (currentIndex + 1) % playlist.length;
    playVideo(currentIndex);
    preloadNextVideo();
  } else {
    setTimeout(() => playVideo(index), 2000);
  }
}

// Preload the next video
function preloadNextVideo() {
  if (preloadedVideo) {
    document.body.removeChild(preloadedVideo);
    preloadedVideo = null;
  }

  preloadedVideo = document.createElement('video');
  preloadedVideo.src = playlist[(currentIndex + 1) % playlist.length];
  preloadedVideo.preload = "auto";
  preloadedVideo.style.display = "none";
  document.body.appendChild(preloadedVideo);
}

// Check for a new version on GitHub
function checkForUpdateByCommitSHA() {
  const apiURL = 'https://api.github.com/repos/karima-st/video-playlist/commits/main';

  if (window.fetch) {
    fetch(apiURL, { cache: 'no-store' })
      .then(response => response.json())
      .then(data => handleCommitSHA(data.sha))
      .catch(err => {
        console.warn('GitHub update check failed (fetch):', err);
      });
  } else {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', apiURL, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            handleCommitSHA(data.sha);
          } catch (err) {
            console.warn('Failed to parse GitHub response:', err);
          }
        } else {
          console.warn('GitHub update check failed (XHR): HTTP ' + xhr.status);
        }
      }
    };
    xhr.send();
  }
}

// Handle SHA comparison and reload if updated
function handleCommitSHA(latestSHA) {
  if (lastCommitSHA && latestSHA !== lastCommitSHA) {
    console.log('New version detected from GitHub. Reloading...');
    location.reload();
  }
  lastCommitSHA = latestSHA;
}

// Reload the page every 12 hours
setInterval(() => {
  console.log('12 hours passed. Reloading the page...');
  location.reload();
}, 43200000); // 12 hours

// Check for updates every minute
setInterval(checkForUpdateByCommitSHA, 60000);

// Handle video end
videoPlayer.addEventListener('ended', () => {
  retryCount = 0;
  currentIndex = (currentIndex + 1) % playlist.length;
  playVideo(currentIndex);
  preloadNextVideo();
});

// Initial start
playVideo(currentIndex);
preloadNextVideo();
