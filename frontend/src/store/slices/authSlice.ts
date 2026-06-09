import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  displayName: string;
  avatarUrl?: string | null;
  roles: string[];
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
