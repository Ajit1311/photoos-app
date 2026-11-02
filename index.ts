import { registerRootComponent } from 'expo';

// Emergency WebKit / iOS Safari reload loop protector
if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
  try {
    const count = Number(sessionStorage.getItem('@photoos_crash_loop_guard') || '0');
    if (count >= 2) {
      console.warn('[PhotoOS] Emergency recovery: Repeated crash/reload loop detected. Purging session & memory caches.');
      sessionStorage.clear();
      try {
        localStorage.removeItem('@photoos_last_selfie_v2');
      } catch {}
    } else {
      sessionStorage.setItem('@photoos_crash_loop_guard', String(count + 1));
      setTimeout(() => {
        try {
          sessionStorage.removeItem('@photoos_crash_loop_guard');
        } catch {}
      }, 6000);
    }
  } catch {}
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
