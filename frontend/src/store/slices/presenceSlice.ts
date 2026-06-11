import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PresenceEntry } from '../../utils/presence';

type PresenceState = Record<string, PresenceEntry>;

const presenceSlice = createSlice({
  name: 'presence',
  initialState: {} as PresenceState,
  reducers: {
    updatePresence(
      state,
      action: PayloadAction<{ userId: string; status: string; lastActiveAt?: string | null }>,
    ) {
      const { userId, status, lastActiveAt } = action.payload;
      const prev = state[userId];
      state[userId] = {
        status,
        lastActiveAt: lastActiveAt ?? (status === 'offline' ? prev?.lastActiveAt ?? new Date().toISOString() : prev?.lastActiveAt ?? null),
      };
    },
    setBulkPresence(
      state,
      action: PayloadAction<Array<{ userId: string; status: string; lastActiveAt: string | null }>>,
    ) {
      for (const row of action.payload) {
        state[row.userId] = { status: row.status, lastActiveAt: row.lastActiveAt };
      }
    },
  },
});

export const { updatePresence, setBulkPresence } = presenceSlice.actions;
export default presenceSlice.reducer;
