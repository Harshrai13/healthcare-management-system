import { createSlice } from '@reduxjs/toolkit';

const AUTH_STORAGE_KEY = 'verdantcare_auth';

function loadAuthFromStorage() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        accessToken: parsed.accessToken || null,
        isAuthenticated: !!(parsed.user && parsed.accessToken),
        isLoading: false,
      };
    }
  } catch {
    // Ignore storage errors
  }
  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  };
}

function saveAuthToStorage(user, accessToken) {
  try {
    if (user && accessToken) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, accessToken }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

const initialState = loadAuthFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      saveAuthToStorage(user, accessToken);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      saveAuthToStorage(null, null);
    },
  },
});

export const { setCredentials, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
