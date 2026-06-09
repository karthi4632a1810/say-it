import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type UiState = {
  sidebarOpen: boolean;
  activeConversationId: string | null;
  aiSearchOpen: boolean;
};

const initialState: UiState = {
  sidebarOpen: true,
  activeConversationId: null,
  aiSearchOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },
    setAiSearchOpen(state, action: PayloadAction<boolean>) {
      state.aiSearchOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setActiveConversation, setAiSearchOpen } = uiSlice.actions;
export default uiSlice.reducer;
