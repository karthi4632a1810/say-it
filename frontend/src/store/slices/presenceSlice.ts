import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PresenceState = Record<string, string>;

const presenceSlice = createSlice({
  name: 'presence',
  initialState: {} as PresenceState,
  reducers: {
    updatePresence(state, action: PayloadAction<{ userId: string; status: string }>) {
      state[action.payload.userId] = action.payload.status;
    },
  },
});

export const { updatePresence } = presenceSlice.actions;
export default presenceSlice.reducer;
