/**
 * Notification Sound System for SAFECORD
 * 
 * This plays a notification sound when certain events occur (friend requests, messages, etc.)
 * The sound is from: https://youtu.be/rIPq9Fl5r44?si=66RhlnyDEJuJQ2UM
 */

class NotificationSoundManager {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize audio element
    // Note: For production, replace this URL with the actual audio file hosted on your CDN
    // You can extract audio from the YouTube video and host it
    // For now, using a placeholder notification sound
    this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    this.audio.volume = 0.5;
  }

  /**
   * Play notification sound
   */
  play() {
    if (!this.enabled || !this.audio) return;

    try {
      // Reset audio to beginning
      this.audio.currentTime = 0;
      
      // Play the sound
      this.audio.play().catch(err => {
        console.error('Failed to play notification sound:', err);
        // Browser might block autoplay - user interaction required
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Enable/disable notification sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

// Create singleton instance
export const notificationSound = new NotificationSoundManager();

/**
 * Helper function to play notification sound
 * Use this in your components when you want to play a notification
 */
export function playNotificationSound() {
  notificationSound.play();
}
