import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {AudiotrackIcon} from '@common/icons/material/Audiotrack';

const template = `<div class="audio-player">
  <div class="player-container">
    <div class="player-header">
      <div class="track-info">
        <h4 class="track-title">Sample Audio Track</h4>
        <p class="track-artist">Artist Name</p>
      </div>
      <div class="track-artwork">
        <img src="/images/builder/placeholder.svg" alt="Album Art">
      </div>
    </div>
    
    <div class="player-controls">
      <button class="control-btn" id="prevBtn">
        <i class="fa fa-step-backward"></i>
      </button>
      <button class="control-btn play-pause" id="playPauseBtn">
        <i class="fa fa-play"></i>
      </button>
      <button class="control-btn" id="nextBtn">
        <i class="fa fa-step-forward"></i>
      </button>
    </div>
    
    <div class="progress-container">
      <span class="time current-time">0:00</span>
      <div class="progress-bar">
        <div class="progress-fill"></div>
        <div class="progress-handle"></div>
      </div>
      <span class="time total-time">3:45</span>
    </div>
    
    <div class="volume-container">
      <button class="control-btn volume-btn">
        <i class="fa fa-volume-up"></i>
      </button>
      <div class="volume-slider">
        <div class="volume-fill"></div>
        <div class="volume-handle"></div>
      </div>
    </div>
    
    <div class="playlist-container">
      <h5>Playlist</h5>
      <div class="playlist">
        <div class="track-item active">
          <span class="track-number">1</span>
          <div class="track-details">
            <p class="track-name">Sample Audio Track</p>
            <p class="track-duration">3:45</p>
          </div>
        </div>
        <div class="track-item">
          <span class="track-number">2</span>
          <div class="track-details">
            <p class="track-name">Another Great Song</p>
            <p class="track-duration">4:20</p>
          </div>
        </div>
        <div class="track-item">
          <span class="track-number">3</span>
          <div class="track-details">
            <p class="track-name">Musical Experience</p>
            <p class="track-duration">2:58</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <audio id="audioElement" preload="metadata">
    <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvWMcBTOA0PLbgyEFIHfE8N2QQAYUZ7Tj66pYFAhCmNzzwGMcBTA+zfLigyEGHHTG8N6QQAYTZ7Li66tYFQU==" type="audio/wav">
    Your browser does not support the audio element.
  </audio>
</div>`;

const style = `.audio-player {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 25px;
  color: white;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

.audio-player .player-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.audio-player .player-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.audio-player .track-info {
  flex: 1;
}

.audio-player .track-title {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.audio-player .track-artist {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

.audio-player .track-artwork {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.audio-player .track-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-player .player-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
}

.audio-player .control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  backdrop-filter: blur(5px);
}

.audio-player .control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.audio-player .play-pause {
  background: linear-gradient(145deg, #4ecca3, #45b7aa);
  color: #1a1a2e;
  width: 60px;
  height: 60px;
  font-size: 20px;
}

.audio-player .play-pause:hover {
  background: linear-gradient(145deg, #5ff3d1, #4ecca3);
}

.audio-player .progress-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.audio-player .time {
  font-size: 12px;
  font-weight: 600;
  min-width: 35px;
  opacity: 0.8;
}

.audio-player .progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.audio-player .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecca3, #45b7aa);
  border-radius: 3px;
  width: 30%;
  transition: width 0.1s ease;
}

.audio-player .progress-handle {
  position: absolute;
  top: 50%;
  left: 30%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: left 0.1s ease;
}

.audio-player .volume-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.audio-player .volume-btn {
  width: 35px;
  height: 35px;
  font-size: 14px;
}

.audio-player .volume-slider {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.audio-player .volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecca3, #45b7aa);
  border-radius: 2px;
  width: 70%;
  transition: width 0.1s ease;
}

.audio-player .volume-handle {
  position: absolute;
  top: 50%;
  left: 70%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: left 0.1s ease;
}

.audio-player .playlist-container h5 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  opacity: 0.9;
}

.audio-player .playlist {
  max-height: 200px;
  overflow-y: auto;
}

.audio-player .track-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 5px;
}

.audio-player .track-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.audio-player .track-item.active {
  background: rgba(255, 255, 255, 0.2);
}

.audio-player .track-number {
  width: 20px;
  text-align: center;
  font-weight: 600;
  opacity: 0.7;
  font-size: 14px;
}

.audio-player .track-details {
  flex: 1;
}

.audio-player .track-name {
  margin: 0 0 2px 0;
  font-size: 14px;
  font-weight: 500;
}

.audio-player .track-duration {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}

@media (max-width: 480px) {
  .audio-player {
    padding: 20px;
  }
  
  .audio-player .player-container {
    padding: 20px;
  }
  
  .audio-player .player-header {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .audio-player .track-artwork {
    width: 80px;
    height: 80px;
  }
  
  .audio-player .player-controls {
    gap: 10px;
  }
  
  .audio-player .control-btn {
    width: 45px;
    height: 45px;
    font-size: 16px;
  }
  
  .audio-player .play-pause {
    width: 55px;
    height: 55px;
    font-size: 18px;
  }
}`;

export class AudioPlayerEl extends ArchitectElement {
  name = 'audio player';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = [];
  category = 'media';
  icon = <AudiotrackIcon />;
  specificity = 3;
  hiddenClasses = ['audio-player'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'audio-player');
  }
} 